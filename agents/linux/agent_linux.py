import os
import time

import requests

from auth_linux import parsear_linea

ARCHIVO = "/var/log/auth.log"
API = os.environ.get("SIEM_API", "http://localhost:3000/api/v1/ingest")
LLAVE = os.environ.get("SIEM_AGENT_KEY", "")


def seguir(archivo):
    with open(archivo, "rb") as f:
        f.seek(0, 2)
        while True:
            linea = f.readline()
            if not linea:
                time.sleep(0.5)
                continue
            yield linea.decode("utf-8", errors="replace")


def enviar(evento):
    try:
        r = requests.post(API, json=evento, headers={"X-Agent-Key": LLAVE}, timeout=5)
        print(r.status_code, evento["event_type"], evento["usuario"], evento["src_ip"])
    except requests.RequestException as e:
        print("No se pudo enviar:", e)


if __name__ == "__main__":
    if not LLAVE:
        raise SystemExit("Falta la variable SIEM_AGENT_KEY")
    print("Agente siguiendo", ARCHIVO, "->", API)
    for linea in seguir(ARCHIVO):
        evento = parsear_linea(linea)
        if evento:
            enviar(evento)
