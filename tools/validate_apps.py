#!/usr/bin/env python3
"""Validate first-party application manifests and phase boundaries."""
import json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
CORE={"cairn","locus","quanta","cadence","keystone"}
EXTENDED={"pulse","glyph","prism","morrow","crate","chronos","spectra","beacon"}
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
  seen.add(d["id"]);phase="core" if app in CORE else "extended"
  if d["phase"]!=phase:errors.append(f"{app}: expected phase {phase}")
  expected_status="host-prototype" if phase=="core" else "planned"
  if d["status"]!=expected_status:errors.append(f"{app}: expected status {expected_status}")
  if d["prototype"]!=(phase=="core"):errors.append(f"{app}: prototype flag mismatch")
 return errors
if __name__=="__main__":
 errors=validate()
 if errors:print("\n".join(errors),file=sys.stderr);raise SystemExit(1)
 print(f"Validated {len(CORE)} core apps and {len(EXTENDED)} planned extended apps.")
