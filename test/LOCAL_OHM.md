# Testing a local Ohm distribution

The normal editor uses the released Ohm build from unpkg. Open
`/?ohm-js=local` to load `public/dist/ohm.js` and `ohm-extras.js` instead.

For a clean checkout or CI, use an npm package archive produced by `npm pack`
from the desired Ohm revision. Pin the archive and its SHA-256 in the job that
supplies it; recovery tests require an archive containing Fallible support.
With `OHM_PACKAGE` pointing to that archive:

```sh
test ! -e public/dist && test ! -L public/dist
fixture_dir=$(mktemp -d)
tar -xzf "$OHM_PACKAGE" -C "$fixture_dir"
mkdir -p public/dist
cp "$fixture_dir/package/dist/ohm.js" public/dist/
cp "$fixture_dir/package/dist/ohm-extras.js" public/dist/
rm -rf "$fixture_dir"
npm ci
npx playwright install chromium
OHM_EDITOR_PORT=8091 npm run test:e2e -- --project=chromium
```

Run the initial existence check separately and stop if it fails: an existing
developer symlink must be preserved. The generated distribution is ignored by
ESLint and Git. To exercise the local loader before recovery is available, use
a released archive such as `npm pack ohm-js@17.5.0` and run
`test/local-ohm-e2e.test.js`; other browser tests continue testing the normal
remote loader using recorded network responses.
