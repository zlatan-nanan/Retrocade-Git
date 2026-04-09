#!/usr/bin/env python3
"""
Monitors all connected joysticks for Start+Select held simultaneously.
When detected, kills the Chromium process (passed as argv[1]).
Also exits cleanly when Chromium is already gone.
"""
import struct, os, sys, signal, glob, select, threading

JS_EVENT_BUTTON = 0x01
EVENT_FMT = 'IhBB'
EVENT_SIZE = struct.calcsize(EVENT_FMT)

BTN_SELECT = 8
BTN_START  = 9

chrome_pid = int(sys.argv[1])
buttons = {}  # key: (js_index, btn_number) → bool

def quit_game():
    try:
        os.kill(chrome_pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    sys.exit(0)

def monitor_js(path, js_index):
    try:
        with open(path, 'rb') as js:
            while True:
                r, _, _ = select.select([js], [], [], 1.0)
                if not r:
                    # Check if Chromium is still running
                    try:
                        os.kill(chrome_pid, 0)
                    except ProcessLookupError:
                        sys.exit(0)
                    continue
                event = js.read(EVENT_SIZE)
                if not event or len(event) < EVENT_SIZE:
                    break
                t, value, etype, number = struct.unpack(EVENT_FMT, event)
                if etype & 0x7F == JS_EVENT_BUTTON:
                    buttons[(js_index, number)] = bool(value)
                    sel = buttons.get((js_index, BTN_SELECT), False)
                    sta = buttons.get((js_index, BTN_START),  False)
                    if sel and sta:
                        quit_game()
    except Exception:
        pass

js_devices = sorted(glob.glob('/dev/input/js*'))
threads = []
for i, path in enumerate(js_devices):
    t = threading.Thread(target=monitor_js, args=(path, i), daemon=True)
    t.start()
    threads.append(t)

for t in threads:
    t.join()
