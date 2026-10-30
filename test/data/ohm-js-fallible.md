# Recovery browser fixture

`ohm-js-fallible.tgz` is the output of `npm pack` for ohm-js 17.5.0 from
<https://github.com/DavidSouther/ohm> at commit
`70d4af01b01aabf5b099199eb689e7d7ca44ebca` (the three-slot correction
semantics recovery slice).

SHA-256: `89546e8f6507eafafcfc5133e9cd6caaa1a32a0269738174e70da13d6d7024e0`.

The Playwright workflow verifies this digest and extracts only the browser
distribution into `public/dist`. The editor's installed dependency and normal
remote loader remain on released Ohm. See [local setup](../LOCAL_OHM.md).
