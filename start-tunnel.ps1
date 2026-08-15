# ============================================================
# start-tunnel.ps1 —— Cloudflare 隧道自愈脚本
# 作用：
#   1. 启动 cloudflared 把本机 3002 端口暴露到公网
#   2. 每 1.5 秒监控日志，抓到新的 https://xxx.trycloudflare.com
#   3. 自动把新地址 POST 给本机服务(/api/public)，攻击者控制台二维码自动更新
#   4. 隧道掉线(免费临时隧道常见)后自动重启，无需人工干预
# 用法：双击 start-tunnel.bat，或 powershell -ExecutionPolicy Bypass -File start-tunnel.ps1
# 退出：按 Ctrl+C
# ============================================================
$ErrorActionPreference = 'SilentlyContinue'
$origin = 'http://localhost:3002'
$api = 'http://localhost:3002/api/public'
$log = Join-Path $PSScriptRoot 'tunnel.log'
$last = ''

while ($true) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] 启动 Cloudflare 隧道 -> $origin"
    if (Test-Path $log) { Remove-Item $log -Force }

    $proc = Start-Process -FilePath 'cloudflared' `
        -ArgumentList @('tunnel', '--url', $origin, '--protocol', 'http2', '--no-autoupdate') `
        -RedirectStandardOutput $log -NoNewWindow -PassThru

    $reported = $last
    while (-not $proc.HasExited) {
        Start-Sleep -Milliseconds 1500
        if (Test-Path $log) {
            $content = Get-Content $log -Raw
            if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
                $url = $Matches[0].TrimEnd()
                if ($url -and $url -ne $reported) {
                    $reported = $url
                    if ($url -ne $last) {
                        $last = $url
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 新隧道地址: $url"
                        try {
                            Invoke-RestMethod -Uri $api -Method Post -ContentType 'application/json' `
                                -Body (@{ url = $url } | ConvertTo-Json) | Out-Null
                            Write-Host '          -> 已自动同步到攻击者控制台 (二维码已更新)'
                        } catch {
                            Write-Host '          -> 本机服务未启动，无法同步（请先运行 node server.js）'
                        }
                    }
                }
            }
        }
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 隧道进程退出，3 秒后自动重启..."
    Start-Sleep -Seconds 3
}
