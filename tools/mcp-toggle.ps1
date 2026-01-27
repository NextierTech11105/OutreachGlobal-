# MCP Toggle Script for Claude Code
# Usage: .\tools\mcp-toggle.ps1 [enable|disable|status]

param(
    [Parameter(Position=0)]
    [ValidateSet('enable', 'disable', 'status')]
    [string]$Action = 'status'
)

$mcpActive = ".mcp.json"
$mcpDisabled = ".mcp.disabled.json"
$projectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $projectRoot

switch ($Action) {
    'enable' {
        if (Test-Path $mcpDisabled) {
            if (Test-Path $mcpActive) {
                Remove-Item $mcpActive -Force
            }
            Rename-Item $mcpDisabled $mcpActive
            Write-Host "MCP servers ENABLED. Restart Claude Code to apply." -ForegroundColor Green
        } elseif (Test-Path $mcpActive) {
            Write-Host "MCP servers already enabled." -ForegroundColor Yellow
        } else {
            Write-Host "No MCP config found. Copy .mcp.json.example to .mcp.json" -ForegroundColor Red
        }
    }
    'disable' {
        if (Test-Path $mcpActive) {
            if (Test-Path $mcpDisabled) {
                Remove-Item $mcpDisabled -Force
            }
            Rename-Item $mcpActive $mcpDisabled
            Write-Host "MCP servers DISABLED. Restart Claude Code to apply." -ForegroundColor Yellow
        } elseif (Test-Path $mcpDisabled) {
            Write-Host "MCP servers already disabled." -ForegroundColor Yellow
        } else {
            Write-Host "No MCP config found." -ForegroundColor Red
        }
    }
    'status' {
        if (Test-Path $mcpActive) {
            Write-Host "MCP Status: ENABLED" -ForegroundColor Green
            $config = Get-Content $mcpActive | ConvertFrom-Json
            Write-Host "Configured servers:" -ForegroundColor Cyan
            $config.mcpServers.PSObject.Properties | ForEach-Object {
                Write-Host "  - $($_.Name)" -ForegroundColor White
            }
        } elseif (Test-Path $mcpDisabled) {
            Write-Host "MCP Status: DISABLED" -ForegroundColor Yellow
        } else {
            Write-Host "MCP Status: NOT CONFIGURED" -ForegroundColor Red
            Write-Host "Copy .mcp.json.example to .mcp.json to get started." -ForegroundColor Gray
        }
    }
}
