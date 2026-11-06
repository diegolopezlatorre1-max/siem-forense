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
- Las credenciales de **servicios y aplicación** (PostgreSQL, `CLAVE_FORENSE`, `SECRETO_JWT`, llave de agente y el login `admin` de la web) están en `docs/privado/credenciales.md` (no se versiona). La **contraseña del sistema operativo** de cada máquina (la del login/SSH) es la que se puso al instalar y **no está en el repo**. El usuario de Ubuntu para SSH es `diego-latorre10` (`ssh diego-latorre10@192.168.56.101`).

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
| Agente Linux | `cd agents/linux && SIEM_AGENT_KEY=... .venv/bin/python agent_linux.py` (SIN `sudo`: el usuario está en el grupo `adm`; con `sudo -E` en Ubuntu 26.04 la llave no llega) |
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
- **pnpm roto en la VM** (`Cannot find module '.../.cache/node/corepack/pnpm/<ver>/bin/pnpm.cjs'`): la caché de corepack se corrompió y `corepack prepare` no la redescarga ni borrándola. Reinstalar pnpm sin corepack: `sudo apt install npm` y luego `sudo npm install -g pnpm@12.15.0` (comprobar con `which pnpm` → `/usr/local/bin/pnpm` y `pnpm -v`).
- **La VM Windows se congela** (sobre todo con tareas pesadas como `git clone`): suele ser falta de RAM o el conflicto de Hyper-V del anfitrión. Remedios: apagar las VMs que no se usen (Kali solo hace falta para los ataques), y en el **anfitrión Windows 11** desactivar Integridad de memoria y `bcdedit /set hypervisorlaunchtype off` (ver más abajo). Señal del conflicto: una tortuga verde en la esquina de la ventana de la VM.
- **No se puede copiar/pegar del PC a la VM:** instalar las *Guest Additions* (menú Dispositivos → Insertar imagen de CD de las Guest Additions → ejecutar `VBoxWindowsAdditions.exe` → reiniciar) y activar Dispositivos → Portapapeles compartido → **Bidireccional**.
- **Llevar el agente Windows a la VM sin `git clone`** (que puede congelarla): descargar solo los 3 archivos desde el `raw` de GitHub, en PowerShell:
  `[Net.ServicePointManager]::SecurityProtocol='Tls12'; $b='https://raw.githubusercontent.com/<usuario>/siem-forense/dev/agents/windows'; $w=New-Object Net.WebClient; $w.DownloadFile("$b/ParserWindows.psm1","C:\siem\agente\ParserWindows.psm1")` (y lo mismo para `agente_windows.ps1` y `Probar-Parser.ps1`).
- **`auditpol` da "El parámetro no es correcto" en PowerShell:** PowerShell reinterpreta las `{}` y los `/opcion:valor`. Ejecutarlo desde **cmd como administrador**, o anteponer el token `--%` en PowerShell: `auditpol --% /set /subcategory:"{...}" /success:enable /failure:enable`.
- **La llave de agente no está atada al host:** la API valida la llave contra cualquier agente, así que una llave válida (p. ej. la de `ubuntu`) sirve para ingestar desde Windows; el `host` sale del evento. Para atribuir bien los eventos, crear la llave `windows10` con `pnpm --filter api agente:crear windows10 192.168.56.102`.
- **Docker Desktop del PC choca con VirtualBox.** Por eso el stack corre dentro de Ubuntu. Si alguna vez se quiere Docker en el PC:
  - Para Docker: activar "Plataforma de máquina virtual", ejecutar `bcdedit /set hypervisorlaunchtype auto` (CMD como administrador) y reiniciar.
  - Para volver a las VMs: desactivar "Plataforma de máquina virtual", ejecutar `bcdedit /set hypervisorlaunchtype off`, desactivar Integridad de memoria y reiniciar.
  - Cada cambio exige reinicio. Mientras se usan las VMs, no instalar programas de fuentes dudosas.
