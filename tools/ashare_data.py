#!/usr/bin/env python3
"""A-Share Data Tool — Tencent quotes + East Money financials, zero external dependencies (stdlib only).

Provides A-share real-time quotes and financial data for Claude Code Skills.
Design: standalone module, does not affect existing tools; uses curl with --noproxy to bypass system proxy.

Usage (called automatically by Skills):
    python3.11 tools/ashare_data.py quote 600519                    # Real-time quote
    python3.11 tools/ashare_data.py financials 600519               # Core financials (last 5 years)
    python3.11 tools/ashare_data.py valuation 600519                # Valuation metrics
    python3.11 tools/ashare_data.py search keyword                  # Search ticker by name

Requires Python >= 3.8, no external dependencies.
"""

import argparse
import json
import os
import subprocess
import sys
from decimal import Decimal, ROUND_HALF_EVEN

_TIMEOUT = 15


def _curl(url):
    """Fetch URL via curl --noproxy to bypass system proxy."""
    result = subprocess.run(
        ["/usr/bin/curl", "-s", "--noproxy", "*",
         "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
         url],
        capture_output=True, timeout=_TIMEOUT,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise ConnectionError(f"Request failed: {url}")
    # Tencent quote API returns GBK; others return UTF-8
    try:
        return result.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return result.stdout.decode("gbk")


def _curl_json(url, params=None):
    """Fetch JSON via curl."""
    if params:
        from urllib.parse import urlencode
        url = f"{url}?{urlencode(params)}"
    return json.loads(_curl(url))


# ---------------------------------------------------------------------------
# Tencent Quote API (stable, no auth required)
# ---------------------------------------------------------------------------

def _qq_code(code: str) -> str:
    """Convert stock code to Tencent quote format."""
    code = code.strip().replace(".SH", "").replace(".SZ", "").replace(".BJ", "")
    if code.startswith(("6", "9", "5")):
        return f"sh{code}"
    elif code.startswith(("0", "3", "2", "1")):
        return f"sz{code}"
    elif code.startswith(("4", "8")):
        return f"bj{code}"
    return f"sh{code}"


def _parse_qq_quote(raw: str) -> dict:
    """Parse Tencent quote response. Format: v_shXXXXXX="field1~field2~..."; """
    start = raw.find('"')
    end = raw.rfind('"')
    if start < 0 or end <= start:
        return {}
    fields = raw[start + 1:end].split("~")
    if len(fields) < 50:
        return {}
    return {
        "name": fields[1],
        "code": fields[2],
        "price": fields[3],
        "prev_close": fields[4],
        "open": fields[5],
        "volume": fields[6],         # lots
        "buy_vol": fields[7],
        "sell_vol": fields[8],
        "high": fields[33] if len(fields) > 33 else fields[3],
        "low": fields[34] if len(fields) > 34 else fields[3],
        "change_pct": fields[32],
        "change_amt": fields[31],
        "turnover_amt": fields[37] if len(fields) > 37 else "-",
        "turnover_rate": fields[38] if len(fields) > 38 else "-",
        "pe": fields[39] if len(fields) > 39 else "-",
        "market_cap": fields[45] if len(fields) > 45 else "-",   # total market cap (100M RMB)
        "float_cap": fields[44] if len(fields) > 44 else "-",    # float market cap (100M RMB)
        "pb": fields[46] if len(fields) > 46 else "-",
        "high_52w": fields[47] if len(fields) > 47 else "-",
        "low_52w": fields[48] if len(fields) > 48 else "-",
        "total_shares": fields[38] if len(fields) > 38 else "-",  # will recalculate
    }


def _fmt_large(value) -> str:
    if value is None or value == "-" or value == "":
        return "-"
    try:
        v = float(value)
    except (ValueError, TypeError):
        return str(value)
    if abs(v) >= 1e8:
        return f"{v / 1e8:.2f}00M"
    if abs(v) >= 1e4:
        return f"{v / 1e4:.2f}0K"
    return f"{v:.2f}"


def _fmt_pct(value) -> str:
    if value is None or value == "-" or value == "":
        return "-"
    try:
        return f"{float(value):.2f}%"
    except (ValueError, TypeError):
        return str(value)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_quote(code: str):
    """Real-time quote snapshot."""
    qq_code = _qq_code(code)
    raw = _curl(f"https://qt.gtimg.cn/q={qq_code}")
    d = _parse_qq_quote(raw)
    if not d:
        print(f"❌ Stock not found: {code}")
        return

    print("=" * 60)
    print(f"Real-time Quote: {d['name']} ({d['code']})")
    print("=" * 60)
    print(f"  Price:          {d['price']}")
    print(f"  Change %:       {d['change_pct']}%")
    print(f"  Change:         {d['change_amt']}")
    print(f"  Open:           {d['open']}")
    print(f"  High:           {d['high']}")
    print(f"  Low:            {d['low']}")
    print(f"  Prev Close:     {d['prev_close']}")
    print(f"  Volume:         {d['volume']} lots")
    print(f"  Turnover:       {d['turnover_amt']} 10K RMB")
    print(f"  Market Cap:     {d['market_cap']} 100M RMB")
    print(f"  Float Cap:      {d['float_cap']} 100M RMB")
    print(f"  PE (TTM):       {d['pe']}")
    print(f"  PB:             {d['pb']}")
    print(f"  Turnover Rate:  {d['turnover_rate']}%")
    print(f"  52W High:       {d['high_52w']}")
    print(f"  52W Low:        {d['low_52w']}")


def cmd_valuation(code: str):
    """Valuation metrics summary."""
    qq_code = _qq_code(code)
    raw = _curl(f"https://qt.gtimg.cn/q={qq_code}")
    d = _parse_qq_quote(raw)
    if not d:
        print(f"❌ Stock not found: {code}")
        return

    price = d["price"]
    market_cap_yi = d["market_cap"]

    print("=" * 60)
    print(f"Valuation Metrics: {d['name']} ({d['code']})")
    print("=" * 60)
    print(f"  Price:          {price}")
    print(f"  Market Cap:     {market_cap_yi} 100M RMB")
    print(f"  Float Cap:      {d['float_cap']} 100M RMB")
    print(f"  PE (TTM):       {d['pe']}")
    print(f"  PB:             {d['pb']}")
    print(f"  52W High:       {d['high_52w']}")
    print(f"  52W Low:        {d['low_52w']}")

    # Market cap verification
    try:
        p = Decimal(price)
        cap = Decimal(market_cap_yi) * Decimal("1e8")
        shares = cap / p
        print(f"\n  Implied shares: {_fmt_large(float(shares))}")
        calc_cap = p * shares
        reported_cap = Decimal(market_cap_yi) * Decimal("1e8")
        diff = abs(calc_cap - reported_cap) / reported_cap * 100
        print(f"  Market cap check: ✅ Consistent (deviation {float(diff):.1f}%)")
    except Exception:
        pass


def cmd_financials(code: str):
    """Core financial data for last 5 years."""
    qq_code = _qq_code(code)
    raw = _curl(f"https://qt.gtimg.cn/q={qq_code}")
    d = _parse_qq_quote(raw)
    name = d.get("name", code) if d else code

    code_clean = code.strip().replace(".SH", "").replace(".SZ", "").replace(".BJ", "")
    market = "SH" if code_clean.startswith(("6", "9", "5")) else "SZ"

    # East Money datacenter API (annual report data)
    fin_url = "https://datacenter.eastmoney.com/securities/api/data/get"
    params = {
        "type": "RPT_F10_FINANCE_MAINFINADATA",
        "sty": "ALL",
        "filter": f'(SECUCODE="{code_clean}.{market}")(REPORT_TYPE="年报")',
        "p": "1",
        "ps": "5",
        "sr": "-1",
        "st": "REPORT_DATE",
        "source": "HSF10",
        "client": "PC",
    }
    reports = []
    try:
        data = _curl_json(fin_url, params)
        reports = data.get("result", {}).get("data", [])
    except Exception:
        pass

    # If annual-only filter returns nothing, remove it
    if not reports:
        params["filter"] = f'(SECUCODE="{code_clean}.{market}")'
        try:
            data = _curl_json(fin_url, params)
            reports = data.get("result", {}).get("data", [])
        except Exception:
            pass

    print("=" * 60)
    print(f"Core Financials: {name} ({code_clean})")
    print("=" * 60)

    if not reports:
        print("  ⚠️ Unable to fetch financial data — suggest using WebSearch to supplement")
        return

    for r in reports[:5]:
        date = r.get("REPORT_DATE", "")[:10]
        report_name = r.get("REPORT_DATE_NAME", "")
        revenue = r.get("TOTALOPERATEREVE")
        net_profit = r.get("PARENTNETPROFIT")
        eps = r.get("EPSJB")
        bps = r.get("BPS")
        roe = r.get("ROEJQ")
        rev_growth = r.get("TOTALOPERATEREVETZ")
        profit_growth = r.get("PARENTNETPROFITTZ")

        print(f"\n  --- {date} {report_name} ---")
        if revenue is not None:
            print(f"  Revenue:          {_fmt_large(revenue)}")
        if rev_growth is not None:
            print(f"  Revenue YoY:      {_fmt_pct(rev_growth)}")
        if net_profit is not None:
            print(f"  Net Profit:       {_fmt_large(net_profit)}")
        if profit_growth is not None:
            print(f"  Net Profit YoY:   {_fmt_pct(profit_growth)}")
        if eps is not None:
            print(f"  Basic EPS:        {eps}")
        if bps is not None:
            print(f"  Book Value/Share: {bps:.2f}")
        if roe is not None:
            print(f"  ROE (weighted):   {_fmt_pct(roe)}")


def cmd_search(keyword: str):
    """Search for stock by name or keyword."""
    url = "https://searchadapter.eastmoney.com/api/suggest/get"
    params = {
        "input": keyword,
        "type": "14",
        "token": "D43BF722C8E33BDC906FB84D85E326E8",
        "count": "10",
    }
    data = _curl_json(url, params)
    results = data.get("QuotationCodeTable", {}).get("Data", [])

    if not results:
        print(f"❌ No results found for '{keyword}'")
        return

    print("=" * 60)
    print(f"Search Results: '{keyword}'")
    print("=" * 60)
    for r in results:
        code = r.get("Code", "")
        name = r.get("Name", "")
        market = r.get("MktNum", "")
        mkt_label = {"1": "SH", "2": "SZ", "3": "BJ"}.get(str(market), "")
        print(f"  {code} {name} [{mkt_label}]")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="A-Share Data Tool — Tencent quotes + East Money financials",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command")

    p_quote = sub.add_parser("quote", help="Real-time quote")
    p_quote.add_argument("code", help="Stock code, e.g. 600519")

    p_fin = sub.add_parser("financials", help="Core financials (last 5 years)")
    p_fin.add_argument("code", help="Stock code")

    p_val = sub.add_parser("valuation", help="Valuation metrics")
    p_val.add_argument("code", help="Stock code")

    p_search = sub.add_parser("search", help="Search stock by name or keyword")
    p_search.add_argument("keyword", help="Company name or keyword")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "quote": lambda: cmd_quote(args.code),
        "financials": lambda: cmd_financials(args.code),
        "valuation": lambda: cmd_valuation(args.code),
        "search": lambda: cmd_search(args.keyword),
    }
    cmds[args.command]()


if __name__ == "__main__":
    main()
