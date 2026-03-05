from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db import get_db

router = APIRouter(tags=["albums"])

@router.get("/albums")
def list_albums(
    artist_id: int = Query(..., gt=0),
    query: str = Query(""),
    db: Session = Depends(get_db),
):
    q = f"%{query}%"
    rows = db.execute(
        text("""
            SELECT AlbumId, Title, ArtistId
            FROM Album
            WHERE ArtistId = :aid AND Title LIKE :q
            ORDER BY Title
            LIMIT 300
        """),
        {"aid": artist_id, "q": q},
    ).mappings().all()

    return {"items": rows}
