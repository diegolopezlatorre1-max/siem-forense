# Pruebas del parser de Windows, sin dependencias (vale con el Pester 3.4 de serie o sin él).
# Uso:  powershell -ExecutionPolicy Bypass -File agents\windows\Probar-Parser.ps1

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'ParserWindows.psm1') -Force

$script:fallos = 0
function Afirmar([string]$Nombre, [scriptblock]$Condicion) {
    if (& $Condicion) { Write-Host "  ok    $Nombre" }
    else { Write-Host "  FALLO $Nombre" -ForegroundColor Red; $script:fallos++ }
}

# XML con la forma de EventRecord.ToXml(); solo cambian ID, hora y EventData.
function Nuevo-Xml([string]$Id, [string]$Registro, [hashtable]$Datos) {
    $data = ($Datos.GetEnumerator() | ForEach-Object { "<Data Name='$($_.Key)'>$($_.Value)</Data>" }) -join ''
    return "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System>" +
        "<Provider Name='Microsoft-Windows-Security-Auditing' Guid='{54849625-5478-4994-A5BA-3E3B0328C30D}'/>" +
        "<EventID>$Id</EventID><Version>0</Version><Level>0</Level><Task>12544</Task><Opcode>0</Opcode>" +
        "<Keywords>0x8010000000000000</Keywords><TimeCreated SystemTime='2026-10-30T16:45:00.1234567Z'/>" +
        "<EventRecordID>$Registro</EventRecordID><Correlation/><Execution ProcessID='652' ThreadID='4012'/>" +
        "<Channel>Security</Channel><Computer>WIN10</Computer><Security/></System><EventData>$data</EventData></Event>"
}

$fallido = Nuevo-Xml '4625' '5120' @{
    SubjectUserName = '-'; TargetUserName = 'administrador'; TargetDomainName = 'WIN10'; Status = '0xc000006d'
    SubStatus = '0xc000006a'; LogonType = '3'; WorkstationName = 'KALI'; IpAddress = '192.168.56.103'; IpPort = '0'
}
$correcto = Nuevo-Xml '4624' '5121' @{
    TargetUserName = 'Usuario10'; TargetDomainName = 'WIN10'; LogonType = '10'; LogonProcessName = 'User32'
    WorkstationName = 'PC'; IpAddress = '192.168.56.1'
}
$deServicio = Nuevo-Xml '4624' '5122' @{ TargetUserName = 'SYSTEM'; TargetDomainName = 'NT AUTHORITY'; LogonType = '5'; IpAddress = '-' }
$deEquipo = Nuevo-Xml '4624' '5123' @{ TargetUserName = 'WIN10$'; TargetDomainName = 'GRUPO'; LogonType = '3'; IpAddress = '::1' }
$creado = Nuevo-Xml '4720' '5124' @{
    TargetUserName = 'backdoor'; TargetDomainName = 'WIN10'; SubjectUserName = 'Usuario10'; SubjectDomainName = 'WIN10'
}
$otro = Nuevo-Xml '4672' '5125' @{ SubjectUserName = 'Usuario10' }

Write-Host 'ParserWindows'

$e = ConvertTo-EventoSiem -Xml $fallido
Afirmar '4625 -> login_failed con usuario e IP' { $e.event_type -eq 'login_failed' -and $e.usuario -eq 'administrador' -and $e.src_ip -eq '192.168.56.103' }
Afirmar '4625 -> source windows-security, host y severidad medium' { $e.source -eq 'windows-security' -and $e.host -eq 'WIN10' -and $e.severity -eq 'medium' }
Afirmar 'ts en UTC ISO-8601 con milisegundos' { $e.ts -eq '2026-10-30T16:45:00.123Z' }
Afirmar 'event_id: 32 hex y estable para el mismo registro' { $e.event_id -match '^[0-9a-f]{32}$' -and (ConvertTo-EventoSiem -Xml $fallido).event_id -eq $e.event_id }
Afirmar 'event_id distinto para otro registro' { (ConvertTo-EventoSiem -Xml $correcto).event_id -ne $e.event_id }
Afirmar 'raw incluye el EventRecordID' { $e.raw -match 'registro=5120' }

$e = ConvertTo-EventoSiem -Xml $correcto
Afirmar '4624 RDP -> login_success severidad low' { $e.event_type -eq 'login_success' -and $e.usuario -eq 'Usuario10' -and $e.severity -eq 'low' }
Afirmar '4624 de servicio (SYSTEM, tipo 5) se descarta' { $null -eq (ConvertTo-EventoSiem -Xml $deServicio) }
Afirmar '4624 de cuenta de equipo (termina en $) se descarta' { $null -eq (ConvertTo-EventoSiem -Xml $deEquipo) }

$e = ConvertTo-EventoSiem -Xml $creado
Afirmar '4720 -> user_created con la cuenta creada, sin IP, severidad high' { $e.event_type -eq 'user_created' -and $e.usuario -eq 'backdoor' -and $null -eq $e.src_ip -and $e.severity -eq 'high' }
Afirmar '4720 -> raw dice quien la creo' { $e.raw -match 'creada_por=WIN10\\Usuario10' }
Afirmar 'otros IDs (4672) se descartan' { $null -eq (ConvertTo-EventoSiem -Xml $otro) }

Afirmar "IP '-' -> null" { $null -eq (ConvertTo-IpValida '-') }
Afirmar 'IPv4 mapeada ::ffff:a.b.c.d -> a.b.c.d' { (ConvertTo-IpValida '::ffff:192.168.56.103') -eq '192.168.56.103' }
Afirmar 'IPv6 con zona fe80::1%12 -> fe80::1' { (ConvertTo-IpValida 'fe80::1%12') -eq 'fe80::1' }
Afirmar 'texto que no es IP -> null' { $null -eq (ConvertTo-IpValida 'KALI') }

$json = ConvertTo-EventoSiem -Xml $creado | ConvertTo-Json -Compress
Afirmar 'el JSON lleva src_ip null (no se omite)' { $json -match '"src_ip":null' }

if ($script:fallos -gt 0) { Write-Host "$script:fallos prueba(s) fallaron" -ForegroundColor Red; exit 1 }
Write-Host 'Todas las pruebas pasaron'
