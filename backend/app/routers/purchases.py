from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from .auth import get_current_user

router = APIRouter(tags=["purchases"])


class PurchaseCreate(BaseModel):
    track_id: int = Field(..., gt=0)
    quantity: int = Field(1, ge=1, le=99)


class PurchaseItem(BaseModel):
    id: int
    purchased_at: str
    TrackId: int
    TrackName: str
    AlbumTitle: Optional[str] = None
    ArtistName: Optional[str] = None
    GenreName: Optional[str] = None
    UnitPrice: float
    Quantity: int
    LineTotal: float
    InvoiceId: Optional[int] = None


def _next_id(db: Session, table: str, col: str) -> int:
    row = db.execute(
        text(f"SELECT IFNULL(MAX({col}), 0) + 1 AS next_id FROM {table}")
    ).mappings().first()
    return int(row["next_id"])


@router.get("/purchases", response_model=Dict[str, List[PurchaseItem]])
def list_purchases(
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Muestra SOLO las compras del usuario logueado.
    Ya no depende de Invoice/CustomerId para listar.
    """
    user_id = int(user["id"])

    rows = db.execute(
        text("""
            SELECT
              p.id,
              DATE_FORMAT(p.purchased_at, '%Y-%m-%d %H:%i:%s') AS purchased_at,
              p.invoice_id AS InvoiceId,
              t.TrackId,
              t.Name AS TrackName,
              al.Title AS AlbumTitle,
              ar.Name AS ArtistName,
              g.Name AS GenreName,
              p.unit_price AS UnitPrice,
              p.quantity AS Quantity,
              p.total AS LineTotal
            FROM app_purchase p
            JOIN Track t ON t.TrackId = p.track_id
            JOIN Album al ON al.AlbumId = t.AlbumId
            JOIN Artist ar ON ar.ArtistId = al.ArtistId
            LEFT JOIN Genre g ON g.GenreId = t.GenreId
            WHERE p.user_id = :uid
            ORDER BY p.purchased_at DESC, p.id DESC
            LIMIT 300
        """),
        {"uid": user_id},
    ).mappings().all()

    items = []
    for r in rows:
        items.append({
            "id": int(r["id"]),
            "purchased_at": r["purchased_at"],
            "InvoiceId": int(r["InvoiceId"]) if r["InvoiceId"] is not None else None,
            "TrackId": int(r["TrackId"]),
            "TrackName": r["TrackName"],
            "AlbumTitle": r.get("AlbumTitle"),
            "ArtistName": r.get("ArtistName"),
            "GenreName": r.get("GenreName"),
            "UnitPrice": float(r["UnitPrice"]),
            "Quantity": int(r["Quantity"]),
            "LineTotal": float(r["LineTotal"]),
        })

    return {"items": items}


@router.post("/purchases")
def create_purchase(
    payload: PurchaseCreate,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Crea una compra SOLO para el usuario logueado.
    La validación de recompra ahora es por app_user.id, no por CustomerId compartido.
    """
    user_id = int(user["id"])
    customer_id = int(user["chinook_customer_id"])
    track_id = payload.track_id
    quantity = payload.quantity

    # 1) validar track
    track = db.execute(
        text("SELECT TrackId, UnitPrice FROM Track WHERE TrackId = :tid"),
        {"tid": track_id},
    ).mappings().first()

    if not track:
        raise HTTPException(404, "Track no existe")

    unit_price = float(track["UnitPrice"])
    line_total = float(unit_price * quantity)

    # 2) bloquear recompra SOLO para este usuario
    already = db.execute(
        text("""
            SELECT 1
            FROM app_purchase
            WHERE user_id = :uid AND track_id = :tid
            LIMIT 1
        """),
        {"uid": user_id, "tid": track_id},
    ).first()

    if already:
        raise HTTPException(
            status_code=409,
            detail="Ya compraste esta canción. No puedes comprarla otra vez.",
        )

    # 3) datos de facturación Chinook
    cust = db.execute(
        text("""
            SELECT Address, City, State, Country, PostalCode
            FROM Customer
            WHERE CustomerId = :cid
        """),
        {"cid": customer_id},
    ).mappings().first()

    if not cust:
        raise HTTPException(404, "CustomerId no existe en Chinook")

    invoice_id = _next_id(db, "Invoice", "InvoiceId")
    invoice_line_id = _next_id(db, "InvoiceLine", "InvoiceLineId")
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    try:
        # 4) insertar Invoice
        db.execute(
            text("""
                INSERT INTO Invoice
                  (InvoiceId, CustomerId, InvoiceDate, BillingAddress, BillingCity, BillingState,
                   BillingCountry, BillingPostalCode, Total)
                VALUES
                  (:iid, :cid, :dt, :addr, :city, :st, :cty, :pc, :tot)
            """),
            {
                "iid": invoice_id,
                "cid": customer_id,
                "dt": now,
                "addr": cust.get("Address"),
                "city": cust.get("City"),
                "st": cust.get("State"),
                "cty": cust.get("Country"),
                "pc": cust.get("PostalCode"),
                "tot": line_total,
            },
        )

        # 5) insertar InvoiceLine
        db.execute(
            text("""
                INSERT INTO InvoiceLine
                  (InvoiceLineId, InvoiceId, TrackId, UnitPrice, Quantity)
                VALUES
                  (:ilid, :iid, :tid, :up, :qty)
            """),
            {
                "ilid": invoice_line_id,
                "iid": invoice_id,
                "tid": track_id,
                "up": unit_price,
                "qty": quantity,
            },
        )

        # 6) registrar compra SOLO para este usuario
        db.execute(
            text("""
                INSERT INTO app_purchase
                  (user_id, invoice_id, track_id, unit_price, quantity, total)
                VALUES
                  (:uid, :iid, :tid, :up, :qty, :tot)
            """),
            {
                "uid": user_id,
                "iid": invoice_id,
                "tid": track_id,
                "up": unit_price,
                "qty": quantity,
                "tot": line_total,
            },
        )

        db.commit()

        return {
            "ok": True,
            "invoice_id": invoice_id,
            "invoice_line_id": invoice_line_id,
            "track_id": track_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "total": line_total,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Purchase failed: {str(e)}")
