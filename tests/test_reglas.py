import pytest

from app.detection.reglas import cargar_regla, cargar_reglas


def test_carga_regla_fuerza_bruta():
    ids = [r["id"] for r in cargar_reglas()]
    assert "LINUX-001" in ids


def test_regla_incompleta(tmp_path):
    archivo = tmp_path / "mala.yml"
    archivo.write_text("id: X\n")
    with pytest.raises(ValueError):
        cargar_regla(archivo)