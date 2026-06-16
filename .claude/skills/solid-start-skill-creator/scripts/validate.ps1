#!/usr/bin/env pwsh
# Run the skill validator. Usable manually or as a pre-commit hook.
#
#   ./validate.ps1                 # validate all stacks (fails on any issue)
#   ./validate.ps1 -Stack express  # validate one stack
#   ./validate.ps1 -Report         # summarise slop counts, never fail
param(
    [string]$Stack = "",
    [switch]$Report
)

$ErrorActionPreference = "Stop"
$tools = Join-Path $PSScriptRoot ".." "tools" "validate.py"
$py = (Get-Command python -ErrorAction SilentlyContinue) ?? (Get-Command python3 -ErrorAction SilentlyContinue)
if (-not $py) { Write-Error "python not found on PATH"; exit 1 }

$argv = @($tools)
if ($Stack) { $argv += @("--stack", $Stack) } else { $argv += "--all" }
if ($Report) { $argv += "--report" }

& $py.Source @argv
exit $LASTEXITCODE
