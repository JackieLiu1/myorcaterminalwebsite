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

The command generates both `downloads/manifest.json` and
`assets/downloads-manifest.js`. The homepage loads the embedded JS manifest
before `app.js`, then tries to refresh from `downloads/manifest.json` at
runtime. If an installer file name changes with each release, the manifest
records the new file name.

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
