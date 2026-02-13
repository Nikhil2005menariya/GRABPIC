from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.models.schemas import ProcessPhotoRequest
from app.services.s3_service import download_image
from app.services.face_service import extract_embeddings
from app.services.faiss_service import add_embeddings, search_embeddings

import os
import uuid

router = APIRouter()


# ---------------------------------------
# PROCESS PHOTO (Worker → AI)
# ---------------------------------------
@router.post("/process-photo")
def process_photo(data: ProcessPhotoRequest):
    try:
        # 🔥 Validate input explicitly
        if not data.s3Key or not data.eventId or not data.photoId:
            raise HTTPException(status_code=400, detail="Invalid payload")

        temp_filename = f"/tmp/{uuid.uuid4()}.jpg"

        # Download from S3
        download_image(str(data.s3Key), temp_filename)

        # Extract embeddings
        embeddings = extract_embeddings(temp_filename)

        # Add to FAISS
        if embeddings:
            add_embeddings(
                str(data.eventId),
                str(data.photoId),
                embeddings
            )

        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        return {
            "status": "Processed",
            "faces_found": len(embeddings)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------
# SEARCH FACE (Frontend → AI)
# ---------------------------------------
@router.post("/search-face")
async def search_face(
    eventId: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        temp_filename = f"/tmp/{uuid.uuid4()}.jpg"

        contents = await file.read()

        with open(temp_filename, "wb") as f:
            f.write(contents)

        embeddings = extract_embeddings(temp_filename)

        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        if not embeddings:
            return {
                "matches": [],
                "total_matches": 0,
                "message": "No face detected"
            }

        query_embedding = embeddings[0]

        matches = search_embeddings(str(eventId), query_embedding)

        return {
            "matches": matches,
            "total_matches": len(matches)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
