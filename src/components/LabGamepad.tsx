import { useEffect, useRef, useState } from 'react';
import { applyMove, dispatchKey, remoteControl } from '../remote/RemoteBridge';

// Standard gamepad mapping (navigator.getGamepads):
//   buttons: 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Select 9=Start 12-15=D-pad
//   axes:    0/1 = left stick, 2/3 = right stick (up = -1 on vertical axes)
const TAP_BUTTONS: Array<{ index: number; label: string; code: string }> = [
  { index: 0, label: 'A', code: 'Digit1' }, // glassware rack
  { index: 1, label: 'B', code: 'Digit2' }, // chemicals rack
  { index: 2, label: 'X', code: 'Digit3' }, // fire & tools rack
  { index: 3, label: 'Y', code: 'KeyN' }, // ask Nova
  { index: 4, label: 'LB', code: 'KeyF' }, // toggle heat
  { index: 5, label: 'RB', code: 'KeyP' }, // pour / mix
  { index: 6, label: 'LT', code: 'KeyX' }, // remove selected
  { index: 8, label: 'Select', code: 'KeyC' }, // clear table
  { index: 9, label: 'Start', code: 'Escape' }, // close menu / deselect
  { index: 14, label: 'DpadL', code: 'KeyQ' }, // cycle item backwards
  { index: 15, label: 'DpadR', code: 'KeyE' }, // cycle item forwards
];

export function LabGamepad() {
  const prev = useRef<boolean[]>([]);
  const prevMove = useRef({ x: 0, y: 0 });
  const talkHeld = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    let frame: number;

    const tap = (code: string) => {
      dispatchKey(code, true);
      setTimeout(() => dispatchKey(code, false), 70);
    };

    const loop = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let found: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          found = p;
          break;
        }
      }

      if (found) {
        remoteControl.gamepadCount = 1;
        if (remoteControl.gamepadName !== found.id) {
          remoteControl.gamepadName = found.id;
          setNotice(`Gamepad connected: ${found.id}`);
          if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
          noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
        }

        const axes = found.axes || [];
        const leftX = Number(axes[0]) || 0;
        const leftY = Number(axes[1]) || 0;
        const rightX = Number(axes[2]) || 0;
        const rightY = Number(axes[3]) || 0;

        // Left stick = walk (applies to both the desktop camera and, when a
        // headset session is presenting, the XR player via XRWalk).
        const dead = 0.12;
        const sx = Math.abs(leftX) > dead ? leftX : 0;
        const sy = Math.abs(leftY) > dead ? leftY : 0;
        if (sx !== prevMove.current.x || sy !== prevMove.current.y) {
          prevMove.current = { x: sx, y: sy };
          applyMove(sx, sy);
        }

        // Right stick = look around (delta per frame, consumed by WASDPlayerControls).
        const lookSensitivity = 4.5;
        if (Math.abs(rightX) > 0.08 || Math.abs(rightY) > 0.08) {
          remoteControl.lookDx += rightX * lookSensitivity;
          remoteControl.lookDy += rightY * lookSensitivity;
        }

        // Edge-triggered action buttons.
        const buttons = found.buttons || [];
        for (const b of TAP_BUTTONS) {
          const pressed = !!buttons[b.index]?.pressed;
          if (pressed && !prev.current[b.index]) tap(b.code);
          prev.current[b.index] = pressed;
        }

        // RT = hold to talk (Space push-to-talk).
        const rt = !!buttons[7]?.pressed;
        if (rt && !talkHeld.current) {
          talkHeld.current = true;
          dispatchKey('Space', true);
        } else if (!rt && talkHeld.current) {
          talkHeld.current = false;
          dispatchKey('Space', false);
        }
      } else {
        if (remoteControl.gamepadCount !== 0) {
          remoteControl.gamepadCount = 0;
          remoteControl.gamepadName = null;
          setNotice('Gamepad disconnected');
          if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
          noticeTimer.current = window.setTimeout(() => setNotice(null), 3000);
          applyMove(0, 0);
          prevMove.current = { x: 0, y: 0 };
        }
        prev.current = [];
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      if (talkHeld.current) {
        dispatchKey('Space', false);
        talkHeld.current = false;
      }
      if (remoteControl.gamepadCount) {
        remoteControl.gamepadCount = 0;
        remoteControl.gamepadName = null;
      }
      applyMove(0, 0);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  return notice ? (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
      <div className="bg-emerald-600/90 border border-emerald-400/60 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl">
        {notice}
      </div>
    </div>
  ) : null;
}
