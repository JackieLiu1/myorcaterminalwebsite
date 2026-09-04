# OrcaTerminal Site Deployment

## Automated Releases

Tagged OrcaTerminal releases update this site automatically. The application
release workflow publishes installers to `JackieLiu1/orcaterminal-releases`,
then commits these two generated files to this repository:

- `downloads/manifest.json`, containing public GitHub Release links, sizes,
  and SHA-256 checksums.
- `changelog.html`, generated from OrcaTerminal's `CHANGELOG.zh_CN`.

The website does not store new installer binaries. GitHub Releases is the
single source of truth for release assets, while this repository stays small
and triggers its normal Pages deployment from the generated commit.

The source repository uses a write-enabled deploy key scoped only to this
repository. Its private half is stored there as the `WEBSITE_DEPLOY_KEY`
Actions secret.

## Legacy Local Asset Generation

`npm run downloads:manifest` remains available for working with the older
installers already checked into `downloads/`. Do not use it for new releases;
it generates local file links and MD5 checksums instead of the automated
GitHub Release manifest.

## Expected Release Asset Names

These file names are supported:

- `orcaterminal-0.9.10-aarch64.rpm`
- `orcaterminal-0.9.10-amd64.deb`
- `orcaterminal-0.9.10-arm64.deb`
- `OrcaTerminal-0.9.10-macOS-arm64.dmg`
- `OrcaTerminal-0.9.10-Windows-x64.exe`
- `orcaterminal-0.9.10-x86_64.rpm`

## Icons

The macOS, Windows, and Linux icons used in the download cards are embedded in
`index.html`, so they do not depend on separate icon files during deployment.
