@router.post("")
def create_track(
    payload: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    try:
        name = (payload.get("name") or "").strip()
        raw_unit_price = payload.get("unit_price")
        raw_genre_id = payload.get("genre_id")
        raw_media_type_id = payload.get("media_type_id")
        composer = payload.get("composer")
        milliseconds = int(payload.get("milliseconds") or 1)
        bytes_value = payload.get("bytes")

        album_id = payload.get("album_id")
        album_mode = payload.get("album_mode") or payload.get("album_source")
        artist_id = payload.get("artist_id")
        new_album_title = (
            payload.get("new_album_title")
            or payload.get("album_title")
            or payload.get("new_album_name")
            or ""
        ).strip()

        if not name:
            raise HTTPException(status_code=400, detail="Nombre requerido")

        if raw_unit_price is None or str(raw_unit_price).strip() == "":
            raise HTTPException(status_code=400, detail="Precio requerido")

        try:
            unit_price = float(raw_unit_price)
        except Exception:
            raise HTTPException(status_code=400, detail="Precio inválido")

        if unit_price < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo")

        # Si no viene album_id, crear álbum nuevo cuando corresponda
        if not album_id:
            if album_mode == "new" or new_album_title:
                if not artist_id:
                    raise HTTPException(status_code=400, detail="Artista requerido para crear álbum")
                if not new_album_title:
                    raise HTTPException(status_code=400, detail="Título de álbum requerido")

                next_album_row = db.execute(
                    text("SELECT COALESCE(MAX(AlbumId), 0) + 1 AS next_id FROM Album")
                ).mappings().first()
                next_album_id = int(next_album_row["next_id"])

                db.execute(
                    text("""
                        INSERT INTO Album (AlbumId, Title, ArtistId)
                        VALUES (:album_id, :title, :artist_id)
                    """),
                    {
                        "album_id": next_album_id,
                        "title": new_album_title,
                        "artist_id": int(artist_id),
                    },
                )
                album_id = next_album_id
            else:
                raise HTTPException(status_code=400, detail="Álbum requerido")

        # Validar que el álbum exista
        album_exists = db.execute(
            text("SELECT AlbumId FROM Album WHERE AlbumId = :album_id"),
            {"album_id": int(album_id)},
        ).mappings().first()
        if not album_exists:
            raise HTTPException(status_code=400, detail="Álbum inválido")

        # Resolver MediaTypeId válido
        if raw_media_type_id not in (None, "", 0, "0"):
            media_type_id = int(raw_media_type_id)
            media_exists = db.execute(
                text("SELECT MediaTypeId FROM MediaType WHERE MediaTypeId = :media_type_id"),
                {"media_type_id": media_type_id},
            ).mappings().first()
            if not media_exists:
                raise HTTPException(status_code=400, detail="MediaType inválido")
        else:
            media_row = db.execute(
                text("SELECT MediaTypeId FROM MediaType ORDER BY MediaTypeId LIMIT 1")
            ).mappings().first()
            if not media_row:
                raise HTTPException(status_code=400, detail="No hay MediaType disponible")
            media_type_id = int(media_row["MediaTypeId"])

        # Resolver GenreId válido o null
        genre_id = None
        if raw_genre_id not in (None, "", 0, "0"):
            genre_id = int(raw_genre_id)
            genre_exists = db.execute(
                text("SELECT GenreId FROM Genre WHERE GenreId = :genre_id"),
                {"genre_id": genre_id},
            ).mappings().first()
            if not genre_exists:
                raise HTTPException(status_code=400, detail="Género inválido")

        next_track_row = db.execute(
            text("SELECT COALESCE(MAX(TrackId), 0) + 1 AS next_id FROM Track")
        ).mappings().first()
        next_track_id = int(next_track_row["next_id"])

        db.execute(
            text("""
                INSERT INTO Track
                    (TrackId, Name, AlbumId, MediaTypeId, GenreId, Composer, Milliseconds, Bytes, UnitPrice)
                VALUES
                    (:track_id, :name, :album_id, :media_type_id, :genre_id, :composer, :milliseconds, :bytes_value, :unit_price)
            """),
            {
                "track_id": next_track_id,
                "name": name,
                "album_id": int(album_id),
                "media_type_id": media_type_id,
                "genre_id": genre_id,
                "composer": composer,
                "milliseconds": milliseconds,
                "bytes_value": int(bytes_value) if bytes_value not in (None, "", 0, "0") else None,
                "unit_price": unit_price,
            },
        )

        db.commit()
        return {"ok": True, "track_id": next_track_id, "album_id": int(album_id)}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando track: {str(e)}")
