import faiss
import numpy as np
import os
import json

INDEX_DIR = os.getenv("FAISS_INDEX_PATH", "./faiss_indexes")
os.makedirs(INDEX_DIR, exist_ok=True)


def get_index_path(event_id):
    return os.path.join(INDEX_DIR, f"{event_id}.index")


def get_metadata_path(event_id):
    return os.path.join(INDEX_DIR, f"{event_id}_meta.json")


# ----------------------------------------
# Use INNER PRODUCT (Cosine Similarity)
# ----------------------------------------
def load_or_create_index(event_id, dim=512):
    index_path = get_index_path(event_id)

    if os.path.exists(index_path):
        return faiss.read_index(index_path)

    # 🔥 Use IP instead of L2
    return faiss.IndexFlatIP(dim)


def save_index(index, event_id):
    faiss.write_index(index, get_index_path(event_id))


# ----------------------------------------
# Add Embeddings (Must Be Normalized!)
# ----------------------------------------
def add_embeddings(event_id, photo_id, embeddings):
    index = load_or_create_index(event_id)
    metadata_path = get_metadata_path(event_id)

    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    else:
        metadata = []

    for emb in embeddings:
        vector = np.array([emb]).astype("float32")

        # Ensure normalized (safety check)
        faiss.normalize_L2(vector)

        index.add(vector)
        metadata.append(photo_id)

    save_index(index, event_id)

    with open(metadata_path, "w") as f:
        json.dump(metadata, f)


# ----------------------------------------
# Search Using Cosine Similarity
# ----------------------------------------
def search_embeddings(event_id, query_embedding, threshold=0.45):
    index_path = get_index_path(event_id)
    metadata_path = get_metadata_path(event_id)

    if not os.path.exists(index_path):
        return []

    index = faiss.read_index(index_path)

    with open(metadata_path, "r") as f:
        metadata = json.load(f)

    query_vector = np.array([query_embedding]).astype("float32")

    # Normalize query
    faiss.normalize_L2(query_vector)

    scores, indices = index.search(query_vector, k=20)

    matches = []

    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue

        # 🔥 For cosine similarity, HIGHER is better
        if score > threshold:
            matches.append(metadata[idx])

    return list(set(matches))
