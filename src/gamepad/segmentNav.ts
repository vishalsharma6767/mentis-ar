// Shared navigation hub for the in-VR wall segments. Each mounted LabWallSegment
// registers itself (with its live items accessor) and the gamepad's D-pad/A/B
// are routed here: Left/Right switches which wall segment is active, Up/Down
// moves within the active segment, A activates the focused pill, B steps back
// (switches to the previous segment).
//
// A tiny store (subscribe + version) lets each segment re-render the active /
// focused highlight without React context churn.

export interface WallSegmentItem {
  id: string;
  label: string;
  sub?: string;
  color: string;
  action: () => void;
}

type Segment = { id: string; items: () => WallSegmentItem[] };

const segments = new Map<string, Segment>();
let activeId: string | null = null;
let focusIndex = 0;
let version = 0;
const subs = new Set<() => void>();

function emit() {
  version++;
  for (const fn of subs) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

function ensureActive() {
  if (segments.size === 0) {
    if (activeId !== null) {
      activeId = null;
      focusIndex = 0;
      emit();
    }
    return;
  }
  if (!activeId || !segments.has(activeId)) {
    activeId = segments.keys().next().value as string;
    focusIndex = 0;
  }
}

export const segmentNav = {
  get version() {
    return version;
  },
  get count() {
    return segments.size;
  },
  get activeId() {
    return activeId;
  },
  get focusIndex() {
    return activeId && segments.has(activeId) ? focusIndex : -1;
  },

  register(seg: Segment) {
    segments.set(seg.id, seg);
    ensureActive();
    emit();
  },
  unregister(id: string) {
    segments.delete(id);
    if (activeId === id) {
      activeId = null;
      ensureActive();
    }
    emit();
  },

  // Pointer hover / click routes focus + activation to this segment.
  setPointer(segId: string, itemIndex: number, run = false) {
    if (!segments.has(segId)) return;
    activeId = segId;
    focusIndex = itemIndex;
    emit();
    if (run) {
      const seg = segments.get(segId);
      const item = seg?.items()?.[Math.max(0, Math.min(focusIndex, (seg?.items()?.length || 1) - 1))];
      item?.action();
    }
  },

  move(dir: 'up' | 'down' | 'left' | 'right') {
    if (segments.size === 0) return;
    ensureActive();
    if (dir === 'left' || dir === 'right') {
      const keys = [...segments.keys()];
      const i = keys.indexOf(activeId as string);
      activeId = keys[(i + (dir === 'right' ? 1 : -1) + keys.length) % keys.length];
      focusIndex = 0;
    } else {
      const items = segments.get(activeId as string)?.items() || [];
      if (items.length > 0) {
        const step = dir === 'up' ? 1 : -1;
        focusIndex = (focusIndex + step + items.length) % items.length;
        // ex: 0 -> last on 'up', wrap helper below uses this shape
        focusIndex = ((focusIndex % items.length) + items.length) % items.length;
      }
    }
    emit();
  },

  activate() {
    if (!activeId) return;
    const items = segments.get(activeId)?.items() || [];
    const item = items[Math.max(0, Math.min(focusIndex, items.length - 1))];
    item?.action();
  },

  back() {
    this.move('left');
  },

  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};