# Bitácora del proyecto

## Semana 1 (6 al 14 oct)
- Día 1: Git, VS Code, Python 3.12, Docker Desktop y DBeaver. Python de la Store no creaba venv: se usó python.org.
- Día 2: estructura de carpetas. .gitignore y .env.example quedaron vacíos y se corrigieron después.
- Día 3: Docker Desktop choca con VirtualBox, así que el stack corre en Ubuntu. PostgreSQL 16 y Redis 7 con docker compose. DBeaver conectado.
- Día 4: API FastAPI con /health en Ubuntu (Python 3.14). Ubuntu perdió internet: se arregló reconectando el cable del Adaptador 1.
- Día 5: Ubuntu .101, Windows 10 .102 y Kali .103 en la red solo-anfitrión, con hora de Bogotá. auth.log tiene bytes basura por un cierre de VirtualBox: leer con grep -a.

## Sprint 1 (14 oct): recoleccion de logs de Linux
Bien: flujo completo funcionando; parser con pruebas; /ingest rechaza duplicados.
Mejorar: cuidar las rutas (~/siem-forense); mantener una sola copia de cada archivo; revisar internet antes de git pull.