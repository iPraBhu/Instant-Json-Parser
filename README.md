# Instant JSON Parser

Instant JSON Parser is a Chrome Extension (Manifest V3) that prettifies, validates, searches, and inspects JSON instantly in a privacy-friendly popup. It runs completely offline and can optionally auto-paste JSON from your clipboard the moment you open the popup.

## Features

- Clipboard-aware popup with large editor, Pretty and Tree tabs, and light/dark themes.
- High-fidelity JSON parsing with duplicate-key policies, depth/size limits, and optional lenient mode (comments + trailing commas).
- Syntax-coloured pretty printer and an interactive lazy-rendered tree with pointer breadcrumbs, expand/collapse all, and node-level copy.
- Full-text search across either view with match navigation, case-insensitive toggle, and keyboard shortcuts (Ctrl/Cmd+Enter to parse, Ctrl/Cmd+F to focus search, Ctrl/Cmd+C to copy output).
- Robust error reporting: line/column, friendly tips, and highlighted code frames.
- Settings page to configure auto-paste, indentation, theme, duplicate handling, lenient mode, limits, and more.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Choose **Load unpacked** and select the project folder containing `manifest.json`.

The extension icon will appear in your toolbar; pin it for quick access.

## Usage

1. Open the popup from the toolbar (or context menu). If auto-paste is enabled and your clipboard holds valid JSON, it will load automatically.
2. Paste or edit JSON in the left editor and press **Parse** (or Ctrl/Cmd+Enter).
3. Switch between **Pretty** and **Tree** tabs, search, copy the output, or explore node details. Hover any node to view its JSON Pointer; click to copy it.
4. Review status badges for lenient parsing or duplicate-key warnings.

### Keyboard Shortcuts

- **Ctrl/Cmd + Enter** – Parse JSON.
- **Ctrl/Cmd + F** – Focus search box.
- **Enter / Shift + Enter** (in search) – Next / Previous match.
- **Ctrl/Cmd + C** (when output focused) – Copy current view.

## Options

Open the extension’s **Options** page to configure:

- Auto-paste behaviour and whether to remember the last input.
- Lenient parsing (comments/trailing commas) and duplicate-key policy (error, first wins, last wins).
- Pretty-print indent size (2 or 4 spaces) and default search case sensitivity.
- Default theme (System / Light / Dark) and popup theme overrides.
- Safety limits for maximum JSON depth and input size.

Use “Reset to defaults” to restore the recommended configuration.

## Permissions & Privacy

- **storage** – Persist your preferences (theme, options, last input if enabled).
- **clipboardRead** – Optional auto-paste from your clipboard when the popup opens.

All parsing happens locally; no network requests are made. Clipboard access is only requested when needed, and nothing leaves your device.

## Testing Aids

The `testdata/` directory includes:

- `sample-valid.json` – Valid JSON demonstrating standard usage.
- `sample-invalid.json` – Invalid JSON for error handling.
- `sample-large.json` – Medium-sized JSON to exercise performance and depth counters.
- `sample-lenient.jsonc` – JSON-with-comments to validate lenient parsing.

Load these samples via copy/paste to verify behaviour across scenarios.

## Troubleshooting

- **Clipboard errors** – Ensure you granted clipboard permission and Chrome allows clipboard access for extensions.
- **Parse failures** – See the error panel for exact line/column info and tips.
- **Theme mismatch** – Toggle the theme in the popup; if “System” is selected, it follows your OS preference.

Feel free to adapt `src/constants.js` to change metadata, defaults, or contact links.
