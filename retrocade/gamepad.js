// Shared gamepad-to-keyboard shim
// Include in any game with: <script src="./gamepad.js"></script>
// Maps common controller inputs to keyboard events.

(function () {
    const AXIS_THRESHOLD = 0.5;

    // Button index -> keyboard code
    const BUTTON_KEYS = {
        0: 'Space',      // A / Cross
        1: 'Space',      // B / Circle
        2: 'Space',      // X / Square
        3: 'Space',      // Y / Triangle
        6: 'ArrowLeft',  // LT / L2
        7: 'ArrowRight', // RT / R2
        8: 'Space',      // Select / Back
        9: 'Space',      // Start
        12: 'ArrowUp',
        13: 'ArrowDown',
        14: 'ArrowLeft',
        15: 'ArrowRight'
    };

    const KEY_META = {
        ArrowUp: { key: 'ArrowUp', keyCode: 38 },
        ArrowDown: { key: 'ArrowDown', keyCode: 40 },
        ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
        ArrowRight: { key: 'ArrowRight', keyCode: 39 },
        Space: { key: ' ', keyCode: 32 }
    };

    const prevButtons = {};
    const prevAxes = {};
    let isPolling = false;

    function getDispatchTargets() {
        const targets = [];
        const active = document.activeElement;
        if (active) targets.push(active);
        if (document.body && document.body !== active) targets.push(document.body);
        if (document) targets.push(document);
        if (window) targets.push(window);
        return targets;
    }

    function createKeyboardEvent(type, code) {
        const meta = KEY_META[code] || { key: code, keyCode: 0 };
        const event = new KeyboardEvent(type, {
            key: meta.key,
            code: code,
            bubbles: true,
            cancelable: true,
            composed: true
        });

        // Some runtimes still read legacy fields.
        try {
            Object.defineProperty(event, 'keyCode', { get: () => meta.keyCode });
            Object.defineProperty(event, 'which', { get: () => meta.keyCode });
        } catch (e) {
            // Ignore if fields are not redefinable.
        }

        return event;
    }

    function fireKey(code, type) {
        const targets = getDispatchTargets();
        for (const target of targets) {
            target.dispatchEvent(createKeyboardEvent(type, code));
        }
    }

    function axisToKeys(axisValue, negKey, posKey, axisId) {
        const prev = prevAxes[axisId] || 'none';
        let curr = 'none';

        if (axisValue < -AXIS_THRESHOLD) curr = negKey;
        else if (axisValue > AXIS_THRESHOLD) curr = posKey;

        if (curr !== prev) {
            if (prev !== 'none') fireKey(prev, 'keyup');
            if (curr !== 'none') fireKey(curr, 'keydown');
            prevAxes[axisId] = curr;
        }
    }

    function releaseGamepadState(gamepadIndex) {
        Object.keys(prevButtons).forEach((id) => {
            if (!id.startsWith(`${gamepadIndex}-`)) return;
            if (prevButtons[id]) {
                const buttonIndex = Number(id.split('-')[1]);
                const code = BUTTON_KEYS[buttonIndex];
                if (code) fireKey(code, 'keyup');
            }
            delete prevButtons[id];
        });

        Object.keys(prevAxes).forEach((id) => {
            if (!id.startsWith(`${gamepadIndex}-`)) return;
            const code = prevAxes[id];
            if (code && code !== 'none') fireKey(code, 'keyup');
            delete prevAxes[id];
        });
    }

    function poll() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (const gp of gamepads) {
            if (!gp) continue;

            gp.buttons.forEach((btn, index) => {
                const code = BUTTON_KEYS[index];
                if (!code) return;

                const id = `${gp.index}-${index}`;
                const pressed = Boolean(btn && btn.pressed);

                if (pressed && !prevButtons[id]) {
                    fireKey(code, 'keydown');
                } else if (!pressed && prevButtons[id]) {
                    fireKey(code, 'keyup');
                }

                prevButtons[id] = pressed;
            });

            if (gp.axes.length > 0) axisToKeys(gp.axes[0], 'ArrowLeft', 'ArrowRight', `${gp.index}-ax0`);
            if (gp.axes.length > 1) axisToKeys(gp.axes[1], 'ArrowUp', 'ArrowDown', `${gp.index}-ax1`);
            if (gp.axes.length > 4) axisToKeys(gp.axes[4], 'ArrowLeft', 'ArrowRight', `${gp.index}-ax4`);
            if (gp.axes.length > 5) axisToKeys(gp.axes[5], 'ArrowUp', 'ArrowDown', `${gp.index}-ax5`);
        }

        requestAnimationFrame(poll);
    }

    function startPolling() {
        if (isPolling) return;
        isPolling = true;
        requestAnimationFrame(poll);
    }

    window.addEventListener('gamepadconnected', startPolling);
    window.addEventListener('gamepaddisconnected', (event) => {
        releaseGamepadState(event.gamepad.index);
    });

    // Keep this enabled so already-connected controllers work on load.
    startPolling();
})();
