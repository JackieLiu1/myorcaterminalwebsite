# OrcaTerminal Site Deployment

## Updating Download Assets

You do not need to edit `downloads/manifest.json` by hand.

1. Put release installers into `downloads/`.
2. Run:

   ```bash
   npm run downloads:manifest
   ```

3. Deploy the whole site directory, including `index.html`, `app.js`,
   `styles.css`, `assets/`, and `downloads/`.

The command generates `downloads/manifest.json`. The homepage reads that JSON
at runtime with a cache-busting query string, so this file is the single source
of truth for download versions, file names, sizes, and MD5 checksums.

## Expected Release Asset Names

These file names are supported:

- `orcaterminal-0.9.10-aarch64.rpm`
- `orcaterminal-0.9.10-amd64.deb`
- `orcaterminal-0.9.10-arm64.deb`
- `OrcaTerminal-0.9.10-macOS-arm64.dmg`
- `OrcaTerminal-0.9.10-macOS-x64.dmg`
- `OrcaTerminal-0.9.10-Windows-x64.exe`
- `orcaterminal-0.9.10-x86_64.rpm`

## Icons

The macOS, Windows, and Linux icons used in the download cards are embedded in
`index.html`, so they do not depend on separate icon files during deployment.
