#Requires -Version 5.1
<#
.SYNOPSIS
Prepares a local Docker Compose development environment for Sub2API.

.DESCRIPTION
This script is the Windows-friendly local-build counterpart of docker-deploy.sh.
It creates deploy/.env from deploy/.env.example, fills required secrets, creates
data directories, and can optionally start docker-compose.dev.yml with --build.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\deploy\docker-dev-setup.ps1

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\deploy\docker-dev-setup.ps1 -Start

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\deploy\docker-dev-setup.ps1 -Force -ServerPort 18080
#>

[CmdletBinding()]
param(
    [switch]$Start,
    [switch]$Force,
    [ValidateRange(1, 65535)]
    [int]$ServerPort = 8080,
    [string]$BindHost = "127.0.0.1",
    [string]$AdminEmail = "admin@sub2api.local",
    [string]$AdminPassword = "",
    [switch]$SkipAdminPassword
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function New-HexSecret {
    param([int]$Bytes = 32)

    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($buffer)
    }
    finally {
        $rng.Dispose()
    }

    return (($buffer | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Set-DotEnvValue {
    param(
        [string]$Content,
        [string]$Key,
        [string]$Value
    )

    $escapedKey = [regex]::Escape($Key)
    $pattern = "(?m)^$escapedKey=.*$"
    $line = "$Key=$Value"

    if ([regex]::IsMatch($Content, $pattern)) {
        return [regex]::Replace($Content, $pattern, { param($match) $line })
    }

    if ($Content.Length -gt 0 -and -not $Content.EndsWith("`n")) {
        $Content += [Environment]::NewLine
    }

    return $Content + $line + [Environment]::NewLine
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

$scriptPath = $PSCommandPath
if ([string]::IsNullOrWhiteSpace($scriptPath)) {
    $scriptPath = $MyInvocation.MyCommand.Path
}

$deployDir = Split-Path -Parent $scriptPath
if ([string]::IsNullOrWhiteSpace($deployDir)) {
    $deployDir = (Get-Location).Path
}

$deployDir = (Resolve-Path $deployDir).Path
$envExamplePath = Join-Path $deployDir ".env.example"
$envPath = Join-Path $deployDir ".env"
$composeFile = "docker-compose.dev.yml"
$composePath = Join-Path $deployDir $composeFile

Write-Host ""
Write-Host "=========================================="
Write-Host "  Sub2API Local Docker Setup"
Write-Host "=========================================="
Write-Host ""

if (-not (Test-Path $envExamplePath)) {
    Write-Fail "Missing template: $envExamplePath"
    exit 1
}

if (-not (Test-Path $composePath)) {
    Write-Fail "Missing compose file: $composePath"
    exit 1
}

$shouldWriteEnv = $true
if ((Test-Path $envPath) -and -not $Force) {
    Write-Warn ".env already exists: $envPath"
    $reply = Read-Host "Overwrite existing .env? (y/N)"
    if ($reply -notmatch "^[Yy]$") {
        $shouldWriteEnv = $false
        Write-Info "Keeping existing .env. Use -Force to recreate it non-interactively."
    }
}

$generatedPostgresPassword = ""
$generatedJwtSecret = ""
$generatedTotpKey = ""
$effectiveAdminPassword = $AdminPassword

if ($shouldWriteEnv) {
    Write-Info "Generating local secrets..."

    $generatedPostgresPassword = New-HexSecret
    $generatedJwtSecret = New-HexSecret
    $generatedTotpKey = New-HexSecret

    if ($SkipAdminPassword) {
        $effectiveAdminPassword = ""
    }
    elseif ([string]::IsNullOrWhiteSpace($effectiveAdminPassword)) {
        $effectiveAdminPassword = New-HexSecret -Bytes 12
    }

    $content = [System.IO.File]::ReadAllText($envExamplePath)
    $content = Set-DotEnvValue $content "BIND_HOST" $BindHost
    $content = Set-DotEnvValue $content "SERVER_PORT" ([string]$ServerPort)
    $content = Set-DotEnvValue $content "SERVER_MODE" "debug"
    $content = Set-DotEnvValue $content "POSTGRES_PASSWORD" $generatedPostgresPassword
    $content = Set-DotEnvValue $content "JWT_SECRET" $generatedJwtSecret
    $content = Set-DotEnvValue $content "TOTP_ENCRYPTION_KEY" $generatedTotpKey
    $content = Set-DotEnvValue $content "ADMIN_EMAIL" $AdminEmail
    $content = Set-DotEnvValue $content "ADMIN_PASSWORD" $effectiveAdminPassword

    Write-Utf8NoBom $envPath $content
    Write-Success "Generated .env"
}

Write-Info "Creating local data directories..."
foreach ($dirName in @("data", "postgres_data", "redis_data")) {
    $dirPath = Join-Path $deployDir $dirName
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath | Out-Null
    }
}
Write-Success "Data directories are ready"

Write-Host ""
Write-Host "=========================================="
Write-Host "  Preparation Complete"
Write-Host "=========================================="
Write-Host ""

if ($shouldWriteEnv) {
    Write-Host "Generated credentials:"
    Write-Host "  POSTGRES_PASSWORD:     $generatedPostgresPassword"
    Write-Host "  JWT_SECRET:            $generatedJwtSecret"
    Write-Host "  TOTP_ENCRYPTION_KEY:   $generatedTotpKey"
    if ($SkipAdminPassword) {
        Write-Host "  ADMIN_PASSWORD:        <auto-generated by app; check first-run logs>"
    }
    else {
        Write-Host "  ADMIN_EMAIL:           $AdminEmail"
        Write-Host "  ADMIN_PASSWORD:        $effectiveAdminPassword"
    }
    Write-Host ""
    Write-Warn "These credentials have been saved to deploy/.env. Keep them private."
    Write-Host ""
}

Write-Host "Next steps:"
Write-Host "  1. Start local build compose:"
Write-Host "     cd `"$deployDir`""
Write-Host "     docker compose -f $composeFile up -d --build"
Write-Host ""
Write-Host "  2. View logs:"
Write-Host "     docker compose -f $composeFile logs -f sub2api"
Write-Host ""
Write-Host "  3. Access Web UI:"
Write-Host "     http://localhost:$ServerPort"
Write-Host ""

if ($Start) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Fail "Docker CLI was not found in PATH."
        exit 1
    }

    Write-Info "Starting docker compose with local image build..."
    Push-Location $deployDir
    try {
        & docker compose -f $composeFile up -d --build
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }
    finally {
        Pop-Location
    }
    Write-Success "Services started"
}
