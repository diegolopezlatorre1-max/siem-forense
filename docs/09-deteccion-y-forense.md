# 09 · Detección y forense

## Reglas (YAML)

Las reglas viven en `rules/*.yml`. Agregar una regla es agregar un archivo, sin tocar código. El formato **no cambia** respecto al Sprint 2; ahora se valida con un schema Zod (`ReglaSchema`) al arrancar el worker, y una regla inválida detiene el arranque con un mensaje que indica el archivo y el campo.

```yaml
id: LINUX-001                # único, ^[A-Z]+-\d{3}$
nombre: Fuerza bruta SSH
descripcion: Muchos logins fallidos desde la misma IP en poco tiempo
event_type: login_failed      # tipo de evento que vigila
agrupar_por: src_ip           # src_ip | usuario | host
umbral: 5                     # entero ≥ 1
ventana_segundos: 60          # entero ≥ 1
severidad: high               # low | medium | high | critical
mitre: T1110                  # ^T\d{4}(\.\d{3})?$
```

| ID | Nombre | Tipo | Agrupa | Umbral / ventana | Severidad | MITRE |
| --- | --- | --- | --- | --- | --- | --- |
| LINUX-001 | Fuerza bruta SSH | login_failed | src_ip | 5 / 60 s | high | T1110 |
| LINUX-002 | Fuerza bruta SSH lenta | login_failed | src_ip | 10 / 600 s | medium | T1110 |
| LINUX-003 | Ataque contra un solo usuario | login_failed | usuario | 5 / 120 s | high | T1110.001 |
| LINUX-004 | Ráfaga de logins exitosos | login_success | src_ip | 5 / 60 s | medium | T1078 |
| WIN-001 | Fuerza bruta en Windows (4625) | login_failed | src_ip | 5 / 60 s | high | T1110 |
| WIN-002 | Creación de usuario local (4720) | user_created | host | 1 / 60 s | high | T1136.001 |

## Motor (`engine.ts`)

Es un puerto directo de `motor.py`. Es una función pura `evaluar(regla, eventos): AlertaNueva[]`:

1. Filtra los eventos por `event_type` y los agrupa por el campo `agrupar_por` (descarta los que no tienen clave).
2. Ordena cada grupo por `ts` y desliza una ventana (cola de dos extremos): entra el evento nuevo y salen los que superan `ventana_segundos` respecto a él.
3. Si la ventana llega al `umbral`, emite una alerta (`clave`, `cantidad` y `ts` del último evento) y **vacía la ventana**. Así, 10 fallos seguidos producen 2 alertas, no 6.

**Pruebas obligatorias** (las mismas de `test_motor.py`): 5 fallos rápidos dan 1 alerta; 5 fallos lentos dan 0; 5 IPs distintas dan 0; otro tipo de evento da 0; 10 fallos seguidos dan 2.

**Servicio de detección (worker):** por cada regla del `event_type` del job, lee los eventos de los últimos `ventana × 10` segundos, ejecuta `evaluar` y descarta las alertas para las que ya existe otra con la misma regla y la misma clave dentro de la última ventana (deduplicación heredada de `servicio.py`). Inserta el resto en una transacción.

## Cadena forense

**Objetivo:** demostrar que ningún evento guardado fue modificado, borrado o insertado después.

**Sellado** (dentro de la transacción de ingesta, ver [07-datos.md](07-datos.md#transacciones-y-bloqueos)):

```
canonico(e)  = JSON con las claves ordenadas de
               {event_id, ts (ISO UTC), host, source, event_type, usuario, src_ip, severity, raw}
hash_n       = HMAC-SHA256(CLAVE_FORENSE, hash_{n-1} || "|" || n || "|" || canonico(e_n))   (hex)
hash_0       = HMAC-SHA256(CLAVE_FORENSE, "GENESIS|siem-forense")
```

- Que el mismo evento con el mismo anterior dé siempre el mismo sello es una prueba unitaria.
- Como se usa HMAC y no un hash simple, quien tenga acceso de escritura a la base pero no a `CLAVE_FORENSE` no puede recalcular la cadena después de alterarla.
- `CLAVE_FORENSE` vive solo en el `.env` de la VM, nunca en la base.

**Verificación** (`GET /forensics/verify`): recorre la cadena por `secuencia` en lotes de 1000, recalcula cada hash a partir del evento actual y compara:

| Situación | Motivo informado |
| --- | --- |
| `hash` recalculado ≠ guardado | `evento_alterado` |
| `hash_anterior` ≠ `hash` del eslabón previo | `cadena_rota` |
| Hueco en `secuencia` | `eslabon_faltante` |
| Evento sin eslabón | `evento_sin_sellar` |

Se responde con el **primer** fallo y se registra `forense.verificacion_fallida`. La UI lo muestra en rojo, con la secuencia y el evento.

**Demo:** `UPDATE eventos SET raw = 'x' WHERE id = 7;` en DBeaver, con el usuario propietario, porque el de la aplicación no puede hacer UPDATE. Después, Verificar cadena marca rojo, con `evento_alterado` en la secuencia de ese evento.

## Agentes

| Agente | Fuente | Tipos | Ubicación |
| --- | --- | --- | --- |
| Linux (Python) | `/var/log/auth.log` (modo binario, tolera bytes nulos) | login_failed, login_success | `agents/linux/` |
| Windows (PowerShell) | Security Event Log 4625, 4624 y 4720 | login_failed, login_success, user_created | `agents/windows/` |

El `event_id` es la huella SHA-256 de la línea o del registro original (32 caracteres), así que reenviar no duplica. La llave de agente se lee de la variable `SIEM_AGENT_KEY`.
