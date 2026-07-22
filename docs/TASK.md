# TASK

> 진행할 태스크 목록. 새 태스크는 아래에 추가한다.

**모델 표기**: `(O)` Opus — 복잡·추론·설계 / `(S)` Sonnet — 일반 구현·리서치 / `(H)` Haiku — 단순·반복 작업

**진행상황**: `[ ]` 예정 · `[~]` 진행중 · `[x]` 완료

---

## 진행중 / 예정

### 🟢 토스증권 API 연동 — 보유 해외주식 메인 상단 표시

> 목표: 대시보드 홈 최상단에 내가 보유한 해외(미국) 주식 리스트를 실시간 표시.
> 인증: OAuth2 Client Credentials (server-to-server). Base URL `https://openapi.tossinvest.com`.
> ⚠️ 엔드포인트/필드명은 공식 문서(developers.tossinvest.com) 기준으로 1번에서 확정.

- [~] (S) **1. API 스펙 확정** — 확정: 토큰 `POST /oauth2/token`(Basic), 계좌목록 `GET /api/v1/accounts`, 보유종목 `GET /api/v1/holdings`(AssetApi). scope는 N/A(세분 권한 토글 없음). **IP 허용목록 필수 확인됨.** 남은 것: 실제 연결 후 잔고 **응답 필드명** 확정
- [x] (H) **2. env 설정** — `TOSS_APP_KEY`/`TOSS_APP_SECRET` 등록 완료 (`.env.local` + Vercel). 단일계좌라 `TOSS_ACCOUNT_NO`는 비움(코드가 자동 조회)
- [x] (O) **3. 토스 API 클라이언트** — `dashboard/lib/toss.ts`: 토큰 발급+메모리 캐싱, 계좌 자동 조회, 잔고 조회, 해외(비 KRW)만 정규화. 목업(`MOCK_HOLDINGS`) 포함
- [x] (S) **4. API 라우트** — `dashboard/app/api/holdings/route.ts`: 로그인 쿠키(`dash_auth`) 검증, `TOSS_MOCK=1`이면 목업 반환, 실패 시 502
- [x] (O) **5. 홈 상단 UI** — `page.tsx` `HoldingsBanner`를 홈 최상단에 배치. 총 평가액/손익 + 종목별 카드(티커/손익률/평가액/수량·평단), 로딩·에러·빈·목업 배지 상태 처리
- [ ] (S) **6. 검증·배포** — ⬜ 실제 연결(IP 해결) 후 목업 필드 vs 실응답 대조 → `TOSS_MOCK=0` 전환 → 로컬 확인 → Vercel 배포·프로덕션 확인

### 🔎 확인 필요 / 미해결
- **[현재 블로커] IP 허용목록** — 연결 테스트 결과 토스가 IP 화이트리스트 요구 확인됨. 자리 이동으로 IP 바뀌어 재등록 대기 중. 유동 IP라 바뀔 때마다 재등록 필요
- **Vercel 배포 시 IP 문제** — 서버리스 IP 비고정 → 허용목록과 충돌. 고정 IP 프록시/게이트웨이 또는 고정 IP 서버(VPS) 필요 (태스크 6에서 해결)
- 토큰 만료 ~1시간, 서버리스 콜드스타트 → 현재 모듈 메모리 캐싱, 배포 방식 확정 후 재검토

## 완료

