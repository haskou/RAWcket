# Third-party notices

RAWcket is MIT-licensed, but its production bundle contains separately licensed dependencies. This page records the dependencies that require special attention beyond the generated package lockfile.

## libraw-wasm 1.6.0

- Purpose: Emscripten/Web Worker adapter used to decode camera RAW files without blocking the main browser thread.
- Upstream: <https://github.com/ybouane/LibRaw-Wasm>
- Wrapper license declared by the published package: ISC.
- RAWcket changes: none to the upstream wrapper or its compiled LibRaw binary.

## LibRaw

- Purpose: camera RAW parsing, camera-aware white balance/color conversion, demosaicing, and 16-bit RGB output.
- Upstream source: <https://github.com/LibRaw/LibRaw>
- Upstream licenses: the user may choose GNU LGPL 2.1 or CDDL 1.0. Upstream provides both `LICENSE.LGPL` and `LICENSE.CDDL`.
- RAWcket integration: the unmodified LibRaw build distributed by `libraw-wasm` is loaded as a separate WASM asset and used through the wrapper's asynchronous API.

Release packaging must preserve these notices and provide the corresponding upstream source/license links. Any future modification or first-party rebuild of LibRaw requires a fresh compliance review and publication of the covered source and build scripts as required by the selected license. This engineering record is not legal advice.
