#!/usr/bin/env python3
"""Validate relative links and inline path refs in repo context docs."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

CONTEXT_FILES = {"AGENTS.md", "README.md"}
IGNORE_DIRS = {
    ".git",
    ".pnpm-store",
    ".venv",
    "__pycache__",
    "coverage",
    "dist",
    "node_modules",
}
PATH_PREFIXES = (
    "../",
    "./",
    ".agents/",
    ".github/",
    "deploy/",
    "docs/",
    "evals/",
    "scripts/",
    "src/",
    "test/",
)
PATH_EXTS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sql",
    ".ts",
    ".tsx",
    ".txt",
    ".yml",
    ".yaml",
}

LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
CODE_RE = re.compile(r"`([^`\n]+)`")


def context_files(repo: Path) -> list[Path]:
    files: list[Path] = []
    for root, dirs, names in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for name in names:
            if name in CONTEXT_FILES:
                files.append(Path(root) / name)
    return sorted(files)


def clean_link_target(target: str) -> str | None:
    parsed = urlparse(target.strip())
    if parsed.scheme or target.startswith("#"):
        return None
    path = unquote(parsed.path)
    return path or None


def is_path_like(value: str) -> bool:
    if any(ch.isspace() for ch in value):
        return False
    if any(ch in value for ch in ("*", "<", ">", "|", "{", "}")):
        return False
    if value.startswith(PATH_PREFIXES):
        return True
    return Path(value).suffix in PATH_EXTS


def exists(repo: Path, source: Path, ref: str) -> bool:
    candidates = [source.parent / ref]
    if not ref.startswith("../"):
        candidates.append(repo / ref)
    return any(candidate.exists() for candidate in candidates)


def main() -> int:
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    broken: list[tuple[Path, str]] = []
    checked = 0

    for source in context_files(repo):
        text = source.read_text(encoding="utf-8")

        for target in LINK_RE.findall(text):
            ref = clean_link_target(target)
            if ref is None:
                continue
            checked += 1
            if not exists(repo, source, ref):
                broken.append((source, target))

        for value in CODE_RE.findall(text):
            if not is_path_like(value):
                continue
            checked += 1
            if not exists(repo, source, value):
                broken.append((source, value))

    if broken:
        for source, ref in broken:
            print(f"{source.relative_to(repo)}: missing {ref}", file=sys.stderr)
        return 1

    print(f"context paths ok: {len(context_files(repo))} files, {checked} refs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
