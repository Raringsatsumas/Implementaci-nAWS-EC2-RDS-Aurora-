from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from .db import get_db

app = FastAPI(title="Chinook Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/tracks/count")
def tracks_count(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT COUNT(*) AS c FROM Track")).mappings().first()
    return {"tracks": result["c"]}
