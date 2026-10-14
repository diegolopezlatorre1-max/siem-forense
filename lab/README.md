# Laboratorio SIEM Forense

Red solo-anfitrión: 192.168.56.0/24 (solo el PC y las máquinas virtuales la ven).

| Máquina | Rol | IP | Usuario |
| --- | --- | --- | --- |
| PC (Windows) | Desarrollo | 192.168.56.1 | - |
| Ubuntu 26.04 | Servidor del SIEM y víctima | 192.168.56.101 | diego-latorre10 |
| Windows 10 | Fuente de logs de Windows | 192.168.56.102 | Usuario10 |
| Kali Linux | Atacante | 192.168.56.103 | diego |

- Adaptador 1: NAT (internet). Adaptador 2: solo-anfitrión (laboratorio).
- Zona horaria de todas las máquinas: America/Bogota, con NTP activado.
- Snapshot limpio de cada máquina: dia5-limpio.
- Logs de logins de Ubuntu: /var/log/auth.log (leer con grep -a).
- Si una máquina pierde internet: Dispositivos > Red > Adaptador 1 > Conectar cable, y luego sudo nmcli device connect <interfaz>.
