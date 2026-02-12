from fastapi import FastAPI
from app.routes.process_routes import router as process_router

app = FastAPI(title="GRABPIC AI Service")

app.include_router(process_router)

@app.get("/")
def health():
    return {"status": "AI Service Running"}
