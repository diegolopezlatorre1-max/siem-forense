from collections import defaultdict, deque
from datetime import timedelta


def evaluar(regla, eventos):
    ventana = timedelta(seconds=regla["ventana_segundos"])
    grupos = defaultdict(list)
    for e in eventos:
        if e["event_type"] == regla["event_type"]:
            clave = e.get(regla["agrupar_por"])
            if clave:
                grupos[clave].append(e)

    alertas = []
    for clave, lista in grupos.items():
        lista.sort(key=lambda e: e["ts"])
        activos = deque()
        for e in lista:
            activos.append(e)
            while e["ts"] - activos[0]["ts"] > ventana:
                activos.popleft()
            if len(activos) >= regla["umbral"]:
                alertas.append({
                    "regla_id": regla["id"],
                    "nombre": regla["nombre"],
                    "severidad": regla["severidad"],
                    "mitre": regla["mitre"],
                    "clave": clave,
                    "cantidad": len(activos),
                    "ts": e["ts"],
                })
                activos.clear()
    return alertas