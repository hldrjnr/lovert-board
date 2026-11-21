# Storage Format

## Working folder
A project folder contains:
- `project.lbmeta`: project identity and format version.
- `workspace.db`: SQLite database.
- `assets/originals/`: imported source assets.
- `assets/thumbnails/`: generated previews.
- `assets/attachments/`: supporting files.
- `backups/`: recovery snapshots.

## Portable archive
`.lbboard` is a ZIP-based archive containing the same project structure plus a manifest.

The manifest must include:
- `format`: `lovert-board`
- `formatVersion`: integer
- `appVersion`: semantic version
- `database`: relative path
- `createdAt`: ISO-8601 timestamp

Absolute filesystem paths must never be required to reopen a project.
