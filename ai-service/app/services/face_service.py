import insightface
import numpy as np
from PIL import Image
import os

# ---------------------------------------
# Load InsightFace Model (CPU mode)
# ---------------------------------------
model = insightface.app.FaceAnalysis(name="buffalo_l")
model.prepare(ctx_id=-1)  # CPU


# ---------------------------------------
# Extract Face Embeddings (Robust + Safe)
# ---------------------------------------
def extract_embeddings(image_path: str):
    if not image_path:
        raise Exception("Invalid image path")

    if not os.path.exists(image_path):
        raise Exception(f"Image file does not exist: {image_path}")

    if os.path.getsize(image_path) == 0:
        raise Exception("Downloaded image is empty")

    try:
        img = Image.open(image_path)
        img = img.convert("RGB")
    except Exception as e:
        raise Exception(f"Failed to load image: {str(e)}")

    img_np = np.array(img)

    faces = model.get(img_np)

    embeddings = []

    for face in faces:
        emb = face.embedding.astype("float32")

        norm = np.linalg.norm(emb)

        if norm == 0:
            continue

        emb = emb / norm  # Normalize
        embeddings.append(emb.tolist())

    return embeddings
