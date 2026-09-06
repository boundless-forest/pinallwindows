# ztab release and repository transition

Version **1.1.0** prepares the transition from TabSpan to **ztab**, positioned as **Another excellent tab manager for Chrome.** The product has three equal pillars: managing tabs across windows, shared pinned tabs, and keyboard shortcuts with thoughtful interactions.

The GitHub repository is now [boundless-forest/ztab](https://github.com/boundless-forest/ztab). It contains the prepared code, listing copy, and artwork. The Chrome Web Store update remains pending; a local package or GitHub push does not submit or publish that update.

## Release materials

- Run `pnpm assets:store` to regenerate the icons and promotional assets.
- Run `pnpm package` to create the extension archive.
- Copy the listing fields from [store-listing/LISTING.md](store-listing/LISTING.md).
- Use the PNG files in `store-listing/assets/final/` and follow the screenshot guidance in [store-listing/ARTWORK.md](store-listing/ARTWORK.md).
- Use [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for the public privacy policy.

## Local verification checklist

- Confirm `manifest.json` and `package.json` both use version `1.1.0`.
- Run `pnpm package` and keep the archive's SHA-256 checksum with the release notes.
- Inspect the ZIP and verify `manifest.json` is at its root.
- Load `dist-store/` as an unpacked extension in an isolated Chrome profile.
- Complete the rebrand, keyboard, pinned-tab, and window-merge checks in [tests/README.md](tests/README.md).
- Review the current icon, both promotional tiles, and product screenshots for the ztab name and all three product pillars.
- Verify that the screenshots show the current UI using sample content and that the privacy-policy URL is public.

## Packaging instructions

From the repository root:

```sh
pnpm install
pnpm assets:store
pnpm package
```

The package command:

1. Runs the complete test suite.
2. Verifies the manifest and package versions match.
3. Copies only extension runtime files into `dist-store/`.
4. Checks every packaged JavaScript file and manifest file reference.
5. Creates `ztab-<version>.zip` with `manifest.json` at its root.
6. Prints the archive size and SHA-256 checksum.

The package includes the privacy policy and license, and excludes development docs, tests, dependencies, source-control metadata, and store artwork.

## Chrome Web Store update — pending

Update the [existing Chrome Web Store item](https://chromewebstore.google.com/detail/fakbifeeblnopdhicpmhhmcdhmefphjp) in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). Its extension ID is `fakbifeeblnopdhicpmhhmcdhmefphjp`.

1. Upload `ztab-1.1.0.zip` as a new version of that item.
2. Change the listing name to `ztab: Tab Manager` and replace the summary, description, icon, promotional tiles, and screenshots with the prepared materials. Use lowercase `ztab` in product copy.
3. Review the permission justifications and privacy declarations, including `tabGroups` for preserving groups during window merges.
4. Set the support URL to `https://github.com/boundless-forest/ztab/issues` and the privacy-policy URL to `https://github.com/boundless-forest/ztab/blob/main/PRIVACY_POLICY.md`. Verify both pages are public, then submit the update for review when release approval is given.
5. After approval and publication, verify the installed extension's identity, name, shortcuts, pinned-site data, and panel preference. Remove the temporary pending-release note in the README only after the new listing is live.

Use the existing item so the extension keeps its identity and existing installations receive an update. Keep the historical `pinallwindows.*` storage keys and existing runtime message identifiers: they are compatibility details, not displayed product names. Renaming them would require a separate compatibility decision. Do not publish a second store item for this rename or ask existing users to uninstall and reinstall.

The implementation already requests `tabGroups`. Compare the release permissions with the version currently published in the Dashboard; an added permission may require users to approve the update. Preparing the ztab name alone does not establish what is currently published.

## GitHub repository transition

On 2026-09-06, the existing repository was renamed from `boundless-forest/tabspan` to [boundless-forest/ztab](https://github.com/boundless-forest/ztab), retaining repository ID `1157705494`. Its description now uses the ztab positioning and three product strengths, and its website points to the [canonical Chrome Web Store item](https://chromewebstore.google.com/detail/fakbifeeblnopdhicpmhhmcdhmefphjp).

Repository and support links in this checkout use the new name. The local `origin` is `git@github.com:boundless-forest/ztab.git`. Other clones can update their SSH remote with:

```sh
git remote set-url origin git@github.com:boundless-forest/ztab.git
```

Use `https://github.com/boundless-forest/ztab.git` for clones that use HTTPS. Existing repository links and Git operations redirect after the rename, as described in the [GitHub repository rename guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

The local checkout directory remains `tabspan` so active tools and saved workspace paths continue to work. Its directory name does not affect the GitHub repository or installed extension identity. Chrome Web Store Dashboard links still need to be updated with the store release above.
