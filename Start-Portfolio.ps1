$ErrorActionPreference = 'Stop'

$api = Join-Path $PSScriptRoot 'api.totumdy.com'
$chat = Join-Path $PSScriptRoot 'chat-server-nodejs-v2'
$frontend = Join-Path $PSScriptRoot 'tot-frontend'

function Invoke-ProjectCommand($directory, $command, $arguments) {
    Push-Location -LiteralPath $directory
    try {
        & $command @arguments
        if ($LASTEXITCODE -ne 0) { throw "$command failed in $directory." }
    } finally {
        Pop-Location
    }
}

foreach ($port in 5173, 8000, 3001) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop the existing service or open the preview if it is running."
    }
}

$database = Join-Path $api 'database/portfolio.sqlite'
if (!(Test-Path -LiteralPath $database)) {
    Copy-Item -LiteralPath (Join-Path $api 'database/portfolio-demo.sqlite') -Destination $database -ErrorAction Stop
}
$keyFile = Join-Path $api 'storage/portfolio.key'
if (!(Test-Path -LiteralPath $keyFile)) {
    $bytes = [byte[]]::new(32)
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    Set-Content -LiteralPath $keyFile -Value ('base64:' + [Convert]::ToBase64String($bytes))
}

$env:APP_ENV = 'local'
$env:APP_DEBUG = 'false'
$env:APP_URL = 'http://127.0.0.1:8000'
$env:APP_KEY = (Get-Content -LiteralPath $keyFile -Raw).Trim()
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $database
$env:DATABASE_URL = '(null)'
$env:FILESYSTEM_DISK = 'public'
$env:SESSION_DRIVER = 'file'
$env:CACHE_DRIVER = 'file'
$env:CHAT_HOST = '127.0.0.1'
$env:PORT = '3001'
$env:LARAVEL_API_BASE_URL = 'http://127.0.0.1:8000/api'
$env:NODE_SERVER_URL = 'http://127.0.0.1:3001'
$env:NODE_SERVER_KEY = [guid]::NewGuid().ToString()
$env:CORS_ORIGINS = 'http://127.0.0.1:5173'
$env:FRONTEND_URL = 'http://127.0.0.1:5173'
$env:VITE_API_BASE_URL = $env:LARAVEL_API_BASE_URL
$env:VITE_SERVER_BASE_URL = $env:APP_URL
$env:VITE_SOCKET_URL = $env:NODE_SERVER_URL
$env:APP_CONFIG_CACHE = Join-Path $api 'bootstrap/cache/portfolio-config.php'

. (Join-Path $PSScriptRoot 'scripts/Initialize-Windows.ps1')
foreach ($directory in $chat, $frontend) {
    $lock = Join-Path $directory 'package-lock.json'
    $stamp = Join-Path $directory 'node_modules/.portfolio-install'
    $version = (Get-FileHash $lock).Hash + (& node -v)
    if (!(Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $version) {
        Invoke-ProjectCommand $directory npm.cmd @('ci', '--no-audit', '--no-fund')
        Set-Content -LiteralPath $stamp -Value $version
    }
}

Invoke-ProjectCommand $api php @('artisan', 'migrate', '--force')
if (!(Test-Path (Join-Path $api 'public/storage'))) {
    Invoke-ProjectCommand $api php @('artisan', 'storage:link')
}

$logs = Join-Path $api 'storage/logs'
$router = Join-Path $api 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
$processes = @()
try {
    $processes += Start-Process php.exe -PassThru -WindowStyle Hidden -WorkingDirectory (Join-Path $api 'public') -ArgumentList @(
        '-d', 'upload_max_filesize=20M', '-d', 'post_max_size=24M', '-S', '127.0.0.1:8000', ('"' + $router + '"')
    ) -RedirectStandardError (Join-Path $logs 'portfolio-api.log')
    $processes += Start-Process node.exe -PassThru -WindowStyle Hidden -WorkingDirectory $chat -ArgumentList 'server.js' -RedirectStandardOutput (Join-Path $logs 'portfolio-chat.log') -RedirectStandardError (Join-Path $logs 'portfolio-chat-error.log')
    $processes += Start-Process node.exe -PassThru -WindowStyle Hidden -WorkingDirectory $frontend -ArgumentList @(
        'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'
    ) -RedirectStandardOutput (Join-Path $logs 'portfolio-frontend.log') -RedirectStandardError (Join-Path $logs 'portfolio-frontend-error.log')

    foreach ($url in @('http://127.0.0.1:8000', 'http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling', 'http://127.0.0.1:5173')) {
        for ($attempt = 0; $attempt -lt 15; $attempt++) {
            try {
                Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
                break
            } catch {
                if ($attempt -eq 14) { throw "Preview did not start at $url. See $logs." }
                Start-Sleep -Milliseconds 300
            }
        }
    }
    foreach ($process in $processes) {
        if ($process.HasExited) { throw "A local service exited during startup. See $logs." }
    }
} catch {
    foreach ($process in $processes) {
        if (!$process.HasExited) { Stop-Process -Id $process.Id }
    }
    throw
}

Write-Output 'Open http://127.0.0.1:5173'
Write-Output 'Demo accounts: maya@tot.com and leo@tot.com'
Write-Output 'Password: TotPortfolio1!'
Write-Output ('Stop the preview with: Stop-Process -Id ' + (($processes | Select-Object -ExpandProperty Id) -join ','))
