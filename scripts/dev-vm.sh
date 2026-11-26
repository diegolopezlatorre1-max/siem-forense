#!/usr/bin/env bash
# Levanta el SIEM en la VM en modo desarrollo, leyendo el codigo de la carpeta compartida.
#   bash /media/sf_siem/scripts/dev-vm.sh                -> up -d
#   bash /media/sf_siem/scripts/dev-vm.sh logs -f api    -> cualquier comando de compose
#   bash /media/sf_siem/scripts/dev-vm.sh up -d --build  -> tras cambiar dependencias
# Volver al modo normal (codigo compilado en la imagen): cd ~/siem-forense && docker compose up -d
set -euo pipefail

# Ruta de la carpeta compartida: depende del nombre que se le dio en VirtualBox.
if [ -z "${SIEM_SRC:-}" ]; then
  for candidata in /media/sf_siem /media/sf_SIEM-forense; do
    if [ -d "$candidata/apps" ]; then SIEM_SRC="$candidata"; break; fi
  done
fi
export SIEM_SRC="${SIEM_SRC:-/media/sf_siem}"
REPO_VM="${REPO_VM:-$HOME/siem-forense}"   # aqui viven el .env y los volumenes de datos

if [ ! -d "$SIEM_SRC/apps/api/src" ]; then
  echo "No encuentro el codigo en $SIEM_SRC. Esta montada la carpeta compartida?" >&2
  echo "(revisa: ls $SIEM_SRC  y que tu usuario este en el grupo vboxsf)" >&2
  exit 1
fi

cd "$REPO_VM"
if [ "$#" -eq 0 ]; then set -- up -d; fi
exec docker compose -f docker-compose.yml -f "$SIEM_SRC/docker-compose.dev.yml" "$@"
