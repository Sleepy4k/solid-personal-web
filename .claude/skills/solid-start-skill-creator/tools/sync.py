#!/usr/bin/env python3
"""Mirror skills from the .claude agent dir into .agents and .gemini.

The three agent dirs keep independent copies of every skill (only config.json differs). Author
edits in .claude, then run this to mirror them so the copies never drift. config.json is never
touched.

Usage
-----
    python sync.py --stack express --all                 # mirror every skill
    python sync.py --stack express --skill express-jwt-authentication
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

SOURCE_AGENT = ".claude"
TARGET_AGENTS = (".agents", ".gemini")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


def mirror_skill(stack: str, slug: str, root: Path) -> list[str]:
    src = root / stack / SOURCE_AGENT / "skills" / slug
    if not src.exists():
        print(f"error: source skill not found: {src}", file=sys.stderr)
        return []
    changed = []
    for agent in TARGET_AGENTS:
        dst = root / stack / agent / "skills" / slug
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        changed.append(str(dst.relative_to(root)))
    return changed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Mirror .claude skills to .agents/.gemini.")
    parser.add_argument("--stack", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--skill", help="Single skill slug to mirror")
    group.add_argument("--all", action="store_true", help="Mirror all skills")
    args = parser.parse_args(argv)
    root = repo_root()

    src_base = root / args.stack / SOURCE_AGENT / "skills"
    if not src_base.exists():
        print(f"error: {src_base} not found", file=sys.stderr)
        return 1

    if args.all:
        slugs = sorted(p.name for p in src_base.iterdir() if (p / "SKILL.md").exists())
    else:
        slugs = [args.skill]

    count = 0
    for slug in slugs:
        for path in mirror_skill(args.stack, slug, root):
            count += 1
    print(f"mirrored {len(slugs)} skill(s) into {len(TARGET_AGENTS)} agent dirs ({count} copies).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
