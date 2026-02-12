from fastapi import APIRouter,File, UploadFile, Form
from app.models.schemas import ProcessPhotoRequest
from app.services.s3_service import download_image
from app.services.face_service import extract_embeddings
from app.services.faiss_service import add_embeddings
from app.services.faiss_service import search_embeddings

import os
import uuid

router = APIRouter()

@router.post("/process-photo")
def process_photo(data: ProcessPhotoRequest):
    try:
        temp_filename = f"temp_{uuid.uuid4()}.jpg"

        # Download image
        download_image(data.s3Key, temp_filename)

        # Extract embeddings
        embeddings = extract_embeddings(temp_filename)

        if embeddings:
            add_embeddings(data.eventId, data.photoId, embeddings)

        os.remove(temp_filename)

        return {"status": "Processed", "faces_found": len(embeddings)}

    except Exception as e:
        return {"error": str(e)}
    

@router.post("/search-face")
async def search_face(
    eventId: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        temp_filename = f"temp_{uuid.uuid4()}.jpg"

        contents = await file.read()

        with open(temp_filename, "wb") as f:
            f.write(contents)

        embeddings = extract_embeddings(temp_filename)

        os.remove(temp_filename)

        if not embeddings:
            return {"matches": [], "message": "No face detected"}

        query_embedding = embeddings[0]

        matches = search_embeddings(eventId, query_embedding)

        return {
            "matches": matches,
            "total_matches": len(matches)
        }

    except Exception as e:
        return {"error": str(e)}
