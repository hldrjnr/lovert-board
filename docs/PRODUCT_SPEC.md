# Lovert Board — Product Specification

## Product direction
Offline-first desktop visual workspace inspired by spatial note-taking and moodboard tools. The application should remain useful without network access or an AI provider.

## MVP 0.2
- Project management: create, list, delete.
- Board management: create, list, delete.
- Canvas: draggable note, text and task cards.
- Autosave to local JSON project files.
- Portable `.lbboard` export/import.
- Cross-platform build workflow.

## Explicitly deferred
- Full Milanote feature parity.
- Real-time collaboration and cloud sync.
- Image and video ingestion.
- Rich text, connectors, columns, comments.
- AI agents and provider settings.
- SQLite migration, undo/redo and recovery history.

## Product principles
- Local-first and offline-capable.
- No account required.
- Portable project format with a format version.
- AI must be optional and isolated behind provider adapters.
- User data must not be transmitted without explicit action.
