#!/bin/bash
# adb helpers for driving the phone (Memento + Chrome) from a Mac.
# Coordinates assume the 1080x2408 screen of the phone used so far; screenshots
# are scaled to 448 px wide for reading. Work files go to /tmp/phone.
#   ph.sh shot                 screenshot -> /tmp/phone/s-small.png
#   ph.sh ui [filter]          list on-screen elements: text | id | center x,y
#   ph.sh tap X Y              tap at full-resolution pixels
#   ph.sh taptext 'Label' [n]  tap the nth element showing exactly this text
#   ph.sh tapsmall X Y         tap at coordinates read off the small screenshot
#   ph.sh text 'ascii'         type ASCII text (adb cannot type Urdu)
#   ph.sh key NAME             keyevent (BACK, ENTER, HOME, DEL, PASTE, ...)
#   ph.sh swipe X1 Y1 X2 Y2 [ms]
#   ph.sh selectall            Ctrl+A in the focused field
#   ph.sh ghcopy path [ref]    copy a repo file from GitHub to the phone
#                              clipboard (ref: commit sha; avoids Chrome's cache)
#   ph.sh openfield 'Name'     in Edit library > Fields: open that field's editor
#   ph.sh fieldscript path [ref]  on a JavaScript field's editor: replace the
#                              script with the repo file, check, save
# Tap menu items by text (taptext), not remembered coordinates: menus move.
A=$(command -v adb || echo ~/Library/Android/sdk/platform-tools/adb)
mkdir -p /tmp/phone
cmd=$1; shift
case "$cmd" in
  shot)
    $A exec-out screencap -p > /tmp/phone/s.png && sips -Z 1000 /tmp/phone/s.png --out /tmp/phone/s-small.png >/dev/null && echo ok ;;
  ui)
    $A shell uiautomator dump /sdcard/ui.xml >/dev/null && $A pull -q /sdcard/ui.xml /tmp/phone/ui.xml && python3 -I - "$1" <<'EOF'
import re, sys, xml.etree.ElementTree as ET
flt = (sys.argv[1] or "").lower()
for n in ET.parse("/tmp/phone/ui.xml").iter("node"):
    t, d, rid = n.get("text", ""), n.get("content-desc", ""), n.get("resource-id", "").split("/")[-1]
    if not (t or d or n.get("clickable") == "true"):
        continue
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", n.get("bounds")))
    line = f"{(t or d)[:50]!r:52} {rid[:28]:28} {(x1+x2)//2},{(y1+y2)//2}" + ("  [click]" if n.get("clickable") == "true" else "")
    if flt in line.lower():
        print(line)
EOF
    ;;
  tap) $A shell input tap "$1" "$2" ;;
  taptext)
    # Tap the element whose text (or description) is exactly $1; fail if absent or ambiguous.
    $A shell uiautomator dump /sdcard/ui.xml >/dev/null && $A pull -q /sdcard/ui.xml /tmp/phone/ui.xml
    xy=$(python3 -I - "$1" "${2:-1}" <<'PY'
import re, sys, xml.etree.ElementTree as ET
want, nth = sys.argv[1], int(sys.argv[2])
hits = [n for n in ET.parse("/tmp/phone/ui.xml").iter("node") if want in (n.get("text"), n.get("content-desc"))]
if len(hits) < nth:
    sys.exit("no element with text %r" % want)
x1, y1, x2, y2 = map(int, re.findall(r"\d+", hits[nth - 1].get("bounds")))
print((x1 + x2) // 2, (y1 + y2) // 2)
PY
) || exit 1
    echo "tap $1 at $xy"; $A shell input tap $xy ;;
  tapsmall) $A shell input tap $(python3 -c "print(round($1*1080/448), round($2*1080/448))") ;;
  text) $A shell input text "'$(printf '%s' "$1" | sed 's/ /%s/g')'" ;;
  key) $A shell input keyevent "KEYCODE_$1" ;;
  swipe) $A shell input swipe "$1" "$2" "$3" "$4" "${5:-300}" ;;
  ghcopy)
    # Copy a repo file's raw contents to the phone clipboard via GitHub in Chrome, then go back.
    $A shell am start -a android.intent.action.VIEW -d "https://github.com/talha131/hisab-kitab/blob/${2:-master}/$1" com.android.chrome >/dev/null 2>&1
    for i in 1 2 3 4 5 6 7 8; do perl -e 'select(undef,undef,undef,1.5)'; $0 ui | grep -q "$(basename "$1")" && break; done
    $0 ui | grep -q "$(basename "$1")" || { echo "page for $1 not loaded"; exit 1; }
    # The code box's ⋯ button sits at the right end of the Code/Blame row.
    by=$($0 ui | grep "'Blame'" | head -1 | grep -o '[0-9]*,[0-9]*' | tail -1 | cut -d, -f2)
    [ -n "$by" ] || { echo "Blame row not found"; exit 1; }
    $A shell input tap 1025 "$by"; perl -e 'select(undef,undef,undef,1.5)'
    $0 taptext 'Copy' || exit 1
    perl -e 'select(undef,undef,undef,1)'; $A shell input keyevent KEYCODE_BACK; perl -e 'select(undef,undef,undef,2)'
    echo "copied $1" ;;
  selectall) $A shell input keycombination 113 29 ;;
  openfield)
    # In Edit library > Fields: scroll to the field titled exactly $1, open its menu, tap Change.
    for i in $(seq 1 12); do
      y=$($0 ui | grep "^'$1' *field_title" | head -1 | grep -o '[0-9]*,[0-9]*' | tail -1 | cut -d, -f2)
      [ -n "$y" ] && [ "$y" -lt 2150 ] && break
      y=""; $A shell input swipe 540 1700 540 1000 400; perl -e 'select(undef,undef,undef,0.8)'
    done
    [ -n "$y" ] || { echo "field $1 not found"; exit 1; }
    $A shell input tap 1000 $((y + 24)); perl -e 'select(undef,undef,undef,1)'
    $0 taptext 'Change' >/dev/null || exit 1; perl -e 'select(undef,undef,undef,1.8)'
    $0 ui | grep -q "^'$1' *template_title" || { echo "opened the wrong field for $1"; exit 1; }
    echo "opened $1" ;;
  fieldscript)
    # On a JavaScript field's "Edit field" screen: replace the script with repo file $1, check it, save.
    $0 ghcopy "$1" "$2" || exit 1
    $0 ui | grep -q "'Edit field'" || { echo "not back on Edit field"; exit 1; }
    ey=$($0 ui | grep "expression" | head -1 | grep -o '[0-9]*,[0-9]*' | tail -1 | cut -d, -f2)
    [ -n "$ey" ] || { echo "script editor not found"; exit 1; }
    $0 tap 540 "$ey"; perl -e 'select(undef,undef,undef,0.6)'
    $0 selectall; perl -e 'select(undef,undef,undef,0.4)'
    $A shell input keyevent KEYCODE_PASTE; perl -e 'select(undef,undef,undef,1.2)'
    $A shell input keyevent KEYCODE_BACK; perl -e 'select(undef,undef,undef,0.8)'
    $A shell uiautomator dump /sdcard/ui.xml >/dev/null && $A pull -q /sdcard/ui.xml /tmp/phone/ui.xml
    # The editor must now hold exactly the repo file.
    python3 -I - "$(git rev-parse --show-toplevel)/$1" <<'PY' || exit 1
import sys, xml.etree.ElementTree as ET
squash = lambda t: " ".join(t.split())  # XML attributes turn newlines into spaces
want = squash(open(sys.argv[1], encoding="utf-8").read())
texts = [squash(n.get("text", "")) for n in ET.parse("/tmp/phone/ui.xml").iter("node")]
sys.exit(0 if want in texts else "pasted script does not match " + sys.argv[1])
PY
    $0 taptext 'Save' >/dev/null; perl -e 'select(undef,undef,undef,1.5)'
    echo "updated with $1" ;;
  *) echo "unknown: $cmd"; exit 1 ;;
esac
