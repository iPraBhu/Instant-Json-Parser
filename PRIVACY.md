# Instant JSON Parser – Privacy Policy

Effective date: 2025-01-01

Instant JSON Parser (the "Extension") runs entirely within your browser. We do not collect, transmit, or store any personal data on external servers. All processing happens locally on your device.

## Data Handling

- **Clipboard access**: When the "Auto-paste from clipboard on popup open" setting is enabled, the Extension reads the current clipboard content as soon as the popup gains focus. The clipboard contents are used only to populate the JSON editor and are never transmitted, logged, or shared.
- **User preferences**: Settings such as theme, parsing options, and feature toggles are stored using `chrome.storage.local` so they persist across browser sessions. These values remain on your device.
- **JSON input**: Any JSON you paste or type into the Extension stays in memory within the popup. Closing the popup clears the data unless you opt into "Remember last input".

## Third-Party Services

The Extension does not use third-party analytics, advertising, or tracking services.

## Permissions Rationale

- `clipboardRead`: Required to support the optional auto-paste feature. Clipboard access is clearly disclosed in-product and can be disabled at any time from the settings page.
- `storage`: Saves Extension preferences (e.g., theme, input history) locally on your machine.
- `contextMenus`: Adds convenience menu items for quickly opening the Extension from the browser toolbar or page context.

## Contact

For questions or concerns about privacy, please contact the developer at support@example.com.

