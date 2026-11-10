# SAPP v1 container format

SAPP is the native executable container currently recognized by SAND OS. The loader implementation is authoritative. All integers are unsigned little-endian. There is no compression or signing in v1.

## File layout

1. 64-byte header
2. Segment table (count × 32 bytes)
3. UTF-8 JSON metadata
4. Relocation table (count × 12 bytes; omitted when count is zero)
5. Segment payloads

## Header: 64 bytes

| Offset | Size | Field | Meaning |
|---:|---:|---|---|
| 0 | 4 | magic | ASCII SAPP |
| 4 | 2 | version | 1 |
| 6 | 2 | architecture | 1 = x86-32 |
| 8 | 4 | header_size | 64 |
| 12 | 4 | flags | 0 |
| 16 | 4 | entry | executable entry virtual address |
| 20 | 4 | segment_offset | segment table offset |
| 24 | 4 | segment_count | 1–8 |
| 28 | 4 | metadata_offset | metadata offset |
| 32 | 4 | metadata_size | 1–4096 |
| 36 | 4 | file_size | exact total file size |
| 40 | 4 | signature_offset | 0 |
| 44 | 4 | signature_size | 0 |
| 48 | 4 | relocation_offset | 0 if relocation_count is 0 |
| 52 | 4 | relocation_count | 0–256 |
| 56 | 8 | reserved | all zero |

## Segment: 32 bytes

Format <6I8s: vaddr, memsz, file_offset, file_size, permissions, alignment, reserved[8]. Memory size must be non-zero and file size cannot exceed it. Permission bits are read=1, write=2, execute=4; read is required and W+X is rejected. Alignment is a power of two and at least 4096. Virtual and payload ranges must not overlap. The image is limited to 64 mapped pages.

## Relocation: 12 bytes

Format <3I: target, type, addend. Only type 1 (ABS32) is accepted. Target must be a 4-byte writable location and may not cross a page boundary. The current loader writes addend as the 32-bit value.

The user stack occupies the page immediately below 0xBFFFE000. Signatures are unsupported.
