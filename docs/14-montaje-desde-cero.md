# 14 · Montaje desde cero en otro equipo

Guía para reconstruir el laboratorio completo en un PC nuevo, partiendo solo del repositorio de GitHub. Los detalles de cada máquina están en [11 · Laboratorio](11-laboratorio.md) y en `tareas-manuales.txt`; aquí va el orden completo.

## Qué trae el repositorio y qué no

| En GitHub | Fuera de GitHub (hay que rehacerlo o traerlo aparte) |
| --- | --- |
| API, worker, web, agentes Linux y Windows, reglas YAML, tests | Las 3 máquinas virtuales (discos, red y snapshots) |
| `docker-compose.yml` (Postgres, Redis, migraciones, API, worker y web) | `.env` con contraseñas y secretos (ignorado por Git) |
| Documentación de `docs/` | `docs/privado/credenciales.md`: usuario admin y llaves de agente (ignorado por Git) |
| `.env.example` como plantilla | Datos de la base (usuarios, eventos, alertas, cadena forense): viven en el volumen Docker `pgdata` |
| | Ajustes de Windows (auditoría, firewall) y la lista de claves en Kali |

## 1. Red y máquinas virtuales (VirtualBox)

1. *Archivo → Herramientas → Administrador de red host-only*: red `192.168.56.1 / 255.255.255.0`, **DHCP deshabilitado**.
2. Crear las tres VM, cada una con **Adaptador 1 = NAT** y **Adaptador 2 = Host-only**:

| Máquina | IP host-only | Recursos | Notas |
| --- | --- | --- | --- |
| Ubuntu Server | 192.168.56.101 | 2 vCPU, 4 GB RAM, 25 GB | Marcar "Install OpenSSH server" |
| Windows 10 | 192.168.56.102 | 2 vCPU, 4 GB RAM | Fuente de logs de Windows |
| Kali Linux | 192.168.56.103 | 2 vCPU, 4 GB RAM | Atacante (Hydra, smbclient) |

3. Poner IP fija en el adaptador host-only:
   - Ubuntu (suele ser `enp0s8`):
     ```bash
     sudo nmcli connection add type ethernet ifname enp0s8 con-name hostonly ipv4.method manual ipv4.addresses 192.168.56.101/24
     sudo nmcli connection modify hostonly connection.autoconnect yes
     sudo nmcli connection up hostonly
     ```
   - Kali: igual, con `eth1` y `192.168.56.103/24`.
   - Windows (PowerShell como administrador):
     ```powershell
     New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 192.168.56.102 -PrefixLength 24
     ```
4. Zona horaria `America/Bogota` y NTP activado en todas las máquinas. La línea de tiempo forense depende de ello.
5. Comprobar la red: `ping 192.168.56.101` desde Kali. Windows bloquea el ping por defecto, así que hacia Windows se comprueba con `nc -zv 192.168.56.102 445`.

## 2. Preparar Ubuntu (servidor del SIEM)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # cerrar sesión y volver a entrar
docker compose version

sudo apt install -y git python3-venv python3-pip
```

Node y pnpm **no hacen falta** si todo corre en contenedores. Solo se necesitan para desarrollar o para ejecutar los tests en la VM (ver [11 · Laboratorio](11-laboratorio.md)).

## 3. Descargar el proyecto y configurar el `.env`

```bash
git clone https://github.com/diegolopezlatorre1-max/siem-forense.git
cd siem-forense
git switch main            # o la rama que se vaya a demostrar
cp .env.example .env
```

Editar `.env` y cambiar como mínimo:

| Variable | Valor |
| --- | --- |
| `POSTGRES_PASSWORD` | Contraseña larga nueva |
| `SECRETO_JWT` | Mínimo 32 caracteres: `openssl rand -base64 48` |
| `CLAVE_FORENSE` | Otro valor distinto, también con `openssl rand -base64 48` |

Si `SECRETO_JWT` o `CLAVE_FORENSE` tienen menos de 32 caracteres, la API no arranca. Si se restaura una base anterior (paso 9), `CLAVE_FORENSE` **debe ser la misma de entonces**, o la verificación de la cadena fallará.

## 4. Levantar el SIEM

```bash
docker compose up -d --build
docker compose ps
```

El servicio `migrate` aplica las migraciones y termina. Después arrancan `api`, `worker` y `web`. Comprobaciones:

- `curl http://localhost:3000/api/v1/health` debe responder `{"estado":"ok","db":"ok","redis":"ok"}`.
- Desde el PC, `http://192.168.56.101` abre la web.
- `http://192.168.56.101:3000/api/docs` abre la documentación OpenAPI.

## 5. Crear el usuario admin y las llaves de agente

La base empieza vacía. Las herramientas de línea de comandos se ejecutan dentro del contenedor de la API:

```bash
docker compose exec api node dist/cli/crear-usuario.js admin '<clave-de-8-o-mas>' admin
docker compose exec api node dist/cli/crear-agente.js ubuntu 192.168.56.101
docker compose exec api node dist/cli/crear-agente.js windows10 192.168.56.102
```

Cada llave **se imprime una sola vez**: hay que copiarla a `docs/privado/credenciales.md` (no se sube a Git). Los usuarios analista y auditor se crean después desde la web, en *Usuarios*.

## 6. Agente Linux (en Ubuntu)

```bash
cd ~/siem-forense/agents/linux
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cat > ~/.siem-agente.env <<'EOF'
SIEM_AGENT_KEY=<llave de ubuntu>
SIEM_API=http://localhost:3000/api/v1/ingest
EOF
chmod 600 ~/.siem-agente.env

set -a; . ~/.siem-agente.env; set +a
nohup .venv/bin/python agent_linux.py > ~/agente.log 2>&1 &
```

El agente se ejecuta **sin `sudo`**. El usuario tiene que estar en el grupo `adm` para leer `/var/log/auth.log` (`sudo usermod -aG adm $USER`). Hay que ejecutar **un solo** agente a la vez.

## 7. Agente Windows (en la VM Windows 10)

1. Copiar `agents/windows/` a `C:\siem\agente\`. Si `git clone` congela la VM, descargar los 3 archivos sueltos desde GitHub (ver "Problemas frecuentes" en [11 · Laboratorio](11-laboratorio.md)).
2. Activar la auditoría desde **cmd como administrador**:
   ```
   auditpol /set /subcategory:"{0CCE9215-69AE-11D9-BED3-505054503030}" /success:enable /failure:enable
   auditpol /set /subcategory:"{0CCE9235-69AE-11D9-BED3-505054503030}" /success:enable /failure:enable
   ```
3. Arrancar el agente desde **PowerShell como administrador**:
   ```powershell
   $env:SIEM_AGENT_KEY = '<llave de windows10>'
   powershell -ExecutionPolicy Bypass -File C:\siem\agente\agente_windows.ps1
   ```
4. Para la regla WIN-001, abrir el SMB solo a la red del laboratorio:
   ```powershell
   New-NetFirewallRule -DisplayName "SIEM lab SMB" -Direction Inbound -Protocol TCP -LocalPort 445 -RemoteAddress 192.168.56.0/24 -Action Allow
   ```

## 8. Preparar Kali y probar la detección

```bash
ls /usr/share/wordlists/rockyou.txt || sudo gunzip /usr/share/wordlists/rockyou.txt.gz
head -n 12 /usr/share/wordlists/rockyou.txt > /tmp/claves.txt

# LINUX-001 / LINUX-003: fuerza bruta SSH contra Ubuntu
hydra -l intruso -P /tmp/claves.txt -t 4 ssh://192.168.56.101

# WIN-001: fuerza bruta SMB contra Windows
for p in $(cat /tmp/claves.txt); do smbclient -L //192.168.56.102 -U "Usuario10%$p" -t 3; done
```

En la VM Windows, `net user backdoor Clave.Lab.2026 /add` dispara WIN-002. Después se borra con `net user backdoor /delete`. Las alertas aparecen en la vista *Alertas* en menos de un minuto. El guion completo de la demo está en [13 · Demostración de ataque](13-demo-ataque.md).

## 9. Llevar los datos de un equipo a otro (opcional)

Para conservar usuarios, alertas y la cadena forense:

```bash
# En el equipo viejo
docker exec siem-postgres pg_dump -U siem -d siem -Fc > siem.dump

# En el equipo nuevo, con el stack levantado y el MISMO CLAVE_FORENSE en el .env
docker cp siem.dump siem-postgres:/tmp/siem.dump
docker exec siem-postgres pg_restore -U siem -d siem --clean --if-exists /tmp/siem.dump
docker compose restart api worker
```

## 10. Atajo: exportar las VM ya montadas

Con el laboratorio funcionando, en VirtualBox *Archivo → Exportar servicio virtualizado* genera un `.ova` por máquina. Conviene guardarlos en un disco externo junto con el `.env` y `credenciales.md`. En el equipo nuevo basta con *Archivo → Importar servicio virtualizado*, recrear la red host-only del paso 1 y arrancar las VM. El stack de Docker se levanta solo, porque los servicios tienen `restart: unless-stopped`. Los agentes sí hay que lanzarlos a mano (pasos 6 y 7).

## Lista de comprobación antes de una demo

- [ ] Las tres VM se ven entre sí en `192.168.56.0/24`.
- [ ] `docker compose ps`: `api`, `worker`, `web`, `postgres` y `redis` en marcha, y `migrate` terminado sin error.
- [ ] `/api/v1/health` responde `ok` en `db` y `redis`.
- [ ] Login como admin en `http://192.168.56.101`.
- [ ] Agente Linux y agente Windows enviando: aparecen eventos nuevos en *Eventos*.
- [ ] Un ataque de prueba genera su alerta.
- [ ] *Verificar cadena* da resultado correcto (✓).
