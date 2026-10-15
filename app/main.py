from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from app.db import Sesion, Evento

app = FastAPI(title="SIEM Forense")


class EventoEntrada(BaseModel):
    event_id: str
    ts: datetime
    host: str
    source: str
    event_type: str
    usuario: Optional[str] = None
    src_ip: Optional[str] = None
    severity: str = "low"
    raw: str


@app.get("/health")
def health():
    return {"estado": "ok"}


@app.post("/ingest")
def ingest(evento: EventoEntrada):
    with Sesion() as sesion:
        fila = Evento(**evento.model_dump())
        sesion.add(fila)
        try:
            sesion.commit()
        except IntegrityError:
            sesion.rollback()
            raise HTTPException(status_code=409, detail="Evento ya recibido (event_id repetido)")
        return {"guardado": True, "id": fila.id}