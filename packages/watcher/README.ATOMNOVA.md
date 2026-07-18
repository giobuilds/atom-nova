# @atom/watcher (AtomNova fork)

Vendored from `@atom/watcher@1.3.5` with V8 API fixes for Electron 14+ and MSVC builds.

## Patches

1. `src/nan/functional_callback.cpp`: replace `ArrayBuffer::GetContents` / 3-arg `ArrayBuffer::New` with `GetBackingStore` / size-based `New` + memcpy.
2. `src/helper/windows/helper.h`: declare the two-arg `windows_error_result` before the one-arg wrapper (MSVC C2672), and call `FormatMessageA` so UNICODE builds compile.
