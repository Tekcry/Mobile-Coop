# Makes the level editor's own https certificate for the home network (Kestrel-Editor-Network.cmd runs this).
# iOS allows controllers only on secure (https) pages. The certificate covers localhost and this PC's home-network
# addresses; it is made once and remade with -Force (for example after the PC's address changes).
# Uses the openssl that comes with Git for Windows. Files go to .kestrel-cert\ (not in git).
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dir = Join-Path $root '.kestrel-cert'
$cert = Join-Path $dir 'cert.pem'
$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' } | ForEach-Object { $_.IPAddress })
if ((Test-Path $cert) -and -not $Force) {
  $text = & 'C:\Program Files\Git\usr\bin\openssl.exe' x509 -in $cert -noout -text
  $missing = $ips | Where-Object { -not ($text -match [regex]::Escape("IP Address:$_")) }
  if (-not $missing) { Write-Host "Certificate ready ($($ips -join ', '))."; exit 0 }
  Write-Host "This PC has a new address ($($missing -join ', ')); making a new certificate."
}
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
if (-not (Test-Path $openssl)) { Write-Host 'openssl not found (install Git for Windows). The editor runs on http; controllers may not work in Safari.'; exit 1 }
New-Item -ItemType Directory -Force $dir | Out-Null
$san = (@('DNS:localhost', 'IP:127.0.0.1') + ($ips | ForEach-Object { "IP:$_" })) -join ','
$cnf = @"
[req]
prompt = no
distinguished_name = dn
x509_extensions = ext
[dn]
CN = Kestrel level editor
[ext]
subjectAltName = $san
basicConstraints = critical,CA:TRUE
keyUsage = critical,digitalSignature,keyEncipherment,keyCertSign
extendedKeyUsage = serverAuth
"@
$cnfPath = Join-Path $dir 'cert.cnf'
Set-Content -Path $cnfPath -Value $cnf -Encoding ascii
# openssl prints progress dots on its error stream; that is not a failure
$ErrorActionPreference = 'Continue'
& $openssl req -x509 -newkey rsa:2048 -nodes -days 800 -keyout (Join-Path $dir 'key.pem') -out $cert -config $cnfPath 2>$null | Out-Null
if (-not (Test-Path $cert)) { Write-Host 'Could not make the certificate.'; exit 1 }
Write-Host "New certificate for $($ips -join ', '). Install it on the phone once (see docs/kestrel/editor.md)."
