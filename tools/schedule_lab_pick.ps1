# 실험실 주간 추천 — Windows 작업 스케줄러가 매주 월요일 09:05(KST)에 실행한다. (TASK-190)
#
# 구조는 병목 스캔(schedule_bottleneck_scan.ps1)과 같다 — 로컬 실행이어야 하는 이유도 같다:
#   클라우드 루틴은 이 PC 의 reports/·data/ 에 쓰지 못하고, 이 저장소는 public 이라 push 로 우회하면
#   픽이 공개된다. 대가: 09:05 에 PC 가 켜져 있어야 한다(꺼져 있었으면 켜지는 대로 돈다).
#
# 단계:
#   ① python3 tools/lab_screen.py   — S&P 500 기계 필터(토큰 0, 약 2분). Claude 가 실패해도 후보 순위는 남는다.
#   ② claude -p (stdin)             — skills/lab-pick.md 결격 검증 → 보고서 + 판단 기록부
#   ③ 기록 확인                      — data/lab-calls.jsonl 에 이번 실행일 기록이 생겼나(조용한 실패 감지)
#   ④ python3 tools/commit_reports.py — 로컬 커밋
#   ⑤ git push                       — 공개 페이지(site/lab · Vercel) 갱신
#
# 왜 월요일 09:05 인가(2026-10-02 사용자 요청으로 08:30 → 09:05): 사용자가 깨어 있는 시간이고, 금요일 미국 종가가
# 반영돼 있으며, 미국 장 개장(22:30) 전이다. ⚠️ 병목 스캔(매일 09:00)과 몇 분 겹칠 수 있다 —
# 두 헤드리스 Claude 가 동시에 OAuth 를 갱신하면 충돌하므로 아래의 1회 재시도(120초 뒤)가 그걸 흡수한다.
#
# 등록/해제:
#   등록:      schtasks /create /tn "AI-Berkshire-Lab-Pick" /sc weekly /d MON /st 09:05 /tr "powershell -NoProfile -ExecutionPolicy Bypass -File \"<저장소>\tools\schedule_lab_pick.ps1\""
#   확인:      schtasks /query /tn "AI-Berkshire-Lab-Pick"
#   즉시 실행: schtasks /run   /tn "AI-Berkshire-Lab-Pick"
#   해제:      schtasks /delete /tn "AI-Berkshire-Lab-Pick" /f
#
# 배관만 점검(스크리닝·Claude 실행 없음, 토큰 0):  ... -File tools/schedule_lab_pick.ps1 -DryRun
#
# ⚠️ 이 파일은 **UTF-8 BOM**으로 저장해야 한다. 작업 스케줄러가 호출하는 powershell.exe(5.1)는
# BOM 없는 .ps1 을 ANSI(CP949)로 읽어 한글이 깨지고 문자열이 끊긴다(2026-08-06 실측).

param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

# ─── 저장소 루트 (스크립트 위치 기준 — 절대경로 하드코딩 금지) ───
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logDir = Join-Path $repoRoot 'logs\lab-pick'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$log = Join-Path $logDir ("{0}.log" -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
}

# 네이티브 호출 헬퍼 — 5.1 의 'Stop' + 2>&1 조합은 stderr 한 줄에 NativeCommandError 로 끊긴다.
function Invoke-Native([scriptblock]$block) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $block 2>&1 | ForEach-Object { Add-Content -Path $log -Value ([string]$_) -Encoding utf8 }
  } finally {
    $ErrorActionPreference = $prev
  }
  return $LASTEXITCODE
}

# 로그의 N번째 줄 이후에 패턴이 있는가 — 재시도 판정은 **이번 시도의 출력만** 봐야 한다.
function Test-LogSince([int]$fromLine, [string]$pattern) {
  $lines = @(Get-Content -Path $log -Encoding utf8)
  if ($lines.Count -le $fromLine) { return $false }
  return [bool]($lines[$fromLine..($lines.Count - 1)] | Select-String -Pattern $pattern -SimpleMatch -Quiet)
}

$today = Get-Date -Format 'yyyy-MM-dd'
$stamp = Get-Date -Format 'yyyyMMdd'
$screen = "data/_lab/screen-$stamp.json"
Write-Log "실험실 주간 추천 시작 (repo: $repoRoot, 실행일 $today)"

# ─── ① 기계 필터 ───
if ($DryRun) {
  Write-Log "DRY RUN — 스크리닝 건너뜀 (python3 tools/lab_screen.py)"
} else {
  $code = Invoke-Native { python3 tools/lab_screen.py }
  if ($code -ne 0 -or -not (Test-Path $screen)) {
    Write-Log "ERROR: 스크리닝 실패 (exit: $code, 파일: $screen 없음) — Claude 단계를 건너뛴다"
    exit 1
  }
  Write-Log "스크리닝 완료 → $screen"
}

# ─── ② Claude 결격 검증 ───
$prompt = @"
skills/lab-pick.md 의 절차를 그대로 실행한다.

이번 실행 정보:
- 실행일: $today (주간 자동 실행 · 헤드리스)
- 스크리닝은 방금 끝났다: $screen — 다시 돌리지 않는다.

지켜야 할 것:
1. 사용자에게 아무것도 묻지 않는다. 애매하면 스킬 문서의 '판정 규칙(애매할 때의 기본값)'을 따른다.
2. 서브에이전트를 스폰하지 않는다(TB-1). 검색 상한(종목당 WebSearch 4 · WebFetch 2)을 지킨다.
3. 보고서는 reports/lab/lab-pick-$stamp.md 에 Write 1회로 쓰고, 반드시 python3 tools/lab_record.py 로 기록한다.
4. lab_record.py 가 오류를 내면 메시지대로 고쳐서 다시 기록한다. 우회하지 않는다.
5. data/calls.jsonl · tools/record_call.py · reports/{티커}/ 는 건드리지 않는다.
"@

$claude = Join-Path $env:APPDATA 'npm\claude.cmd'
if (-not (Test-Path $claude)) {
  Write-Log "ERROR: claude CLI를 찾을 수 없음 ($claude)"
  exit 1
}
# 결격 검증에 필요한 도구만 허용한다(전면 우회 금지). Edit 은 주지 않는다 — 보고서는 Write 1회다.
$allowedTools = @(
  'Read', 'Write', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'Bash(python3 tools/*)'
)
# 🔴 프롬프트는 stdin 으로 — claude.cmd 인자로 여러 줄을 넘기면 첫 줄에서 잘리고 --allowedTools 가 사라진다.
$claudeArgs = @('-p', '--allowedTools') + $allowedTools

function Invoke-Claude {
  $from = @(Get-Content -Path $log -Encoding utf8).Count
  $code = Invoke-Native { $prompt | & $claude @claudeArgs }
  return @{ Code = $code; From = $from }
}

if ($DryRun) {
  Write-Log "DRY RUN — Claude 건너뜀 (claude: $claude)"
  Write-Log "프롬프트 $($prompt.Length)자 · $(($prompt -split "`n").Count)줄 (stdin), 허용 도구: $($allowedTools -join ' ')"
} else {
  try {
    $r = Invoke-Claude
    # OAuth 갱신 충돌(다른 Claude 프로세스가 동시에 갱신 중)은 일시적이다 → 2분 뒤 **1회만** 재시도(TB-2).
    if (Test-LogSince $r.From 'Failed to refresh OAuth token') {
      Write-Log "WARN: OAuth 토큰 갱신 충돌 — 120초 뒤 1회 재시도"
      Start-Sleep -Seconds 120
      $r = Invoke-Claude
    }
    if (Test-LogSince $r.From "haven't granted it yet") {
      Write-Log "ERROR: 도구 권한 거부 감지 — --allowedTools 가 전달되지 않았을 수 있다 (exit: $($r.Code))"
    } elseif ($r.Code -ne 0) {
      Write-Log "ERROR: Claude 실행 실패 (exit: $($r.Code)) — 로그 위쪽 출력을 확인"
    } else {
      Write-Log "Claude 실행 종료 (exit: 0)"
    }
  } catch {
    Write-Log "ERROR: Claude 실행 예외 — $_"
  }

  # ─── ③ 기록 확인 — exit 0 이어도 기록이 없으면 실패다 ───
  $recorded = $false
  if (Test-Path 'data/lab-calls.jsonl') {
    $recorded = [bool](Select-String -Path 'data/lab-calls.jsonl' -Pattern "`"date`": `"$today`"" -SimpleMatch -Quiet)
  }
  if ($recorded) {
    Write-Log "기록 확인: data/lab-calls.jsonl 에 $today 실행 기록 있음"
  } else {
    Write-Log "ERROR: $today 실행 기록이 판단 기록부에 없다 — 후보 순위($screen)는 있으니 수동으로 /lab-pick 실행"
  }
}

# ─── ④ 로컬 커밋 (안전망 — 헤드리스에서는 Stop 훅이 안 돌 수 있다) ───
try {
  $publishArgs = @('tools/commit_reports.py')
  if ($DryRun) { $publishArgs += '--dry-run' }
  $code = Invoke-Native { python3 @publishArgs }
  Write-Log "커밋 확인 완료 (exit: $code)"
} catch {
  Write-Log "WARN: 커밋 실패 — 다음 세션의 Stop 훅이 재시도한다. ($_)"
}

# ─── ⑤ push — 공개 페이지(site/lab, Vercel)가 GitHub 에서 새 추천을 받아 간다 (2026-10-02 사용자 승인) ───
# 그 시점까지 쌓인 로컬 커밋(보고서 등)도 함께 올라간다 — 저장소는 이미 public 이다.
# 사용자의 미커밋 작업은 --autostash 로 잠시 치웠다가 그대로 되돌린다(커밋하지 않는다).
if ($DryRun) {
  Write-Log "DRY RUN — push 건너뜀"
} else {
  $code = Invoke-Native { git pull --rebase --autostash origin main }
  if ($code -ne 0) {
    Write-Log "ERROR: git pull --rebase 실패 (exit: $code) — push 하지 않는다. 충돌을 손으로 풀고 push 할 것"
  } else {
    $code = Invoke-Native { git push origin main }
    if ($code -ne 0) { Write-Log "ERROR: git push 실패 (exit: $code) — 공개 페이지가 갱신되지 않았다" }
    else { Write-Log "push 완료 → Vercel 이 site/lab 을 다시 배포한다" }
  }
}

Get-ChildItem $logDir -Filter '*.log' |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-90) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

Write-Log "종료"
