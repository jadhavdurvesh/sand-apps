.section .text
.global _start
.type _start, @function
_start:
    /* Minimal loader smoke-test entry. SAPP v1 has no public console syscall. */
1:
    jmp 1b
.size _start, .-_start
