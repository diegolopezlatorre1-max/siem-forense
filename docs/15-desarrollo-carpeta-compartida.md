# 15 · Desarrollo sin `git pull`: carpeta compartida + recarga automática

Objetivo: editar en el PC (`D:\SIEM-forense`) y que la VM Ubuntu use ese código al momento, sin
`git pull` ni `docker compose build` en cada cambio.

```
PC (Windows)                                VM Ubuntu (192.168.56.101)
D:\SIEM-forense  ── carpeta compartida ──>  /media/sf_SIEM-forense
  web: pnpm --filter web dev (5173)           api    : tsc --watch + node --watch (lee /media/sf_SIEM-forense)
       /api ──── proxy ──────────────────>    worker : tsc --watch + node --watch
                                              postgres, redis, .env  -> ~/siem-forense
```

## 1. Una sola vez: montar la carpeta en la VM

1. **Guest Additions en Ubuntu.** Comprobar si ya están con `lsmod | grep vboxsf`. Si no aparece:
   ```bash
   sudo apt update
   sudo apt install -y build-essential dkms linux-headers-$(uname -r)
   # Ventana de la VM: Dispositivos → Insertar imagen de CD de las Guest Additions
   sudo mkdir -p /mnt/cdrom && sudo mount /dev/cdrom /mnt/cdrom
   sudo sh /mnt/cdrom/VBoxLinuxAdditions.run
   sudo reboot
   ```
   (La actualización automática desde el menú de VirtualBox suele fallar con `VBOX_E_GSTCTL_GUEST_ERROR`;
   si `vboxsf` ya aparece en `lsmod`, se puede ignorar.)
2. **Con la VM apagada**, en VirtualBox: *Configuración → Carpetas compartidas → +*
   - Ruta: `D:\SIEM-forense`
   - Nombre: `SIEM-forense` (queda en `/media/sf_SIEM-forense`)
   - Marcar **Automontar**. *No* marcar "Solo lectura" ni "Make Global". Punto de montaje vacío.
3. Arrancar la VM y dar permiso a tu usuario:
   ```bash
   sudo usermod -aG vboxsf $USER
   sudo reboot
   ls /media/sf_SIEM-forense        # debe listar apps, packages, rules, docker-compose.dev.yml...
   ```

El `.env`, los volúmenes de Postgres/Redis y el `docker-compose.yml` siguen en `~/siem-forense`
(el clon de la VM): no hace falta copiar secretos al PC.

## 2. Cada vez que quieras desarrollar

En la VM:
```bash
bash /media/sf_SIEM-forense/scripts/dev-vm.sh                       # levanta api y worker en modo watch
bash /media/sf_SIEM-forense/scripts/dev-vm.sh logs -f api worker    # ver cómo recompilan
```

En el PC:
```powershell
pnpm --filter web dev      # http://localhost:5173 (usa apps/web/.env.local -> API de la VM)
```

## Qué se actualiza solo y qué no

| Cambias… | Qué pasa | ¿Hay que hacer algo? |
| --- | --- | --- |
| `apps/web/**` | Vite recarga el navegador | No |
| `apps/api/src/**` | API y worker recompilan y reinician (unos segundos, por el polling) | No |
| `packages/shared/src/**` | Se compila al arrancar | `dev-vm.sh restart api worker` |
| `rules/*.yml` | Las reglas se cargan al arrancar | `dev-vm.sh restart worker` |
| Migración nueva | — | `dev-vm.sh run --rm migrate` |
| `package.json` / `pnpm-lock.yaml` | Los `node_modules` son de la imagen | `dev-vm.sh up -d --build` |

## Volver al modo normal (demo, código compilado)

```bash
cd ~/siem-forense && git pull && docker compose up -d --build
```

## Problemas frecuentes

- **`ls: no se puede acceder a '/media/sf_siem'`**: la carpeta se monta como `/media/sf_<Nombre>`, con el
  nombre que se puso en VirtualBox. Ver dónde quedó con `mount | grep vboxsf`. El script prueba
  `/media/sf_siem` y `/media/sf_SIEM-forense`; para otra ruta: `SIEM_SRC=/media/sf_otra bash .../dev-vm.sh`.
- **`No encuentro el codigo en ...`**: la carpeta no está montada o tu usuario no está en `vboxsf`
  (`groups` debe mostrarlo; tras el `usermod` hay que reiniciar o volver a entrar).
- **Guardo y no recompila**: confirma que corres con `dev-vm.sh` (no con `docker compose up` a secas):
  `docker inspect siem-api --format '{{.Config.Cmd}}'` debe mostrar `node --watch dist/main.js`.
- **`Permission denied` en `dev-vm.sh`**: ejecútalo con `bash ...` (en vboxsf no hay bit de ejecución).
- **`$'\r': command not found`**: el `.sh` quedó con fin de línea CRLF. `.gitattributes` fuerza LF;
  si lo editaste a mano, en VS Code cambia "CRLF" por "LF" en la barra de estado.
- **La web de la VM (`http://192.168.56.101`) no muestra tus cambios**: es normal, es el build de
  nginx. En desarrollo usa `http://localhost:5173` en el PC.
