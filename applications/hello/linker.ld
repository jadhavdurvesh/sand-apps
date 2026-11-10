OUTPUT_FORMAT(elf32-i386)
OUTPUT_ARCH(i386)
ENTRY(_start)
SECTIONS
{
  . = 0x40000000;
  .text : ALIGN(4096) { *(.text*) }
  /DISCARD/ : { *(.comment) *(.note*) *(.eh_frame*) }
}
