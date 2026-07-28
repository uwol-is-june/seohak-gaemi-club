import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // app/api/calls/route.ts 가 콜 원장을 `path.join(process.cwd(), "..", "data", "calls.jsonl")`
    // 로 읽는다 — 원장은 리포 루트의 git 추적 append-only 단일 소스라 tools/record_call.py,
    // tools/score_calls.py 와 경로를 공유해야 하므로 dashboard/ 안으로 옮길 수 없다.
    // 이 `..` 때문에 Turbopack NFT(파일 트레이싱)가 상위 프로젝트 전체를 훑고 경고를 낸다.
    // 이 대시보드는 로컬 전용(npm run dev)이고 `output: "standalone"` 을 쓰지 않아
    // NFT 결과물이 소비되지 않는다 → 기능 영향 없는 표시상 경고라 좁게 억제한다.
    // 원장 경로 정책이 바뀌면 이 항목을 지우고 경고가 사라졌는지 확인할 것.
    ignoreIssue: [
      {
        path: "**/next.config.ts",
        title: "Encountered unexpected file in NFT list",
      },
    ],
  },
};

export default nextConfig;
