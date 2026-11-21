# Lovert Board

Offline-first visual workspace for desktop. Current release target: MVP 0.2.0.

## Implemented in this MVP
- Tauri 2 desktop shell.
- Local project creation, listing and deletion.
- Boards per project.
- Freeform board with draggable note, text and task cards.
- Autosave to local project files.
- Project export to `.lbboard` ZIP archive.
- Import from `.lbboard` archive.
- GitHub Actions builds for Linux, Windows and macOS.

## Not yet implemented
- Image cards and asset manager.
- Rich-text editor.
- Connectors, columns and multi-select.
- SQLite database (current persistence uses versioned JSON files).
- Undo/redo and crash-recovery snapshots.
- AI integrations (Ollama and cloud providers).
- Automated UI/integration tests.

## Requirements
- Node.js 22
- Rust stable
- Tauri Linux prerequisites (GTK 3 and WebKitGTK 4.1 development packages)

## Linux Mint XFCE
```bash
sudo apt update
sudo apt install -y build-essential curl wget file pkg-config libssl-dev \
  libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf unzip zip

# Install Node 22 with nvm if needed:
# https://github.com/nvm-sh/nvm
nvm install 22
nvm use 22

# Install Rust if needed:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

npm install
npm run tauri dev
```

## Build locally
```bash
npm run build
npm run tauri build
```

## GitHub Actions
1. Create a GitHub repository named `lovert-board`.
2. Push this project to the `main` branch.
3. GitHub Actions runs `.github/workflows/build.yml`.
4. Open the Actions tab and download artifacts for Linux, Windows and macOS.
5. To create a versioned release, create and push a tag, e.g. `git tag v0.2.0 && git push origin v0.2.0`.

The workflow currently uploads build artifacts. It does not publish a GitHub Release automatically.

## Data layout
Projects are stored under the OS application data directory, one folder per project:
- `project.json`
- `project.lbmeta`
- `boards/<board-id>.json`
- `assets/originals/`
- `assets/thumbnails/`

The `.lbboard` portable format is a ZIP archive of this project folder.
