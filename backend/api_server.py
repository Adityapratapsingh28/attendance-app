# api_server.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from PIL import Image
import io
import base64
import torch
import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import time
import logging
from typing import Dict, List, Optional
import queue

# Load environment variables
load_dotenv()

# Add current directory to Python path to fix import issues
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Supabase setup
SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# Import face processing modules with better error handling
def import_face_modules():
    """Import face processing modules with multiple fallback options"""
    face_modules = {}

    # Try different import strategies
    import_strategies = [
        # Strategy 1: Direct imports (files in same directory)
        lambda: (__import__("detect_faces"), __import__("embedding_module")),
        # Strategy 2: If files are in subdirectories
        lambda: (
            __import__("detection.detect_faces", fromlist=[""]),
            __import__("embedding.embedding_module", fromlist=[""]),
        ),
    ]

    for strategy in import_strategies:
        try:
            detect_mod, embed_mod = strategy()
            face_modules["detect_face"] = detect_mod.detect_face
            face_modules["get_face_embedding"] = embed_mod.get_face_embedding
            print("✅ Successfully imported face processing modules")
            return face_modules
        except ImportError as e:
            continue
        except Exception as e:
            print(f"⚠️ Import attempt failed: {e}")
            continue

    # Fallback: Create dummy functions
    print("❌ Could not import face processing modules, using fallback functions")

    def dummy_detect_face(image):
        print("⚠️ Using dummy face detection")
        # Return a dummy tensor for testing
        return torch.randn(3, 160, 160) if torch.rand() > 0.5 else None

    def dummy_get_face_embedding(face_tensor):
        print("⚠️ Using dummy embedding generation")
        if face_tensor is None:
            return None
        # Return dummy embedding
        return np.random.randn(512).astype(np.float32)

    face_modules["detect_face"] = dummy_detect_face
    face_modules["get_face_embedding"] = dummy_get_face_embedding
    return face_modules


# Import the modules
face_modules = import_face_modules()
detect_face = face_modules["detect_face"]
get_face_embedding = face_modules["get_face_embedding"]

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Recognition Attendance API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    logger.info(f"📨 {request.method} {request.url}")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"📤 Response: {response.status_code} ({process_time:.2f}s)")
    return response


# ===== UTILITY FUNCTIONS =====


def is_similar(embedding1, embedding2, threshold=0.68):
    """
    Compare two embeddings using cosine similarity
    """
    try:
        # Try to import sklearn, fallback to numpy
        try:
            from sklearn.metrics.pairwise import cosine_similarity

            emb1 = np.array(embedding1).reshape(1, -1)
            emb2 = np.array(embedding2).reshape(1, -1)
            similarity = cosine_similarity(emb1, emb2)[0][0]
        except ImportError:
            # Fallback to numpy-based cosine similarity
            emb1 = np.array(embedding1).flatten()
            emb2 = np.array(embedding2).flatten()
            similarity = np.dot(emb1, emb2) / (
                np.linalg.norm(emb1) * np.linalg.norm(emb2)
            )

        distance = 1.0 - similarity
        return similarity >= threshold, distance

    except Exception as e:
        logger.error(f"Error in similarity calculation: {e}")
        return False, 1.0


def draw_box(frame, text, box_color=(0, 255, 0), text_color=(255, 255, 255)):
    """
    Draw a bounding box with text on the frame
    """
    try:
        h, w = frame.shape[:2]
        # Simple center box
        x1, y1 = int(w * 0.25), int(h * 0.25)
        x2, y2 = int(w * 0.75), int(h * 0.75)

        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
        cv2.putText(
            frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2
        )
    except Exception as e:
        logger.error(f"Error drawing box: {e}")


# ===== SUPABASE UTILITY FUNCTIONS =====


def get_embeddings():
    """
    Get all registered embeddings from database
    """
    try:
        response = supabase.table("faces").select("id, name, embedding").execute()
        if hasattr(response, "data"):
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error getting embeddings: {e}")
        return []


def store_embedding(name, embedding, image_path=None):
    """
    Store face embedding in database
    """
    try:
        # Check if user already exists
        existing = supabase.table("faces").select("id").eq("name", name).execute()

        embedding_list = (
            embedding.tolist() if hasattr(embedding, "tolist") else embedding
        )

        if existing.data and len(existing.data) > 0:
            # Update existing user
            user_id = existing.data[0]["id"]
            result = (
                supabase.table("faces")
                .update({"embedding": embedding_list, "embedding_updated_at": "now()"})
                .eq("id", user_id)
                .execute()
            )
        else:
            # Create new user
            result = (
                supabase.table("faces")
                .insert(
                    {
                        "name": name,
                        "embedding": embedding_list,
                        "image_path": image_path,
                    }
                )
                .execute()
            )

        return True
    except Exception as e:
        logger.error(f"Error storing embedding: {e}")
        return False


def mark_attendance(name, camera_id, confidence=1.0):
    """
    Mark attendance for a user
    """
    try:
        # Check if already marked today
        today = time.strftime("%Y-%m-%d")
        existing = (
            supabase.table("attendance")
            .select("id")
            .eq("name", name)
            .eq("date", today)
            .execute()
        )

        if existing.data and len(existing.data) > 0:
            return False  # Already marked

        # Mark attendance
        result = (
            supabase.table("attendance")
            .insert(
                {
                    "name": name,
                    "date": today,
                    "time": time.strftime("%H:%M:%S"),
                    "camera_id": camera_id,
                    "confidence": confidence,
                }
            )
            .execute()
        )

        return True
    except Exception as e:
        logger.error(f"Error marking attendance: {e}")
        return False


def get_attendance_summary():
    """
    Get today's attendance summary
    """
    try:
        today = time.strftime("%Y-%m-%d")
        print(f"📅 Getting attendance for: {today}")

        # Try different table/column combinations
        attempts = [
            ("attendance", "name", "time"),
            ("attendance", "full_name", "timestamp"),
            (
                "leaves",
                "name",
                "created_at",
            ),  # Try leaves table if that's what you have
        ]

        for table, name_col, time_col in attempts:
            try:
                print(f"🔍 Trying table: {table}, columns: {name_col}, {time_col}")
                response = (
                    supabase.table(table)
                    .select(f"{name_col}, {time_col}")
                    .eq("date", today)
                    .execute()
                )

                if response.data:
                    print(f"✅ Found data in {table} table")
                    attendance_list = []
                    for record in response.data:
                        attendance_list.append(
                            {"name": record.get(name_col), "time": record.get(time_col)}
                        )

                    return {
                        "date": today,
                        "total_present": len(attendance_list),
                        "attendance_list": attendance_list,
                    }
            except Exception as table_error:
                print(f"❌ Failed with {table}: {table_error}")
                continue

        print("❌ No attendance data found in any table")
        return {"date": today, "total_present": 0, "attendance_list": []}

    except Exception as e:
        print(f"❌ Error getting attendance summary: {e}")
        return {
            "date": time.strftime("%Y-%m-%d"),
            "total_present": 0,
            "attendance_list": [],
        }


def get_all_registered_faces():
    """
    Get all registered faces
    """
    try:
        response = (
            supabase.table("faces").select("id, name, embedding_updated_at").execute()
        )
        if hasattr(response, "data"):
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error getting registered faces: {e}")
        return []


# ===== CAMERA MANAGER =====

# Global variables for camera streaming
camera_active = False
latest_detection = {"name": None, "timestamp": None, "status": "waiting"}


class CameraManager:
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.known_embeddings = []

    def load_embeddings(self):
        """Load known embeddings from faces table"""
        try:
            print("🔄 CameraManager.load_embeddings() called")
            self.known_embeddings = get_embeddings()
            print(f"📦 Raw embeddings from get_embeddings(): {self.known_embeddings}")
            print(f"📊 Number of embeddings: {len(self.known_embeddings)}")

            # Check if embeddings are valid
            valid_embeddings = 0
            for i, item in enumerate(self.known_embeddings):
                has_embedding = item.get("embedding") is not None
                embedding_length = (
                    len(item.get("embedding", [])) if item.get("embedding") else 0
                )
                print(
                    f"   👤 {i}: {item.get('name', 'Unknown')} - Has embedding: {has_embedding} - Length: {embedding_length}"
                )
                if has_embedding and embedding_length > 0:
                    valid_embeddings += 1

            print(f"✅ Valid embeddings with data: {valid_embeddings}")
            logger.info(f"Loaded {valid_embeddings} valid embeddings")
            return True

        except Exception as e:
            print(f"❌ Error loading embeddings: {e}")
            logger.error(f"Error loading embeddings: {e}")
            return False

    def start_camera(self):
        """Start camera capture"""
        print("📷 Starting camera...")

        if self.cap is not None:
            self.cap.release()
            print("🔄 Released previous camera instance")

        # Try different camera indices
        for camera_index in [0, 1, 2]:
            print(f"🔍 Trying camera index: {camera_index}")
            self.cap = cv2.VideoCapture(camera_index)
            if self.cap.isOpened():
                print(f"✅ Camera {camera_index} opened successfully")

                # Get camera properties
                width = self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                height = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                fps = self.cap.get(cv2.CAP_PROP_FPS)
                print(f"📐 Camera properties: {width}x{height} at {fps} FPS")
                break
        else:
            error_msg = "❌ Could not open any camera"
            print(error_msg)
            raise Exception(error_msg)

        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)

        # Verify settings
        actual_width = self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_height = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        actual_fps = self.cap.get(cv2.CAP_PROP_FPS)
        print(
            f"⚙️ Camera settings applied: {actual_width}x{actual_height} at {actual_fps} FPS"
        )

        self.is_running = True
        print("🎯 Camera started successfully")
        return True

    def process_frame(self):
        """Process a single frame for face recognition"""
        global latest_detection

        print("🎬 process_frame() called")

        if not self.cap or not self.cap.isOpened():
            print("❌ Camera not available or not opened")
            return None

        print("📸 Reading frame from camera...")
        ret, frame = self.cap.read()
        if not ret or frame is None:
            print("❌ Failed to read frame from camera")
            return None

        print(f"✅ Frame captured - Shape: {frame.shape}, Type: {frame.dtype}")

        try:
            # Convert to PIL Image
            print("🔄 Converting BGR to RGB and creating PIL Image...")
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(rgb_frame)
            print(f"📐 PIL Image created - Size: {img_pil.size}, Mode: {img_pil.mode}")

            # Detect face
            print("🔍 Detecting face...")
            face_tensor = detect_face(img_pil)
            print(f"✅ Face detection completed - Result: {face_tensor is not None}")

            if face_tensor is not None:
                print(
                    f"📦 Face tensor details - Type: {type(face_tensor)}, Shape: {face_tensor.shape}"
                )

                # Generate embedding
                print("🧠 Generating face embedding...")
                embedding = get_face_embedding(face_tensor)
                print(
                    f"✅ Embedding generation completed - Result: {embedding is not None}"
                )

                if embedding is not None:
                    # Convert to numpy if tensor
                    if isinstance(embedding, torch.Tensor):
                        print("🔧 Converting tensor to numpy...")
                        embedding = embedding.detach().cpu().numpy()
                        print("✅ Tensor converted to numpy")

                    print(f"📊 Original embedding shape: {embedding.shape}")
                    embedding = embedding.flatten()
                    print(f"📊 Flattened embedding shape: {embedding.shape}")

                    # Check against known embeddings
                    print(
                        f"🔎 Checking against {len(self.known_embeddings)} known embeddings..."
                    )
                    recognized = False

                    if len(self.known_embeddings) == 0:
                        print("⚠️ No known embeddings available for comparison")
                    else:
                        for i, item in enumerate(self.known_embeddings):
                            item_embedding = item.get("embedding")
                            if item_embedding is None:
                                print(
                                    f"   ⚠️ Item {i} ({item.get('name', 'Unknown')}) has no embedding"
                                )
                                continue

                            print(
                                f"   👤 Comparing with: {item.get('name', 'Unknown')}"
                            )

                            try:
                                item_embedding = np.array(
                                    item_embedding, dtype=np.float32
                                ).flatten()
                                print(
                                    f"   📐 Item embedding shape: {item_embedding.shape}"
                                )

                                similar, dist = is_similar(embedding, item_embedding)
                                print(
                                    f"   📊 Similarity result: {similar}, Distance: {dist:.3f}"
                                )

                                if similar:
                                    name = item.get("name", "Unknown")
                                    confidence = 1.0 - dist

                                    print(
                                        f"   ✅ MATCH FOUND: {name} (confidence: {confidence:.3f})"
                                    )

                                    # Mark attendance
                                    print(f"   📝 Marking attendance for {name}...")
                                    attendance_marked = mark_attendance(
                                        name=name,
                                        camera_id="camera_0",
                                        confidence=confidence,
                                    )
                                    print(
                                        f"   ✅ Attendance marked: {attendance_marked}"
                                    )

                                    latest_detection = {
                                        "name": name,
                                        "timestamp": time.time(),
                                        "status": (
                                            "marked"
                                            if attendance_marked
                                            else "already_present"
                                        ),
                                        "confidence": confidence,
                                        "distance": dist,
                                    }

                                    # Draw box on frame
                                    if attendance_marked:
                                        draw_box(
                                            frame, f"✅ {name} - Attendance Marked!"
                                        )
                                        print(
                                            f"   🟢 Drew green box for new attendance"
                                        )
                                    else:
                                        draw_box(frame, f"Present: {name}")
                                        print(
                                            f"   🟡 Drew yellow box for existing attendance"
                                        )

                                    recognized = True
                                    break

                            except Exception as compare_error:
                                print(
                                    f"   ❌ Error comparing embeddings: {compare_error}"
                                )
                                import traceback

                                print(
                                    f"   🔍 Comparison error details: {traceback.format_exc()}"
                                )
                                continue

                    if not recognized:
                        print("❌ No match found - unknown face")
                        latest_detection = {
                            "name": "Unknown",
                            "timestamp": time.time(),
                            "status": "unknown",
                            "confidence": 0.0,
                            "distance": 1.0,
                        }
                        draw_box(frame, "Unknown Face")
                        print("   🔴 Drew red box for unknown face")

            else:
                print("❌ No face detected in frame")
                latest_detection = {
                    "name": None,
                    "timestamp": time.time(),
                    "status": "waiting",
                    "confidence": 0.0,
                    "distance": 1.0,
                }
                print("   ⏳ Set status to 'waiting'")

            # Convert frame to base64 for streaming
            print("🖼️ Converting frame to JPEG and base64...")
            success, buffer = cv2.imencode(".jpg", frame)
            if not success:
                print("❌ Failed to encode frame as JPEG")
                return None

            print(f"✅ Frame encoded as JPEG - Buffer size: {len(buffer)} bytes")
            frame_b64 = base64.b64encode(buffer).decode("utf-8")
            print(f"✅ Frame converted to base64 - Length: {len(frame_b64)} characters")

            result = {"frame": frame_b64, "detection": latest_detection}

            print("🎉 Frame processing completed successfully")
            return result

        except Exception as e:
            print(f"💥 ERROR in process_frame: {e}")
            import traceback

            print(f"🔍 Stack trace: {traceback.format_exc()}")
            return None

    def stop_camera(self):
        """Stop camera capture"""
        print("🛑 Stopping camera...")
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
            print("✅ Camera released successfully")
        else:
            print("ℹ️ Camera was already stopped")
        logger.info("📷 Camera stopped")


# Global camera manager
camera_manager = CameraManager()

# ===== API ENDPOINTS =====


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Face Recognition Attendance API",
        "status": "running",
        "endpoints": {
            "register_face": "POST /api/register-face",
            "start_scanner": "POST /api/start-scanner",
            "stop_scanner": "POST /api/stop-scanner",
            "scanner_frame": "GET /api/scanner-frame",
            "scanner_status": "GET /api/scanner-status",
            "attendance_summary": "GET /api/attendance-summary",
            "registered_faces": "GET /api/registered-faces",
            "health": "GET /api/health",
        },
    }


@app.post("/api/register-face")
async def register_face(name: str = Form(...), file: UploadFile = File(...)):
    """Register a new face"""
    try:
        logger.info(f"Attempting to register face for: {name}")

        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Name is required")

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read image
        image_data = await file.read()
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Image file is empty")

        # Convert to PIL Image
        img_pil = Image.open(io.BytesIO(image_data))
        if img_pil.mode != "RGB":
            img_pil = img_pil.convert("RGB")

        # Detect face
        face_tensor = detect_face(img_pil)
        if face_tensor is None:
            raise HTTPException(status_code=400, detail="No face detected in image")

        # Generate embedding
        embedding = get_face_embedding(face_tensor)
        if embedding is None:
            raise HTTPException(
                status_code=400, detail="Could not generate face embedding"
            )

        # Convert to numpy if tensor
        if isinstance(embedding, torch.Tensor):
            embedding = embedding.detach().cpu().numpy()

        # Store in database
        success = store_embedding(name.strip(), embedding, None)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store face data")

        return {
            "success": True,
            "message": f"Face registered successfully for {name.strip()}",
            "name": name.strip(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error registering face: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/start-scanner")
async def start_scanner():
    """Start the attendance scanner"""
    global camera_active

    try:
        print("🚀 /api/start-scanner called")

        if camera_active:
            print("⚠️ Scanner already active")
            return {"success": False, "message": "Scanner is already running"}

        # Load embeddings with detailed logging
        print("📥 Loading embeddings...")
        embeddings_loaded = camera_manager.load_embeddings()
        print(f"📊 Embeddings loaded: {embeddings_loaded}")
        print(f"📋 Known embeddings count: {len(camera_manager.known_embeddings)}")

        if not embeddings_loaded:
            print("❌ Failed to load embeddings")
            raise HTTPException(
                status_code=500, detail="Failed to load known faces from database"
            )

        if len(camera_manager.known_embeddings) == 0:
            print("❌ No embeddings found in database")
            # Let's check what's actually in the database
            try:
                raw_embeddings = get_embeddings()
                print(f"🔍 Raw embeddings from DB: {raw_embeddings}")
                print(f"🔍 Raw embeddings type: {type(raw_embeddings)}")
                if raw_embeddings:
                    print(
                        f"🔍 First embedding structure: {raw_embeddings[0] if raw_embeddings else 'None'}"
                    )
            except Exception as db_error:
                print(f"💥 Error checking raw embeddings: {db_error}")

            raise HTTPException(
                status_code=400,
                detail="No registered faces found. Register faces first.",
            )

        # Start camera
        print("📷 Starting camera...")
        camera_manager.start_camera()
        camera_active = True
        print("✅ Scanner started successfully")

        return {
            "success": True,
            "message": "Scanner started successfully",
            "registered_faces": len(camera_manager.known_embeddings),
        }

    except Exception as e:
        print(f"💥 Error in start_scanner: {e}")
        logger.error(f"Error starting scanner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stop-scanner")
async def stop_scanner():
    """Stop the attendance scanner"""
    global camera_active

    try:
        if not camera_active:
            return {"success": False, "message": "Scanner is not running"}

        camera_manager.stop_camera()
        camera_active = False

        return {"success": True, "message": "Scanner stopped successfully"}

    except Exception as e:
        logger.error(f"Error stopping scanner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/debug-embeddings")
async def debug_embeddings():
    """Debug endpoint to check embeddings directly"""
    try:
        embeddings = get_embeddings()
        return {"success": True, "count": len(embeddings), "embeddings": embeddings}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/scanner-frame")
async def get_scanner_frame():
    """Get current frame from scanner"""
    try:
        print("=" * 50)
        print("📡 /api/scanner-frame endpoint called")

        if not camera_active:
            print("❌ Scanner not active")
            raise HTTPException(status_code=400, detail="Scanner is not running")

        print("🎬 Processing frame through CameraManager...")
        frame_data = camera_manager.process_frame()

        if frame_data is None:
            print("❌ Frame processing returned None")
            raise HTTPException(
                status_code=500, detail="Failed to capture or process frame"
            )

        print("✅ Frame processed successfully")
        print(
            f"📊 Response data - Frame length: {len(frame_data.get('frame', ''))}, Detection: {frame_data.get('detection', {})}"
        )
        print("=" * 50)
        return frame_data

    except Exception as e:
        print(f"💥 ERROR in /api/scanner-frame: {e}")
        import traceback

        print(f"🔍 Stack trace: {traceback.format_exc()}")
        print("=" * 50)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-camera")
async def test_camera():
    """Test if camera is working"""
    try:
        print("🧪 Testing camera...")

        if not camera_manager.cap or not camera_manager.cap.isOpened():
            print("❌ Camera not initialized")
            return {"success": False, "error": "Camera not initialized"}

        print("📸 Attempting to capture frame...")
        ret, frame = camera_manager.cap.read()

        if ret:
            print(f"✅ Frame captured successfully - Shape: {frame.shape}")
            return {
                "success": True,
                "frame_captured": True,
                "frame_shape": frame.shape,
                "frame_type": str(frame.dtype),
            }
        else:
            print("❌ Failed to capture frame")
            return {"success": False, "error": "Failed to capture frame"}

    except Exception as e:
        print(f"💥 Camera test failed: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/test-face-detection")
async def test_face_detection():
    """Test face detection with a sample image"""
    try:
        print("🧪 Testing face detection system...")

        # Create a simple test image
        print("🎨 Creating test image...")
        test_image = Image.new("RGB", (640, 480), color="black")
        print(f"📐 Test image created - Size: {test_image.size}")

        print("🔍 Testing face detection...")
        face_tensor = detect_face(test_image)
        print(f"✅ Face detection completed - Face detected: {face_tensor is not None}")

        if face_tensor is not None:
            print(
                f"📦 Face tensor - Type: {type(face_tensor)}, Shape: {face_tensor.shape}"
            )

            print("🧠 Testing embedding generation...")
            embedding = get_face_embedding(face_tensor)
            print(
                f"✅ Embedding generation completed - Embedding generated: {embedding is not None}"
            )

            if embedding is not None:
                if isinstance(embedding, torch.Tensor):
                    embedding = embedding.detach().cpu().numpy()
                print(f"📊 Embedding shape: {embedding.shape}")

        return {
            "success": True,
            "face_detected": face_tensor is not None,
            "embedding_generated": (
                embedding is not None if face_tensor is not None else False
            ),
        }

    except Exception as e:
        print(f"💥 Face detection test failed: {e}")
        import traceback

        print(f"🔍 Test error details: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


@app.get("/api/camera-status")
async def get_camera_status():
    """Get detailed camera status"""
    try:
        status = {
            "camera_active": camera_active,
            "camera_initialized": camera_manager.cap is not None,
            "camera_opened": (
                camera_manager.cap.isOpened() if camera_manager.cap else False
            ),
            "camera_running": camera_manager.is_running,
            "known_embeddings_count": len(camera_manager.known_embeddings),
            "latest_detection": latest_detection,
        }

        if camera_manager.cap and camera_manager.cap.isOpened():
            status.update(
                {
                    "frame_width": camera_manager.cap.get(cv2.CAP_PROP_FRAME_WIDTH),
                    "frame_height": camera_manager.cap.get(cv2.CAP_PROP_FRAME_HEIGHT),
                    "fps": camera_manager.cap.get(cv2.CAP_PROP_FPS),
                }
            )

        return status

    except Exception as e:
        return {"error": str(e), "camera_active": camera_active}


@app.get("/api/scanner-status")
async def get_scanner_status():
    """Get scanner status and latest detection"""
    return {
        "active": camera_active,
        "latest_detection": latest_detection,
        "registered_faces": (
            len(camera_manager.known_embeddings)
            if camera_manager.known_embeddings
            else 0
        ),
    }


@app.get("/api/attendance-summary")
async def get_attendance_summary_api():
    """Get today's attendance summary"""
    try:
        summary = get_attendance_summary()
        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Error getting attendance summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/registered-faces")
async def get_registered_faces_api():
    """Get all registered faces"""
    try:
        faces = get_all_registered_faces()
        return {"success": True, "faces": faces}
    except Exception as e:
        logger.error(f"Error getting registered faces: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "scanner_active": camera_active,
        "timestamp": time.time(),
    }


@app.post("/api/test-upload")
async def test_upload(file: UploadFile = File(...)):
    """Test file upload endpoint"""
    try:
        data = await file.read()
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(data),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Test upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting Face Recognition Attendance API Server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔧 Make sure you have the following files in the same directory:")
    print("   - detect_faces.py")
    print("   - embedding_module.py")
    print()

    # Remove reload=True to fix the warning
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
