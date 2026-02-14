import chromadb
import os

# -----------------------------------------
# Chroma Cloud Client
# -----------------------------------------
client = chromadb.CloudClient(
    api_key=os.getenv("CHROMA_API_KEY"),
    tenant=os.getenv("CHROMA_TENANT"),
    database=os.getenv("CHROMA_DATABASE"),
)


# -----------------------------------------
# Get Collection Per Event (Cosine Space)
# -----------------------------------------
def get_collection(event_id: str):
    return client.get_or_create_collection(
        name=f"event_{event_id}",
        metadata={"hnsw:space": "cosine"}  # 🔥 Force cosine similarity
    )


# -----------------------------------------
# Add Embeddings (Multi-face Safe)
# -----------------------------------------
def add_embeddings(event_id: str, photo_id: str, embeddings):
    collection = get_collection(event_id)

    ids = []
    vectors = []
    metadatas = []

    for i, emb in enumerate(embeddings):
        ids.append(f"{photo_id}_{i}")
        vectors.append(emb)
        metadatas.append({"photoId": photo_id})

    collection.add(
        ids=ids,
        embeddings=vectors,
        metadatas=metadatas
    )


# -----------------------------------------
# Search Embeddings (Cosine Similarity)
# -----------------------------------------
def search_embeddings(event_id: str, query_embedding, threshold=0.40):
    collection = get_collection(event_id)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=50
    )

    matches = []

    if "distances" not in results or not results["distances"]:
        return []

    # For cosine in Chroma:
    # distance = 1 - cosine_similarity
    # lower distance = better match

    for dist, meta in zip(
        results["distances"][0],
        results["metadatas"][0]
    ):
        similarity = 1 - dist

        if similarity > threshold:
            matches.append(meta["photoId"])

    # Remove duplicates (multi-face safe)
    return list(set(matches))
