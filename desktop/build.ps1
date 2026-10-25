$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Windows .NET Framework C# compiler is required.' }
$output = Join-Path $PSScriptRoot 'Workshop-Desk.exe'
$icon = Join-Path $PSScriptRoot 'WorkshopDesk.ico'
$source = Join-Path $PSScriptRoot 'WorkshopDesk.cs'
& $compiler /nologo /target:winexe "/out:$output" "/win32icon:$icon" /reference:System.Windows.Forms.dll /reference:System.Core.dll $source
if ($LASTEXITCODE -ne 0) { throw 'Workshop Desk desktop build failed.' }
Write-Output $output
