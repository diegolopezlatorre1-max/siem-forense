from pathlib import Path

import yaml

OBLIGATORIOS = ["id", "nombre", "event_type", "agrupar_por",
                "umbral", "ventana_segundos", "severidad", "mitre"]
CARPETA = Path(__file__).resolve().parents[2] / "rules"


def cargar_regla(ruta):
    with open(ruta, encoding="utf-8") as f:
        regla = yaml.safe_load(f)
    faltan = [c for c in OBLIGATORIOS if c not in regla]
    if faltan:
        raise ValueError(f"{Path(ruta).name}: faltan campos {faltan}")
    return regla


def cargar_reglas(carpeta=CARPETA):
    return [cargar_regla(r) for r in sorted(Path(carpeta).glob("*.yml"))]