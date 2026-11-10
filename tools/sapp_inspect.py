#!/usr/bin/env python3
"""Validate and display a SAPP v1 package."""
from __future__ import annotations
import argparse
import json
import pathlib
import struct
import sys

HEADER = struct.Struct("<4sHH12I8s")
SEGMENT = struct.Struct("<6I8s")
RELOC = struct.Struct("<3I")
PAGE = 4096
USER_MIN, USER_MAX, STACK_TOP = 0x40000000, 0xC0000000, 0xBFFFE000

class FormatError(ValueError):
    pass

def inspect(data: bytes):
    if len(data) < HEADER.size:
        raise FormatError("file is shorter than the 64-byte header")
    (magic, version, arch, hsize, flags, entry, seg_off, seg_count,
     meta_off, meta_size, file_size, sig_off, sig_size, reloc_off,
     reloc_count, reserved) = HEADER.unpack_from(data)
    if magic != b"SAPP" or version != 1 or arch != 1 or hsize != 64:
        raise FormatError("unsupported SAPP magic, version, architecture, or header size")
    if flags or reserved != bytes(8) or sig_off or sig_size or file_size != len(data):
        raise FormatError("invalid flags, reserved bytes, signature fields, or file size")
    if not 1 <= seg_count <= 8 or reloc_count > 256:
        raise FormatError("segment or relocation count exceeds loader limits")
    def range_ok(off, size):
        return off <= len(data) and size <= len(data) - off
    seg_bytes = seg_count * SEGMENT.size
    if not range_ok(seg_off, seg_bytes) or seg_off < HEADER.size:
        raise FormatError("segment table is out of range")
    if not range_ok(meta_off, meta_size) or meta_size == 0 or meta_size > 4096 or meta_off < seg_off + seg_bytes:
        raise FormatError("metadata is out of range or invalid")
    if reloc_count:
        reloc_bytes = reloc_count * RELOC.size
        if not range_ok(reloc_off, reloc_bytes) or reloc_off < meta_off + meta_size:
            raise FormatError("relocation table is out of range")
        payload_min = reloc_off + reloc_bytes
    else:
        if reloc_off:
            raise FormatError("relocation offset must be zero when count is zero")
        payload_min = meta_off + meta_size
    try:
        metadata = json.loads(data[meta_off:meta_off + meta_size])
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise FormatError(f"metadata is not valid UTF-8 JSON: {exc}") from exc
    if not isinstance(metadata, dict):
        raise FormatError("metadata must be a JSON object")
    segments, pages, entry_ok = [], 0, False
    for i in range(seg_count):
        vaddr, memsz, off, size, perms, align, reserved_seg = SEGMENT.unpack_from(data, seg_off + i * SEGMENT.size)
        if reserved_seg != bytes(8) or not memsz or size > memsz or not range_ok(off, size) or off < payload_min:
            raise FormatError(f"segment {i} has invalid sizes, payload range, or reserved bytes")
        if vaddr < USER_MIN or vaddr >= USER_MAX or memsz > USER_MAX - vaddr:
            raise FormatError(f"segment {i} is outside user address space")
        if perms & ~7 or not (perms & 1) or (perms & 6) == 6:
            raise FormatError(f"segment {i} has unsupported permissions")
        if align < PAGE or align & (align - 1) or vaddr & (align - 1):
            raise FormatError(f"segment {i} has invalid alignment")
        if vaddr < STACK_TOP and vaddr + memsz > STACK_TOP - PAGE:
            raise FormatError(f"segment {i} overlaps the reserved user stack")
        p = (((vaddr + memsz - 1) & ~(PAGE - 1)) - (vaddr & ~(PAGE - 1))) // PAGE + 1
        pages += p
        if pages > 64:
            raise FormatError("image exceeds 64 mapped pages")
        if perms & 4 and vaddr <= entry < vaddr + memsz:
            entry_ok = True
        for old in segments:
            if vaddr < old["vaddr"] + old["memsz"] and old["vaddr"] < vaddr + memsz:
                raise FormatError("virtual segments overlap")
            if size and old["size"] and off < old["off"] + old["size"] and old["off"] < off + size:
                raise FormatError("segment payloads overlap")
        segments.append({"vaddr": vaddr, "memsz": memsz, "off": off, "size": size, "permissions": perms, "alignment": align})
    if not entry_ok:
        raise FormatError("entry is not inside an executable segment")
    for i in range(reloc_count):
        target, typ, addend = RELOC.unpack_from(data, reloc_off + i * RELOC.size)
        if typ != 1 or (target & 0xFFF) > 0xFFC:
            raise FormatError(f"relocation {i} has unsupported type or crosses a page")
        if not any((s["permissions"] & 2) and target >= s["vaddr"] and target <= s["vaddr"] + s["memsz"] - 4 for s in segments):
            raise FormatError(f"relocation {i} target is not in writable memory")
    return {"version": version, "architecture": "x86-32", "entry": f"0x{entry:08x}",
            "metadata": metadata, "segments": segments, "relocations": reloc_count,
            "file_size": len(data)}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("package", type=pathlib.Path)
    args = ap.parse_args()
    try:
        result = inspect(args.package.read_bytes())
    except (OSError, FormatError, struct.error) as exc:
        print(f"sapp-inspect: INVALID: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    print("SAPP v1: VALID")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
