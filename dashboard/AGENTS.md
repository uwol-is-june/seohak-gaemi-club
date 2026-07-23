<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 디자인 시스템 (필독 · 강제)

**TRIGGER — 이 대시보드에서 UI/UX를 만들거나 바꾸는 모든 작업(새 화면·컴포넌트·페이지,
스타일/색/폰트/레이아웃 변경, 신규 위젯) 전에, 반드시 `docs/`의 가장 최근 `DESIGN-*.md`를
Read로 먼저 읽고 그 언어로 구현한다.** 이 단계를 건너뛰지 말 것. 임의의 색/폰트/그림자/라운드
값을 지어내지 말고, 항상 아래 토큰과 문서 수치를 사용한다.

- **현재 적용본: `../docs/DESIGN-x.ai.md`** (xAI 디자인 언어).
- 여러 `DESIGN-*.md`가 있으면 **가장 최근에 추가/수정된 것**이 현재 소스다 (사용자가 새 문서를 넣어
  방향을 교체하는 패턴). 확실치 않으면 `docs/`를 확인하고, 애매하면 사용자에게 어느 문서인지 묻는다.
- 과거 버전 `../docs/DESIGN-apple.md`(Apple 라이트)는 이력 — 현재 적용본 아님.

핵심 원칙 (요약 — 상세·수치는 문서 참조):
- **near-black 단일 캔버스**: 페이지 배경 canvas(#0a0a0a), 카드 canvas-card(#191919), 인풋/hover canvas-soft(#1a1c20). 라이트 모드 없음 — dark-canvas 전용.
- **화이트 pill이 전체 인터랙티브 어휘**: 대부분 아웃라인 pill(`rounded-full border border-hairline`), 주요 액션만 화이트-필 pill(`bg-white text-canvas`). 컬러 CTA 없음.
- **레이아웃은 대시보드 앱셸**: 좌측 고정 사이드바(nav row 활성표시 = **화이트-필** `bg-white text-canvas`, 모바일 가로 탭과 통일) + 메인 상단바. 모바일은 상단바 + 가로 탭.
- **타이포 = 두 얼굴**: 디스플레이/본문 Inter(Universal Sans 대체) **weight 400 절대 볼드 금지** + 음수 트래킹(`tracking-[-0.03em]`). 라벨/eyebrow는 **Geist Mono 대문자 + 양수 트래킹** → `.eyebrow` 클래스 사용.
- **그림자 금지**: 1px `border-hairline`(#212327)가 모든 elevation. 카드는 `rounded-lg`(8px).
- **컬러 액센트는 드물게**: sunset/dusk/breeze/twilight는 코드·데이터·포인트에만. 시맨틱 색(합격 emerald / 탈락 red / 손익)은 '데이터 의미'라 예외로 유지.

토큰은 `app/globals.css`의 `@theme`에 정의됨 → `bg-canvas bg-canvas-card bg-canvas-soft bg-canvas-mid text-ink text-body text-mute border-hairline text-breeze text-sunset text-twilight` + `.eyebrow` 클래스. 인라인 hex 지양.
