import insightface
import numpy as np
from PIL import Image

model = insightface.app.FaceAnalysis(name="buffalo_l")
model.prepare(ctx_id=-1)


def extract_embeddings(image_path):
    img = Image.open(image_path).convert("RGB")
    img_np = np.array(img)

    faces = model.get(img_np)

    embeddings = []

    for face in faces:
        embeddings.append(face.embedding)

    return embeddings
