PYTHON ?= python3
CC ?= gcc
LD ?= ld
BUILD := build
APP := hello

.PHONY: all tools hello apps test test-js clean
all: tools apps hello

tools:
	$(PYTHON) -m compileall -q tools

apps:
	$(PYTHON) tools/validate_apps.py

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/$(APP).o: applications/$(APP)/start.S | $(BUILD)
	$(CC) -m32 -c -ffreestanding -fno-pic -o $@ $<

$(BUILD)/$(APP).elf: $(BUILD)/$(APP).o applications/$(APP)/linker.ld
	$(LD) -m elf_i386 -T applications/$(APP)/linker.ld -o $@ $<

hello: $(BUILD)/$(APP).elf
	$(PYTHON) tools/sapp_pack.py $< $(BUILD)/$(APP).sapp --name sand-hello --version 0.1.0
	$(PYTHON) tools/sapp_inspect.py $(BUILD)/$(APP).sapp

test:
	$(PYTHON) -m unittest discover -s tests -v

test-js:
	node --test tests/test_cairn.cjs tests/test_runtime.cjs tests/test_desktop.cjs tests/test_app_modules.cjs tests/test_ui.cjs

clean:
	rm -rf $(BUILD) dist
