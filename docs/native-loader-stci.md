# Native SAPP verification contract

This document is the implementation contract for the SAND OS loader. It is intentionally maintained in `sand-apps`; no files in the main `sand-os` repository have been changed.

## Mandatory execution gate

The native loader must complete all checks below before allocating executable mappings, applying relocations, or transferring control to an application. Any missing, malformed, unsupported, expired, revoked, or untrusted signature must fail closed. There is no user override that turns an invalid signature into an executable image.

## Verification sequence

1. Read the complete executable into an immutable kernel-owned buffer (or an equivalent object that prevents modification between verification and mapping). Never verify one file handle and later execute bytes re-read from a mutable path.
2. Validate SAPP magic, version, architecture, header size, exact file size, flags, reserved bytes, all offset arithmetic and all region boundaries with overflow-safe operations.
3. Accept v1 only under an explicit legacy/development policy. A production secure-boot profile must reject unsigned v1. Accept v2 only when the signature block is present, bounded, well-formed and ends exactly at EOF.
4. Validate segment, relocation, metadata and signature-block non-overlap and all existing memory permission constraints. Reject writable-plus-executable segments.
5. Parse the embedded publisher certificate. Require Ed25519 and the `codeSigning` key usage. Check certificate validity against a trusted clock policy and reject revoked keys/certificates.
6. Match the certificate issuer key ID to a root provisioned by the trusted boot configuration. Never accept a root introduced by the package being installed.
7. Verify the root's Ed25519 signature over the canonical certificate body (certificate fields excluding `issuerSignature`).
8. Verify the publisher's Ed25519 signature over `SAND-SAPP-V2-ED25519` + NUL + the exact bytes from file offset zero through (but excluding) `signature_offset`.
9. Only after successful verification, map segments with their declared permissions, apply validated relocations, and launch through the supported app ABI.
10. Record publisher key ID, root key ID, app ID, version, image digest and verification result in the security audit log.

## Trust-store requirements

- Root public keys are provisioned by a trusted OS installation/update mechanism, not by a normal user-space package installer.
- The trust store is integrity-protected and rollback-resistant.
- Root removal, rotation, publisher revocation and emergency recovery are signed administrative operations.
- Production devices need a trustworthy time source or a carefully specified offline expiry policy.
- Root private keys remain offline; publisher private keys remain in protected signing infrastructure.

## Cryptographic interoperability

The current developer verifier uses OpenSSL Ed25519 and the transcript in `FORMAT.md`. The native implementation must pass shared known-answer vectors for valid signatures, one-bit payload changes, changed header offsets, changed certificate fields, unknown roots, expired certificates, revoked publishers and truncated signature blocks. Do not substitute a different JSON canonicalization or signature transcript.

## Current implementation status

`tools/sapp_sign.py`, `tools/sapp_inspect.py` and `tools/sapp_verify.py` implement host-side SAPP v2 creation, structural inspection and trust verification. This is not a kernel enforcement implementation. The main `sand-os` repository remains untouched by this milestone; native enforcement must be a separate, explicitly approved integration change.
