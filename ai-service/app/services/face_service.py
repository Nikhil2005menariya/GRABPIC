import insightface
import numpy as np
from PIL import Image
import os

# ---------------------------------------
# Load InsightFace Model (CPU Mode)
# ---------------------------------------
# buffalo_l → 512-dim embeddings
model = insightface.app.FaceAnalysis(name="buffalo_l")

# ctx_id = -1 → CPU
model.prepare(ctx_id=-1, det_size=(640, 640))


# ---------------------------------------
# Extract Face Embeddings
# Returns: List[List[float]] (normalized)
# ---------------------------------------
def extract_embeddings(image_path: str):
    if not image_path:
        raise Exception("Invalid image path")

    if not os.path.exists(image_path):
        raise Exception(f"Image does not exist: {image_path}")

    if os.path.getsize(image_path) == 0:
        raise Exception("Image file is empty")

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        raise Exception(f"Failed to load image: {str(e)}")

    img_np = np.array(img)

    try:
        faces = model.get(img_np)
    except Exception as e:
        raise Exception(f"Face detection failed: {str(e)}")

    if not faces:
        return []

    embeddings = []

    for face in faces:
        emb = face.embedding.astype("float32")

        norm = np.linalg.norm(emb)

        if norm == 0:
            continue

        # 🔥 CRITICAL: normalize for cosine similarity
        emb = emb / norm

        embeddings.append(emb.tolist())

    return embeddings
