#ifndef SAND_SAPP_H
#define SAND_SAPP_H

/* SAPP v1 on-disk structures. All integer fields are little-endian.
 * These declarations describe the package format, not a syscall ABI.
 */
#include <stdint.h>

#define SAND_SAPP_MAGIC "SAPP"
#define SAND_SAPP_VERSION 1u
#define SAND_SAPP_ARCH_X86_32 1u
#define SAND_SAPP_HEADER_SIZE 64u
#define SAND_SAPP_SEGMENT_SIZE 32u
#define SAND_SAPP_RELOCATION_SIZE 12u
#define SAND_SAPP_MAX_SEGMENTS 8u
#define SAND_SAPP_MAX_RELOCATIONS 256u
#define SAND_SAPP_MAX_IMAGE_PAGES 64u
#define SAND_SAPP_MAX_METADATA_SIZE 4096u

enum sand_sapp_permission {
    SAND_SAPP_READ = 1u,
    SAND_SAPP_WRITE = 2u,
    SAND_SAPP_EXECUTE = 4u
};

enum sand_sapp_relocation_type {
    SAND_SAPP_RELOC_ABS32 = 1u
};

#if defined(__GNUC__)
#define SAND_SAPP_PACKED __attribute__((packed))
#else
#error "SAPP v1 structures require a compiler supporting packed structures"
#endif

struct SAND_SAPP_PACKED sand_sapp_header {
    uint8_t magic[4];
    uint16_t version;
    uint16_t architecture;
    uint32_t header_size;
    uint32_t flags;
    uint32_t entry;
    uint32_t segment_offset;
    uint32_t segment_count;
    uint32_t metadata_offset;
    uint32_t metadata_size;
    uint32_t file_size;
    uint32_t signature_offset;
    uint32_t signature_size;
    uint32_t relocation_offset;
    uint32_t relocation_count;
    uint8_t reserved[8];
};

struct SAND_SAPP_PACKED sand_sapp_segment {
    uint32_t vaddr;
    uint32_t memsz;
    uint32_t file_offset;
    uint32_t file_size;
    uint32_t permissions;
    uint32_t alignment;
    uint8_t reserved[8];
};

struct SAND_SAPP_PACKED sand_sapp_relocation {
    uint32_t target;
    uint32_t type;
    uint32_t addend;
};

typedef char sand_sapp_header_must_be_64_bytes[(sizeof(struct sand_sapp_header) == SAND_SAPP_HEADER_SIZE) ? 1 : -1];
typedef char sand_sapp_segment_must_be_32_bytes[(sizeof(struct sand_sapp_segment) == SAND_SAPP_SEGMENT_SIZE) ? 1 : -1];
typedef char sand_sapp_relocation_must_be_12_bytes[(sizeof(struct sand_sapp_relocation) == SAND_SAPP_RELOCATION_SIZE) ? 1 : -1];

#undef SAND_SAPP_PACKED
#endif
