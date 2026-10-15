import os
import time

import requests

from app.parsers.auth_linux import parsear_linea

ARCHIVO = "/var/log/auth.log"
API = os.environ.get("SIEM_API", "http://localhost:8000/ingest")


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
        r = requests.post(API, json=evento, timeout=5)
        print(r.status_code, evento["event_type"], evento["usuario"], evento["src_ip"])
    except requests.RequestException as e:
        print("No se pudo enviar:", e)


if __name__ == "__main__":
    print("Agente siguiendo", ARCHIVO)
    for linea in seguir(ARCHIVO):
        evento = parsear_linea(linea)
        if evento:
            enviar(evento)