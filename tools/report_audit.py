#!/usr/bin/env python3
"""Report Audit Tool for AI Berkshire.

Data sampling tool: extracts 15% of financial data points from research reports,
compares against reliable sources, and issues a pass/fail verdict.

Zero external dependencies — uses only Python stdlib.
Requires Python >= 3.7.

Workflow (3 steps):
  Step 1 — Extract data points, randomly sample 15%:
    python3 tools/report_audit.py extract --report reports/xxx.md

  Step 2 — For each item in the checklist, fetch the value from a reliable source
            (macrotrends / stockanalysis / SEC EDGAR), fill in fetched_value

  Step 3 — Input verification results, output pass/fail verdict:
    python3 tools/report_audit.py verdict --results '[...]'

  One-step preview (extract and print checklist only, no verification):
    python3 tools/report_audit.py extract --report reports/xxx.md --dry-run
"""

import argparse
import json
import math
import os
import re
import sys
from decimal import Decimal, Context, ROUND_HALF_EVEN
from random import Random

_CTX = Context(prec=28, rounding=ROUND_HALF_EVEN)

# ---------------------------------------------------------------------------
# Data point extraction: identify financial numbers from Markdown reports
# ---------------------------------------------------------------------------

# Patterns: number + unit, preceded by a context label
_PATTERNS = [
    # Percentage
    (r'([\d,，\.]+)\s*%',                        '%',    'percent'),
    # Hundred millions (Chinese unit — kept for backward compat with older reports)
    (r'([\d,，\.]+)\s*亿(元|美元|港元|RMB|USD|HKD)?', '亿',    'hundred_million'),
    # Multiples PE/PB/PS
    (r'([\d,，\.]+)\s*[xX倍]',                   'x',    'multiple'),
    # Trillions (Chinese unit)
    (r'([\d,，\.]+)\s*万亿',                      '万亿', 'trillion'),
    # USD absolute (B/T/K/mn/bn)
    (r'\$\s*([\d,，\.]+)\s*([BMTKk]|mn|bn|亿)',   '$',    'usd_abs'),
    # Plain integers in table cells
    (r'\|\s*[~约]?\$?([\d,，\.]+)\s*\|',          '',     'table_num'),
]

_UNIT_PAT = r'亿[元美港]?元?|万亿|[xX倍]|%|[BMTKk]|mn|bn'

_LABEL_RE = re.compile(
    r'(?P<label>[^\|\n：:]{2,25})[：:\s]+[~约]?\$?(?P<num>[\d,，\.]+)\s*(?P<unit>' + _UNIT_PAT + r')?'
)

_TABLE_ROW_RE = re.compile(
    r'\|\s*(?P<label>[^|]{1,40})\s*\|\s*[~约]?\$?(?P<num>[\d,，\.]+)\s*(?P<unit>' + _UNIT_PAT + r')?\s*\|'
)


def _clean_num(s: str) -> float:
    """Convert a number string with commas (including full-width) to float."""
    s = s.replace(',', '').replace('，', '').strip()
    # Parenthesized negatives: (123.4) → -123.4
    m = re.fullmatch(r'\((\d+(?:\.\d+)?)\)', s)
    if m:
        try:
            return -float(m.group(1))
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


def _is_valid_label(label: str) -> bool:
    """Check whether a label is a meaningful financial field name (filter noise)."""
    label = label.strip()
    if len(label) < 2:
        return False
    if re.fullmatch(r'[\d\s年季度Q]+', label):
        return False
    if re.match(r'^[+\-\*#\|~\$>_`]', label):
        return False
    if '**' in label or '`' in label or '__' in label:
        return False
    if re.fullmatch(r'[+\-]?\d+(\.\d+)?%', label):
        return False
    _SKIP = {'来源', 'sources', 'source', '说明', '注意', '备注', '数据来源',
             'n/a', '—', '-', '/', '合计', 'total', '单位', '趋势'}
    if label.lower() in _SKIP:
        return False
    return True


# Two-column table row: | label | value unit |
_KV_TABLE_RE = re.compile(
    r'^\|\s*(?P<label>[^|*\n]{2,40}?)\s*\|\s*[~约]?\$?(?P<num>[\d,，\.]+)\s*'
    r'(?P<unit>' + _UNIT_PAT + r'亿)?\s*[\|（\(]'
)

# Label KV row: label：value unit
_KV_LABEL_RE = re.compile(
    r'(?P<label>[一-龥A-Za-z][^\|\n：:*]{1,30})[：:]\s*[~约]?\$?'
    r'(?P<num>[\d,，\.]+)\s*(?P<unit>' + _UNIT_PAT + r')?'
)


def _is_separator_line(line: str) -> bool:
    return bool(re.match(r'^\|[\-\s\|:]+\|$', line.strip()))


def _parse_md_tables(lines: list) -> list:
    """Parse all Markdown tables, return (row_label, col_header, value, unit, lineno, raw) tuples."""
    results = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if '|' not in line or _is_separator_line(line):
            i += 1
            continue

        headers_raw = [h.strip().strip('*_').strip() for h in line.split('|') if h.strip()]

        # Advance past optional separator row(s) and secondary header rows
        j = i + 1
        while j < len(lines) and (
            _is_separator_line(lines[j])
            or ('|' in lines[j] and not re.search(r'[\d,，\.]+', lines[j]))
        ):
            j += 1

        # j now points to first data row; require at least one data row with numbers
        if j == i + 1 and not (j < len(lines) and '|' in lines[j] and re.search(r'[\d,，\.]+', lines[j])):
            i += 1
            continue

        i = j
        while i < len(lines):
            dline = lines[i].strip()
            if not dline or not dline.startswith('|'):
                break
            if _is_separator_line(dline):
                i += 1
                continue
            cells = [c.strip().strip('*_~').strip() for c in dline.split('|')]
            cells = [c for c in cells if c != '']
            if len(cells) < 2:
                i += 1
                continue
            row_label = cells[0]
            for col_idx, cell in enumerate(cells[1:], start=1):
                col_header = headers_raw[col_idx] if col_idx < len(headers_raw) else f'Col{col_idx}'
                # Support parenthesized negatives in table cells
                neg_m = re.search(r'\((\d[\d,，\.]*)\)\s*(' + _UNIT_PAT + r')?', cell)
                pos_m = re.search(r'[~约]?\$?([\d,，\.]+)\s*(' + _UNIT_PAT + r')?', cell)
                if neg_m:
                    val = _clean_num(f'({neg_m.group(1)})')
                    unit = (neg_m.group(2) or '').strip()
                elif pos_m:
                    val = _clean_num(pos_m.group(1))
                    unit = (pos_m.group(2) or '').strip()
                else:
                    i += 1
                    continue
                if val is not None and val != 0 and abs(val) < 1e15:
                    results.append((row_label, col_header, val, unit, i + 1, dline))
            i += 1
        continue
    return results


def extract_data_points(md_text: str) -> list:
    """Extract all identifiable financial data points from a Markdown report.

    Covers three structures:
      1. Multi-column Markdown tables (primary source): (row label + col header) → value
      2. Colon KV lines: label: value unit
      3. Bold number lines: **value** unit

    Returns list of dicts:
      {id, label, reported_value, unit, raw_text, line_number}
    """
    points = []
    seen = set()

    def _add(label, val, unit, lineno, raw):
        label = re.sub(r'[\*_`]+', '', label).strip()
        if not _is_valid_label(label):
            return
        if val is None or val == 0 or val > 1e15:
            return
        if re.fullmatch(r'(20\d{2}|Q[1-4]|\d{4}\s*Q[1-4])', label.strip()):
            return
        key = f"{label}|{round(val,4)}|{unit}"
        if key in seen:
            return
        seen.add(key)
        points.append({
            'id': len(points) + 1,
            'label': label,
            'reported_value': val,
            'unit': unit,
            'raw_text': raw[:120],
            'line_number': lineno,
        })

    lines = md_text.split('\n')
    in_code = False

    # --- 1. Multi-column tables ---
    for row_label, col_header, val, unit, lineno, raw in _parse_md_tables(lines):
        if not _is_valid_label(row_label):
            continue
        if col_header.upper() in ('YOY', 'YOY%', 'GROWTH', 'CHANGE', 'TREND', 'NOTE', 'REMARK'):
            continue
        if col_header and col_header != row_label:
            label = f"{row_label} · {col_header}"
        else:
            label = row_label
        _add(label, val, unit, lineno, raw)

    # --- 2. KV colon lines ---
    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
            continue
        if in_code or stripped.startswith('> ') or re.match(r'^#{1,6}\s', stripped):
            continue
        if '|' in stripped:
            continue

        for m in _KV_LABEL_RE.finditer(stripped):
            label = m.group('label')
            num_str = m.group('num')
            # Check if the match is preceded by '(' indicating a parenthesized negative
            start = m.start('num')
            if start > 0 and stripped[start - 1] == '(':
                num_str = f'({num_str})'
            val = _clean_num(num_str)
            unit = (m.group('unit') or '').strip()
            _add(label, val, unit, lineno, stripped)

    return points


def sample_points(points: list, ratio: float = 0.15, seed: int = None) -> list:
    """Randomly sample ratio% of data points, minimum 3, maximum 30."""
    n = max(3, min(30, math.ceil(len(points) * ratio)))
    n = min(n, len(points))
    rng = Random(seed)
    sampled = rng.sample(points, n)
    return sorted(sampled, key=lambda p: p['line_number'])


# ---------------------------------------------------------------------------
# Pass / Fail Verdict
# ---------------------------------------------------------------------------

_TOLERANCE = 0.01   # 1% tolerance


def _pct_diff(reported: float, fetched: float) -> float:
    """Absolute relative deviation."""
    if reported == 0:
        return 0.0 if fetched == 0 else float('inf')
    return abs(reported - fetched) / abs(reported)


def render_verdict(results: list, report_name: str = "") -> dict:
    """
    Output pass/fail verdict based on verification results.

    results: list of dicts, each containing:
      - id, label, reported_value, unit, fetched_value, fetched_source
      - (optional) fetched_value2, fetched_source2   ← second source

    Returns:
      {
        'verdict': 'PASS' | 'FAIL',
        'pass_count': int,
        'fail_count': int,
        'total': int,
        'fail_items': [...],
        'summary': str,
      }
    """
    # ANSI 색은 TTY 일 때만 — 파이프/비ANSI 콘솔에 이스케이프 시퀀스가 새는 것을 막는다(TASK-71).
    _color = sys.stdout.isatty()
    BOLD = '\033[1m' if _color else ''
    RED = '\033[91m' if _color else ''
    GREEN = '\033[92m' if _color else ''
    YELLOW = '\033[93m' if _color else ''
    RESET = '\033[0m' if _color else ''

    print('=' * 70)
    print(f'{BOLD}Report Data Audit — Pass/Fail Verdict{RESET}')
    if report_name:
        print(f'Report: {report_name}')
    print('=' * 70)
    print()

    fail_items = []
    warn_items = []

    for item in results:
        label = item.get('label', '?')
        unit = item.get('unit', '')
        source = item.get('fetched_source', '?')
        fetched2 = item.get('fetched_value2')
        source2 = item.get('fetched_source2', '')
        item_id = item.get('id', '?')

        # 사용자 제공 JSON 이라 값이 null/비숫자일 수 있다 — 예외로 전체 중단 대신 항목만 건너뛴다(TASK-66).
        try:
            reported = float(item.get('reported_value'))
        except (TypeError, ValueError):
            print(f'  ⚠️  [{str(item_id):>2}] {label[:35]:35s} reported_value 누락/비숫자 — 건너뜀')
            continue

        fetched = item.get('fetched_value')
        if fetched is None:
            print(f'  ⬜ [{str(item_id):>2}] {label[:35]:35s} {reported:>12.2f} {unit}  →  [no verification value provided, skipped]')
            continue

        try:
            fetched = float(fetched)
        except (TypeError, ValueError):
            print(f'  ⚠️  [{str(item_id):>2}] {label[:35]:35s} fetched_value 비숫자 — 건너뜀')
            continue
        diff1 = _pct_diff(reported, fetched)

        diff2 = None
        if fetched2 is not None:
            try:
                fetched2 = float(fetched2)
                diff2 = _pct_diff(reported, fetched2)
            except (TypeError, ValueError):
                fetched2 = None

        pass1 = diff1 <= _TOLERANCE
        pass2 = (diff2 is None) or (diff2 <= _TOLERANCE)

        if pass1 and pass2:
            status = f'{GREEN}✅ PASS{RESET}'
            detail = f'{source}: {fetched:.2f} (deviation {diff1*100:.2f}%)'
            if diff2 is not None:
                detail += f'  |  {source2}: {fetched2:.2f} (deviation {diff2*100:.2f}%)'
        elif not pass1 and not pass2:
            status = f'{RED}❌ FAIL{RESET}'
            detail = f'{source}: {fetched:.2f} (deviation {diff1*100:.2f}%)'
            if diff2 is not None:
                detail += f'  |  {source2}: {fetched2:.2f} (deviation {diff2*100:.2f}%)'
            fail_items.append({
                'id': item['id'],
                'label': label,
                'reported': reported,
                'unit': unit,
                'fetched': fetched,
                'source': source,
                'fetched2': fetched2,
                'source2': source2,
                'diff1_pct': round(diff1 * 100, 2),
                'diff2_pct': round(diff2 * 100, 2) if diff2 is not None else None,
                'raw_text': item.get('raw_text', ''),
                'line_number': item.get('line_number', 0),
            })
        else:
            status = f'{YELLOW}⚠️  WARNING{RESET}'
            detail = f'{source}: {fetched:.2f} (deviation {diff1*100:.2f}%)'
            if diff2 is not None:
                detail += f'  |  {source2}: {fetched2:.2f} (deviation {diff2*100:.2f}%)'
            warn_items.append({
                'id': item['id'], 'label': label,
                'reported': reported, 'unit': unit,
                'diff1_pct': round(diff1 * 100, 2),
                'diff2_pct': round(diff2 * 100, 2) if diff2 is not None else None,
            })

        print(f'  {status} [{item["id"]:>2}] {label[:35]:35s}  Reported: {reported:>12.2f} {unit}')
        print(f'              {" " * 38}{detail}')

    print()
    print('-' * 70)

    total = len([r for r in results if r.get('fetched_value') is not None])
    fail_count = len(fail_items)
    warn_count = len(warn_items)
    pass_count = total - fail_count - warn_count

    print(f'  Sampled: {total}  |  Pass: {GREEN}{pass_count}{RESET}  |  Warning: {YELLOW}{warn_count}{RESET}  |  Fail: {RED}{fail_count}{RESET}')
    print()

    if fail_count == 0:
        print(f'{BOLD}{GREEN}[SELF-AUDIT PASS] 표본 데이터가 자가 감사를 통과 — 발행 가능.{RESET}')
        print(f'{YELLOW}  주의: 이 감사의 대조 기준(ground truth)도 동일 모델이 채운 값입니다.')
        print(f'  독립 감사가 아니며, 표본(15%) 밖 수치와 [추정] 항목은 검증되지 않았습니다.{RESET}')
        verdict = 'PASS'
    else:
        print(f'{BOLD}{RED}[REJECTED] {fail_count} data point(s) failed verification — report must be corrected and re-audited.{RESET}')
        print()
        print(f'{BOLD}Rejection reasons:{RESET}')
        for fi in fail_items:
            print(f'  ❌ Line {fi["line_number"]} | {fi["label"]}')
            print(f'     Reported: {fi["reported"]} {fi["unit"]}')
            print(f'     {fi["source"]}: {fi["fetched"]}  (deviation {fi["diff1_pct"]}%)')
            if fi.get('fetched2') is not None:
                print(f'     {fi["source2"]}: {fi["fetched2"]}  (deviation {fi["diff2_pct"]}%)')
            print(f'     Raw: {fi["raw_text"][:80]}')
            print()
        verdict = 'FAIL'

    if warn_count > 0:
        print(f'{YELLOW}Note: {warn_count} data point(s) show source discrepancy (>1%) — may be GAAP/Non-GAAP or FX difference, review manually.{RESET}')
        for wi in warn_items:
            print(f'  ⚠️  {wi["label"]}  Reported:{wi["reported"]} {wi["unit"]}  Deviation: {wi["diff1_pct"]}% / {wi["diff2_pct"]}%')

    print('=' * 70)

    return {
        'verdict': verdict,
        'pass_count': pass_count,
        'warn_count': warn_count,
        'fail_count': fail_count,
        'total': total,
        'fail_items': fail_items,
        'warn_items': warn_items,
    }


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Report Audit Tool — Research report data verification',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Workflow:

  Step 1 — Extract data points and randomly sample 15%, print checklist:
    python3 tools/report_audit.py extract --report reports/Apple/Apple-research-20260627.md

  Step 2 — For each item in the checklist, fetch the value from a reliable source
            (macrotrends.net, stockanalysis.com, SEC EDGAR),
            fill in fetched_value / fetched_source / fetched_value2 / fetched_source2

  Step 3 — Input verification results, output pass/fail verdict:
    python3 tools/report_audit.py verdict --results '[
      {"id":1,"label":"Revenue","reported_value":391,"unit":"B","fetched_value":391,"fetched_source":"macrotrends","fetched_value2":390,"fetched_source2":"stockanalysis"},
      ...
    ]'

  Preview only (print checklist, skip verification):
    python3 tools/report_audit.py extract --report reports/xxx.md --dry-run

  Custom sampling ratio (default 0.15):
    python3 tools/report_audit.py extract --report reports/xxx.md --ratio 0.20

  Fixed random seed (reproduce same sample):
    python3 tools/report_audit.py extract --report reports/xxx.md --seed 42
        """)

    sub = parser.add_subparsers(dest='command')

    # extract
    ext = sub.add_parser('extract', help='Extract data points from report and sample')
    ext.add_argument('--report', required=True, help='Report file path (Markdown)')
    ext.add_argument('--ratio', type=float, default=0.15, help='Sampling ratio, default 0.15')
    ext.add_argument('--seed', type=int, default=None, help='Random seed (optional, for reproducibility)')
    ext.add_argument('--dry-run', action='store_true', help='Print only, no JSON output')

    # verdict
    vrd = sub.add_parser('verdict', help='Output pass/fail verdict based on verification results')
    vrd.add_argument('--results', required=True, help='JSON array containing fetched_value fields')
    vrd.add_argument('--report', default='', help='Report name (optional, for display)')
    vrd.add_argument('--output-json', action='store_true', help='Output verdict as JSON to stdout')

    args = parser.parse_args()

    if args.command == 'extract':
        if not os.path.exists(args.report):
            print(f'❌ File not found: {args.report}', file=sys.stderr)
            sys.exit(1)

        with open(args.report, 'r', encoding='utf-8') as f:
            text = f.read()

        all_points = extract_data_points(text)
        sampled = sample_points(all_points, ratio=args.ratio, seed=args.seed)

        print('=' * 70)
        print(f'Report Data Audit Checklist')
        print(f'File: {args.report}')
        print(f'Total data points: {len(all_points)}  |  Sampling ratio: {args.ratio:.0%}  |  Sample size: {len(sampled)}')
        if args.seed is not None:
            print(f'Random seed: {args.seed} (use to reproduce same sample)')
        print('=' * 70)
        print()
        print(f'{"ID":>3}  {"Line":>5}  {"Data Label":<35}  {"Reported Value":>14}  {"Unit"}')
        print(f'{"─"*3}  {"─"*5}  {"─"*35}  {"─"*14}  {"─"*6}')
        for p in sampled:
            print(f'{p["id"]:>3}  {p["line_number"]:>5}  {p["label"][:35]:<35}  {p["reported_value"]:>14.2f}  {p["unit"]}')
        print()
        print('↑ For each data point above, fetch the value from these sources and fill in fetched_value:')
        print('  US stocks: macrotrends.net (primary) + stockanalysis.com (secondary)')
        print('  HK stocks: aastocks.com (primary) + macrotrends ADR (secondary)')
        print()

        if not args.dry_run:
            template = []
            for p in sampled:
                template.append({
                    'id': p['id'],
                    'label': p['label'],
                    'reported_value': p['reported_value'],
                    'unit': p['unit'],
                    'line_number': p['line_number'],
                    'raw_text': p['raw_text'],
                    'fetched_value': None,       # ← fill in primary source value
                    'fetched_source': '',        # ← fill in primary source name
                    'fetched_value2': None,      # ← fill in secondary source value (optional)
                    'fetched_source2': '',       # ← fill in secondary source name (optional)
                })
            print('Audit checklist JSON (fill in fetched_value, then pass to verdict command):')
            print()
            print(json.dumps(template, ensure_ascii=False, indent=2))

    elif args.command == 'verdict':
        try:
            results = json.loads(args.results)
        except json.JSONDecodeError as e:
            print(f'❌ JSON parse error: {e}', file=sys.stderr)
            sys.exit(1)

        report_name = args.report or ''
        outcome = render_verdict(results, report_name=report_name)

        if args.output_json:
            print(json.dumps(outcome, ensure_ascii=False, indent=2))

        sys.exit(0 if outcome['verdict'] == 'PASS' else 1)

    else:
        parser.print_help()


if __name__ == '__main__':
    main()
