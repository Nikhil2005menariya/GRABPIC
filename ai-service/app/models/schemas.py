from pydantic import BaseModel


class ProcessPhotoRequest(BaseModel):
    photoId: str
    s3Key: str
    eventId: str
