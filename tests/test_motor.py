from datetime import datetime, timedelta

from app.detection.motor import evaluar

REGLA = {
    "id": "LINUX-001",
    "nombre": "Fuerza bruta SSH",
    "event_type": "login_failed",
    "agrupar_por": "src_ip",
    "umbral": 5,
    "ventana_segundos": 60,
    "severidad": "high",
    "mitre": "T1110",
}
INICIO = datetime(2026, 10, 14, 12, 0, 0)


def evento(ip, segundo, tipo="login_failed"):
    return {"event_type": tipo, "src_ip": ip,
            "ts": INICIO + timedelta(seconds=segundo)}


def test_alerta_con_5_fallos_rapidos():
    eventos = [evento("10.0.0.1", i * 10) for i in range(5)]
    alertas = evaluar(REGLA, eventos)
    assert len(alertas) == 1
    assert alertas[0]["clave"] == "10.0.0.1"
    assert alertas[0]["mitre"] == "T1110"


def test_sin_alerta_si_son_lentos():
    eventos = [evento("10.0.0.1", i * 20) for i in range(5)]
    assert evaluar(REGLA, eventos) == []


def test_sin_alerta_si_son_ips_distintas():
    eventos = [evento(f"10.0.0.{i}", i) for i in range(5)]
    assert evaluar(REGLA, eventos) == []


def test_ignora_otros_tipos_de_evento():
    eventos = [evento("10.0.0.1", i, "login_success") for i in range(5)]
    assert evaluar(REGLA, eventos) == []


def test_no_repite_alertas():
    eventos = [evento("10.0.0.1", i) for i in range(10)]
    assert len(evaluar(REGLA, eventos)) == 2