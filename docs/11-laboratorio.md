# 11 · Laboratorio

Red solo-anfitrión `192.168.56.0/24`: solo el PC y las máquinas virtuales la ven.

| Máquina | Rol | IP | Usuario |
| --- | --- | --- | --- |
| PC (Windows 11) | Desarrollo (VS Code, Git, DBeaver) | 192.168.56.1 | — |
| Ubuntu 26.04 | Servidor del SIEM (Docker) y víctima | 192.168.56.101 | diego-latorre10 |
| Windows 10 | Fuente de logs de Windows | 192.168.56.102 | Usuario10 |
| Kali Linux | Atacante (Hydra) | 192.168.56.103 | diego |

- Adaptador 1: NAT (internet). Adaptador 2: solo-anfitrión (laboratorio).
- Zona horaria de todas las máquinas: `America/Bogota`, con NTP activado. Es clave para la línea de tiempo forense.
- Snapshot limpio de cada máquina: `dia5-limpio`.
- Logs de logins de Ubuntu: `/var/log/auth.log` (léelo con `grep -a`, porque tiene bytes nulos de un cierre de VirtualBox).
- Las contraseñas de las máquinas y servicios están en `docs/privado/credenciales.md` (no se versiona).

## Requisitos en Ubuntu

- Docker y Docker Compose (ya instalados).
- Node.js 22 LTS y pnpm: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs && sudo corepack enable`.
- Python 3 con venv, para el agente Linux.

## Cómo encender todo

Regla para no confundirse: se escribe en el PC (prompt MINGW64) y se ejecuta en Ubuntu (prompt VirtualBox).

| Paso | Comando (en Ubuntu, dentro de `~/siem-forense`) |
| --- | --- |
| Conectarse desde el PC | `ssh diego-latorre10@192.168.56.101` |
| Traer cambios | `git pull && pnpm install` |
| Base de datos y Redis | `docker compose up -d postgres redis` |
| Migraciones | `pnpm --filter api migration:run` |
| API | `pnpm --filter api start` (o `pnpm --filter api dev` con recarga). OpenAPI en `http://192.168.56.101:3000/api/docs` |
| Worker de detección | `pnpm --filter api start:worker` (otra ventana) |
| Web (desarrollo) | `pnpm --filter web dev --host` → `http://192.168.56.101:5173` |
| Crear llave de agente (una vez) | `pnpm --filter api agente:crear ubuntu` → guardar la llave en `docs/privado/` |
| Agente Linux | `cd agents/linux && sudo SIEM_AGENT_KEY=... .venv/bin/python agent_linux.py` |
| Pruebas | `pnpm lint && pnpm typecheck && pnpm test`, `pnpm --filter api test:e2e` y `cd agents/linux && pytest` |

Todo en contenedores (Sprint 7): `docker compose up -d` y luego `http://192.168.56.101`.

## Ataque de prueba (Hydra desde Kali)

```bash
hydra -l intruso -P /usr/share/wordlists/rockyou.txt -t 4 -f ssh://192.168.56.101
```

Se espera que la alerta LINUX-001 (y LINUX-003 por el usuario `intruso`) aparezca en menos de un minuto.

## Problemas frecuentes

- **Ubuntu sin internet** ("La red es inaccesible"): en VirtualBox, Dispositivos → Red → Adaptador de red 1, desmarcar y marcar "Conectar cable", y luego `sudo nmcli device connect enp0s3`.
- **Dos agentes a la vez** (respuestas 200 y 409 por parejas): `sudo pkill -f agent_linux.py` y ejecutar uno solo.
- **Docker Desktop del PC choca con VirtualBox.** Por eso el stack corre dentro de Ubuntu. Si alguna vez se quiere Docker en el PC:
  - Para Docker: activar "Plataforma de máquina virtual", ejecutar `bcdedit /set hypervisorlaunchtype auto` (CMD como administrador) y reiniciar.
  - Para volver a las VMs: desactivar "Plataforma de máquina virtual", ejecutar `bcdedit /set hypervisorlaunchtype off`, desactivar Integridad de memoria y reiniciar.
  - Cada cambio exige reinicio. Mientras se usan las VMs, no instalar programas de fuentes dudosas.
