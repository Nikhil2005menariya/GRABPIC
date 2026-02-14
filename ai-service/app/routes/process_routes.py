from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.models.schemas import ProcessPhotoRequest
from app.services.s3_service import download_image
from app.services.face_service import extract_embeddings
from app.services.chroma_service import (
    add_embeddings,
    search_embeddings,
    delete_event_embeddings
)

import os
import uuid

router = APIRouter()


# ============================================================
# PROCESS PHOTO
# ============================================================
@router.post("/process-photo")
def process_photo(data: ProcessPhotoRequest):
    temp_filename = None

    try:
        if not data.photoId or not data.s3Key or not data.eventId:
            raise HTTPException(status_code=400, detail="Invalid payload")

        temp_filename = f"/tmp/{uuid.uuid4()}.jpg"

        download_image(str(data.s3Key), temp_filename)

        embeddings = extract_embeddings(temp_filename)

        if embeddings:
            add_embeddings(
                event_id=str(data.eventId),
                photo_id=str(data.photoId),
                embeddings=embeddings
            )

        return {
            "status": "Processed",
            "faces_found": len(embeddings)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)


# ============================================================
# SEARCH FACE
# ============================================================
@router.post("/search-face")
async def search_face(
    eventId: str = Form(...),
    file: UploadFile = File(...)
):
    temp_filename = None

    try:
        if not eventId:
            raise HTTPException(status_code=400, detail="Event ID required")

        temp_filename = f"/tmp/{uuid.uuid4()}.jpg"

        contents = await file.read()

        if not contents:
            raise HTTPException(status_code=400, detail="Empty image")

        with open(temp_filename, "wb") as f:
            f.write(contents)

        embeddings = extract_embeddings(temp_filename)

        if not embeddings:
            return {
                "matches": [],
                "total_matches": 0,
                "message": "No face detected"
            }

        matches = search_embeddings(
            event_id=str(eventId),
            query_embedding=embeddings[0]
        )

        return {
            "matches": matches,
            "total_matches": len(matches)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)


# ============================================================
# DELETE EVENT EMBEDDINGS
# ============================================================
@router.delete("/delete-event/{event_id}")
def delete_event(event_id: str):
    try:
        deleted = delete_event_embeddings(event_id)

        if deleted:
            return {"message": "Embeddings deleted successfully"}

        return {"message": "No embeddings found for this event"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
