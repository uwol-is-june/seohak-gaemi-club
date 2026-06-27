#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Xueqiu universal scraper: traverses a user's full timeline and filters original posts by keywords.

Features:
  - Playwright session reuse: first run opens headful browser for manual login; state persisted locally
  - Dual-channel fetch: prefers in-page JS fetch, falls back to context.request (APIRequestContext)
  - Resumable crawl: saves progress every 10 pages; resumes from last position on restart
  - Rate-limit mitigation: 2-4s random jitter + 30s long pause every 50 pages + auto-exit on 5 consecutive timeouts
  - Repost filter: only collects original posts by the target user (text non-empty, not "Repost")

Credentials passed via environment variables (NOT stored in the repo):
  export XQ_PHONE=13xxxxxxxxx
  export XQ_PASSWORD=xxx
Or leave unset; first run will open headful browser for manual login (scan QR / SMS / password).

Usage examples:
  # Duan Yongping on PDD
  python3 xueqiu_scraper.py \\
      --user-id 1247347556 \\
      --keywords PDD,Temu,Pinduoduo,Huang Zheng \\
      --output ../reports/PDD/DYP-xueqiu-PDD.md

  # Other user + keywords
  python3 xueqiu_scraper.py --user-id 6784593966 --keywords Kweichow --output /tmp/out.md

Login state cache defaults to /tmp/xueqiu_state.json; override with --state-path.
"""

import argparse
import asyncio
import json
import os
import random
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright


def is_match(text, keywords):
    t = (text or '').lower()
    return any(k.lower() in t for k in keywords)


def parse_ts(ts):
    try:
        return datetime.fromtimestamp(int(ts) / 1000).strftime('%Y-%m-%d %H:%M')
    except Exception:
        return str(ts)


def clean(s):
    if not s: return ''
    s = re.sub(r'<[^>]+>', '', s)
    for ent, rep in [('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&nbsp;', ' ')]:
        s = s.replace(ent, rep)
    return re.sub(r'&#\d+;', '', s).strip()


async def browser_fetch_json(page, url, timeout_s=15):
    """Prefer in-page JS fetch; fall back to context.request."""
    js = f"""
        async () => {{
            const ctl = new AbortController();
            const to = setTimeout(() => ctl.abort(), {int(timeout_s*1000)});
            try {{
                const r = await fetch({json.dumps(url)}, {{
                    headers: {{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}},
                    credentials: 'include', signal: ctl.signal
                }});
                const text = await r.text();
                clearTimeout(to);
                try {{ return JSON.parse(text); }}
                catch(e) {{ return {{_raw: text.substring(0, 300)}}; }}
            }} catch(e) {{
                clearTimeout(to);
                return {{_error: e.toString()}};
            }}
        }}
    """
    try:
        result = await asyncio.wait_for(page.evaluate(js), timeout=timeout_s + 5)
        if result and not result.get('_error') and not result.get('_raw'):
            return result
    except Exception:
        pass
    try:
        resp = await page.context.request.get(url, headers={
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://xueqiu.com/',
        }, timeout=timeout_s * 1000)
        if resp.ok:
            return await resp.json()
    except Exception:
        return None
    return None


async def verify_login(page, user_id):
    test = await browser_fetch_json(
        page,
        f'https://xueqiu.com/v4/statuses/user_timeline.json?user_id={user_id}&page=2&count=1'
    )
    return bool(test and test.get('statuses') is not None)


async def interactive_login(pw, state_path, user_id):
    phone = os.environ.get('XQ_PHONE', '')
    print("\n[Login required] Opening headful browser — please complete Xueqiu login")
    if phone:
        print(f"        XQ_PHONE = {phone}   (password via XQ_PASSWORD)")
    else:
        print("        XQ_PHONE/XQ_PASSWORD not set — please log in manually in the browser (QR / SMS / password)")
    browser = await pw.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled'],
    )
    context = await browser.new_context(
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale='zh-CN',
        viewport={'width': 1280, 'height': 800},
    )
    await context.add_init_script(
        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
    )
    page = await context.new_page()
    await page.goto('https://xueqiu.com/', wait_until='domcontentloaded')
    print(">>> Complete login in the browser; script polls every 5s and continues automatically (up to 10 min)")
    ok = False
    for i in range(120):
        await asyncio.sleep(5)
        try:
            if await verify_login(page, user_id):
                ok = True
                print(f"  ✓ Login successful (poll #{i+1})")
                break
        except Exception as e:
            print(f"  Poll error (ignored): {e}")
        if (i + 1) % 6 == 0:
            print(f"  ...still waiting for login ({(i+1)*5}s elapsed)")
    if not ok:
        print("Login not detected within 10 minutes, exiting")
        await browser.close()
        return None
    await context.storage_state(path=state_path)
    print(f"Session state saved → {state_path}")
    return browser, context, page


async def load_with_state(pw, state_path, user_id):
    if not os.path.exists(state_path):
        return None
    browser = await pw.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    )
    context = await browser.new_context(
        storage_state=state_path,
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale='zh-CN',
        viewport={'width': 1280, 'height': 800},
    )
    await context.add_init_script(
        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
    )
    page = await context.new_page()
    loaded = False
    for attempt in range(3):
        try:
            await page.goto('https://xueqiu.com/', wait_until='domcontentloaded', timeout=15000)
            loaded = True
            break
        except Exception as e:
            print(f"  Homepage load failed (attempt {attempt+1}): {e}")
            await asyncio.sleep(5)
    if not loaded:
        try:
            await page.goto('about:blank')
        except Exception:
            pass
    await asyncio.sleep(2)
    if await verify_login(page, user_id):
        print("✓ Reusing saved session state")
        return browser, context, page
    print("Saved state has expired")
    await browser.close()
    return None


async def fetch_all_timeline(page, user_id, keywords, progress_path, dump_all_path=''):
    collected = {}
    # all_posts: stores all original posts by the user (unfiltered) for offline multi-topic analysis
    all_posts = {}
    if dump_all_path and os.path.exists(dump_all_path):
        try:
            for e in json.load(open(dump_all_path)):
                all_posts[e['id']] = e
            print(f"  ↪ Loaded existing full cache: {len(all_posts)} posts")
        except Exception as e:
            print(f"  Full cache read error: {e}")
    print("\n=== Traversing full timeline ===")
    data = await browser_fetch_json(
        page,
        f'https://xueqiu.com/v4/statuses/user_timeline.json?user_id={user_id}&page=1&count=20'
    )
    if not data or data.get('error_code'):
        print(f"  Page 1 failed: {data}")
        return collected
    max_page = data.get('maxPage', 600)
    total = data.get('total', '?')
    print(f"  User ID: {user_id} | Total posts: {total} | Total pages: {max_page}")

    total_posts = 0
    found = 0

    def process(d):
        nonlocal total_posts, found
        for post in d.get('statuses', []):
            total_posts += 1
            text = clean(post.get('text', '') or post.get('description', ''))
            title = clean(post.get('title', ''))
            rt = post.get('retweeted_status') or {}
            rt_text = clean(rt.get('text', ''))
            own_text = (text or '').strip()
            if own_text in ('', '转发微博', '轉發微博', 'Repost'):
                continue
            pid = str(post.get('id', ''))
            date = parse_ts(post.get('created_at', 0))
            entry = {'id': pid, 'date': date, 'title': title, 'text': own_text,
                     'url': f'https://xueqiu.com/{user_id}/{pid}'}
            if rt:
                rt_user = (rt.get('user') or {}).get('screen_name', '')
                entry['retweet_of'] = f'@{rt_user}: {rt_text}'
            # Full cache (unfiltered)
            if dump_all_path and pid not in all_posts:
                all_posts[pid] = entry
            # Keyword-filtered collection
            if keywords and is_match(title + ' ' + own_text, keywords):
                if pid not in collected:
                    collected[pid] = entry
                    found += 1
                    preview = own_text[:80] if own_text else (rt_text[:80] if rt_text else title[:80])
                    print(f"  ✓ [{date}] {preview}...")

    process(data)
    start_page = 2
    if os.path.exists(progress_path):
        try:
            with open(progress_path) as f:
                prev = json.load(f)
            start_page = max(2, prev.get('next_page', 2))
            for e in prev.get('collected', []):
                collected[e['id']] = e
                found += 1
            print(f"  ↪ Resuming from page {start_page}, {found} hits so far")
        except Exception as e:
            print(f"  Progress file read error: {e}")

    def save_progress(next_page):
        with open(progress_path, 'w', encoding='utf-8') as f:
            json.dump({'next_page': next_page, 'collected': list(collected.values())},
                      f, ensure_ascii=False)
        if dump_all_path:
            with open(dump_all_path, 'w', encoding='utf-8') as f:
                json.dump(list(all_posts.values()), f, ensure_ascii=False)

    consec_fail = 0
    for p in range(start_page, max_page + 1):
        try:
            data = await browser_fetch_json(
                page,
                f'https://xueqiu.com/v4/statuses/user_timeline.json?user_id={user_id}&page={p}&count=20',
                timeout_s=15,
            )
        except Exception as e:
            print(f"  Page {p} exception: {e}")
            data = None
        if not data:
            consec_fail += 1
            print(f"  Page {p} no response/timeout (consecutive: {consec_fail})")
            if consec_fail >= 5:
                print("  5 consecutive failures — saving progress and exiting (re-run to resume)")
                save_progress(p)
                break
            await asyncio.sleep(5 * consec_fail)
            continue
        consec_fail = 0
        if data.get('error_code'):
            print(f"  Page {p} error: {data.get('error_code')} {data.get('error_description')}")
            save_progress(p)
            break
        statuses = data.get('statuses', [])
        if not statuses:
            print(f"  Page {p} empty, stopping")
            break
        prev_found = found
        process(data)
        if p % 10 == 0 or found > prev_found:
            print(f"  Page {p}/{max_page} | Scanned {total_posts} | Hits {found}")
        if p % 10 == 0:
            save_progress(p + 1)
        if p % 50 == 0:
            print(f"  ⏸ Pausing 30s after page {p}")
            await asyncio.sleep(30)
        else:
            await asyncio.sleep(random.uniform(2.0, 4.0))
    else:
        if os.path.exists(progress_path):
            os.remove(progress_path)

    if dump_all_path:
        with open(dump_all_path, 'w', encoding='utf-8') as f:
            json.dump(list(all_posts.values()), f, ensure_ascii=False)
        print(f"  Full cache → {dump_all_path} ({len(all_posts)} posts)")
    print(f"\nDone: scanned {total_posts} posts, {found} hits")
    return collected


def format_md(collected, user_id, keywords):
    posts = sorted(collected.values(), key=lambda x: x.get('date', ''))
    lines = [
        f"# Xueqiu Posts: User {user_id}",
        "",
        f"> **Source**: Xueqiu https://xueqiu.com/u/{user_id}",
        f"> **Compiled**: {datetime.now().strftime('%Y-%m-%d')}",
        f"> **Count**: {len(posts)} posts",
        f"> **Keywords**: {', '.join(keywords)}",
        f"> **Method**: Playwright session + user_timeline.json full traversal (original posts only)",
        "",
        "---",
        "",
    ]
    for i, p in enumerate(posts, 1):
        lines.append(f"## {i}. {p.get('date','?')}")
        lines.append("")
        if p.get('title'):
            lines += [f"**[{p['title']}]**", ""]
        if p.get('retweet_of'):
            lines += [f"> Retweeted: {p['retweet_of']}", ""]
        if p.get('text'):
            lines.append(p['text'])
            lines.append("")
        lines += [f"Source: {p.get('url','')}", "", "---", ""]
    return '\n'.join(lines)


def parse_args():
    ap = argparse.ArgumentParser(description="Xueqiu user timeline scraper (filter original posts by keywords)")
    ap.add_argument('--user-id', type=int, help='Xueqiu user ID (numeric segment of profile URL)')
    ap.add_argument('--keywords', type=str, default='',
                    help='Comma-separated keyword list. E.g.: PDD,Temu,Pinduoduo')
    ap.add_argument('--output', type=str, default='', help='Markdown output path')
    ap.add_argument('--raw-json', type=str, default='', help='(Optional) Raw JSON output path for matched posts')
    ap.add_argument('--state-path', type=str, default='/tmp/xueqiu_state.json',
                    help='Session state cache file (default: /tmp/xueqiu_state.json)')
    ap.add_argument('--dump-all', type=str, default='',
                    help='Full cache path: writes all original posts by the user here for offline multi-topic analysis')
    ap.add_argument('--from-cache', type=str, default='',
                    help='Skip crawl, filter from existing full cache JSON to generate markdown (requires --keywords and --output)')
    return ap.parse_args()


def filter_from_cache(cache_path, keywords, user_id):
    posts = json.load(open(cache_path))
    out = []
    for p in posts:
        if is_match((p.get('title','') + ' ' + p.get('text','')), keywords):
            out.append(p)
    return {p['id']: p for p in out}


async def main():
    args = parse_args()
    keywords = [k.strip() for k in args.keywords.split(',') if k.strip()]

    # Offline filter mode
    if args.from_cache:
        if not (keywords and args.output):
            print("--from-cache requires both --keywords and --output")
            return
        user_id = args.user_id or 0
        collected = filter_from_cache(args.from_cache, keywords, user_id)
        print(f"Filtered {len(collected)} posts from cache {args.from_cache} (keywords: {keywords})")
        if not collected:
            return
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(format_md(collected, user_id, keywords))
        print(f"Markdown → {args.output}")
        return

    if not args.user_id:
        print("--user-id is required")
        return

    progress_path = args.state_path + f'.progress.{args.user_id}'
    raw_json = args.raw_json or f'/tmp/xueqiu_{args.user_id}_raw.json'

    print("=" * 60)
    print(f"Xueqiu Scraper | user_id={args.user_id} | keywords={keywords} | dump_all={args.dump_all}")
    print("=" * 60)

    async with async_playwright() as pw:
        session = await load_with_state(pw, args.state_path, args.user_id)
        if not session:
            session = await interactive_login(pw, args.state_path, args.user_id)
        if not session:
            print("Login failed, exiting")
            return
        browser, _, page = session
        collected = await fetch_all_timeline(page, args.user_id, keywords, progress_path, args.dump_all)
        await browser.close()

    print(f"\n=== Final: {len(collected)} hits ===")
    if not collected:
        return
    with open(raw_json, 'w', encoding='utf-8') as f:
        json.dump(list(collected.values()), f, ensure_ascii=False, indent=2)
    print(f"Raw JSON → {raw_json}")
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(format_md(collected, args.user_id, keywords))
        print(f"Markdown  → {args.output}")


if __name__ == '__main__':
    asyncio.run(main())
