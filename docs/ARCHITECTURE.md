# Architecture

- React + TypeScript: presentation and interaction.
- Tauri 2: desktop runtime and IPC.
- Rust commands: project and board persistence, archive import/export.
- JSON files: MVP persistence, chosen for transparent project folders and easy portability.
- `.lbboard`: ZIP archive of a project folder.

All filesystem access is performed by Rust commands. React calls the commands through `src/services/desktop.ts`. The UI does not directly access project files.

## Future migration
Move JSON board persistence to SQLite once asset indexing, board querying and migration tests are ready. Keep the command interface stable so the UI does not need to know the storage implementation.
