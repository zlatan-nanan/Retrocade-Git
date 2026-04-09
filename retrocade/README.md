# Scratch Games — RetroPie Setup Guide

## How to add a new game

1. Create a single self-contained HTML file in this folder:
   ```
    /home/nanan/RetroPie/roms/retrocade/MyGame.html
   ```
2. Restart EmulationStation — it will appear in the Scratch menu automatically.

That's it. No `.sh` launcher file needed.

---

## Game controller support

Include this in your HTML `<head>` to get controller input for free:
```html
<script src="./gamepad.js"></script>
```

The shim maps controller input to standard keyboard events, so your game only needs to listen for keyboard events — no gamepad code required.

| Controller input         | Keyboard event  |
|--------------------------|-----------------|
| D-pad / Left stick left  | ArrowLeft       |
| D-pad / Left stick right | ArrowRight      |
| D-pad / Left stick up    | ArrowUp         |
| D-pad / Left stick down  | ArrowDown       |
| A / B / Select / Start   | Space           |

---

## Quitting a game

Press **Start + Select** together to exit any game and return to EmulationStation.

This is handled automatically by `quit_monitor.py` which runs in the background
alongside every game. No code needed in your HTML.

---

## HTML game rules for this Pi/Chromium setup

### Draw with canvas, not images

Do **not** load external image files. The Pi's GPU driver crashes when SVG
images are drawn to canvas via `drawImage()`. Draw everything with canvas 2D
APIs instead:

```javascript
// Good
ctx.fillStyle = '#cc2200';
ctx.fillRect(x, y, width, height);
ctx.fillText('Score: ' + score, 10, 30);

// Bad — causes GPU crash on this Pi
const img = new Image();
img.src = 'sprite.svg';
ctx.drawImage(img, x, y);
```

If you must use images, embed them as base64 data URIs directly in the HTML
so there are no external file loads.

### Games with asset files

If your game needs separate asset files (audio, images, data), put them in a
subfolder named after the game:

```
RetrocadeDash.html        ← ES detects this
RetrocadeDash/            ← assets live here
  background.png
  sound.mp3
```

Reference them with a relative path from the HTML file:
```javascript
audio.src = './RetrocadeDash/sound.mp3';
```

### Start immediately — no image preloading needed

Since you're drawing with canvas APIs, there are no images to wait for.
Call your game loop directly:

```javascript
initGame();   // or requestAnimationFrame(gameLoop)
```

---

## Minimal game template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Game</title>
    <script src="./gamepad.js"></script>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; }
    </style>
</head>
<body>
    <canvas id="gameCanvas" width="480" height="360"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        document.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft')  { /* move left  */ }
            if (e.code === 'ArrowRight') { /* move right */ }
            if (e.code === 'ArrowUp')    { /* move up    */ }
            if (e.code === 'ArrowDown')  { /* move down  */ }
            if (e.code === 'Space')      { /* action     */ }
        });

        function gameLoop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // draw your game here
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    </script>
</body>
</html>
```

---

## How the launcher works

`launch.sh` is a shared script called by EmulationStation for every game.
It receives the path to the game's HTML file and opens it in Chromium kiosk
mode. You never need to edit or copy this file.

The EmulationStation system is configured in:
```
/opt/retropie/configs/all/emulationstation/es_systems.cfg
```

---

## How the autostart works

ES is launched automatically on boot via:
```
~/.config/autostart/emulationstation.desktop
  → /home/nanan/start-es.sh
    → script -q -c /usr/bin/emulationstation
```

The `script` command is important — it allocates a pseudo-terminal so that
`runcommand.sh` can open `/dev/tty` when launching emulators. Without it,
all ROMs fail to launch and immediately return to the ES menu.

If you ever change how ES is started, make sure it runs inside a PTY.
