// Interprets spoken commands for the Solar System Academy and applies them to
// the live planet state. Returns a message for Nova to speak (or null when the
// phrase is a general astronomy question for the AI).

import { solarState, solarCmd } from './solarState';
import { bodyById, PLANET_ORDER, SOLAR_BODIES } from './solarData';

const PLANET_ALIASES: Record<string, string> = {
  sun: 'sun',
  surya: 'sun',
  mercury: 'mercury',
  budh: 'mercury',
  venus: 'venus',
  shukra: 'venus',
  earth: 'earth',
  prithvi: 'earth',
  dhara: 'earth',
  mars: 'mars',
  mangal: 'mars',
  jupiter: 'jupiter',
  brihaspati: 'jupiter',
  saturn: 'saturn',
  shani: 'saturn',
  uranus: 'uranus',
  aru: 'uranus',
  neptune: 'neptune',
  varun: 'neptune',
  moon: 'moon',
  chand: 'moon',
  chanda: 'moon',
};

function resolveBody(text: string): string | null {
  for (const [alias, id] of Object.entries(PLANET_ALIASES)) {
    if (text.includes(alias)) return id;
  }
  return null;
}

export interface CommandResult {
  applied: boolean;
  text: string | null; // spoken reply
}

export function parseSolarCommand(raw: string): CommandResult {
  const text = raw.toLowerCase();
  const id = resolveBody(text);

  if (id) {
    solarState.selectedId = id;
    const body = bodyById(id);
    const name = body?.name || id;

    if (text.includes('show') || text.includes('dikhao') || text.includes('select') || text.includes('choose')) {
      return { applied: true, text: `This is ${name}. ${body?.fact.en || ''}` };
    }
    if (text.includes('tell') || text.includes('about') || text.includes('batao') || text.includes('explain') || text.includes('fact')) {
      return { applied: true, text: body?.fact.en || null };
    }
    if (text.includes('spin') || text.includes('rotate') || text.includes('ghuma') || text.includes('turn')) {
      const h = solarState.planets[id];
      if (h) h.spin = Math.random() * 10 + 4;
      return { applied: true, text: `Spinning up ${name}.` };
    }
    if (text.includes('big') || text.includes('bada') || text.includes('zoom in')) {
      const h = solarState.planets[id];
      if (h) h.scale = Math.min(3, h.scale + 0.5);
      return { applied: true, text: `Making ${name} bigger.` };
    }
    if (text.includes('small') || text.includes('chota') || text.includes('zoom out')) {
      const h = solarState.planets[id];
      if (h) h.scale = Math.max(0.4, h.scale - 0.5);
      return { applied: true, text: `Making ${name} smaller.` };
    }
    if (text.includes('move') || text.includes('le jao')) {
      const h = solarState.planets[id];
      if (h) {
        h.spin = Math.random() * 10 + 4;
      }
      return { applied: true, text: `I selected ${name}. Pinch in front of the camera to grab it and move it around your room.` };
    }
  }

  // Global commands.
  if (text.includes('reset') || text.includes('wapis') || text.includes('restore')) {
    solarState.selectedId = null;
    return { applied: true, text: 'All planets are back in their orbits.' };
  }
  if (text.includes('camera on') || text.includes('mixed reality') || text.includes('ar mode') || text.includes('camara on')) {
    if (solarState.mode !== 'camera') solarCmd.cameraToggle += 1;
    return { applied: true, text: 'Turning the camera on. Now the solar system floats in your real room.' };
  }
  if (text.includes('camera off') || text.includes('space mode') || text.includes('camara off')) {
    if (solarState.mode === 'camera') solarCmd.cameraToggle += 1;
    return { applied: true, text: 'Switching to space mode with a starfield background.' };
  }
  if (text.includes('how many') || text.includes('count')) {
    const n = SOLAR_BODIES.length;
    return { applied: true, text: `Our solar system has ${n} bodies: the Sun, eight planets, and the Moon.` };
  }
  if (text.includes('planet')) {
    return {
      applied: true,
      text: `The planets in order from the Sun are: ${PLANET_ORDER
        .map((p) => bodyById(p)?.name || p)
        .join(', ')}. ${'Earth is our home and the third planet.'}`,
    };
  }

  return { applied: false, text: null };
}
