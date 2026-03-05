from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db import get_db

router = APIRouter(tags=["stats"])

@router.get("/stats/artists")
def artists_stats(query: str = Query(""), db: Session = Depends(get_db)):
    q = f"%{query}%"
    rows = db.execute(
        text("""
            SELECT
              ar.ArtistId,
              ar.Name AS ArtistName,
              (SELECT COUNT(*) FROM Album al WHERE al.ArtistId = ar.ArtistId) AS AlbumCount,
              (SELECT COUNT(*) FROM Track t
                 JOIN Album al2 ON al2.AlbumId = t.AlbumId
               WHERE al2.ArtistId = ar.ArtistId) AS TrackCount
            FROM Artist ar
            WHERE ar.Name LIKE :q
            ORDER BY ar.Name
            LIMIT 300
        """),
        {"q": q},
    ).mappings().all()
    return {"items": rows}


@router.get("/stats/genres")
def genres_stats(query: str = Query(""), db: Session = Depends(get_db)):
    q = f"%{query}%"
    rows = db.execute(
        text("""
            SELECT
              g.GenreId,
              g.Name AS GenreName,
              (SELECT COUNT(*) FROM Track t WHERE t.GenreId = g.GenreId) AS TrackCount
            FROM Genre g
            WHERE g.Name LIKE :q
            ORDER BY g.Name
            LIMIT 300
        """),
        {"q": q},
    ).mappings().all()
    return {"items": rows}
