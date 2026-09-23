<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 디자인 시스템 (필독 · 강제)

**TRIGGER — 이 대시보드에서 UI/UX를 만들거나 바꾸는 모든 작업(새 화면·컴포넌트·페이지,
스타일/색/폰트/레이아웃 변경, 신규 위젯) 전에, 반드시 `docs/`의 가장 최근 `DESIGN-*.md`를
Read로 먼저 읽고 그 언어로 구현한다.** 이 단계를 건너뛰지 말 것. 임의의 색/폰트/그림자/라운드
값을 지어내지 말고, 항상 아래 토큰과 문서 수치를 사용한다.

- **현재 적용본: [`../docs/DESIGN-toss.md`](../docs/DESIGN-toss.md)** (토스증권 레퍼런스 다크, 2026-09-23~).
- 과거 `../docs/DESIGN-x.ai.md`(xAI)·`DESIGN-apple.md`는 **폐기**다. x.ai 문서는 지금 코드와
  정면으로 어긋나므로(볼드 금지·그림자 없음·시맨틱 팔레트 없음) 그대로 적용하면 리뉴얼을 되돌린다.
- 여러 `DESIGN-*.md`가 있으면 **가장 최근 것**이 현재 소스다(사용자가 새 문서를 넣어 방향을
  교체하는 패턴). 애매하면 사용자에게 묻는다.

핵심 원칙 (요약 — 상세·수치·대비 실측값은 문서 참조):
- **색 축이 셋이고 절대 섞지 않는다.** 등락(`up`/`down`) · 판정(`success`/`danger`/`warn`) ·
  분류(`cat-1`~`cat-4`). 섞으면 "빗나감"이 "상승"으로 읽힌다.
- 🔴 **등락은 한국 관례 — 상승 빨강(`up`) / 하락 파랑(`down`).** 미국식(초록 상승)과 정반대.
  이 앱에선 **하락이 곧 진입 기회**라 진입 구간·래더 차수·"1차까지 N%"도 전부 `down` 파랑이다.
- 🔴 **색으로만 말하지 않는다.** 손익은 색+부호+도형 3겹. 직접 만들지 말고 `<Delta>` 를 쓴다 —
  프리미티브가 강제한다.
- **서페이스 단차가 위계를 진다. 카드에 보더를 두지 않는다.** canvas(#14181F) → canvas-card
  (#191F28) → canvas-soft(#232A35) → canvas-mid(#2E3742). 카드 안의 블록은 **반드시 한 단 위로**.
- **타이포**: Noto Sans KR(Toss Product Sans 대체), 제목 **weight 700**, 본문 15px.
  `tabular-nums` 는 `body` 에 전역으로 걸려 있다. **영문 대문자 eyebrow 금지** — 굵은 한글 라벨.
- **반경**: 카드 `rounded-2xl`(16px) · 내부 블록 `rounded-xl`(12px) · 칩 `rounded-full`.
  터치 타깃 최소 44px(`min-h-11`).
- **흰 pill 반전은 필터 칩에만.** 사이드바 현재 위치는 한 단 밝은 배경 + 굵은 글자.
  primary 액션(화면당 1개)은 토스 블루 fill(`bg-primary-press`).
- `primary`(#3182F6)는 **fill 전용** — 카드 위 4.46:1이라 본문 텍스트 금지.
  `faint`(#6B7684)는 **UI 전용** — 3.59:1이라 본문 금지.

**재사용 부품이 먼저다**: `components/primitives/` (Delta · StatusChip · TierBadge · Card ·
NavItem · Button). 직접 스타일링하기 전에 여기 있는지 본다.

**작업 후 반드시**: `python3 tools/check_design_tokens.py` — 토큰 오용을 기계가 막는다.

토큰 정본은 `app/globals.css` 의 `@theme` 이다(문서와 값이 갈리면 코드가 맞다). 인라인 hex 금지.
