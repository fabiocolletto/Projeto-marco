# Maintenance and Archiving Policy

This document summarizes the governance applied to the automated maintenance routines that keep the Marco project tidy and reversible. The workflow favours transparency, dry-run defaults, and manifests that can be audited at any time.

## Classification Rules

- **Active** — Any item referenced by HTML, CSS, JS imports, registry routes, or manifest entries.
- **Candidate for archive** — Files with no inbound references **and** at least 120 days without modifications.
- **Orphan** — Items without references that are younger than the archive threshold. They are reported but not moved automatically.
- **Manuals** — Never archived automatically. If a manual is older than 120 days it is listed in `manuals-status.txt` for human review.
- **Miniapps** — When a miniapp is not registered in `appbase/registry.json` or is marked as deprecated in its manifest, its whole subtree is moved to `miniapps/_archive/<id>/`.
- **Assets** — Binary assets above 5 MB without references are moved to `assets/_archive/<YYYY-MM>/` and flagged for Git LFS adoption.

## Audit Flow (`npm run audit:repo`)

1. Scans the repository tree and records the hash, size, and timestamps in `reports/<date>/tree.json`.
2. Builds a reference graph across JS/TS, HTML, CSS, JSON manifests, and the application registry.
3. Produces `findings.json`, `summary.md`, `manuals-status.txt`, `linkcheck.txt`, `eslint-unused.txt`, `markup-lint.txt`, and `registry-diff.json` inside the dated report directory.
4. The audit always runs in dry mode; no files are moved.

## Archiving Flow (`npm run archive:apply`)

1. Loads the latest report (`reports/<date>/findings.json`).
2. Moves candidates older than 120 days to `archive/<YYYY-MM>/…` while preserving their relative structure.
3. Appends entries to `archive/MANIFEST.json` with the original path, destination, SHA-256 hash, size, reasons, and evidence snippets.
4. Miniapps are moved to `miniapps/_archive/<id>/` and annotated with a README that explains why they were archived and how to restore them.
5. Large assets (>5 MB) are relocated to `assets/_archive/<YYYY-MM>/` and marked with `lfsSuggested: true` in the manifest entry.
6. Manuals are never moved automatically.

## Restoration Flow (`npm run archive:restore -- --path=<file>`)

1. Looks up the entry in `archive/MANIFEST.json` by original path or SHA-256 identifier.
2. Validates the archived file hash before restoring.
3. Restores the file to its original location if it is absent, preserving directory structure.
4. Supports a dry-run mode by omitting `--apply`.

## Reports Overview

- `summary.md` — key metrics and top candidates/orphans.
- `tree.json` — inventory of every file scanned.
- `findings.json` — list of candidates with evidence.
- `manuals-status.txt` — manuals that require review.
- `linkcheck.txt` — relative links that failed resolution.
- `eslint-unused.txt` — exports without importers.
- `markup-lint.txt` — structural warnings on HTML/CSS.
- `registry-diff.json` — mismatches between the registry and miniapp manifests.

## CI Workflow

The scheduled GitHub Action (`.github/workflows/maintenance.yml`) runs weekly in dry-run mode. It uploads the `reports/<date>` directory as an artifact and updates the "Relatório de Manutenção Semanal" issue. Maintainers can trigger the workflow manually with the `apply` input to perform an archival run, but the default schedule never moves files.

## Checklist for Maintainers

- Always review `findings.json` before applying archival actions.
- Commit the updated `archive/MANIFEST.json` when files are moved.
- Use `npm run archive:restore` to undo an archival entry after verifying the hash.
- Regularly inspect `lfs-scan.mjs` output to keep large binaries tracked under Git LFS.
