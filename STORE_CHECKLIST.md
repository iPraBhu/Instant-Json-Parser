# Chrome Web Store Submission Checklist

This document summarizes the steps and collateral needed to ship **Instant JSON Parser** to the Chrome Web Store.

## 1. Verify the build

- [ ] Run through the popup UI flows (auto-paste, manual paste, search, tree view, copy) to confirm no console errors.
- [ ] Ensure the clipboard notice appears before the auto-paste feature reads clipboard data. Dismissal state should persist across sessions.
- [ ] Confirm options page toggles persist as expected (auto-parse on blur, auto-paste, lenient mode, etc.).
- [ ] Test context-menu entries after enabling the extension to confirm the new `contextMenus` permission is satisfied.

## 2. Prepare the package

- [ ] Increment the version in `manifest.json` (`version`) and match it in store metadata.
- [ ] Generate the signed package via Chrome: `chrome://extensions` → *Pack extension...* pointing at the project root.
- [ ] Review the output `.zip` to ensure it includes only required assets (exclude `testdata/` if not needed in production).

## 3. Store listing assets

- **Name**: Instant JSON Parser (matches `_locales/en/messages.json:appName`).
- **Short description**: e.g., “Instantly prettify, explore, and search JSON with a clipboard-aware popup.”
- **Full description**: Highlight key features (pretty/tree views, search, clipboard workflow, privacy-by-design). Mention on-device processing explicitly.
- **Screenshots**: Capture at least one 1280×800 screenshot of the popup in light and dark themes.
- **Icon**: Use the 128×128 asset at `assets/icons/icon128.png`.
- **Category**: Developer Tools.

## 4. Privacy and compliance

- [ ] Upload the included `PRIVACY.md` (or copy its contents) to a hosted URL and reference it in the Chrome Web Store privacy policy field.
- [ ] In the store listing’s “Data disclosure” section, mark that the extension reads clipboard content only on device and does not transmit data off the user’s machine.
- [ ] Ensure any marketing site linked from the listing mirrors the privacy messaging.

## 5. Post-submission

- Monitor the developer dashboard for review feedback.
- Respond promptly to any policy inquiries regarding clipboard usage or data handling.

