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
    aim: 'To determine the exact concentration of Hydrochloric Acid (HCl) by neutralising it with standard Sodium Hydroxide (NaOH) solution using Phenolphthalein indicator.',
    description: 'Determine the concentration of an unknown acid using a standard base with Phenolphthalein.',
    steps: [
      '1. Inspect the pre-placed HCl Beaker, NaOH Flask, and Phenolphthalein Dropper on your table.',
      '2. Select Phenolphthalein Dropper and add indicator into the HCl Beaker.',
      '3. Click Pour / Mix (P) to pour NaOH from the Flask into the HCl Beaker.',
      '4. Observe the neutralisation reaction turn the solution vibrant MAGENTA PINK!',
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
        name: 'NaOH Base Flask (50 mL)',
        category: 'glassware',
        type: 'flask',
        position: [0.0, 0, 0.1],
        contents: {
          chemicals: [{ id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH', amount: 50, color: '#edf2f7' }],
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
    aim: 'To prepare and isolate Oxygen gas (O₂) through the thermal decomposition of Potassium Permanganate (KMnO₄) using a Bunsen Burner heat source.',
    description: 'Thermal decomposition of Potassium Permanganate.',
    steps: [
      '1. Inspect the Test Tube containing purple Potassium Permanganate (KMnO₄) on your workstation table.',
      '2. Ignite the Bunsen Burner by clicking Heat (F) on the workstation toolbar.',
      '3. Observe thermal decomposition as temperature rises above 200°C.',
      '4. Watch Oxygen gas (O₂) bubbles and fumes evolving from the heated reaction vessel!',
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
    aim: 'To study the double displacement precipitation reaction between aqueous Copper Sulfate (CuSO₄) and Sodium Hydroxide (NaOH) forming Copper(II) Hydroxide.',
    description: 'Observe color change and precipitation of Copper Sulfate solution.',
    steps: [
      '1. Inspect the pre-placed CuSO₄ Flask and NaOH Beaker on your workstation desk.',
      '2. Select Pour / Mix (P) to combine NaOH into the blue CuSO₄ solution.',
      '3. Observe immediate formation of gelatinous deep blue Copper(II) Hydroxide [Cu(OH)₂↓] precipitate.',
      '4. Optional: Click Heat (F) to ignite the Bunsen Burner and observe heat effects on the copper complex.',
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
