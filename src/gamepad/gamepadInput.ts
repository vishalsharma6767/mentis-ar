// Shared, mutable input state written by the Bluetooth gamepad poll loop and
// read every frame by the movement controllers (XRWalk / WASDPlayerControls /
// DesktopController / SolarSystem). The phone controller and split-screen VR
// were removed — the gamepad is the only input device now.
export const remoteControl = {
  moveX: 0,
  moveZ: 0,
  lookDx: 0,
  lookDy: 0,
  gamepadCount: 0,
  gamepadName: null as string | null,
  recenterPulse: 0,
};

export const lastKeys: Record<string, boolean> = {};

export function dispatchKey(code: string, down: boolean) {
  // Derive a proper `key` value too: some handlers (e.g. the rack modal item
  // picker) read e.key (parseInt), not e.code.
  let key = code;
  if (code.startsWith('Key')) key = code.slice(3).toLowerCase();
  else if (code.startsWith('Digit')) key = code.slice(5);
  else if (code.startsWith('Numpad')) key = code.slice(6);
  else if (code === 'Space') key = ' ';
  const evt = new KeyboardEvent(down ? 'keydown' : 'keyup', {
    code,
    key,
    bubbles: true,
  });
  window.dispatchEvent(evt);
}

// Convert the left-stick axes into held WASD key state (desktop look for
// non-VR) and store the raw axes for the VR walk controller (XRWalk).
export function applyMove(x: number, z: number) {
  remoteControl.moveX = x;
  remoteControl.moveZ = z;
  const want: Record<string, boolean> = {
    KeyW: z < -0.15,
    KeyS: z > 0.15,
    KeyA: x < -0.15,
    KeyD: x > 0.15,
  };
  (['KeyW', 'KeyS', 'KeyA', 'KeyD'] as const).forEach((k) => {
    const pressed = want[k];
    if (pressed !== !!lastKeys[k]) {
      lastKeys[k] = pressed;
      dispatchKey(k, pressed);
    }
  });
}

// In-lab 3D wall panel navigation: the gamepad D-pad moves a focus highlight,
// A activates the focused target and B goes back. LabControlPanel3D registers
// a live accessor here while mounted so LabGamepad can route those buttons to
// it (an accessor captures up-to-date closures every frame).
export type UiNav = {
  move: (dir: 'up' | 'down' | 'left' | 'right') => void;
  activate: () => void;
  back: () => void;
};
type UiNavAccessor = () => UiNav | null;
let uiNav: UiNavAccessor | null = null;
export function onGamepadUi(fn: UiNavAccessor | null) {
  uiNav = fn;
}
export function gamepadUi(): UiNav | null {
  return uiNav ? uiNav() : null;
}