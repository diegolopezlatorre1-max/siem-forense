import hashlib
import re
from datetime import datetime

FECHA = re.compile(r"(?P<ts>\d{4}-\d{2}-\d{2}T[\d:.]+[+-]\d{2}:\d{2})\s+(?P<host>\S+)\s+sshd(?:-session)?\[\d+\]:\s+(?P<msg>.*)")
FALLIDO = re.compile(r"Failed password for (?:invalid user )?(?P<usuario>\S+) from (?P<ip>\S+) port")
ACEPTADO = re.compile(r"Accepted \S+ for (?P<usuario>\S+) from (?P<ip>\S+) port")


def parsear_linea(linea):
    linea = linea.replace("\x00", "").strip()
    encontrada = FECHA.search(linea)
    if not encontrada:
        return None

    mensaje = encontrada.group("msg")
    fallido = FALLIDO.search(mensaje)
    aceptado = ACEPTADO.search(mensaje)

    if fallido:
        tipo, severidad, datos = "login_failed", "medium", fallido
    elif aceptado:
        tipo, severidad, datos = "login_success", "low", aceptado
    else:
        return None

    try:
        ts = datetime.fromisoformat(encontrada.group("ts"))
    except ValueError:
        return None

    return {
        "event_id": hashlib.sha256(linea.encode()).hexdigest()[:32],
        "ts": ts.isoformat(),
        "host": encontrada.group("host"),
        "source": "auth.log",
        "event_type": tipo,
        "usuario": datos.group("usuario"),
        "src_ip": datos.group("ip"),
        "severity": severidad,
        "raw": linea,
    }