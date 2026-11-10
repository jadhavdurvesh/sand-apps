#!/usr/bin/env python3
"""Pack a constrained ELF32 executable into the SAND SAPP v1 container."""
from __future__ import annotations
import argparse
import json
import pathlib
import struct
import sys

HEADER = struct.Struct("<4sHH12I8s")
SEGMENT = struct.Struct("<6I8s")
ELF_HEADER = struct.Struct("<16sHHIIIIIHHHHHH")
ELF_PROGRAM = struct.Struct("<IIIIIIII")
PT_LOAD, PF_X, PF_W, PF_R = 1, 1, 2, 4
USER_MIN, USER_MAX = 0x40000000, 0xC0000000
STACK_TOP, PAGE = 0xBFFFE000, 4096
MAX_SEGMENTS, MAX_PAGES = 8, 64

class PackError(ValueError):
    pass

def parse_elf(data: bytes):
    if len(data) < ELF_HEADER.size:
        raise PackError("input is shorter than an ELF32 header")
    h = ELF_HEADER.unpack_from(data)
    ident, etype, machine, version, entry, phoff, _shoff, _flags, ehsize, phentsize, phnum, *_ = h
    if ident[:7] != b"\x7fELF\x01\x01\x01":
        raise PackError("expected little-endian ELF32, current ABI version")
    if etype != 2 or machine != 3 or version != 1:
        raise PackError("expected ELF32 ET_EXEC for i386")
    if ehsize != ELF_HEADER.size or phentsize != ELF_PROGRAM.size or not 1 <= phnum <= 8:
        raise PackError("unsupported ELF header or program-header count")
    if phoff > len(data) or phnum > (len(data) - phoff) // phentsize:
        raise PackError("program-header table is outside the file")
    segments, total_pages, entry_ok = [], 0, False
    for i in range(phnum):
        p_type, offset, vaddr, _paddr, filesz, memsz, flags, align = ELF_PROGRAM.unpack_from(data, phoff + i * phentsize)
        if p_type != PT_LOAD:
            continue
        if not memsz or filesz > memsz or offset > len(data) or filesz > len(data) - offset:
            raise PackError(f"load segment {i} has invalid sizes or file range")
        if vaddr < USER_MIN or vaddr >= USER_MAX or memsz > USER_MAX - vaddr:
            raise PackError(f"load segment {i} is outside the user address range")
        if flags & ~(PF_R | PF_W | PF_X) or not (flags & PF_R):
            raise PackError(f"load segment {i} must have only known flags and read permission")
        if (flags & (PF_W | PF_X)) == (PF_W | PF_X):
            raise PackError(f"load segment {i} is writable and executable")
        if align not in (0, 1) and (align & (align - 1) or ((vaddr - offset) & (align - 1))):
            raise PackError(f"load segment {i} has invalid ELF alignment")
        if vaddr & (PAGE - 1):
            raise PackError(f"load segment {i} virtual address must be page-aligned for SAPP v1")
        if align > PAGE and vaddr % align:
            raise PackError(f"load segment {i} does not satisfy its ELF alignment")
        if vaddr < STACK_TOP and vaddr + memsz > STACK_TOP - PAGE:
            raise PackError(f"load segment {i} overlaps the reserved user stack")
        pages = (((vaddr + memsz - 1) & ~(PAGE - 1)) - (vaddr & ~(PAGE - 1))) // PAGE + 1
        total_pages += pages
        if total_pages > MAX_PAGES:
            raise PackError("image exceeds the 64-page loader limit")
        for old in segments:
            if vaddr < old["vaddr"] + old["memsz"] and old["vaddr"] < vaddr + memsz:
                raise PackError("load segments overlap in virtual memory")
            if filesz and old["file_size"] and offset < old["offset"] + old["file_size"] and old["offset"] < offset + filesz:
                raise PackError("load segments overlap in the ELF file")
        perms = 1 | (2 if flags & PF_W else 0) | (4 if flags & PF_X else 0)
        segments.append({"vaddr": vaddr, "memsz": memsz, "offset": offset,
                         "file_size": filesz, "permissions": perms,
                         "alignment": max(PAGE, align if align > 1 else PAGE)})
        if flags & PF_X and vaddr <= entry < vaddr + memsz:
            entry_ok = True
    if not segments or len(segments) > MAX_SEGMENTS or not entry_ok:
        raise PackError("ELF must contain 1–8 load segments and an entry inside an executable segment")
    return entry, segments

def pack(input_path: pathlib.Path, output_path: pathlib.Path, name: str, version: str):
    data = input_path.read_bytes()
    entry, segments = parse_elf(data)
    metadata = json.dumps({"format": "SAPP", "format_version": 1, "name": name,
                           "version": version, "architecture": "x86-32",
                           "entry": entry, "segment_count": len(segments),
                           "capabilities": []}, sort_keys=True, separators=(",", ":")).encode()
    if not metadata or len(metadata) > 4096:
        raise PackError("metadata must be between 1 and 4096 bytes")
    seg_off = HEADER.size
    meta_off = seg_off + len(segments) * SEGMENT.size
    cursor = meta_off + len(metadata)
    table, payloads = [], []
    for seg in segments:
        payload = data[seg["offset"]:seg["offset"] + seg["file_size"]]
        table.append(SEGMENT.pack(seg["vaddr"], seg["memsz"], cursor,
                                  len(payload), seg["permissions"], seg["alignment"], bytes(8)))
        payloads.append(payload)
        cursor += len(payload)
    header = HEADER.pack(b"SAPP", 1, 1, HEADER.size, 0, entry, seg_off,
                         len(segments), meta_off, len(metadata), cursor,
                         0, 0, 0, 0, bytes(8))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(header + b"".join(table) + metadata + b"".join(payloads))
    print(f"Packed {output_path}: {len(segments)} segments, {cursor} bytes")

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=pathlib.Path)
    ap.add_argument("output", type=pathlib.Path)
    ap.add_argument("--name", default="unnamed-app")
    ap.add_argument("--version", default="0.1.0")
    args = ap.parse_args()
    try:
        pack(args.input, args.output, args.name, args.version)
    except (OSError, PackError, struct.error) as exc:
        print(f"sapp-pack: error: {exc}", file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
