import chromadb
from chromadb.config import Settings

# -----------------------------------------
# Persistent Local Storage
# -----------------------------------------
client = chromadb.PersistentClient(
    path="/app/chroma_data",
    settings=Settings(anonymized_telemetry=False)
)


# -----------------------------------------
# Get Collection Per Event
# -----------------------------------------
def get_collection(event_id: str):
    return client.get_or_create_collection(
        name=f"event_{event_id}",
        metadata={"hnsw:space": "cosine"}  # 🔥 FORCE COSINE
    )


# -----------------------------------------
# Add Embeddings
# -----------------------------------------
def add_embeddings(event_id: str, photo_id: str, embeddings):
    collection = get_collection(event_id)

    for i, emb in enumerate(embeddings):
        collection.add(
            ids=[f"{photo_id}_{i}"],
            embeddings=[emb],
            metadatas=[{"photoId": photo_id}]
        )


# -----------------------------------------
# Search Embeddings (Cosine)
# -----------------------------------------
def search_embeddings(event_id: str, query_embedding, threshold=0.40):
    collection = get_collection(event_id)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=50,
    )

    matches = []

    if "distances" not in results:
        return []

    # For cosine in Chroma:
    # distance = 1 - cosine_similarity
    # So lower distance = better match

    for dist, meta in zip(
        results["distances"][0],
        results["metadatas"][0]
    ):
        similarity = 1 - dist

        if similarity > threshold:
            matches.append(meta["photoId"])

    return list(set(matches))
