-- AI Berkshire 대시보드 — Supabase 스키마
-- 적용: Supabase 프로젝트 > SQL Editor 에 붙여넣고 실행(1회). 재실행 안전(idempotent).
--
-- 접근 모델: 대시보드는 모든 DB 접근을 서버 사이드 API 라우트에서 service_role 키로 수행한다.
-- 따라서 RLS를 켜되 정책을 두지 않아 anon/public 키로는 아무것도 못 읽게 막고,
-- service_role(서버 전용)만 RLS를 우회해 접근한다. anon 키는 클라이언트에 노출하지 않는다.

-- ─── reports: 보고서 본문 + 파생 메타데이터 ────────────────────────────────
create table if not exists reports (
  path         text primary key,                    -- 예: reports/WST/WST-checklist-20260723.md
  company      text,                                 -- 티커(정규화); 루트(섹터/스크리닝) 보고서는 null
  name         text not null,                        -- 파일명 (예: WST-checklist-20260723.md)
  content      text not null,                        -- 마크다운 본문
  summary      text,                                 -- 열등주 스크리닝 판정(통과/면제 통과/탈락/데이터 부족); 해당 없으면 null
  confidence   text,                                 -- 데이터 신뢰도(높음/보통/낮음); 없으면 null
  committed_at timestamptz not null default now(),   -- as-of(신선도) 기준 시각
  updated_at   timestamptz not null default now()
);

create index if not exists reports_company_idx on reports (company);

alter table reports enable row level security;
-- 정책 없음 = anon 접근 차단. service_role은 RLS 우회.

-- ─── app_config: 대시보드 앱 상태(섹터 그룹 등) key-value ──────────────────
create table if not exists app_config (
  key        text primary key,                       -- 예: 'sector_groups'
  value      jsonb not null,                         -- 임의 JSON (섹터 그룹 배열 등)
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;
-- 정책 없음 = anon 접근 차단. service_role은 RLS 우회.
