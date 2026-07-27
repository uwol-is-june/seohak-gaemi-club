#!/usr/bin/env python3
"""Financial Rigor Toolkit for AI Berkshire.

Command-line tool for verifying financial data accuracy during investment research.
Automatically called by Claude Code Skills at critical validation checkpoints.

Zero external dependencies — uses only Python stdlib (decimal, json, math, argparse).
Requires Python >= 3.7.

Usage (called automatically by Skills, no manual execution needed):
    python3 tools/financial_rigor.py verify-market-cap --price 510 --shares 9.11e9 --reported 4.65e12 --currency USD
    python3 tools/financial_rigor.py verify-valuation --price 510 --eps 23.5 --bvps 120 --fcf-per-share 18 --dividend 2.4
    python3 tools/financial_rigor.py cross-validate --field revenue --values '{"Annual Report": 7518, "Yahoo": 7500, "StockAnalysis": 7520}' --unit B
    python3 tools/financial_rigor.py benford --values '[1234, 2345, 3456, ...]'
        # benford requires >=50 values for a statistically valid check — use multi-year/
        # multi-quarter cumulative data (e.g. several 10-Ks + earnings reports for one
        # ticker), not a single report's handful of headline figures.
    python3 tools/financial_rigor.py calc --expr '510 * 9.11e9'
"""

import argparse
import ast
import json
import math
import operator as _operator
import sys
from decimal import Decimal, Context, ROUND_HALF_EVEN, InvalidOperation

# 안전한 산술 평가기(TASK-67): eval 대신 AST 를 직접 걸어 +,-,*,/ 와 괄호만 허용한다.
# 문자 화이트리스트만으로는 9**9**9 같은 지수 DoS 를 막지 못하므로 ** 자체를 미허용한다.
_ARITH_BINOPS = {ast.Add: _operator.add, ast.Sub: _operator.sub,
                 ast.Mult: _operator.mul, ast.Div: _operator.truediv}
_ARITH_UNARY = {ast.UAdd: _operator.pos, ast.USub: _operator.neg}


def _safe_arith(expr: str):
    def ev(n):
        if isinstance(n, ast.Constant):
            if isinstance(n.value, (int, float)) and not isinstance(n.value, bool):
                return n.value
            raise ValueError("숫자 상수만 허용됩니다")
        if isinstance(n, ast.BinOp) and type(n.op) in _ARITH_BINOPS:
            return _ARITH_BINOPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in _ARITH_UNARY:
            return _ARITH_UNARY[type(n.op)](ev(n.operand))
        raise ValueError("허용되지 않은 연산입니다")
    return ev(ast.parse(expr, mode="eval").body)

# ---------------------------------------------------------------------------
# Exact Decimal Engine (no floating-point drift)
# ---------------------------------------------------------------------------

_CTX = Context(prec=28, rounding=ROUND_HALF_EVEN)


def exact(value) -> Decimal:
    """Convert any numeric to exact Decimal, avoiding float traps."""
    if isinstance(value, Decimal):
        return value
    if isinstance(value, float):
        return Decimal(str(value))
    return Decimal(str(value))


def fmt_number(d: Decimal, unit: str = "") -> str:
    """Format large numbers in human-readable form (B/T)."""
    v = float(d)
    abs_v = abs(v)
    if abs_v >= 1e12:
        return f"{v/1e12:.2f}T"
    if abs_v >= 1e9:
        return f"{v/1e9:.2f}B"
    if abs_v >= 1e6:
        return f"{v/1e6:.2f}M"
    return f"{v:,.2f}"


# ---------------------------------------------------------------------------
# 1. Market Cap Verification (Price × Shares vs Reported Market Cap)
# ---------------------------------------------------------------------------

def verify_market_cap(price, shares, reported_cap, currency=""):
    """Verify market cap = price × shares, compare with reported value."""
    p = exact(price)
    s = exact(shares)
    r = exact(reported_cap)

    calculated = _CTX.multiply(p, s)
    deviation = abs(float(calculated - r) / float(r)) * 100 if r != 0 else 0

    print("=" * 60)
    print("Market Cap Verification")
    print("=" * 60)
    print(f"  Price:              {p} {currency}")
    print(f"  Shares:             {fmt_number(s)}")
    print(f"  Calculated Cap:     {fmt_number(calculated)} {currency}")
    print(f"  Reported Cap:       {fmt_number(r)} {currency}")
    print(f"  Deviation:          {deviation:.2f}%")
    print()

    if deviation > 5:
        print(f"  ❌ WARNING: Deviation {deviation:.1f}% > 5%, check:")
        print(f"     - Are shares up to date (buybacks/issuances)?")
        print(f"     - Are units consistent (USD vs HKD vs CNY)?")
        print(f"     - Is the price current?")
        return False
    elif deviation > 1:
        print(f"  ⚠️  Deviation {deviation:.1f}% within acceptable range — may be due to price movement or share count change")
        return True
    else:
        print(f"  ✅ 산술 일치 — 편차 {deviation:.2f}% (주의: 입력값이 옳다는 전제하의 계산 검증일 뿐, 사실 정확성 보장 아님)")
        return True


# ---------------------------------------------------------------------------
# 2. Valuation Metrics Verification
# ---------------------------------------------------------------------------

def verify_valuation(price, eps=None, bvps=None, fcf_per_share=None,
                     dividend=None, revenue_per_share=None):
    """Calculate and verify key valuation ratios from raw inputs."""
    p = exact(price)

    print("=" * 60)
    print("Valuation Metrics Verification")
    print("=" * 60)
    print(f"  Current Price: {p}")
    print()

    results = {}

    if eps is not None:
        e = exact(eps)
        if e != 0:
            pe = _CTX.divide(p, e)
            print(f"  PE (TTM):       {p} / {e} = {pe:.2f}x")
            results["PE"] = float(pe)
            ey = _CTX.divide(e, p) * 100
            print(f"  Earnings Yield: {ey:.2f}%")
        else:
            print(f"  PE: EPS is 0, cannot calculate")

    if bvps is not None:
        b = exact(bvps)
        if b != 0:
            pb = _CTX.divide(p, b)
            print(f"  PB:             {p} / {b} = {pb:.2f}x")
            results["PB"] = float(pb)
            if eps is not None and float(exact(eps)) != 0:
                roe = _CTX.divide(exact(eps), b) * 100
                print(f"  ROE:            {exact(eps)} / {b} = {roe:.2f}%")
                results["ROE"] = float(roe)

    if fcf_per_share is not None:
        f = exact(fcf_per_share)
        if f != 0:
            fcf_yield = _CTX.divide(f, p) * 100
            pfcf = _CTX.divide(p, f)
            print(f"  P/FCF:          {p} / {f} = {pfcf:.2f}x")
            print(f"  FCF Yield:      {fcf_yield:.2f}%")
            results["P_FCF"] = float(pfcf)
            results["FCF_Yield"] = float(fcf_yield)

    if dividend is not None:
        d = exact(dividend)
        if p != 0:
            div_yield = _CTX.divide(d, p) * 100
            print(f"  Dividend Yield: {d} / {p} = {div_yield:.2f}%")
            results["Dividend_Yield"] = float(div_yield)

    if revenue_per_share is not None:
        r = exact(revenue_per_share)
        if r != 0:
            ps = _CTX.divide(p, r)
            print(f"  PS:             {p} / {r} = {ps:.2f}x")
            results["PS"] = float(ps)

    print()
    print("  ✅ 모든 지표를 정확 십진 연산으로 계산 — 부동소수점 오차 없음")
    print("     (주의: '산술의 정확성'만 보장. 입력한 가격·EPS 등이 실제와 맞는지는 검증하지 않음)")
    return results


# ---------------------------------------------------------------------------
# 3. Cross-Source Data Validation
# ---------------------------------------------------------------------------

def cross_validate(field_name, source_values: dict, unit="", tolerance_pct=2.0):
    """Compare a data point across multiple sources, flag discrepancies."""
    print("=" * 60)
    print(f"Cross-Validation: {field_name}")
    print("=" * 60)

    values = {k: exact(v) for k, v in source_values.items()}
    sources = list(values.keys())
    nums = list(values.values())

    sorted_vals = sorted(float(v) for v in nums)
    n = len(sorted_vals)
    median = sorted_vals[n // 2] if n % 2 == 1 else (sorted_vals[n//2-1] + sorted_vals[n//2]) / 2

    print(f"  Sources:         {len(sources)}")
    print(f"  Reference (median): {fmt_number(exact(median))} {unit}")
    print()

    all_ok = True
    for src, val in values.items():
        dev = abs(float(val) - median) / median * 100 if median != 0 else 0
        status = "✅" if dev <= tolerance_pct else "❌"
        if dev > tolerance_pct:
            all_ok = False
        print(f"  {status} {src:20s}: {fmt_number(val)} {unit}  (deviation {dev:.2f}%)")

    print()
    if all_ok:
        print(f"  ✅ All sources within {tolerance_pct}% — data consistent")
    else:
        print(f"  ⚠️  Source deviation > {tolerance_pct}% detected — verify discrepancy")
        print(f"     Recommendation: prioritize company annual report / SEC filing data")

    consensus = median
    # 실제로는 비가중 median 이므로 라벨을 정확히 표기(TASK-71).
    print(f"\n  Consensus (median): {fmt_number(exact(consensus))} {unit}")
    return {"consensus": consensus, "all_consistent": all_ok}


# ---------------------------------------------------------------------------
# 4. Benford's Law Quick Check (Financial Data Integrity Test)
# ---------------------------------------------------------------------------

_BENFORD = {d: math.log10(1 + 1/d) for d in range(1, 10)}


def benford_check(values: list):
    """Quick Benford's Law check on a list of financial values."""
    print("=" * 60)
    print("Benford's Law Check (Financial Data Integrity)")
    print("=" * 60)

    digits = []
    for v in values:
        v = abs(float(v))
        if v > 0:
            # 부동소수 지수 연산은 반올림 오차로 선두 자릿수를 틀리게 할 수 있어(TASK-71)
            # 과학적 표기 문자열의 첫 유효숫자를 직접 취한다(예: 4.0e-04 → '4').
            first = f"{v:.15e}"[0]
            if first.isdigit() and first != "0":
                digits.append(int(first))

    n = len(digits)
    if n < 50:
        print(f"  ⚠️  Insufficient sample: {n} < 50 — Benford analysis unreliable")
        return None

    counts = {}
    for d in digits:
        counts[d] = counts.get(d, 0) + 1
    observed = {d: counts.get(d, 0) / n for d in range(1, 10)}

    mad = sum(abs(observed.get(d, 0) - _BENFORD[d]) for d in range(1, 10)) / 9
    chi2 = sum((counts.get(d, 0) - _BENFORD[d] * n) ** 2 / (_BENFORD[d] * n) for d in range(1, 10))

    if mad < 0.006:
        conformity = "Close conformity"
    elif mad < 0.012:
        conformity = "Acceptable conformity"
    elif mad < 0.015:
        conformity = "Marginally acceptable"
    else:
        conformity = "Nonconforming ⚠️"

    print(f"  Sample size:  {n}")
    print(f"  MAD:          {mad:.6f}")
    print(f"  Chi-sq:       {chi2:.2f}")
    print(f"  Conformity:   {conformity}")
    print()

    print(f"  {'Digit':>6} {'Observed':>8} {'Benford Expected':>16} {'Deviation':>10}")
    print(f"  {'-'*6} {'-'*8} {'-'*16} {'-'*10}")
    for d in range(1, 10):
        obs = observed.get(d, 0)
        exp = _BENFORD[d]
        dev = obs - exp
        flag = " ⚠️" if abs(dev) > 0.03 else ""
        print(f"  {d:>6d} {obs:>8.3f} {exp:>16.3f} {dev:>+10.3f}{flag}")

    print()
    is_ok = mad < 0.015
    if is_ok:
        print("  ✅ Leading digit distribution conforms to Benford's Law")
    else:
        print("  ❌ Leading digit distribution anomaly — possible manual adjustment")
        print("     Note: Non-conformance does not prove fabrication, but warrants further investigation")

    return {"mad": mad, "chi2": chi2, "conformity": conformity, "is_conforming": is_ok}


# ---------------------------------------------------------------------------
# 5. Exact Calculator
# ---------------------------------------------------------------------------

def exact_calc(expr: str):
    """Evaluate a financial expression with exact decimal arithmetic.

    Supports: +, -, *, /, (), numbers (including scientific notation).
    """
    print("=" * 60)
    print("Exact Calculator")
    print("=" * 60)

    allowed = set("0123456789.+-*/() eE")
    if not all(c in allowed for c in expr.replace(" ", "")):
        print(f"  ❌ Unsafe expression: {expr}")
        return None

    try:
        result = _safe_arith(expr)
        d_result = exact(result)
        print(f"  Expression: {expr}")
        print(f"  Result:     {fmt_number(d_result)}")
        print(f"  Exact:      {d_result}")
        return float(d_result)
    except Exception as e:
        print(f"  ❌ Calculation error: {e}")
        return None


# ---------------------------------------------------------------------------
# 6. Three-Scenario Valuation
# ---------------------------------------------------------------------------

def three_scenario_valuation(current_price, current_eps, shares_billion,
                             growth_optimistic, growth_neutral, growth_pessimistic,
                             pe_optimistic, pe_neutral, pe_pessimistic,
                             years=3, currency=""):
    """Calculate three-scenario target prices with exact arithmetic."""
    print("=" * 60)
    print("Three-Scenario Valuation Model")
    print("=" * 60)

    p = exact(current_price)
    eps = exact(current_eps)
    shares = exact(shares_billion)

    scenarios = [
        ("Bull (Optimistic)", growth_optimistic, pe_optimistic),
        ("Base (Neutral)",    growth_neutral,    pe_neutral),
        ("Bear (Pessimistic)", growth_pessimistic, pe_pessimistic),
    ]

    print(f"  Current Price:  {p} {currency}")
    print(f"  Current EPS:    {eps}")
    print(f"  Forecast Years: {years}")
    print()
    print(f"  {'Scenario':20} {'Growth':>8} {'Target PE':>10} {'Target EPS':>12} {'Target Price':>13} {'Upside':>8}")
    print(f"  {'-'*20} {'-'*8} {'-'*10} {'-'*12} {'-'*13} {'-'*8}")

    for name, growth, pe in scenarios:
        g = exact(growth)
        target_pe = exact(pe)
        future_eps = eps
        for _ in range(years):
            future_eps = _CTX.multiply(future_eps, _CTX.add(Decimal("1"), g))
        target_price = _CTX.multiply(future_eps, target_pe)
        # current_price 가 0이면 상승률은 정의되지 않는다 — ZeroDivisionError 방지(TASK-71).
        if float(p) != 0:
            change_str = f"{float(target_price - p) / float(p) * 100:>+8.1f}%"
        else:
            change_str = f"{'N/A':>8}"

        print(f"  {name:20} {float(g)*100:>7.0f}% {float(target_pe):>9.0f}x "
              f"{float(future_eps):>12.2f} {float(target_price):>12.1f} {change_str}")

    print()
    print("  ✅ All calculations use exact decimal arithmetic — results are auditable")


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Financial Rigor Toolkit — Investment data verification tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s verify-market-cap --price 180 --shares 15.2e9 --reported 2.74e12 --currency USD
  %(prog)s verify-valuation --price 180 --eps 6.43 --bvps 4.38
  %(prog)s cross-validate --field revenue --values '{"Annual Report": 391, "Yahoo": 390, "StockAnalysis": 391}' --unit B
  %(prog)s benford --values '[1234, 2345, 3456, ...]'
  %(prog)s calc --expr '180 * 15.2e9'
        """)

    sub = parser.add_subparsers(dest="command")

    # verify-market-cap
    mc = sub.add_parser("verify-market-cap", help="Verify market cap = price × shares")
    mc.add_argument("--price", type=float, required=True)
    mc.add_argument("--shares", type=float, required=True, help="Total shares outstanding")
    mc.add_argument("--reported", type=float, required=True, help="Reported market cap")
    mc.add_argument("--currency", default="", help="Currency (USD, HKD, etc.)")

    # verify-valuation
    val = sub.add_parser("verify-valuation", help="Verify valuation metrics")
    val.add_argument("--price", type=float, required=True)
    val.add_argument("--eps", type=float, default=None)
    val.add_argument("--bvps", type=float, default=None, help="Book value per share")
    val.add_argument("--fcf-per-share", type=float, default=None)
    val.add_argument("--dividend", type=float, default=None, help="Dividend per share")
    val.add_argument("--revenue-per-share", type=float, default=None)

    # cross-validate
    cv = sub.add_parser("cross-validate", help="Cross-validate data across multiple sources")
    cv.add_argument("--field", required=True, help="Data field name")
    cv.add_argument("--values", required=True, help='JSON: {"source": value}')
    cv.add_argument("--unit", default="")
    cv.add_argument("--tolerance", type=float, default=2.0, help="Tolerance percentage")

    # benford
    bf = sub.add_parser(
        "benford",
        help="Benford's Law integrity check (needs >=50 values — use multi-year/quarter cumulative data, not a single report)",
    )
    bf.add_argument("--values", required=True, help="JSON array of numbers")

    # calc
    ca = sub.add_parser("calc", help="Exact arithmetic calculator")
    ca.add_argument("--expr", required=True, help="Arithmetic expression")

    # three-scenario
    ts = sub.add_parser("three-scenario", help="Three-scenario valuation model")
    ts.add_argument("--price", type=float, required=True)
    ts.add_argument("--eps", type=float, required=True)
    ts.add_argument("--shares", type=float, required=True, help="Shares outstanding (in billions)")
    ts.add_argument("--growth", nargs=3, type=float, required=True,
                    help="Annual growth rates for 3 scenarios (bull base bear), e.g. 0.15 0.08 0.0")
    ts.add_argument("--pe", nargs=3, type=float, required=True,
                    help="Target PE for 3 scenarios, e.g. 25 20 15")
    ts.add_argument("--years", type=int, default=3)
    ts.add_argument("--currency", default="")

    args = parser.parse_args()

    if args.command == "verify-market-cap":
        verify_market_cap(args.price, args.shares, args.reported, args.currency)
    elif args.command == "verify-valuation":
        verify_valuation(args.price, args.eps, args.bvps, args.fcf_per_share,
                        args.dividend, args.revenue_per_share)
    elif args.command == "cross-validate":
        values = json.loads(args.values)
        cross_validate(args.field, values, args.unit, args.tolerance)
    elif args.command == "benford":
        values = json.loads(args.values)
        benford_check(values)
    elif args.command == "calc":
        exact_calc(args.expr)
    elif args.command == "three-scenario":
        three_scenario_valuation(
            args.price, args.eps, args.shares,
            args.growth[0], args.growth[1], args.growth[2],
            args.pe[0], args.pe[1], args.pe[2],
            args.years, args.currency)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
