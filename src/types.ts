export type NovaLanguage = 'en-GB' | 'hi-IN';

export interface NovaModelInfo {
  id: string;
  provider: string;
  label: string;
  providerLabel: string;
  needsKey: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  aim: string;
  description: string;
  steps: string[];
  initialTableItems: TableItem[];
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'acid-base',
    name: 'Acid-Base Titration',
    aim: 'To determine the exact concentration of Hydrochloric Acid (HCl) by titrating it against standard Sodium Hydroxide (NaOH) using Phenolphthalein indicator.',
    description: 'Acid–base titration to find the unknown concentration of HCl.',
    steps: [
      '1. Pipette exactly 25 mL of HCl into the conical flask — this is your unknown acid.',
      '2. Add 2-3 drops of Phenolphthalein indicator from the dropper.',
      '3. Slowly add NaOH (the base flask) a little at a time, swirling after each pour — each pour transfers ~70%.',
      '4. Stop at the FIRST permanent pink colour — that is the endpoint. NaOH and HCl have just neutralised: HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l).',
      '5. If the pink deepens to magenta, the base is in excess — you overshot the endpoint by a few drops.',
    ],
    initialTableItems: [
      {
        instanceId: 'preset-hcl-beaker',
        catalogId: 'beaker',
        name: 'HCl Acid Beaker (50 mL)',
        category: 'glassware',
        type: 'beaker',
        position: [-1.2, 0, 0.1],
        contents: {
          chemicals: [{ id: 'hcl', name: 'Hydrochloric Acid', formula: 'HCl', amount: 50, color: '#e2e8f0' }],
          color: '#e2e8f0',
          ph: 1.0,
          temperature: 22,
        },
      },
      {
        instanceId: 'preset-naoh-flask',
        catalogId: 'flask',
        name: 'NaOH Base Flask (55 mL)',
        category: 'glassware',
        type: 'flask',
        position: [0.0, 0, 0.1],
        contents: {
          chemicals: [{ id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH', amount: 55, color: '#edf2f7' }],
          color: '#edf2f7',
          ph: 13.0,
          temperature: 22,
        },
      },
      {
        instanceId: 'preset-indicator-dropper',
        catalogId: 'dropper',
        name: 'Phenolphthalein Indicator Dropper',
        category: 'equipment',
        type: 'dropper',
        position: [1.2, 0, 0.1],
        contents: {
          chemicals: [{ id: 'phenolphthalein', name: 'Phenolphthalein Indicator', formula: 'Indicator', amount: 10, color: '#fbbf24' }],
          color: '#fbbf24',
          ph: 7.0,
          temperature: 22,
        },
      },
    ],
  },
  {
    id: 'oxygen-prep',
    name: 'Preparation of Oxygen Gas',
    aim: 'To prepare Oxygen gas (O₂) by the thermal decomposition of Potassium Permanganate (KMnO₄) and test it with a glowing splint.',
    description: 'Thermal decomposition of KMnO₄ releases Oxygen gas.',
    steps: [
      '1. Inspect the dry Test Tube containing ~3 g of purple Potassium Permanganate (KMnO₄) crystals.',
      '2. The tube is already corked and clamped to the stand — heating above 200°C decomposes the KMnO₄.',
      '3. Ignite the Bunsen Burner with Heat (F) while the Test Tube is selected.',
      '4. Watch the thermometer climb; above 200°C: 2KMnO₄(s) → K₂MnO₄(s) + MnO₂(s) + O₂(g)↑',
      '5. Test the gas: a glowing splint bursts into flame in Oxygen — the glowing splint test!',
    ],
    initialTableItems: [
      {
        instanceId: 'preset-kmno4-testtube',
        catalogId: 'test-tube',
        name: 'KMnO₄ Reaction Test Tube',
        category: 'glassware',
        type: 'test-tube',
        position: [-0.8, 0, 0.1],
        contents: {
          chemicals: [{ id: 'kmno4', name: 'Potassium Permanganate', formula: 'KMnO4', amount: 25, color: '#7e22ce' }],
          color: '#7e22ce',
          ph: 7.0,
          temperature: 22,
        },
      },
      {
        instanceId: 'preset-bunsen-burner',
        catalogId: 'burner',
        name: 'Bunsen Burner Apparatus',
        category: 'equipment',
        type: 'burner',
        position: [0.3, 0, 0.1],
      },
      {
        instanceId: 'preset-digital-thermometer',
        catalogId: 'thermometer',
        name: 'Digital Thermometer Probe',
        category: 'equipment',
        type: 'thermometer',
        position: [1.1, 0, 0.1],
      },
    ],
  },
  {
    id: 'copper-sulfate',
    name: 'Copper Sulfate Hydration & Reaction',
    aim: 'To study the double displacement reaction between aqueous Copper Sulfate (CuSO₄) and Sodium Hydroxide (NaOH) forming a Copper(II) Hydroxide precipitate.',
    description: 'Double displacement precipitation — observe colour change and a gelatinous precipitate.',
    steps: [
      '1. Inspect the deep-blue CuSO₄ Flask — the blue comes from aqueous Cu²⁺ ions.',
      '2. Pour / Mix (P) the NaOH Beaker into the CuSO₄ solution.',
      '3. Watch the immediate formation of gelatinous blue Copper(II) Hydroxide: CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ + Na₂SO₄(aq).',
      '4. Optional: Heat (F) the mixture — the precipitate may darken as hydrated copper compounds lose water.',
    ],
    initialTableItems: [
      {
        instanceId: 'preset-cuso4-flask',
        catalogId: 'flask',
        name: 'CuSO₄ Solution Flask (60 mL)',
        category: 'glassware',
        type: 'flask',
        position: [-1.0, 0, 0.1],
        contents: {
          chemicals: [{ id: 'cuso4', name: 'Copper Sulfate', formula: 'CuSO4', amount: 60, color: '#2563eb' }],
          color: '#2563eb',
          ph: 4.5,
          temperature: 22,
        },
      },
      {
        instanceId: 'preset-naoh-beaker',
        catalogId: 'beaker',
        name: 'NaOH Reagent Beaker (50 mL)',
        category: 'glassware',
        type: 'beaker',
        position: [0.2, 0, 0.1],
        contents: {
          chemicals: [{ id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH', amount: 50, color: '#edf2f7' }],
          color: '#edf2f7',
          ph: 13.0,
          temperature: 22,
        },
      },
      {
        instanceId: 'preset-burner-equipment',
        catalogId: 'burner',
        name: 'Bunsen Burner',
        category: 'equipment',
        type: 'burner',
        position: [1.2, 0, 0.1],
      },
    ],
  },
];

export interface InventoryItem {
  id: string;
  name: string;
  category: 'glassware' | 'chemicals' | 'equipment';
  type: string;
  color?: string;
  formula?: string;
  glassIOR?: number;
  glassThickness?: number;
  liquidSSR?: boolean;
}

export const LAB_CATALOG: InventoryItem[] = [
  // Glassware
  { id: 'beaker', name: 'Beaker (250ml)', category: 'glassware', type: 'beaker', color: '#ffffff' },
  { id: 'flask', name: 'Erlenmeyer Flask', category: 'glassware', type: 'flask', color: '#ffffff' },
  { id: 'test-tube', name: 'Test Tube', category: 'glassware', type: 'test-tube', color: '#ffffff' },
  { id: 'burette', name: 'Burette & Stand', category: 'glassware', type: 'burette', color: '#ffffff' },
  { id: 'cylinder', name: 'Measuring Cylinder', category: 'glassware', type: 'cylinder', color: '#ffffff' },

  // Chemicals
  { id: 'hcl', name: 'Hydrochloric Acid', category: 'chemicals', type: 'liquid', formula: 'HCl', color: '#e2e8f0' },
  { id: 'naoh', name: 'Sodium Hydroxide', category: 'chemicals', type: 'liquid', formula: 'NaOH', color: '#edf2f7' },
  { id: 'phenolphthalein', name: 'Phenolphthalein Indicator', category: 'chemicals', type: 'liquid', formula: 'Indicator', color: '#fbbf24' },
  { id: 'kmno4', name: 'Potassium Permanganate', category: 'chemicals', type: 'powder', formula: 'KMnO4', color: '#7e22ce' },
  { id: 'cuso4', name: 'Copper Sulfate', category: 'chemicals', type: 'powder', formula: 'CuSO4', color: '#2563eb' },
  { id: 'h2o', name: 'Distilled Water', category: 'chemicals', type: 'liquid', formula: 'H2O', color: '#38bdf8' },

  // Equipment & Safety
  { id: 'burner', name: 'Bunsen Burner', category: 'equipment', type: 'burner' },
  { id: 'tripod', name: 'Tripod & Wire Gauze', category: 'equipment', type: 'tripod' },
  { id: 'thermometer', name: 'Digital Thermometer', category: 'equipment', type: 'thermometer' },
  { id: 'dropper', name: 'Chemical Pipette/Dropper', category: 'equipment', type: 'dropper' },
];

export interface TableItem {
  instanceId: string;
  catalogId: string;
  name: string;
  category: 'glassware' | 'chemicals' | 'equipment';
  type: string;
  position: [number, number, number];
  contents?: {
    chemicals: { id: string; name: string; amount: number; color: string; formula?: string }[];
    temperature?: number;
    color?: string;
    ph?: number;
    precipitate?: string;
    gasEvolved?: string;
  };
}

// Nominal usable capacity (mL) per container catalog type.
// Used to drive realistic liquid levels, pour transfer and volume percentage.
export const CONTAINER_CAPACITY: Record<string, number> = {
  beaker: 200,
  flask: 150,
  'test-tube': 25,
  burette: 50,
  cylinder: 250,
  dropper: 15,
};

export function totalVolume(item: TableItem): number {
  return (
    item.contents?.chemicals.reduce((acc, c) => acc + (Number.isFinite(c.amount) ? c.amount : 0), 0) || 0
  );
}

export function totalCapacity(item: TableItem): number {
  return CONTAINER_CAPACITY[item.catalogId] || CONTAINER_CAPACITY[item.type] || 100;
}

export function fillPercent(item: TableItem): number {
  const cap = totalCapacity(item);
  return cap > 0 ? Math.min(1, totalVolume(item) / cap) : 0;
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Blend two hex colors; weight `a` in [0,1] is the share of colorA.
export function mixColors(colorA: string, colorB: string, weightA: number): string {
  const w = Math.max(0, Math.min(1, weightA));
  const [r1, g1, b1] = hexToRgb(colorA || '#38bdf8');
  const [r2, g2, b2] = hexToRgb(colorB || '#38bdf8');
  return rgbToHex(r1 * w + r2 * (1 - w), g1 * w + g2 * (1 - w), b1 * w + b2 * (1 - w));
}
