# Windows PowerShell 5.1+. Runtime settings apply only to this launcher and its children.
function Install-LocalRuntime($id) {
    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Install Microsoft App Installer (winget) and rerun to install $id."
    }
    & winget install --id $id --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "WinGet could not provision $id. Check its output and rerun." }
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
}

$toolsDir = Join-Path $PSScriptRoot '../.local-dev'
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
if (!(Get-Command php.exe -ErrorAction SilentlyContinue) -or
    ((& php -r 'echo PHP_VERSION_ID;') -as [int]) -lt 80200) {
    Install-LocalRuntime 'PHP.PHP.8.2'
}
if (!(Get-Command node.exe -ErrorAction SilentlyContinue) -or
    !([version]((& node -v).TrimStart('v')) -ge [version]'22.12.0' -or
      ((& node -v) -match '^v20\.' -and [version]((& node -v).TrimStart('v')) -ge [version]'20.19.0'))) {
    Install-LocalRuntime 'OpenJS.NodeJS.LTS'
}

$required = @('curl','fileinfo','mbstring','openssl','pdo_sqlite','sqlite3','zip','gd')
$loaded = & php -m
$missing = @($required | Where-Object { $_ -notin $loaded })
if ($missing.Count) {
    $iniDirectory = Join-Path $toolsDir 'php'
    New-Item -ItemType Directory -Force -Path $iniDirectory | Out-Null
    $extensionDir = Join-Path (Split-Path -Parent (Get-Command php.exe).Source) 'ext'
    $ini = @("extension_dir=""$extensionDir""") + @($missing | ForEach-Object { "extension=$_" })
    Set-Content -Encoding ASCII -LiteralPath (Join-Path $iniDirectory 'local.ini') -Value $ini
    $env:PHP_INI_SCAN_DIR = "$env:PHP_INI_SCAN_DIR;$iniDirectory"
    $loaded = & php -m
    foreach ($name in $required) {
        if ($name -notin $loaded) { throw "PHP extension $name could not load from $extensionDir." }
    }
}

if (Get-Command composer -ErrorAction SilentlyContinue) {
    Invoke-ProjectCommand $api composer @('install','--no-interaction','--prefer-dist')
} else {
    $phar = Join-Path $toolsDir 'composer.phar'
    if (!(Test-Path -LiteralPath $phar)) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $installer = Join-Path $toolsDir 'composer-setup.php'
        $checksum = (Invoke-RestMethod 'https://composer.github.io/installer.sig').Trim()
        Invoke-WebRequest 'https://getcomposer.org/installer' -UseBasicParsing -OutFile $installer
        if ((Get-FileHash -Algorithm SHA384 $installer).Hash -ne $checksum) { throw 'Composer installer checksum mismatch.' }
        Invoke-ProjectCommand $toolsDir php @($installer,'--2','--filename=composer.phar')
    }
    Invoke-ProjectCommand $api php @($phar,'install','--no-interaction','--prefer-dist')
}
