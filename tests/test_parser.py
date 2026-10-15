from app.parsers.auth_linux import parsear_linea

LINEA_FALLIDA = "2026-10-14T00:42:32.536944-05:00 diego-latorre10-VirtualBox sshd-session[14890]: Failed password for invalid user intruso from 192.168.56.101 port 49994 ssh2"
LINEA_EXITOSA = "2026-10-14T01:10:00.000000-05:00 diego-latorre10-VirtualBox sshd-session[15000]: Accepted password for diego from 192.168.56.1 port 50000 ssh2"


def test_login_fallido():
    evento = parsear_linea(LINEA_FALLIDA)
    assert evento["event_type"] == "login_failed"
    assert evento["usuario"] == "intruso"
    assert evento["src_ip"] == "192.168.56.101"
    assert evento["severity"] == "medium"


def test_login_exitoso():
    evento = parsear_linea(LINEA_EXITOSA)
    assert evento["event_type"] == "login_success"
    assert evento["usuario"] == "diego"
    assert evento["severity"] == "low"


def test_lineas_danadas():
    assert parsear_linea("\x00\x00\x00 basura sin sentido") is None
    assert parsear_linea("") is None
    con_basura = "\x00\x00" + LINEA_FALLIDA
    assert parsear_linea(con_basura)["event_type"] == "login_failed"