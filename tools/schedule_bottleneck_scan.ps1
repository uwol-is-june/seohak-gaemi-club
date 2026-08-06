# 병목 신호 일일 스캔 — Windows 작업 스케줄러가 매일 09:00(KST)에 실행한다.
#
# 왜 로컬 스케줄러인가:
#   Claude Code의 세션 크론(CronCreate)은 세션이 살아 있을 때만 돌고 창을 닫으면 사라진다.
#   클라우드 루틴(/schedule)은 세션과 무관하게 돌지만 **로컬 환경변수에 접근할 수 없어**
#   dashboard/.env.local 의 SUPABASE_SERVICE_KEY 를 못 읽는다 → 발행이 안 되고 대시보드
#   '병목 신호' 탭이 비게 된다. 이 저장소에서 스캔 → 발행 → 대시보드까지 이어지는 유일한
#   경로가 로컬 실행이다. (대가: 09:00에 PC가 켜져 있어야 한다.)
#
# 등록/해제:
#   등록 확인:  schtasks /query /tn "AI-Berkshire-Bottleneck-Scan"
#   즉시 실행:  schtasks /run   /tn "AI-Berkshire-Bottleneck-Scan"
#   해제:       schtasks /delete /tn "AI-Berkshire-Bottleneck-Scan" /f
#
# 수동 테스트:  powershell -ExecutionPolicy Bypass -File tools/schedule_bottleneck_scan.ps1
# 배관만 점검(스캔 실행 없음, 토큰 0):                        ... -File tools/schedule_bottleneck_scan.ps1 -DryRun
#
# ⚠️ 이 파일은 **UTF-8 BOM**으로 저장해야 한다. 작업 스케줄러가 호출하는 powershell.exe(5.1)는
# BOM 없는 .ps1 을 ANSI(CP949)로 읽어 한글이 깨지고 문자열이 끊긴다(2026-08-06 실측).

param(
  # 배관(경로·로그·발행 호출)만 확인하고 실제 스캔은 건너뛴다.
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# ─── 저장소 루트 (스크립트 위치 기준 — 절대경로 하드코딩 금지, CLAUDE.md 경로 규칙) ───
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logDir = Join-Path $repoRoot 'logs\bottleneck-scan'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log = Join-Path $logDir "$stamp.log"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
}

Write-Log "병목 스캔 시작 (repo: $repoRoot)"

# ─── 추적 대상 트렌드 ───
# 이미 섹터 리서치를 마쳐 물리적 병목이 실재하는 것만. 5개 전부 돌리면 토큰만 태운다.
# 트렌드를 바꾸려면 이 줄만 고친다.
$trends = 'AI 인프라(데이터센터 전력·냉각·광통신), 국방 현대화, 구리·전력망'

# 스캔 프롬프트 — 클라우드가 아닌 로컬이지만 세션 컨텍스트가 없는 새 실행이라
# 자기완결적으로 쓴다. 슬래시 커맨드 대신 스킬 문서를 직접 지목해 설치본 불일치를 피한다.
$prompt = @"
skills/bottleneck-hunter.md 의 '일일 스캔 모드' 절차를 그대로 실행한다.

추적 대상 트렌드: $trends

지켜야 할 것:
1. 새 신호가 없으면 **보고서 파일을 만들지 않는다**. 콘솔에 '새 신호 없음'만 출력하고 끝낸다.
   빈 결과가 정상이다 — 억지로 파일을 만들지 말 것.
2. 보고서를 만들 때는 경로·파일명 규약을 정확히 지킨다:
   reports/bottleneck-map/{오늘 날짜 YYYY-MM-DD}/09-00-{티커들}.md  (투자 대상 발견)
   reports/bottleneck-map/{오늘 날짜 YYYY-MM-DD}/09-00-신호스캔.md   (신호만, 대상 없음)
   파일명에 티커를 넣는 것은 **밸류에이션 확인(PS·PER)까지 통과한 기업만**이다.
3. 재무 수치를 못 구한 기업은 신호 강도 ★★를 넘기지 않는다. 추측으로 채우지 않는다.
4. 서브에이전트를 스폰하지 않는다(TB-1). 이 스캔은 단일 컨텍스트로 끝낸다.
5. master-map.md / watchlist.md 에 변화가 있으면 갱신한다.
"@

# ─── Claude Code 헤드리스 실행 ───
# --allowedTools: 무인 실행이라 권한 프롬프트에서 멈추면 안 된다. 필요한 도구만 명시적으로
# 허용한다(bypassPermissions 같은 전면 우회는 쓰지 않는다).
$claude = Join-Path $env:APPDATA 'npm\claude.cmd'
if (-not (Test-Path $claude)) {
  Write-Log "ERROR: claude CLI를 찾을 수 없음 ($claude)"
  exit 1
}

# --allowedTools 는 가변 인자(<tools...>)다 → 콤마로 이은 한 덩어리가 아니라 개별 인자로 넘긴다.
$allowedTools = @(
  'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'Bash(python3 tools/*)'   # financial_rigor.py 등 보조 계산만 허용
)
$claudeArgs = @('-p', $prompt, '--allowedTools') + $allowedTools

if ($DryRun) {
  Write-Log "DRY RUN — 스캔을 건너뛴다 (claude: $claude)"
  Write-Log "프롬프트 길이: $($prompt.Length)자, 트렌드: $trends"
  Write-Log "허용 도구: $($allowedTools -join ' ')"
} else {
  try {
    & $claude @claudeArgs 2>&1 | ForEach-Object { Add-Content -Path $log -Value $_ -Encoding utf8 }
    Write-Log "스캔 완료 (exit: $LASTEXITCODE)"
  } catch {
    Write-Log "ERROR: 스캔 실패 — $_"
  }
}

# ─── Supabase 발행 (안전망) ───
# 정상적으로는 Stop 훅이 발행하지만, 헤드리스 실행에서 훅이 돌지 않아도 신호가 대시보드에
# 도달하도록 명시적으로 한 번 더 돌린다. publish_changed_reports.py 는 git status 기반
# 멱등 동작이라 이미 발행됐으면 대상 0건으로 조용히 끝난다.
try {
  $publishArgs = @('tools/publish_changed_reports.py')
  if ($DryRun) { $publishArgs += '--dry-run' }
  python3 @publishArgs 2>&1 | ForEach-Object { Add-Content -Path $log -Value $_ -Encoding utf8 }
  Write-Log "발행 확인 완료"
} catch {
  Write-Log "WARN: 발행 실패 — 다음 세션의 Stop 훅이 재시도한다. ($_)"
}

# 로그는 30일치만 유지(무한 증식 방지).
Get-ChildItem $logDir -Filter '*.log' |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

Write-Log "종료"
