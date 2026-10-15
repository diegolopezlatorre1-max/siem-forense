from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db import Sesion, Evento, Alerta
from app.detection.motor import evaluar
from app.detection.reglas import cargar_reglas


def ejecutar_reglas():
    nuevas = 0
    with Sesion() as sesion:
        for regla in cargar_reglas():
            ventana = timedelta(seconds=regla["ventana_segundos"])
            desde = datetime.now(timezone.utc) - ventana * 10
            filas = sesion.scalars(
                select(Evento).where(Evento.ts >= desde,
                                     Evento.event_type == regla["event_type"])
            ).all()
            eventos = [{"event_type": f.event_type, "src_ip": f.src_ip,
                        "usuario": f.usuario, "host": f.host, "ts": f.ts}
                       for f in filas]
            for alerta in evaluar(regla, eventos):
                repetida = sesion.scalar(
                    select(Alerta.id).where(
                        Alerta.regla_id == alerta["regla_id"],
                        Alerta.clave == alerta["clave"],
                        Alerta.ts >= alerta["ts"] - ventana))
                if repetida:
                    continue
                sesion.add(Alerta(**alerta))
                sesion.flush()
                nuevas += 1
        sesion.commit()
    return nuevas