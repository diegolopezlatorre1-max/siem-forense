from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

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
        sesion.commit()
        return {"guardado": True, "id": fila.id}
