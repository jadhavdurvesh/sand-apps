# SAND native SDK (ABI v3 development headers)

Copies of the SAND OS freestanding app runtime: `include/sand/{abi,app,libsand}.h` and `lib/libsand.c`. Build an app with `-m32 -ffreestanding -fno-builtin -Isdk/native/include`, link at the SAPP user base, pack with `tools/sapp_pack.py`. The kernel repo (sand-os) is authoritative; refresh these files when its ABI changes. Apps are currently embedded into the kernel image, not loaded from disk.
