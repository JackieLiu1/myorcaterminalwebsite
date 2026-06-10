# OrcaTerminal Download Directory

Put release installers in this directory. File names can include versions, for
example `OrcaTerminal-1.2.3-macOS-arm64.dmg`.

These release asset names are recognized:

- `orcaterminal-0.9.10-aarch64.rpm`
- `orcaterminal-0.9.10-amd64.deb`
- `orcaterminal-0.9.10-arm64.deb`
- `OrcaTerminal-0.9.10-macOS-arm64.dmg`
- `OrcaTerminal-0.9.10-macOS-x64.dmg`
- `OrcaTerminal-0.9.10-Windows-x64.exe`
- `orcaterminal-0.9.10-x86_64.rpm`

After adding or replacing installers, generate `manifest.json`:

```bash
npm run downloads:manifest
```

The homepage reads only `downloads/manifest.json`, so `app.js` does not need to
change for every release. The same command also writes
`assets/downloads-manifest.js`, which lets the homepage show downloads even if a
local preview or server blocks the JSON request. MD5 checksums are calculated
automatically and shown beside each download option.

Recognized targets and package formats:

- macOS arm64: file name contains `macOS` or `darwin`, plus `arm64`, `aarch64`,
  or `apple-silicon`
- macOS Intel: file name contains `macOS` or `darwin`, plus `x64`, `x86_64`,
  `amd64`, or `intel`
- Windows x64: file name contains `Windows` or `win`, plus `x64`, `x86_64`, or
  `amd64`
- Linux x64: file name contains `Linux` or ends with `.deb` / `.rpm` /
  `.AppImage`, plus `x64`, `x86_64`, or `amd64`
- Linux arm64: file name contains `Linux` or ends with `.deb` / `.rpm` /
  `.AppImage`, plus `arm64` or `aarch64`
- Linux package formats are kept as separate download items, so `amd64.deb` and
  `x86_64.rpm` can appear together under Linux.
