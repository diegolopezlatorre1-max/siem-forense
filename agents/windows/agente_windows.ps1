<#
.SYNOPSIS
Agente Windows del SIEM: lee del registro Security los eventos 4624, 4625 y 4720
y los envia a POST /ingest con la llave X-Agent-Key.

.DESCRIPTION
Se ejecuta en PowerShell como administrador (el registro Security lo exige).
La llave se lee de la variable SIEM_AGENT_KEY y la URL de SIEM_API.
Guarda el ultimo EventRecordID enviado en .ultimo-registro, asi al reiniciar
sigue donde quedo. La primera vez arranca desde el final del registro, como
el agente Linux (salvo -DesdeInicio). Reenviar no duplica: la API responde 409.

.EXAMPLE
$env:SIEM_AGENT_KEY = '...'; .\agente_windows.ps1
#>
param(
    [string]$Api = $(if ($env:SIEM_API) { $env:SIEM_API } else { 'http://192.168.56.101:3000/api/v1/ingest' }),
    [string]$Estado = (Join-Path $PSScriptRoot '.ultimo-registro'),
    [int]$Intervalo = 5,
    [switch]$DesdeInicio
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'ParserWindows.psm1') -Force

$Llave = $env:SIEM_AGENT_KEY
if (-not $Llave) { throw 'Falta la variable SIEM_AGENT_KEY' }

$identidad = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $identidad.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Ejecute PowerShell como administrador: leer el registro Security lo exige'
}

function Get-UltimoRegistro {
    if (Test-Path $Estado) { return [long](Get-Content $Estado -TotalCount 1) }
    if ($DesdeInicio) { return 0 }
    $ultimo = Get-WinEvent -LogName Security -MaxEvents 1 -ErrorAction SilentlyContinue
    if ($null -eq $ultimo) { return 0 }
    return $ultimo.RecordId
}

# Devuelve $true si el evento quedo resuelto (aceptado, duplicado o invalido) y se
# puede avanzar; $false si hay que reintentarlo en la siguiente vuelta.
function Send-Evento($Evento) {
    $cuerpo = [System.Text.Encoding]::UTF8.GetBytes(($Evento | ConvertTo-Json -Compress))
    try {
        Invoke-RestMethod -Uri $Api -Method Post -Body $cuerpo -ContentType 'application/json; charset=utf-8' `
            -Headers @{ 'X-Agent-Key' = $Llave } -TimeoutSec 5 | Out-Null
        $codigo = 202
    } catch {
        $respuesta = $_.Exception.Response
        if ($null -eq $respuesta) {
            Write-Host "No se pudo enviar: $($_.Exception.Message)"
            return $false
        }
        $codigo = [int]$respuesta.StatusCode
    }
    Write-Host $codigo $Evento.event_type $Evento.usuario $Evento.src_ip
    if ($codigo -eq 401) { Write-Host 'Llave de agente rechazada (401): revise SIEM_AGENT_KEY' }
    # 409: ya recibido. 400: el evento nunca sera valido; reintentarlo no sirve.
    return ($codigo -eq 202 -or $codigo -eq 409 -or $codigo -eq 400)
}

$ultimo = Get-UltimoRegistro
Write-Host "Agente siguiendo Security (4624, 4625, 4720) desde el registro $ultimo -> $Api"

while ($true) {
    $filtro = "*[System[(EventID=4624 or EventID=4625 or EventID=4720) and EventRecordID > $ultimo]]"
    $registros = @(Get-WinEvent -LogName Security -FilterXPath $filtro -ErrorAction SilentlyContinue | Sort-Object RecordId)
    foreach ($registro in $registros) {
        $evento = ConvertTo-EventoSiem -Xml $registro.ToXml()
        if ($null -ne $evento -and -not (Send-Evento $evento)) { break }
        $ultimo = $registro.RecordId
        Set-Content -Path $Estado -Value $ultimo
    }
    Start-Sleep -Seconds $Intervalo
}
