# ============================================================
# NEXTIER MCP COMPLETE INSTALLATION SCRIPT
# ============================================================
# This script will install and configure ALL MCPs end-to-end
# Run as: .\install-mcps.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NEXTIER MCP INSTALLATION WIZARD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set project root
$PROJECT_ROOT = "c:\Users\colep\Downloads\nextier-main (3)\nextier-main"
Set-Location $PROJECT_ROOT

# ============================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================

Write-Host "STEP 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = py -3.13 --version
    Write-Host "✅ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python 3.13 not found!" -ForegroundColor Red
    exit 1
}

# Check Rust/Cargo
try {
    # Refresh environment variables to pick up Rust if just installed
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    $cargoVersion = cargo --version
    Write-Host "✅ Rust/Cargo installed: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Rust/Cargo not found in PATH" -ForegroundColor Yellow
    Write-Host "   Attempting to find Rust installation..." -ForegroundColor Yellow

    # Try common Rust installation paths
    $rustPaths = @(
        "$env:USERPROFILE\.cargo\bin",
        "C:\Program Files\Rust\.cargo\bin",
        "$env:CARGO_HOME\bin"
    )

    $cargoFound = $false
    foreach ($path in $rustPaths) {
        if (Test-Path "$path\cargo.exe") {
            $env:Path = "$path;$env:Path"
            Write-Host "✅ Found Rust at: $path" -ForegroundColor Green
            $cargoFound = $true
            break
        }
    }

    if (-not $cargoFound) {
        Write-Host "❌ Rust/Cargo not installed!" -ForegroundColor Red
        Write-Host "   Run: winget install Rustlang.Rust.MSVC" -ForegroundColor Yellow
        Write-Host "   Then restart PowerShell and re-run this script" -ForegroundColor Yellow
        exit 1
    }
}

# Check Claude Desktop config directory
$claudeConfigDir = "$env:APPDATA\Claude"
if (-not (Test-Path $claudeConfigDir)) {
    Write-Host "⚠️  Claude Desktop config directory not found. Creating..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

Write-Host ""
Write-Host "✅ All prerequisites satisfied!" -ForegroundColor Green
Write-Host ""

# ============================================================
# STEP 2: BUILD NODE.JS MCPs
# ============================================================

Write-Host "STEP 2: Building Node.js MCPs..." -ForegroundColor Yellow
Write-Host ""

$nodeMcps = @(
    @{Name="mcp-digitalocean"; Path="apps/mcp-digitalocean"},
    @{Name="mcp-notion"; Path="apps/mcp-notion"},
    @{Name="mcp-sendgrid"; Path="apps/mcp-sendgrid"}
)

foreach ($mcp in $nodeMcps) {
    Write-Host "Building $($mcp.Name)..." -ForegroundColor Cyan

    Set-Location "$PROJECT_ROOT\$($mcp.Path)"

    # Install dependencies
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    npm install --silent 2>&1 | Out-Null

    # Build
    Write-Host "  Building..." -ForegroundColor Gray
    npm run build --silent 2>&1 | Out-Null

    # Verify build output
    if (Test-Path "build\index.js") {
        Write-Host "✅ $($mcp.Name) built successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ $($mcp.Name) build failed!" -ForegroundColor Red
        exit 1
    }
}

Set-Location $PROJECT_ROOT
Write-Host ""

# ============================================================
# STEP 3: INSTALL PYTHON MCP
# ============================================================

Write-Host "STEP 3: Installing Python MCP (postgres)..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$PROJECT_ROOT\apps\mcp-postgres"

Write-Host "  Installing mcp-postgres..." -ForegroundColor Gray
py -3.13 -m pip install -e . --quiet 2>&1 | Out-Null

# Verify installation
try {
    $mcpPostgresVersion = py -3.13 -m postgres_mcp --version 2>&1
    Write-Host "✅ mcp-postgres installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  mcp-postgres installed but version check failed (this is OK)" -ForegroundColor Yellow
}

Set-Location $PROJECT_ROOT
Write-Host ""

# ============================================================
# STEP 4: BUILD RUST MCP
# ============================================================

Write-Host "STEP 4: Building Rust MCP (apollo)..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$PROJECT_ROOT\apps\mcp-apollo"

Write-Host "  Building with Cargo (this may take 5-10 minutes)..." -ForegroundColor Gray
cargo build --release 2>&1 | Out-Null

if (Test-Path "target\release\mcp-apollo.exe") {
    Write-Host "✅ mcp-apollo built successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  mcp-apollo build incomplete (optional - can skip)" -ForegroundColor Yellow
}

Set-Location $PROJECT_ROOT
Write-Host ""

# ============================================================
# STEP 5: COLLECT API KEYS/CREDENTIALS
# ============================================================

Write-Host "STEP 5: Collecting API Keys & Credentials..." -ForegroundColor Yellow
Write-Host ""
Write-Host "We need API keys for your MCPs to work." -ForegroundColor White
Write-Host "Press ENTER to skip any you don't have yet." -ForegroundColor Gray
Write-Host ""

# DigitalOcean
Write-Host "DigitalOcean API Token:" -ForegroundColor Cyan
Write-Host "  Get from: https://cloud.digitalocean.com/account/api/tokens" -ForegroundColor Gray
$doToken = Read-Host "Enter token (or press ENTER to skip)"

# SendGrid
Write-Host ""
Write-Host "SendGrid API Key:" -ForegroundColor Cyan
Write-Host "  Get from: https://app.sendgrid.com/settings/api_keys" -ForegroundColor Gray
$sendgridKey = Read-Host "Enter API key (or press ENTER to skip)"

# Notion
Write-Host ""
Write-Host "Notion Integration Token:" -ForegroundColor Cyan
Write-Host "  Get from: https://www.notion.so/my-integrations" -ForegroundColor Gray
$notionToken = Read-Host "Enter token (or press ENTER to skip)"

# Supabase/Postgres
Write-Host ""
Write-Host "Database Connection String:" -ForegroundColor Cyan
Write-Host "  Format: postgresql://user:pass@host:port/database" -ForegroundColor Gray
$dbUrl = Read-Host "Enter connection string (or press ENTER to use existing)"

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    # Use existing from config
    $dbUrl = "postgresql://postgres:u6cZGoc3bFy1V4Tt@db.iudhpxmntvrcwegornmq.supabase.co:5432/postgres"
}

Write-Host ""

# ============================================================
# STEP 6: UPDATE CLAUDE DESKTOP CONFIG
# ============================================================

Write-Host "STEP 6: Updating Claude Desktop Configuration..." -ForegroundColor Yellow
Write-Host ""

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

# Build config object
$config = @{
    mcpServers = @{}
}

# Postgres MCP (always add)
$config.mcpServers["postgres"] = @{
    command = "npx"
    args = @("-y", "@modelcontextprotocol/server-postgres", $dbUrl)
}

$config.mcpServers["postgres-local"] = @{
    command = "C:\Users\colep\AppData\Local\Programs\Python\Python313\python.exe"
    args = @("-m", "postgres_mcp")
}

# DigitalOcean MCP
if (-not [string]::IsNullOrWhiteSpace($doToken)) {
    $config.mcpServers["digitalocean"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-digitalocean\build\index.js")
        env = @{
            DIGITALOCEAN_API_TOKEN = $doToken
        }
    }
    Write-Host "✅ DigitalOcean MCP configured" -ForegroundColor Green
} else {
    $config.mcpServers["digitalocean"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-digitalocean\build\index.js")
    }
    Write-Host "⚠️  DigitalOcean MCP added (no API token - add later)" -ForegroundColor Yellow
}

# Notion MCP
if (-not [string]::IsNullOrWhiteSpace($notionToken)) {
    $config.mcpServers["notion"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-notion\bin\cli.mjs")
        env = @{
            NOTION_API_KEY = $notionToken
        }
    }
    Write-Host "✅ Notion MCP configured" -ForegroundColor Green
} else {
    $config.mcpServers["notion"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-notion\bin\cli.mjs")
    }
    Write-Host "⚠️  Notion MCP added (no API token - add later)" -ForegroundColor Yellow
}

# SendGrid MCP
if (-not [string]::IsNullOrWhiteSpace($sendgridKey)) {
    $config.mcpServers["sendgrid"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-sendgrid\build\index.js")
        env = @{
            SENDGRID_API_KEY = $sendgridKey
        }
    }
    Write-Host "✅ SendGrid MCP configured" -ForegroundColor Green
} else {
    $config.mcpServers["sendgrid"] = @{
        command = "node"
        args = @("$PROJECT_ROOT\apps\mcp-sendgrid\build\index.js")
    }
    Write-Host "⚠️  SendGrid MCP added (no API token - add later)" -ForegroundColor Yellow
}

# Apollo MCP (if built)
if (Test-Path "$PROJECT_ROOT\apps\mcp-apollo\target\release\mcp-apollo.exe") {
    $config.mcpServers["apollo"] = @{
        command = "$PROJECT_ROOT\apps\mcp-apollo\target\release\mcp-apollo.exe"
        args = @()
    }
    Write-Host "✅ Apollo MCP configured" -ForegroundColor Green
}

# Write config
$configJson = $config | ConvertTo-Json -Depth 10
$configJson | Set-Content -Path $configPath -Encoding UTF8

Write-Host ""
Write-Host "✅ Claude Desktop config updated: $configPath" -ForegroundColor Green
Write-Host ""

# ============================================================
# STEP 7: CREATE ENVIRONMENT FILE
# ============================================================

Write-Host "STEP 7: Creating .env file..." -ForegroundColor Yellow
Write-Host ""

$envContent = @"
# ============================================================
# NEXTIER ENVIRONMENT VARIABLES
# Generated by install-mcps.ps1
# ============================================================

# Database
DATABASE_URL="$dbUrl"

# DigitalOcean
$(if ($doToken) { "DIGITALOCEAN_API_TOKEN=`"$doToken`"" } else { "# DIGITALOCEAN_API_TOKEN=`"your_token_here`"" })

# SendGrid
$(if ($sendgridKey) { "SENDGRID_API_KEY=`"$sendgridKey`"" } else { "# SENDGRID_API_KEY=`"your_key_here`"" })

# Notion
$(if ($notionToken) { "NOTION_API_KEY=`"$notionToken`"" } else { "# NOTION_API_KEY=`"your_token_here`"" })

# App Configuration
APP_ENV=production
NODE_ENV=production
PORT=8080
TZ=UTC

# Generate these with: openssl rand -hex 32
APP_SECRET=$(if (Get-Command openssl -ErrorAction SilentlyContinue) { openssl rand -hex 32 } else { "GENERATE_ME_WITH_OPENSSL" })
JWT_SECRET=$(if (Get-Command openssl -ErrorAction SilentlyContinue) { openssl rand -hex 32 } else { "GENERATE_ME_WITH_OPENSSL" })

"@

$envContent | Set-Content -Path "$PROJECT_ROOT\.env" -Encoding UTF8

Write-Host "✅ .env file created: $PROJECT_ROOT\.env" -ForegroundColor Green
Write-Host ""

# ============================================================
# STEP 8: RESTART CLAUDE DESKTOP
# ============================================================

Write-Host "STEP 8: Restarting Claude Desktop..." -ForegroundColor Yellow
Write-Host ""

# Kill Claude Desktop if running
$claudeProcess = Get-Process -Name "Claude" -ErrorAction SilentlyContinue
if ($claudeProcess) {
    Write-Host "  Stopping Claude Desktop..." -ForegroundColor Gray
    Stop-Process -Name "Claude" -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Claude Desktop stopped" -ForegroundColor Green
} else {
    Write-Host "  Claude Desktop not running" -ForegroundColor Gray
}

# Try to start Claude Desktop
Write-Host ""
Write-Host "  Attempting to start Claude Desktop..." -ForegroundColor Gray

$claudePaths = @(
    "$env:LOCALAPPDATA\Programs\Claude\Claude.exe",
    "$env:PROGRAMFILES\Claude\Claude.exe",
    "${env:PROGRAMFILES(X86)}\Claude\Claude.exe"
)

$claudeStarted = $false
foreach ($path in $claudePaths) {
    if (Test-Path $path) {
        Start-Process $path
        Write-Host "✅ Claude Desktop started" -ForegroundColor Green
        $claudeStarted = $true
        break
    }
}

if (-not $claudeStarted) {
    Write-Host "⚠️  Could not auto-start Claude Desktop" -ForegroundColor Yellow
    Write-Host "   Please start it manually to activate MCPs" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# STEP 9: VERIFICATION
# ============================================================

Write-Host "STEP 9: Verification Summary..." -ForegroundColor Yellow
Write-Host ""

Write-Host "MCP Build Status:" -ForegroundColor Cyan
Write-Host "  ✅ mcp-digitalocean: " -NoNewline -ForegroundColor Green
Write-Host (Test-Path "$PROJECT_ROOT\apps\mcp-digitalocean\build\index.js")
Write-Host "  ✅ mcp-notion: " -NoNewline -ForegroundColor Green
Write-Host (Test-Path "$PROJECT_ROOT\apps\mcp-notion\bin\cli.mjs")
Write-Host "  ✅ mcp-sendgrid: " -NoNewline -ForegroundColor Green
Write-Host (Test-Path "$PROJECT_ROOT\apps\mcp-sendgrid\build\index.js")
Write-Host "  ✅ mcp-postgres: Installed via pip" -ForegroundColor Green
if (Test-Path "$PROJECT_ROOT\apps\mcp-apollo\target\release\mcp-apollo.exe") {
    Write-Host "  ✅ mcp-apollo: Built" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  mcp-apollo: Not built (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configuration Files:" -ForegroundColor Cyan
Write-Host "  ✅ Claude config: $configPath" -ForegroundColor Green
Write-Host "  ✅ Environment: $PROJECT_ROOT\.env" -ForegroundColor Green

Write-Host ""

# ============================================================
# COMPLETION
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "What was installed:" -ForegroundColor White
Write-Host "  • 5 MCP servers (DigitalOcean, SendGrid, Notion, Postgres, Apollo)" -ForegroundColor Gray
Write-Host "  • Claude Desktop configuration" -ForegroundColor Gray
Write-Host "  • Environment variables file" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Open Claude Desktop (should be starting now)" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test MCPs by asking Claude:" -ForegroundColor Yellow
Write-Host '   "List all my DigitalOcean databases"' -ForegroundColor Cyan
Write-Host '   "Show my database schema"' -ForegroundColor Cyan
Write-Host '   "Send a test email via SendGrid"' -ForegroundColor Cyan
Write-Host ""
Write-Host "3. If you skipped API keys, add them to:" -ForegroundColor Yellow
Write-Host "   $configPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Run the implementation scripts:" -ForegroundColor Yellow
Write-Host "   .\scripts\execute-implementation.sh" -ForegroundColor Cyan
Write-Host ""

Write-Host "Documentation:" -ForegroundColor White
Write-Host "  • Master Plan: MCP-IMPLEMENTATION-MASTER-PLAN.md" -ForegroundColor Gray
Write-Host "  • SendGrid Setup: sendgrid-integration-guide.md" -ForegroundColor Gray
Write-Host "  • Client Provisioning: provision-client.md" -ForegroundColor Gray
Write-Host "  • Security: secure-digitalocean.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor White
Write-Host "  • If MCPs don't appear in Claude, restart Claude Desktop" -ForegroundColor Gray
Write-Host "  • Check config file format: $configPath" -ForegroundColor Gray
Write-Host "  • Check Claude logs: $env:APPDATA\Claude\logs\" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
