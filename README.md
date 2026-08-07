# AI Berkshire — US Edition

> "Price is what you pay, value is what you get." — Warren Buffett

**AI Berkshire** is a collection of investment research Skills built on [Claude Code](https://claude.ai/code), focused on **US stock analysis** (NYSE/NASDAQ/S&P 500).

It systemizes the methodologies of four value investing masters — Buffett, Munger, Duan Yongping, and Li Lu — and delivers professional-grade research through AI Agents.

**One person + Claude = One investment research team.**

> **Attribution** — This project is a fork of [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire)
> (MIT), originally written for China/HK markets. This "US Edition" rewrites the Skills for
> US equities and adds a Supabase-backed dashboard, a call ledger with automated scoring,
> and sector funnel tooling. All credit for the original framework goes to the upstream authors.

---

## Quick Start

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Install Skills

```bash
git clone https://github.com/uwol-is-june/reality-escape-device.git
mkdir -p ~/.claude/commands
cp reality-escape-device/skills/*.md ~/.claude/commands/
```

### 3. Use

```bash
# Deep research
/investment-team Apple
/private-company-research SpaceX

# Earnings
/earnings-review Apple 2025Q4
/earnings-team Microsoft FY2025

# Sector screening
/industry-research AI Semiconductors
/industry-funnel S&P500 Fintech
/quality-screen Nasdaq 100
/investment-checklist AAPL, MSFT, GOOGL, AMZN

# Portfolio management
/portfolio-review AAPL 30%, MSFT 20%, NVDA 20%, Cash 30%
/thesis-tracker Apple
/news-pulse NVIDIA

# Idea generation & thinking tools
/bottleneck-hunter AI infrastructure
/dyp-ask What is Apple's real moat?
```

---

## Why Not Just Ask AI?

You can ask Claude directly: "Is Apple worth buying?" You'll get a balanced "on one hand... on the other hand..." analysis ending with "invest at your own risk."

**That analysis looks right, but you can't make a decision with it.**

AI Berkshire solves the problem of **analysis quality and decision discipline**:

| Regular AI | AI Berkshire |
|-----------|-------------|
| Balanced, non-committal | **Forced conclusion**: Buy / Pass / Gray zone with specific price targets |
| Single perspective | **4 masters in opposition**: Real conflicts that expose blind spots |
| No bias control | **5-layer anti-bias system** |
| LLM mental math (error-prone) | **Python decimal precision**, no floating point |
| Inconsistent format | **Reproducible structure**: same input → same output format |
| One context window | **4 parallel agents = 4x information volume** |

---

## 15 Skills

### Research
| Skill | Use Case |
|-------|----------|
| `/investment-team` | 4 agents in parallel — 4-masters comprehensive analysis |
| `/private-company-research` | Pre-IPO companies (SpaceX, Stripe, OpenAI, etc.) |
| `/bottleneck-hunter` | Megatrend supply chain bottleneck → listed company discovery |

### Earnings
| Skill | Use Case |
|-------|----------|
| `/earnings-review` | Read 10-K/10-Q directly, no second-hand research |
| `/earnings-team` | 4 masters parallel earnings interpretation → publishable article |

### Screening
| Skill | Use Case |
|-------|----------|
| `/industry-research` | Full sector value chain scan |
| `/industry-funnel` | Full market → ≤10 → 3 best picks |
| `/quality-screen` | 7 hard criteria to eliminate bad companies |
| `/investment-checklist` | Buffett pre-buy checklist, 6 gates, 10-minute decision |

### Portfolio
| Skill | Use Case |
|-------|----------|
| `/portfolio-review` | Position sizing, concentration, rebalancing |
| `/thesis-tracker` | Post-buy discipline: track if thesis is being disproved |
| `/news-pulse` | 10-minute stock move attribution |

### Tools
| Skill | Use Case |
|-------|----------|
| `/dyp-ask` | Duan Yongping-style thinking on any question — roleplay, no data fetched; never cite as evidence |
| `/investment-article` | Convert a finished research report into a publishable blog/newsletter article |

### Shared Standards (not slash commands)
Reference documents in `skills/`, consulted by the skills above. They are **not** installed to
`~/.claude/commands/` because invoking them produces no output.

| Document | Defines |
|----------|---------|
| `skills/data-confidence.md` | Confidence tiers (🟢🟡🔴⬛), claim-type tags, and the `<!-- confidence-summary -->` block the dashboard parses |
| `skills/financial-data.md` | Source priority, cross-validation error thresholds (1% / 5%), SEC filing types |
| `skills/token-budget.md` | Hard rules TB-1~TB-7 — no grandchild agents, retry once, reuse recent output |

---

## Data Sources

| Priority | Source | URL |
|---------|--------|-----|
| Primary | macrotrends | macrotrends.net/stocks/charts/{TICKER} |
| Secondary | stockanalysis | stockanalysis.com/stocks/{ticker}/financials |
| Official filings | SEC EDGAR | sec.gov/cgi-bin/browse-edgar |
| Screening | Finviz | finviz.com/screener |
| News | Yahoo Finance | finance.yahoo.com |
| Analysis | Seeking Alpha | seekingalpha.com |

All data sources are **free and publicly accessible** — no API keys required.

---

## Architecture

```
┌──────────────────────────────────────────┐
│           You (Team Lead)                │
│     Coordinate · Synthesize · Decide     │
├──────────┬──────────┬──────────┬─────────┤
│ Agent 1  │ Agent 2  │ Agent 3  │ Agent 4 │
│ Business │Financial │ Industry │  Risk & │
│  Model   │Valuation │ Analysis │  Mgmt   │
│  (DYP)   │(Buffett) │ (Munger) │ (Li Lu) │
└──────────┴──────────┴──────────┴─────────┘
     ↓ parallel research, real-time progress ↓
              Final Synthesis Report
```

**Three-layer design:**
- **Skill Layer**: 15 entry points covering the full investment lifecycle
- **Agent Layer**: 4 independent agents per skill — they research, argue, and challenge each other
- **Tool Layer**: Precise calculation (`financial_rigor.py`), pre-publish data audit (`report_audit.py`), stock screening

---

## Python Tools

### Financial Rigor (`tools/financial_rigor.py`)

LLM mental math is unreliable. AI Berkshire calls Python for all calculations:

```bash
# Market cap verification
python3 tools/financial_rigor.py verify-market-cap \
  --price 189.30 --shares 15.4e9 --reported 2.915e12 --currency USD

# Valuation metrics
python3 tools/financial_rigor.py verify-valuation \
  --price 189.30 --eps 6.57 --bvps 3.77 --fcf-per-share 7.12 --dividend 1.00

# Cross-validate data from multiple sources
python3 tools/financial_rigor.py cross-validate \
  --field revenue --values '{"macrotrends": 391035, "stockanalysis": 391035}' --unit M

# Three-scenario valuation
python3 tools/financial_rigor.py three-scenario \
  --price 189.30 --eps 6.57 --shares 15.4 \
  --growth 0.12 0.08 0.03 \
  --pe 28 24 18 --years 3 --currency USD
```

All calculations use Python `decimal.Decimal` — no floating-point drift.

### Report Audit (`tools/report_audit.py`)

Pre-publish data verification: randomly samples 15% of financial figures in a report and issues a pass/fail verdict after cross-checking against external sources.

```bash
# Step 1 — extract checklist
python3 tools/report_audit.py extract --report reports/Apple/FinalReport.md

# Step 2 — manually fill in fetched_value from macrotrends / stockanalysis / SEC

# Step 3 — verdict
python3 tools/report_audit.py verdict --results '[...]'
```

Handles parenthesized negatives `(123.4)`, English scale units `K / mn / bn`, and non-standard table structures. Zero external dependencies.

---

## 4 Masters Framework

```
              ┌──────────────────┐
              │  Duan Yongping   │
              │  "Right Business"│
              │  Business Model  │
              └────────┬─────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐    ┌──────────┐     ┌─────────┐
│ Buffett │    │  Munger  │     │  Li Lu  │
│  Moat   │    │ Inversion│     │Civiliz. │
│Valuation│    │ Risk List│     │  Trend  │
│  Mgmt   │    │Bias Check│     │ 20-year │
└─────────┘    └──────────┘     └─────────┘
```

The four masters are designed to **challenge each other**:
- DYP says "great business" → Munger asks "how does it die?"
- Buffett says "cheap enough" → Li Lu asks "will it exist in 10 years?"

---

## Roadmap

- [x] Multi-agent parallel research team — 4-masters comprehensive analysis (`/investment-team`)
- [x] Buffett pre-buy checklist (`/investment-checklist`)
- [x] Sector research & funnel (`/industry-research` + `/industry-funnel`)
- [x] Pre-IPO company research (`/private-company-research`)
- [x] Financial rigor toolkit (precise math, market cap verification, cross-validation)
- [x] Stock price move attribution (`/news-pulse`)
- [x] Earnings analysis (`/earnings-review` + `/earnings-team`)
- [x] Portfolio management (`/portfolio-review`)
- [x] Thesis tracking (`/thesis-tracker`)
- [x] Quality screen — 7 hard criteria (`/quality-screen`)
- [ ] Real-time price alerts (smartphone push notifications)
- [ ] SEC EDGAR direct integration
- [ ] Historical backtest: AI reports vs. actual stock performance

---

## Disclaimer

This project is for educational and research purposes only. Nothing here constitutes investment advice. Always do your own due diligence (DYOR).

---

## License

MIT License — see [LICENSE](LICENSE).

Copyright (c) 2026 xbtlin (original work) and uwol-is-june (US Edition).
Derived from [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire) under the MIT License.

---

> "The best investment you can make is in yourself." — Warren Buffett
>
> AI Berkshire: Give everyone their own investment research team.
