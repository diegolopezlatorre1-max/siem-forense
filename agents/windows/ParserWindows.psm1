# Parser de los eventos de seguridad de Windows al formato de POST /ingest.
# Recibe el XML del registro (EventRecord.ToXml()), así se prueba sin el Event Log.
#   4625 -> login_failed   4624 -> login_success   4720 -> user_created

Set-StrictMode -Version 2.0

$Source = 'windows-security'

# 4624: solo inicios de sesión de personas (interactivo, red, desbloqueo, RDP, cacheado).
# Los de servicio (5) y por lotes (4) son ruido.
$TiposLogonHumanos = @('2', '3', '7', '10', '11')

# Dominios de las cuentas internas de Windows (en inglés y en español).
$DominiosDeSistema = @('NT AUTHORITY', 'AUTORIDAD NT', 'Window Manager', 'Font Driver Host')

function Get-Dato([xml]$Xml, [string]$Nombre) {
    $nodo = $Xml.Event.EventData.Data | Where-Object { $_.Name -eq $Nombre } | Select-Object -First 1
    if ($null -eq $nodo) { return $null }
    $texto = $nodo.InnerText
    if ([string]::IsNullOrWhiteSpace($texto) -or $texto -eq '-') { return $null }
    return $texto
}

# La API exige una IP válida o null. Windows pone '-' cuando no hay IP de red.
function ConvertTo-IpValida([string]$Ip) {
    if ([string]::IsNullOrWhiteSpace($Ip) -or $Ip -eq '-') { return $null }
    $limpia = $Ip -replace '^::ffff:', '' -replace '%\d+$', ''
    $direccion = $null
    if ([System.Net.IPAddress]::TryParse($limpia, [ref]$direccion)) { return $direccion.ToString() }
    return $null
}

function Get-Huella([string]$Texto) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Texto))
        return (-join ($bytes | ForEach-Object { $_.ToString('x2') })).Substring(0, 32)
    } finally {
        $sha.Dispose()
    }
}

function Test-CuentaDeSistema([string]$Usuario, [string]$Dominio) {
    if ($null -eq $Usuario) { return $true }
    if ($Usuario.EndsWith('$')) { return $true }              # cuentas de equipo
    if ($Usuario -match '^(DWM|UMFD)-\d+$') { return $true }  # gestor de ventanas y fuentes
    return $DominiosDeSistema -contains $Dominio
}

<#
.SYNOPSIS
Convierte el XML de un evento 4624, 4625 o 4720 en el evento que espera /ingest.
Devuelve $null si el evento no interesa (otro ID o inicio de sesión de una cuenta del sistema).
#>
function ConvertTo-EventoSiem {
    param([Parameter(Mandatory)][string]$Xml)

    [xml]$doc = $Xml
    $sistema = $doc.Event.System
    $idEvento = $sistema['EventID'].InnerText
    $registro = $sistema['EventRecordID'].InnerText
    $equipo = $sistema['Computer'].InnerText
    $hora = [datetime]::Parse(
        $sistema['TimeCreated'].GetAttribute('SystemTime'),
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    ).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", [Globalization.CultureInfo]::InvariantCulture)

    switch ($idEvento) {
        '4625' {
            $tipo = 'login_failed'; $severidad = 'medium'
            $usuario = Get-Dato $doc 'TargetUserName'
            $ip = ConvertTo-IpValida (Get-Dato $doc 'IpAddress')
            $resumen = "4625 inicio de sesion fallido: usuario=$usuario ip=$ip tipo_logon=$(Get-Dato $doc 'LogonType')" +
                " estacion=$(Get-Dato $doc 'WorkstationName') estado=$(Get-Dato $doc 'Status') subestado=$(Get-Dato $doc 'SubStatus')"
        }
        '4624' {
            $usuario = Get-Dato $doc 'TargetUserName'
            $tipoLogon = Get-Dato $doc 'LogonType'
            if ($TiposLogonHumanos -notcontains $tipoLogon) { return $null }
            if (Test-CuentaDeSistema $usuario (Get-Dato $doc 'TargetDomainName')) { return $null }
            $tipo = 'login_success'; $severidad = 'low'
            $ip = ConvertTo-IpValida (Get-Dato $doc 'IpAddress')
            $resumen = "4624 inicio de sesion correcto: usuario=$usuario ip=$ip tipo_logon=$tipoLogon" +
                " estacion=$(Get-Dato $doc 'WorkstationName') proceso=$(Get-Dato $doc 'LogonProcessName')"
        }
        '4720' {
            $tipo = 'user_created'; $severidad = 'high'
            $usuario = Get-Dato $doc 'TargetUserName'   # la cuenta creada
            $ip = $null
            $resumen = "4720 cuenta de usuario creada: usuario=$usuario dominio=$(Get-Dato $doc 'TargetDomainName')" +
                " creada_por=$(Get-Dato $doc 'SubjectDomainName')\$(Get-Dato $doc 'SubjectUserName')"
        }
        default { return $null }
    }

    # El original sigue en el Event Log de Windows: el registro lo identifica.
    $raw = "$resumen registro=$registro"
    if ($raw.Length -gt 8192) { $raw = $raw.Substring(0, 8192) }

    return [ordered]@{
        event_id   = Get-Huella $Xml
        ts         = $hora
        host       = $equipo
        source     = $Source
        event_type = $tipo
        usuario    = $usuario
        src_ip     = $ip
        severity   = $severidad
        raw        = $raw
    }
}

Export-ModuleMember -Function ConvertTo-EventoSiem, ConvertTo-IpValida
