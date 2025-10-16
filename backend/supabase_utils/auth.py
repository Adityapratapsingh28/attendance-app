# supabase_utils/auth.py
from datetime import datetime, timedelta
import os
import random
import string
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase client setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# OTP storage (in-memory for demo, use Redis or database in production)
otp_store = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def store_otp(identifier, otp):
    """Store OTP with expiration time (10 minutes)"""
    expiry = datetime.now() + timedelta(minutes=10)
    otp_store[identifier] = {
        'otp': otp,
        'expiry': expiry
    }
    return True

def verify_otp(identifier, otp):
    """Verify OTP for the given identifier"""
    if identifier not in otp_store:
        return False
    
    stored = otp_store[identifier]
    if stored['expiry'] < datetime.now():
        # OTP expired
        del otp_store[identifier]
        return False
    
    if stored['otp'] != otp:
        return False
    
    # OTP verified, clean up
    del otp_store[identifier]
    return True

def create_user(email=None, phone=None, name=None):
    """Create a new user in the users table"""
    try:
        user_data = {}
        if email:
            user_data['email'] = email
        if phone:
            user_data['phone'] = phone
        if name:
            user_data['name'] = name
        
        # Add creation timestamp
        user_data['created_at'] = datetime.now().isoformat()
        
        # Insert into users table
        response = supabase.table("users").insert(user_data).execute()
        
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def get_user_by_email(email):
    """Get user by email"""
    try:
        response = supabase.table("users").select("*").eq("email", email).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error getting user by email: {e}")
        return None

def get_user_by_phone(phone):
    """Get user by phone"""
    try:
        response = supabase.table("users").select("*").eq("phone", phone).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error getting user by phone: {e}")
        return None

def get_user_by_id(user_id):
    """Get user by ID"""
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"❌ Error getting user by ID: {e}")
        return None

def link_user_to_face(user_id, face_id):
    """Link a user to a face record"""
    try:
        # Update the user record with the face_id
        response = supabase.table("users").update({"face_id": face_id}).eq("id", user_id).execute()
        
        if response.data:
            return True
        return False
    except Exception as e:
        print(f"❌ Error linking user to face: {e}")
        return False