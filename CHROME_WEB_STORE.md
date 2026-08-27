# Chrome Web Store release guide

The upload archive, store copy, and promotional assets are maintained separately:

- Run `pnpm package` to create the minimal extension archive.
- Copy the listing fields from `store-listing/LISTING.md`.
- Upload the PNG files from `store-listing/assets/final/`.

## Checklist

Before uploading:
- Confirm `manifest.json` and `package.json` use the release version.
- Run `pnpm package` and keep its SHA-256 value with the release notes.
- Inspect the ZIP and verify `manifest.json` is at its root.
- Load `dist-store/` as an unpacked extension in a clean Chrome profile.
- Complete the manual scenarios in `README.md`.
- Upload the current 128×128 icon and the promo PNGs from `store-listing/assets/final/`.
- Capture and upload the real 1280×800 product screenshots described in `store-listing/ARTWORK.md`.
- Confirm the privacy-policy URL is public.

## Packaging instructions

From the repository root:

```sh
pnpm install
pnpm package
```

The command:

1. Runs the complete test suite.
2. Verifies the manifest and package versions match.
3. Copies only extension runtime files into `dist-store/`.
4. Checks every packaged JavaScript file and manifest file reference.
5. Creates `TabSpan-<version>.zip` with `manifest.json` at its root.
6. Prints the archive size and SHA-256 checksum.

Upload the generated ZIP in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Notes

- The package excludes tests, docs, dependencies, source-control metadata, and store artwork.
- If you change permissions, Chrome may require users to re-approve.
