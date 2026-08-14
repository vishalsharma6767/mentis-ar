import { useEffect, useRef, useState } from 'react';
import { applyMove, dispatchKey, remoteControl } from '../gamepad/gamepadInput';
import { segmentNav } from '../gamepad/segmentNav';
import { solarCmd } from '../solar/solarState';
import * as THREE from 'three';

// Standard gamepad mapping (navigator.getGamepads):
//   buttons: 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Select 9=Start 16=Home
//            12/13/14/15 = D-pad Up/Right/Down/Left
//   axes:    0/1 = left stick, 2/3 = right stick (up = -1 on vertical axes)
const DEAD = 0.14;

const DPAD: Array<[number, 'up' | 'down' | 'left' | 'right']> = [
  [12, 'up'],
  [14, 'down'],
  [13, 'right'],
  [15, 'left'],
];

export function LabGamepad({ mode }: { mode: 'lab' | 'solar' }) {
  const prev = useRef<boolean[]>([]);
  const prevMove = useRef({ x: 0, y: 0 });
  const talkHeld = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;

    const tap = (code: string) => {
      dispatchKey(code, true);
      window.setTimeout(() => dispatchKey(code, false), 70);
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
        const lx = Number(axes[0]) || 0;
        const ly = Number(axes[1]) || 0;
        const rx = Number(axes[2]) || 0;
        const ry = Number(axes[3]) || 0;

        // Left stick = walk (desktop camera + XR player via XRWalk).
        const sx = Math.abs(lx) > DEAD ? lx : 0;
        const sy = Math.abs(ly) > DEAD ? ly : 0;
        if (sx !== prevMove.current.x || sy !== prevMove.current.y) {
          prevMove.current = { x: sx, y: sy };
          applyMove(sx, sy);
        }

        // Right stick = look. Consumed every frame by XRLook (VR), the desktop
        // look controller or the solar academy; clamped so the accumulation
        // cannot spin out of control.
        const lookSens = 4.2;
        if (Math.abs(rx) > 0.05) {
          remoteControl.lookDx = Math.max(-60, Math.min(60, remoteControl.lookDx + rx * lookSens));
        } else {
          remoteControl.lookDx *= 0.6;
        }
        if (Math.abs(ry) > 0.05) {
          remoteControl.lookDy = Math.max(-60, Math.min(60, remoteControl.lookDy + ry * lookSens));
        } else {
          remoteControl.lookDy *= 0.6;
        }

        const buttons = found.buttons || [];
        const b = (i: number) => !!buttons[i]?.pressed;
        const edge = (i: number) => b(i) && !prev.current[i];
        const hasSegs = segmentNav.count > 0;

        // D-pad -> move across / inside the wall segments, or cycle table items
        // on desktop when no wall segments are mounted.
        for (const [idx, dir] of DPAD) {
          if (edge(idx)) {
            if (hasSegs) segmentNav.move(dir);
            else if (dir === 'left') tap('KeyQ');
            else if (dir === 'right') tap('KeyE');
          }
          prev.current[idx] = b(idx);
        }

        // A = confirm / activate the focused wall pill (or planet in the
        // academy; on a plain desktop the pill is triggered by pointer).
        if (edge(0)) {
          if (hasSegs) segmentNav.activate();
          else if (mode === 'solar') solarCmd.select += 1;
        }
        prev.current[0] = b(0);

        // B = back through wall segments (or Tools rack on a bare desktop).
        if (edge(1)) {
          if (hasSegs) segmentNav.back();
          else tap('Digit3');
        }
        prev.current[1] = b(1);

        // X / Y = open Glassware / Chemicals racks.
        if (edge(2)) tap('Digit1');
        if (edge(3)) tap('Digit2');
        prev.current[2] = b(2);
        prev.current[3] = b(3);

        // Start = heat, Select = clear table, Home = recenter view.
        if (edge(9)) tap('KeyF');
        if (edge(8)) tap('KeyC');
        if (edge(16)) remoteControl.recenterPulse += 1;
        prev.current[8] = b(8);
        prev.current[9] = b(9);
        prev.current[16] = b(16);

        // LT = Left trigger: In VR, this can be used for ray interaction.
        // On desktop, map to Remove item (X key).
        if (edge(6)) {
          // LT pressed - could be used for ray start in VR
          // On desktop, map to Remove item
          tap('KeyX');
        }
        prev.current[6] = b(6);

        // RT / RB / LB hold = push-to-talk (Space).
        const talk = b(7) || b(5) || b(4);
        if (talk && !talkHeld.current) {
          talkHeld.current = true;
          dispatchKey('Space', true);
        } else if (!talk && talkHeld.current) {
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
  }, [mode]);

  return notice ? (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
      <div className="bg-emerald-600/90 border border-emerald-400/60 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl">
        {notice}
      </div>
    </div>
  ) : null;
}