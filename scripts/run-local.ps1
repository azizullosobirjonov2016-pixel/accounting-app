# Loyihani Google Drive papkasidan (manba) lokal diskka sinxronlab, serverni ishga tushiradi.
# Sabab: Google Drive sinxronizatsiyasi npm install paytida ko'p sonli kichik fayl yozishga xalaqit beradi.
# Foydalanish: G: diskdagi manba fayllarni tahrirlang, so'ng shu skriptni ishga tushiring.

$ErrorActionPreference = 'Stop'

$src = Split-Path -Parent $PSScriptRoot
$dst = "C:\Users\user\accounting-app-run"
$nodeDir = "C:\Program Files\nodejs"
$env:Path = "$nodeDir;$env:Path"

Write-Host "Sinxronlanmoqda: $src -> $dst"
robocopy $src $dst /MIR /XD .git node_modules /XF accounting.db *.pkg-hash /NFL /NDL /NJH /NJS | Out-Null

Set-Location $dst

$pkgHashFile = "$dst.pkg-hash"
$currentHash = (Get-FileHash (Join-Path $src "package.json")).Hash
$needsInstall = $true

if ((Test-Path $pkgHashFile) -and (Test-Path (Join-Path $dst "node_modules"))) {
    $prevHash = (Get-Content $pkgHashFile -Raw).Trim()
    if ($prevHash -eq $currentHash) {
        $needsInstall = $false
    }
}

if ($needsInstall) {
    Write-Host "package.json o'zgargan yoki node_modules yo'q -- npm install ishga tushirilmoqda..."
    npm install
    npm approve-scripts --allow-scripts-pending 2>$null
    Set-Content -Path $pkgHashFile -Value $currentHash
} else {
    Write-Host "Bog'liqliklar yangilangan holatda, npm install o'tkazib yuborildi."
}

Write-Host ""
Write-Host "Server ishga tushmoqda: http://localhost:5000"
Write-Host "To'xtatish uchun: Ctrl+C"
Write-Host ""

node server.js
