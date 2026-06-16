#!/usr/bin/env python3
"""Skill scaffolder for the agentic skills library.

Creates a new, template-conformant SKILL.md (see SKILL_TEMPLATE.md beside this skill) inside
ALL three agent directories (.agents/.claude/.gemini) of a stack in a single run, so the three
copies never drift. Use this when, mid-implementation, the agent hits a recurring need that no
existing skill covers. The authoring contract is self-contained per stack; it does not depend
on any repo-global docs directory.

Examples
--------
    python creator.py --stack express --add express-pagination-cursor \
        --related express-orm-database-integration,express-validation-zod \
        --description "Cursor-based pagination that stays stable under concurrent inserts."

After scaffolding, fill in the real Bad/Good examples and run validate.py.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

AGENT_DIRS = (".agents", ".claude", ".gemini")
SLUG_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)+$")


def repo_root() -> Path:
    # <repo>/<stack>/<agent>/skills/<stack>-skill-creator/tools/creator.py
    return Path(__file__).resolve().parents[5]


def title_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-"))


def render_template(slug: str, description: str, related: list[str]) -> str:
    title = title_from_slug(slug)
    related_yaml = "".join(f"  - {r}\n" for r in related) or "  []\n"
    related_links = (
        "".join(f"- [[{r}]] — TODO: explain the relationship.\n" for r in related)
        or "- [[REPLACE-with-a-real-sibling-skill]] — TODO: explain the relationship.\n"
    )
    return f"""---
name: {slug}
description: {description}
related:
{related_yaml}---

# {title}
- TODO: 2-4 bullets stating the concrete outcome this skill enforces.

## Safety contract: non-negotiable
- Abort if TODO: a specific, detectable bad condition tied to a real failure mode.

## Required tools
- TODO: real runtime / package@version.

## Gotchas
- TODO: a specific, version-aware trap that causes real bugs.

## Workflow
1. TODO: executable step.
2. TODO: executable step.
3. TODO: verification step.

## Code Examples (Good vs Bad)

### Bad Example 1 (TODO: name the failure)
```text
TODO: real, runnable code that demonstrates the bug.
```

### Bad Example 2 (TODO: name a second distinct failure)
```text
TODO: real, runnable code.
```

### Bad Example 3 (TODO: name a third distinct failure)
```text
TODO: real, runnable code.
```

### Bad Example 4 (TODO: name a fourth distinct failure)
```text
TODO: real, runnable code.
```

### Bad Example 5 (TODO: name a fifth distinct failure)
```text
TODO: real, runnable code.
```

### Good Example 1 (TODO: name the fix)
```text
TODO: real, runnable, production-ready code.
```

### Good Example 2 (TODO: name a second correct pattern)
```text
TODO: real, runnable code.
```

### Good Example 3 (TODO: name a third correct pattern)
```text
TODO: real, runnable code.
```

### Good Example 4 (TODO: name a fourth correct pattern)
```text
TODO: real, runnable code.
```

### Good Example 5 (TODO: name a fifth correct pattern)
```text
TODO: real, runnable code.
```

## Related skills
{related_links}"""


def create_skill(stack: str, slug: str, description: str, related: list[str]) -> int:
    if not SLUG_RE.match(slug):
        print(f"error: '{slug}' must be kebab-case (e.g. {stack}-my-skill).", file=sys.stderr)
        return 2
    if not slug.startswith(f"{stack}-"):
        print(f"error: skill name must start with '{stack}-'.", file=sys.stderr)
        return 2

    root = repo_root()
    content = render_template(slug, description, related)
    created, skipped = [], []
    for agent in AGENT_DIRS:
        skill_dir = root / stack / agent / "skills" / slug
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists():
            skipped.append(str(skill_file.relative_to(root)))
            continue
        skill_dir.mkdir(parents=True, exist_ok=True)
        skill_file.write_text(content, encoding="utf-8")
        created.append(str(skill_file.relative_to(root)))

    for path in created:
        print(f"created: {path}")
    for path in skipped:
        print(f"exists (skipped): {path}")
    if not created:
        print("nothing created.", file=sys.stderr)
        return 1
    print(
        "\nNext: fill the TODOs with real Bad/Good examples, then run "
        f"validate.py --stack {stack}"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scaffold a new template-conformant skill.")
    parser.add_argument("--stack", required=True, help="Stack name, e.g. express")
    parser.add_argument("--add", required=True, help="Skill slug, e.g. express-foo-bar")
    parser.add_argument(
        "--related", default="", help="Comma-separated related skill slugs."
    )
    parser.add_argument(
        "--description",
        default="TODO: one concrete sentence describing what this skill guarantees.",
        help="Real, specific description for the frontmatter.",
    )
    args = parser.parse_args(argv)
    related = [r.strip() for r in args.related.split(",") if r.strip()]
    return create_skill(args.stack, args.add, args.description, related)


if __name__ == "__main__":
    raise SystemExit(main())
