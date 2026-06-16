---
name: solid-start-skill-creator
description: Scaffold, validate, and sync new Solid-Start skills so the agent can extend its own skill library mid-task without producing slop.
related:
  - solid-start-project-structure
  - solid-start-best-practices
---

# Solid-Start Skill Creator
- Self-improvement: when you hit a recurring need with no matching skill, create one instead of re-deriving the same solution.
- Every generated skill is template-conformant (`SKILL_TEMPLATE.md` in this skill dir — self-contained, no repo-global docs dependency) and written into all three agent dirs at once.
- A real validator gates quality; a sync helper keeps `.agents`/`.claude`/`.gemini` byte-identical.

## Safety contract: non-negotiable
- Abort if the new skill name does not start with `solid-start-` or is not kebab-case (`creator.py` rejects it to avoid routing collisions).
- Abort if you mark a scaffolded skill "done" while `validate.py` still reports issues (placeholder markers, fewer than five Bad/Good examples, empty fences, unresolved cross-links).
- Abort if you edit a skill in only one agent dir — always run `sync.py` so the three copies match.

## Required tools
- `python >= 3.10` (`python` or `python3` on PATH).
- The toolchain shipped here: `tools/creator.py`, `tools/validate.py`, `tools/sync.py`, `scripts/validate.{ps1,sh}`.

## Gotchas
- Frontmatter needs a real newline after the opening fence; the helper handles this — do not hand-write the name on the same line as the opening fence (that yields invalid YAML and breaks skill routing).
- `creator.py` seeds placeholder markers on purpose; the validator fails while any remain, so you must fill every example before committing.
- `sync.py` overwrites the target skill dirs from `.claude`; always author in `.claude` first, never in `.agents`/`.gemini`.

## Workflow
1. Confirm no existing skill covers the need (scan `solid-start/.claude/skills/`).
2. Scaffold: `python tools/creator.py --stack solid-start --add solid-start-<name> --related <a>,<b> --description "<concrete sentence>"`.
3. Fill the `.claude` copy with a real safety contract, gotchas, workflow, and at least five Bad and five Good runnable examples.
4. Mirror: `python tools/sync.py --stack solid-start --skill solid-start-<name>`.
5. Gate: `python tools/validate.py --stack solid-start` must exit 0.

## Code Examples (Good vs Bad)

### Bad Example 1 (hand-made dir, single agent dir only)
```bash
mkdir solid-start-example
echo "# Example" > solid-start-example/SKILL.md
# No frontmatter, no examples, and the skill exists in only one of the three agent dirs.
```

### Bad Example 2 (marking incomplete work as done)
```bash
python tools/creator.py --stack solid-start --add solid-start-example-skill
# ...left the scaffold placeholders in place...
git add -A && git commit -m "add skill"   # validator never run; ships slop
```

### Bad Example 3 (editing only one agent dir)
```bash
$EDITOR solid-start/.claude/skills/solid-start-foo/SKILL.md   # edited .claude only
# never ran sync.py -> .agents and .gemini still hold the old copy -> validator: "out of sync"
```

### Bad Example 4 (name not stack-prefixed / not kebab-case)
```bash
python tools/creator.py --stack solid-start --add FooBar      # rejected: not kebab-case
python tools/creator.py --stack solid-start --add my-helper    # rejected: missing 'solid-start-' prefix
```

### Bad Example 5 (only four example pairs)
```bash
# filled 4 Bad + 4 Good, then ran the gate:
python tools/validate.py --stack solid-start   # FAIL: need >=5 Bad / >=5 Good examples
```

### Good Example 1 (scaffold, fill, sync, validate)
```bash
python tools/creator.py --stack solid-start --add solid-start-example-skill   --related solid-start-best-practices,solid-start-project-structure   --description "A concrete sentence describing exactly what this skill guarantees."
# edit solid-start/.claude/skills/solid-start-example-skill/SKILL.md -> fill every placeholder
python tools/sync.py --stack solid-start --skill solid-start-example-skill
python tools/validate.py --stack solid-start   # exits 0 only when fully conformant
```

### Good Example 2 (validate everything before committing)
```bash
# from this skill's dir:
./scripts/validate.sh             # all stacks; fails on any issue
./scripts/validate.sh solid-start     # just this stack
python tools/validate.py --stack solid-start --report   # slop summary, never fails
```

### Good Example 3 (seed cross-links at scaffold time)
```bash
python tools/creator.py --stack solid-start --add solid-start-pagination-cursor   --related solid-start-best-practices,solid-start-project-structure   --description "Cursor pagination that stays stable under concurrent inserts."
# related: links are pre-seeded so the cross-link graph stays connected from the start
```

### Good Example 4 (consult the local template, not global docs)
```bash
cat solid-start/.claude/skills/solid-start-skill-creator/SKILL_TEMPLATE.md
# the authoring contract lives beside the tools; nothing depends on a repo-global docs/ dir
```

### Good Example 5 (mirror the whole stack, then gate once)
```bash
python tools/sync.py --stack solid-start --all          # mirror every skill into .agents/.gemini
python tools/validate.py --stack solid-start            # must exit 0 before you call it done
```

## Related skills
- [[solid-start-project-structure]] — new skills should reflect the enterprise layout this skill enforces.
- [[solid-start-best-practices]] — the quality bar every generated skill must meet.
