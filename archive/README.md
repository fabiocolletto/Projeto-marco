# Archive Area

This folder stores every asset that has been relocated by the automated maintenance policy. Items are grouped by the year and month when they were archived to keep timelines easy to trace.

## Structure

- `MANIFEST.json` — append-only ledger with the original path, destination, SHA-256 hash, size, reason, evidence snippet, and archival timestamp.
- `<YYYY-MM>/…` — dated folders mirroring the original relative paths for general files.
- `miniapps/_archive/<id>/…` — inactive miniapps moved out of the runtime surface. Each folder receives a README with the rationale and restoration instructions.
- `assets/_archive/<YYYY-MM>/…` — large binary assets without references. They should be migrated to Git LFS if still relevant.

## Governance Principles

1. **Reversibility** — every move is documented in the manifest and restorable through `npm run archive:restore`.
2. **Traceability** — reasons and evidence from the audit are recorded next to each entry.
3. **Dry-run First** — no automated job moves files without explicit maintainer approval.
4. **Manual Oversight** — manuals and other critical knowledge bases remain untouched; reports guide reviewers instead.

## Restoring Files

Use the `archive:restore` script to reinstate content. Provide either the original path or the SHA-256 identifier logged in the manifest.

```bash
npm run archive:restore -- --path=path/to/file.ext
```

The script verifies hashes before writing to avoid tampering or corruption.
