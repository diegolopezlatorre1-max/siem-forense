from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import Sesion, Evento, Alerta
from app.detection.servicio import ejecutar_reglas

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
        id_guardado = fila.id
    alertas_nuevas = ejecutar_reglas()
    return {"guardado": True, "id": id_guardado, "alertas_nuevas": alertas_nuevas}

@app.get("/alerts")
def listar_alertas(limite: int = 50):
    with Sesion() as sesion:
        filas = sesion.scalars(
            select(Alerta).order_by(Alerta.ts.desc()).limit(limite)
        ).all()
        return [{"id": a.id, "regla_id": a.regla_id, "nombre": a.nombre,
                 "severidad": a.severidad, "mitre": a.mitre, "clave": a.clave,
                 "cantidad": a.cantidad, "ts": a.ts.isoformat()}
                for a in filas]