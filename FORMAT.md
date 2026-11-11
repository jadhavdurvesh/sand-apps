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


---

# SAPP v2 signed executable container

SAPP v2 is an additive signed format revision. The 64-byte header and segment table remain the same size and field offsets as v1. The version field is 2. SAPP v1 remains unsigned and unchanged; a v1 image must never be interpreted as signed.

## Header signature fields

For v2, the existing header fields at offsets 40 and 44 become mandatory:

| Offset | Size | Field | Meaning |
|---:|---:|---|---|
| 40 | 4 | signature_offset | Offset of signature-block JSON, after all executable payloads |
| 44 | 4 | signature_size | Exact signature-block byte length |

`file_size` at offset 36 includes the signature block. The signature block must end exactly at EOF. Signature offset and size must both be non-zero. The signature block cannot overlap the header, segment table, metadata, relocation table or segment payloads. The loader must reject unknown versions, algorithms, malformed certificate data, invalid lengths, and all unsigned v2 images.

## Signature block

The signature block is canonical UTF-8 JSON (keys sorted lexicographically, no insignificant whitespace, UTF-8 encoding):

```json
{
  "format": "SAND-SAPP-SIGNATURE",
  "version": 1,
  "algorithm": "Ed25519",
  "publisherCertificate": { "format": "SAND-PUBLISHER-CERT" },
  "signature": "base64-encoded-64-byte-Ed25519-signature"
}
```

The complete publisher certificate is embedded. Its issuer signature is independently checked against a trusted SAND root. Certificate validity and `codeSigning` key usage are mandatory.

## Signed transcript

The Ed25519 signature is calculated over:

```text
SAND-SAPP-V2-ED25519 followed by a NUL byte, then file[0:signature_offset]
```

The signed prefix includes the final v2 header (including final file size and signature offset/size), segment table, metadata, relocation table and every executable payload byte. The signature block itself is excluded to avoid a circular signature. The signature block size is stable because an Ed25519 signature is always 64 bytes and its base64 representation is always 88 characters.

## Developer tools

- `tools/sapp_sign.py`: validate an unsigned v1 image, convert its header to v2, attach a publisher certificate and sign the complete executable image.
- `tools/sapp_inspect.py`: structurally inspect v1 and v2 images; it does not establish trust.
- `tools/sapp_verify.py`: perform structural validation, certificate-chain verification, certificate validity checks and Ed25519 signature verification against an explicit trust store.

Example:

```sh
python3 tools/sapp_sign.py build/hello.sapp \\
  --certificate private/dmj-publisher/publisher-cert.json \\
  --private-key private/dmj-publisher/publisher-private.pem \\
  --output dist/hello.sapp

python3 tools/sapp_verify.py dist/hello.sapp --trust-store device-trust.json
```

A successful host-tool verification is not native OS enforcement. The SAND OS loader must independently implement this exact transcript and certificate policy before it maps any executable segment. Until that integration is complete, SAPP v2 is a developer-side format/tooling milestone only; do not claim the kernel blocks unsigned applications yet.
