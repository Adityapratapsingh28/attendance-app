# embedder.py
import os
import requests
from io import BytesIO
from PIL import Image
import torch
import numpy as np
from supabase import create_client
from dotenv import load_dotenv
import time
from sklearn.metrics.pairwise import cosine_similarity
import json

# Load environment variables
load_dotenv()

# Supabase client setup
SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "faces")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Import embedding and detection modules
try:
    from embedding_module import get_face_embedding
    from detect_faces import detect_face, detect_all_faces
except ImportError as e:
    print(f"❌ Failed to import face processing modules: {e}")
    exit(1)

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🚀 Using device: {device}")

class FaceRecognitionSystem:
    def __init__(self, recognition_threshold=0.68, verification_threshold=0.72):
        """
        Initialize face recognition system with cosine similarity
        
        Args:
            recognition_threshold: For identifying unknown faces (1:N matching)
            verification_threshold: For verifying known faces (1:1 matching)
        """
        self.recognition_threshold = recognition_threshold
        self.verification_threshold = verification_threshold
        self.registered_users = {}  # {user_id: {'name': str, 'embedding': list}}
        print(f"🎯 Face Recognition System initialized")
        print(f"   - Recognition threshold: {recognition_threshold}")
        print(f"   - Verification threshold: {verification_threshold}")
    
    def register_user(self, user_id, name, embedding):
        """Register a new user with their face embedding"""
        if embedding is None or len(embedding) != 512:
            print(f"❌ Invalid embedding for user {name}")
            return False
            
        self.registered_users[user_id] = {
            'name': name,
            'embedding': embedding
        }
        print(f"✅ Registered user: {name} (ID: {user_id})")
        return True
    
    def load_users_from_database(self):
        """Load all users with embeddings from database"""
        print("📥 Loading users from database...")
        try:
            res = supabase.table("users").select("id, name, embedding").execute()
            
            if hasattr(res, 'error') and res.error:
                print(f"❌ Database query failed: {res.error}")
                return False
            
            users = res.data
            loaded_count = 0
            
            for user in users:
                user_id = user.get('id')
                name = user.get('name')
                embedding = user.get('embedding')
                
                if embedding and len(embedding) == 512:
                    self.registered_users[user_id] = {
                        'name': name,
                        'embedding': embedding
                    }
                    loaded_count += 1
                else:
                    print(f"⚠️ User {name} has invalid or missing embedding")
            
            print(f"✅ Loaded {loaded_count} users with valid embeddings")
            return True
            
        except Exception as e:
            print(f"❌ Error loading users from database: {e}")
            return False
    
    def compare_embeddings(self, embedding1, embedding2, threshold=None):
        """
        Compare two face embeddings using cosine similarity
        
        Args:
            embedding1: First face embedding (512-dimensional vector)
            embedding2: Second face embedding (512-dimensional vector) 
            threshold: Similarity threshold (uses class threshold if None)
        
        Returns:
            is_match: True if same person, False otherwise
            similarity_score: Cosine similarity score (0.0 to 1.0)
        """
        if threshold is None:
            threshold = self.recognition_threshold
            
        try:
            # Ensure embeddings are 2D arrays for cosine_similarity
            emb1 = np.array(embedding1).reshape(1, -1)
            emb2 = np.array(embedding2).reshape(1, -1)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(emb1, emb2)[0][0]
            
            # Determine if it's a match
            is_match = similarity >= threshold
            
            return is_match, similarity
            
        except Exception as e:
            print(f"❌ Error comparing embeddings: {e}")
            return False, 0.0
    
    def recognize_face(self, current_embedding):
        """
        Recognize a face from embedding using cosine similarity (1:N matching)
        
        Returns:
            matched_user_id: ID of recognized user or None
            confidence: Similarity score (0.0 to 1.0)
            all_matches: List of all potential matches
        """
        if not self.registered_users:
            print("❌ No registered users for recognition")
            return None, 0.0, []
        
        try:
            current_emb = np.array(current_embedding).reshape(1, -1)
            all_matches = []
            
            for user_id, user_data in self.registered_users.items():
                stored_emb = np.array(user_data['embedding']).reshape(1, -1)
                similarity = cosine_similarity(current_emb, stored_emb)[0][0]
                
                all_matches.append({
                    'user_id': user_id,
                    'name': user_data['name'],
                    'similarity': similarity
                })
            
            # Sort by similarity (highest first)
            all_matches.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Check if best match meets threshold
            if all_matches and all_matches[0]['similarity'] >= self.recognition_threshold:
                best_match = all_matches[0]
                return best_match['user_id'], best_match['similarity'], all_matches[:5]  # Top 5 matches
            
            # No confident match found
            if all_matches:
                print(f"⚠️ Best match below threshold: {all_matches[0]['name']} ({all_matches[0]['similarity']:.3f})")
            else:
                print("⚠️ No matches found")
                
            return None, 0.0, all_matches[:5]
            
        except Exception as e:
            print(f"❌ Error in face recognition: {e}")
            return None, 0.0, []
    
    def verify_face(self, current_embedding, claimed_user_id):
        """
        Verify if face matches a specific user using cosine similarity (1:1 matching)
        
        Returns:
            is_verified: True if verification passes
            confidence: Similarity score
        """
        if claimed_user_id not in self.registered_users:
            print(f"❌ User ID {claimed_user_id} not found in registered users")
            return False, 0.0
        
        try:
            stored_embedding = self.registered_users[claimed_user_id]['embedding']
            user_name = self.registered_users[claimed_user_id]['name']
            
            is_match, confidence = self.compare_embeddings(
                current_embedding, 
                stored_embedding, 
                threshold=self.verification_threshold
            )
            
            status = "✅ VERIFIED" if is_match else "❌ REJECTED"
            print(f"{status} {user_name} - Confidence: {confidence:.3f} (Threshold: {self.verification_threshold})")
            
            return is_match, confidence
            
        except Exception as e:
            print(f"❌ Error in face verification: {e}")
            return False, 0.0
    
    def find_similar_faces(self, current_embedding, top_k=5, min_similarity=0.5):
        """Find top K most similar faces using cosine similarity"""
        try:
            current_emb = np.array(current_embedding).reshape(1, -1)
            similarities = []
            
            for user_id, user_data in self.registered_users.items():
                stored_emb = np.array(user_data['embedding']).reshape(1, -1)
                similarity = cosine_similarity(current_emb, stored_emb)[0][0]
                
                if similarity >= min_similarity:
                    similarities.append({
                        'user_id': user_id,
                        'name': user_data['name'],
                        'similarity': similarity
                    })
            
            # Return top K matches
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            print(f"❌ Error finding similar faces: {e}")
            return []

# Utility functions for processing users
def get_signed_url(image_path, bucket_name=BUCKET_NAME):
    """Get signed URL with better error handling"""
    try:
        url_resp = supabase.storage.from_(bucket_name).create_signed_url(image_path, 60)
        
        signed_url = (
            url_resp.get("signedURL") or 
            url_resp.get("signed_url") or
            (url_resp.data.get("signedURL") if hasattr(url_resp, 'data') else None) or
            (url_resp.data.get("signed_url") if hasattr(url_resp, 'data') else None)
        )
        
        if not signed_url:
            print(f"❌ No signed URL in response: {url_resp}")
            return None
            
        return signed_url
        
    except Exception as e:
        print(f"❌ Error getting signed URL for {image_path}: {e}")
        return None

def download_and_process_image(signed_url, timeout=15):
    """Download and process image with retry logic"""
    try:
        response = requests.get(signed_url, timeout=timeout)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content)).convert("RGB")
        return img
        
    except requests.exceptions.Timeout:
        print(f"⏰ Timeout downloading image from {signed_url[:50]}...")
        return None
    except Exception as e:
        print(f"❌ Error downloading image: {e}")
        return None

def process_user_embedding(user, retry_count=2):
    """Process a single user's face embedding"""
    user_id = user.get("id")
    name = user.get("name", "Unknown")
    image_path = user.get("image_path")
    
    print(f"\n👤 Processing: {name} (ID: {user_id})")

    if not image_path:
        print(f"⚠️ Skipping {name} - no image path")
        return False

    for attempt in range(retry_count + 1):
        try:
            # Get signed URL
            signed_url = get_signed_url(image_path)
            if not signed_url:
                if attempt < retry_count:
                    print(f"🔄 Retrying signed URL... (Attempt {attempt + 1})")
                    time.sleep(1)
                    continue
                else:
                    print(f"❌ Failed to get signed URL after {retry_count + 1} attempts")
                    return False

            # Download and process image
            img = download_and_process_image(signed_url)
            if img is None:
                if attempt < retry_count:
                    print(f"🔄 Retrying download... (Attempt {attempt + 1})")
                    time.sleep(1)
                    continue
                else:
                    print(f"❌ Failed to download image after {retry_count + 1} attempts")
                    return False

            # Detect face
            face_tensor = None
            face_tensor = detect_face(img)
            
            # Fallback to multi-face detection
            if face_tensor is None:
                print("🔄 Trying multi-face detection...")
                all_faces = detect_all_faces(img, min_confidence=0.75)
                if all_faces:
                    best_face = max(all_faces, key=lambda x: x['confidence'])
                    face_tensor = best_face['face_tensor']
                    print(f"✅ Found face via multi-detection: {best_face['confidence']:.3f}")

            if face_tensor is None:
                print(f"❌ No face detected for {name}")
                return False

            # Get embedding
            face_tensor = face_tensor.to(device)
            embedding = get_face_embedding(face_tensor)
            
            if embedding is None:
                print(f"❌ Embedding generation failed for {name}")
                return False

            # Store embedding in database
            embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else embedding
            
            update_result = supabase.table("users").update({
                "embedding": embedding_list,
                "embedding_updated_at": "now()"
            }).eq("id", user_id).execute()

            if hasattr(update_result, 'error') and update_result.error:
                print(f"❌ Database update failed: {update_result.error}")
                return False

            print(f"✅ Successfully processed {name}")
            return True

        except Exception as e:
            print(f"❌ Error processing {name} (Attempt {attempt + 1}): {e}")
            if attempt < retry_count:
                print(f"🔄 Retrying...")
                time.sleep(2)
            else:
                print(f"❌ Failed after {retry_count + 1} attempts")
                return False

    return False

def main():
    """Main function to process all users"""
    print("🚀 Starting user face embedding processing...")
    print(f"📊 Device: {device}")
    print(f"🏪 Bucket: {BUCKET_NAME}")
    
    try:
        # Fetch users
        print("📥 Fetching users from database...")
        res = supabase.table("users").select("id, name, image_path, embedding").execute()
        
        if hasattr(res, 'error') and res.error:
            print(f"❌ Database query failed: {res.error}")
            return
        
        users = res.data
        print(f"📋 Found {len(users)} users to process")
        
        if not users:
            print("❌ No users found in database")
            return

        # Process each user
        successful = 0
        failed = 0
        skipped = 0
        
        for i, user in enumerate(users, 1):
            print(f"\n📊 Progress: {i}/{len(users)}")
            
            # Skip if already has embedding
            existing_embedding = user.get("embedding")
            if existing_embedding and len(existing_embedding) == 512:
                print(f"⏭️ Skipping {user.get('name')} - already has valid embedding")
                skipped += 1
                continue
            
            if process_user_embedding(user):
                successful += 1
            else:
                failed += 1
            
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        
        # Summary
        print(f"\n🎉 Processing Complete!")
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"⏭️ Skipped: {skipped}")
        print(f"📊 Total: {len(users)}")
        
    except Exception as e:
        print(f"💥 Fatal error in main: {e}")

# Example usage of the FaceRecognitionSystem
def example_usage():
    """Example of how to use the face recognition system"""
    print("\n" + "="*50)
    print("EXAMPLE USAGE")
    print("="*50)
    
    # Initialize the system
    face_system = FaceRecognitionSystem(
        recognition_threshold=0.68,
        verification_threshold=0.72
    )
    
    # Load users from database
    face_system.load_users_from_database()
    
    print(f"📊 Loaded {len(face_system.registered_users)} users")
    
    # Example: Compare two specific users (if you have their embeddings)
    if len(face_system.registered_users) >= 2:
        user_ids = list(face_system.registered_users.keys())[:2]
        user1_id, user2_id = user_ids[0], user_ids[1]
        
        user1_embedding = face_system.registered_users[user1_id]['embedding']
        user2_embedding = face_system.registered_users[user2_id]['embedding']
        
        is_match, similarity = face_system.compare_embeddings(user1_embedding, user2_embedding)
        user1_name = face_system.registered_users[user1_id]['name']
        user2_name = face_system.registered_users[user2_id]['name']
        
        print(f"🔍 Comparison: {user1_name} vs {user2_name}")
        print(f"   Similarity: {similarity:.3f}")
        print(f"   Match: {is_match}")

if __name__ == "__main__":
    main()
    example_usage()