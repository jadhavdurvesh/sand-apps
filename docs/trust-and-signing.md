# SAND Trust & Code Integrity (STCI)

STCI is the proposed SAND publisher trust and package-signing foundation. This repository implements an initial **developer-side Ed25519 certificate and SANDPKG signature tool**. It does not yet enforce trust in the SAND OS kernel or loader.

## Security model

- The SAND root authority is an offline Ed25519 key pair. The public root key is explicitly installed into a device trust store; the private root key is never distributed.
- A publisher generates its own Ed25519 key pair. The root signs a publisher certificate containing the publisher identity, public-key fingerprint, issuer fingerprint, validity interval and code-signing usage.
- A publisher signs the canonical package payload with its private key.
- Verification checks the trusted root, issuer signature on the publisher certificate, certificate validity and code-signing usage, publisher key fingerprint, and package signature.
- A package signature covers the complete SANDPKG payload except the signature envelope itself. Any change to its manifest or file contents invalidates the signature.

## Initial tool workflow

Requires OpenSSL 3.x and Python 3.10+.

Create the offline root authority:

\`\`\`sh
python3 tools/sandcert.py authority-init --name "SAND Root CA" --output private/sand-root
\`\`\`

Issue a publisher certificate (keep publisher private key on the publisher's secure machine):

\`\`\`sh
python3 tools/sandcert.py publisher-issue \\
  --authority private/sand-root/authority.json \\
  --root-key private/sand-root/root-private.pem \\
  --publisher-id dmj-first-party \\
  --subject "DMJ First-Party Publisher" \\
  --output private/dmj-publisher
\`\`\`

Explicitly trust the root on a development device:

\`\`\`sh
python3 tools/sandcert.py trust-root \\
  --authority private/sand-root/authority.json \\
  --store device-trust.json
\`\`\`

Sign and verify a SANDPKG:

\`\`\`sh
python3 tools/sandcert.py sign dist/example.sandpkg \\
  --certificate private/dmj-publisher/publisher-cert.json \\
  --private-key private/dmj-publisher/publisher-private.pem \\
  --output dist/example.signed.sandpkg

python3 tools/sandcert.py verify dist/example.signed.sandpkg \\
  --trust-store device-trust.json
\`\`\`

## Non-negotiable key-handling rules

- Never commit root or publisher private keys, test keys, recovery keys or signing secrets.
- Keep the root private key offline. Use it only for publisher issuance and revocation administration.
- Keep publisher signing keys in protected storage or a hardware-backed key store when available.
- The device trust store contains public roots only.
- A root is trusted only after an explicit administrative action or trusted OS provisioning. A package cannot add its own root.
- A successful signature is not a malware verdict. Continue to enforce least-privilege capabilities, process isolation, resource limits and update policy.

## SAPP v2 developer tooling\n\nThe repository now includes `tools/sapp_sign.py`, `tools/sapp_inspect.py` and `tools/sapp_verify.py`. They convert a structurally valid unsigned SAPP v1 image into SAPP v2, embed the publisher certificate, sign the finalized header and executable bytes using Ed25519, and verify the certificate chain and signature against an explicit trust store. See [SAPP v2 format](../FORMAT.md). SAPP v1 remains unchanged and unsigned. Host verification is not native enforcement.\n\nNative loader implementation requirements are collected in [native-loader-stci.md](native-loader-stci.md).\n\n## Required production work before native enforcement

This implementation is a developer-side prototype and must not be treated as a production PKI or kernel security boundary. The following remain mandatory:

1. Native SAND loader verification before mapping or executing an app; fail closed for unsigned or invalid signatures.
2. Native SAND loader support for the signed SAPP v2 envelope specified in [FORMAT.md](../FORMAT.md). The developer tools now create and verify SAPP v2; the OS loader does not yet enforce it.
3. A cross-language canonicalization specification and test vectors so the native loader verifies exactly the same signed transcript as the host tools.
4. Certificate revocation, key rotation, root rollover, recovery and offline update policy.
5. A trust-store format authenticated by OS provisioning, protected against unprivileged modification and rollback.
6. Explicit user/admin publisher enrollment, certificate expiry policy and publisher identity verification.
7. Independent security review, fuzzing and known-answer tests for cryptographic verification.
8. A kernel-enforced app sandbox and capability broker. Signatures establish publisher and integrity; they do not make app code safe.

Until those are implemented in the OS, native app execution must remain disabled for third-party packages. The existing SANDPKG package manager must continue to report imported third-party packages as non-launchable.
