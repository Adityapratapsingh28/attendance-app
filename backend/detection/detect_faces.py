# detect_faces.py
from facenet_pytorch import MTCNN
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
mtcnn = MTCNN(keep_all=False, post_process=True, device=device)


def detect_face(image_pil):
    """
    Accepts a PIL image, returns a cropped and aligned face tensor (3x160x160)
    or None if no face is found.
    """
    try:
        print("🎯 detect_face() called")
        print(f"📐 Input image size: {image_pil.size}")

        # Detect face - MTCNN returns different formats
        result = mtcnn(image_pil, return_prob=True)
        print(f"📦 MTCNN result type: {type(result)}")

        # Handle different return formats
        if isinstance(result, tuple):
            # Standard format: (face_tensor, probability)
            face_tensor, prob = result
            print(f"📊 Face probability: {prob}")
        else:
            # Sometimes it returns just the tensor
            face_tensor = result
            prob = None
            print("ℹ️ No probability returned")

        if face_tensor is None:
            print("❌ No face detected by MTCNN")
            return None

        print(f"📦 Face tensor shape: {face_tensor.shape}")
        print(f"📦 Face tensor type: {type(face_tensor)}")

        # Handle batch dimension - remove if present
        if len(face_tensor.shape) == 4 and face_tensor.shape[0] == 1:
            print("🔧 Removing batch dimension...")
            face_tensor = face_tensor.squeeze(0)  # Remove batch dimension
            print(f"📦 Face tensor shape after squeeze: {face_tensor.shape}")

        # Check final shape
        if face_tensor.shape != (3, 160, 160):
            print(f"❌ Invalid face tensor shape after processing: {face_tensor.shape}")
            return None

        # Check confidence if available
        if prob is not None and prob < 0.85:
            print(f"⚠️ Low confidence face detection: {prob:.2f}")
            return None

        print("✅ Face detected and processed successfully")
        return face_tensor

    except Exception as e:
        print(f"⚠️ Face detection error: {e}")
        import traceback

        print(f"🔍 Error details: {traceback.format_exc()}")
        return None
