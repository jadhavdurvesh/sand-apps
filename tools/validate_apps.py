#!/usr/bin/env python3
"""Validate first-party application manifests and phase boundaries."""
import json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
CORE={"cairn","locus","quanta","cadence","keystone","glyph","morrow","chronos"}
EXTENDED={"pulse","prism","crate","spectra","beacon"}
CAPABILITIES={"storage.read","storage.write","storage.delete","settings.read","settings.write","ipc.send","ipc.receive","platform.info.read","platform.window.create","platform.files.read","platform.files.write","platform.process.read","platform.device.read","platform.network.read","platform.notifications.create","platform.desktop.events"}
def validate():
 errors=[];seen=set()
 for app in sorted(CORE|EXTENDED):
  p=ROOT/"applications"/app/"manifest.json"
  if not p.is_file():errors.append(f"missing manifest: {p.relative_to(ROOT)}");continue
  try:d=json.loads(p.read_text(encoding="utf-8"))
  except (OSError,json.JSONDecodeError) as e:errors.append(f"invalid {p}: {e}");continue
  required={"id","name","version","description","phase","status","prototype"};missing=required-d.keys()
  if missing:errors.append(f"{app}: missing {', '.join(sorted(missing))}");continue
  if d["id"]!=app:errors.append(f"{app}: id mismatch")
  if d["id"] in seen:errors.append(f"duplicate id: {d['id']}")
  seen.add(d["id"]);caps=d.get("capabilities",[])
  if not isinstance(caps,list) or any(not isinstance(c,str) or c not in CAPABILITIES for c in caps):errors.append(f"{app}: invalid runtime capabilities")
  if isinstance(caps,list) and all(isinstance(c,str) for c in caps) and len(caps)!=len(set(caps)):errors.append(f"{app}: duplicate runtime capabilities")
  phase="core" if app in CORE else "extended"
  if d["phase"]!=phase:errors.append(f"{app}: expected phase {phase}")
  expected_status="host-prototype"
  if d["status"]!=expected_status:errors.append(f"{app}: expected status {expected_status}")
  if d["prototype"] is not True:errors.append(f"{app}: host prototype flag mismatch")
 return errors
if __name__=="__main__":
 errors=validate()
 if errors:print("\n".join(errors),file=sys.stderr);raise SystemExit(1)
 print(f"Validated {len(CORE)} core apps and {len(EXTENDED)} extended host prototypes.")
