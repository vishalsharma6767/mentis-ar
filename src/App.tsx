import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { VRButton, XR, Controllers, Hands } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import { LabRoom } from './components/LabRoom';
import { NovaAssistant } from './components/LabAssistant';
import { UIOverlay } from './components/UIOverlay';
import { DesktopController } from './components/DesktopController';
import { TableWorkbenchUI } from './components/TableWorkbenchUI';
import { Experiment, EXPERIMENTS, InventoryItem, TableItem } from './types';
import { useVoice } from './hooks/useVoice';

export default function App() {
  const [mode, setMode] = useState<'menu' | 'countdown' | 'lab'>('menu');
  const [countdown, setCountdown] = useState(5);

  const [selectedLab, setSelectedLab] = useState<'chemistry' | 'physics' | 'biology'>('chemistry');
  const [labMode, setLabMode] = useState<'guided' | 'sandbox'>('guided');
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(EXPERIMENTS[0]);

  // Nova AI message state
  const [novaMessage, setNovaMessage] = useState(
    'Welcome to the Mentis Chemistry Laboratory. Select a predefined experiment or enter sandbox mode.'
  );

  // Table items state
  const [tableItems, setTableItems] = useState<TableItem[]>([]);

  const [selectedTableItemId, setSelectedTableItemId] = useState<string | null>(null);
  const [activeRackCategory, setActiveRackCategory] = useState<'glassware' | 'chemicals' | 'equipment' | null>(null);
  const [isHeating, setIsHeating] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);

  const loadExperimentEquipment = useCallback((exp: Experiment) => {
    if (exp && exp.initialTableItems) {
      const clonedItems: TableItem[] = JSON.parse(JSON.stringify(exp.initialTableItems));
      setTableItems(clonedItems);
      setSelectedTableItemId(clonedItems[0]?.instanceId || null);
    }
  }, []);

  const handleUserSpeech = useCallback(
    (text: string) => {
      fetchNovaResponse(text);
    },
    [selectedExperiment, labMode, tableItems]
  );

  const { isListening, isSupported, voiceError, startListening, stopListening, speak } = useVoice(handleUserSpeech);

  const handleSelectExperiment = (exp: Experiment) => {
    setSelectedExperiment(exp);
    if (labMode === 'guided') {
      loadExperimentEquipment(exp);
      const msg = `Aim of ${exp.name}: ${exp.aim}`;
      setNovaMessage(msg);
      speak(msg);
      if (mode === 'lab') {
        fetchNovaResponse(`Selected experiment: "${exp.name}". Aim: "${exp.aim}". Briefly state the aim and guide me on step 1.`);
      }
    }
  };

  const handleSetLabMode = (newMode: 'guided' | 'sandbox') => {
    setLabMode(newMode);
    if (newMode === 'guided' && selectedExperiment) {
      loadExperimentEquipment(selectedExperiment);
      const msg = `Guided mode activated for ${selectedExperiment.name}. Aim: ${selectedExperiment.aim}`;
      setNovaMessage(msg);
      speak(msg);
    } else if (newMode === 'sandbox') {
      setTableItems([]);
      setNovaMessage('Open Sandbox Mode active. Select glassware and chemicals from racks.');
      speak('Open Sandbox mode active.');
    }
  };

  // Controller handling for VR
  useEffect(() => {
    let animationFrameId: number;

    const handleGamepad = () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp) {
          const isPressed = gp.buttons.some((b) => b.pressed);
          if (isPressed && mode === 'menu') {
            startVR();
          }
        }
      }
      animationFrameId = requestAnimationFrame(handleGamepad);
    };

    animationFrameId = requestAnimationFrame(handleGamepad);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode]);

  const startVR = () => {
    setMode('countdown');
    speak('Entering chemistry lab room. Use WASD to walk, mouse to look around, and keys 1, 2, 3 for racks.');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (mode === 'countdown' && countdown === 0) {
      setMode('lab');
      if (labMode === 'guided' && selectedExperiment) {
        loadExperimentEquipment(selectedExperiment);
        fetchNovaResponse(
          `Entered lab for ${selectedExperiment.name}. Aim: ${selectedExperiment.aim}. Welcome me to the lab, state the aim, and guide me on step 1.`
        );
      } else {
        fetchNovaResponse('Sandbox mode ready. Press 1, 2, or 3 on your keyboard to choose apparatus.');
      }
    }
    return () => clearTimeout(timer);
  }, [mode, countdown, labMode, selectedExperiment, loadExperimentEquipment]);

  // Global Keyboard Shortcuts for Lab Control
  useEffect(() => {
    if (mode !== 'lab') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      // Key 1: Glassware
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        setActiveRackCategory('glassware');
      }
      // Key 2: Chemicals
      else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        setActiveRackCategory('chemicals');
      }
      // Key 3: Equipment
      else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        setActiveRackCategory('equipment');
      }
      // Key F: Toggle Bunsen Burner
      else if (e.code === 'KeyF') {
        setIsHeating((prev) => !prev);
      }
      // Key C: Clear Table
      else if (e.code === 'KeyC') {
        handleClearTable();
      }
      // Key N: Ask Nova Voice
      else if (e.code === 'KeyN') {
        handleAskNovaAboutTable();
      }
      // Spacebar Push-To-Talk
      else if (e.code === 'Space' && !e.repeat && !isListening && isSupported) {
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space' && isSupported) {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, isSupported, isListening, startListening, stopListening, tableItems]);

  // Fetch response from Gemini / Nova AI
  const fetchNovaResponse = async (message: string) => {
    try {
      const currentItemsStr = tableItems
        .map((i) => `${i.name} (Contains: ${i.contents?.chemicals.map((c) => c.name).join(', ') || 'Empty'})`)
        .join('; ');

      const response = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${message}. Items currently on workstation table: [${currentItemsStr}].`,
          experiment: labMode === 'guided' ? selectedExperiment?.name : 'Sandbox Mode',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && data.text) {
        setNovaMessage(data.text);
        speak(data.text);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = 'I am right here with you in the lab. Let me know what reaction you wish to perform.';
      setNovaMessage(errorMsg);
    }
  };

  const [pourState, setPourState] = useState<{
    sourceId: string;
    targetId: string;
    progress: number;
  } | null>(null);

  // Add Item from Catalog to Table (Spawn on open table, away from heaters)
  const handleAddItemToTable = (catalogItem: InventoryItem) => {
    const offsetIndex = tableItems.length;
    // Spawning coordinates spaced cleanly across open desk (width 6.2m)
    const xPositions = [-1.8, -0.6, 0.6, 1.8, -1.2, 0.0, 1.2];
    const xPos = xPositions[offsetIndex % xPositions.length];
    const zPos = 0.15 + Math.floor(offsetIndex / 4) * 0.4;

    const isChemical = catalogItem.category === 'chemicals';

    const newTableItem: TableItem = {
      instanceId: `table-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      catalogId: isChemical ? 'beaker' : catalogItem.id,
      name: isChemical ? `${catalogItem.name} Beaker` : catalogItem.name,
      category: isChemical ? 'chemicals' : catalogItem.category,
      type: isChemical ? 'beaker' : catalogItem.type,
      position: [xPos, 0, zPos],
      contents: {
        chemicals: [{ id: catalogItem.id, name: catalogItem.name, amount: 60, color: catalogItem.color || '#38bdf8' }],
        color: catalogItem.color || '#38bdf8',
      },
    };

    setTableItems((prev) => [...prev, newTableItem]);
    setSelectedTableItemId(newTableItem.instanceId);

    const msg = `Placed ${catalogItem.name} in Beaker on open workstation desk.`;
    setReactionMessage(msg);
    speak(msg);
    
    // Auto query Nova AI to explain this chemical/equipment step scientifically
    askNovaAboutContext(`I just placed ${catalogItem.name} (${catalogItem.formula || catalogItem.type}) on the lab workstation. Briefly explain its properties and potential chemical reactions.`);

    setTimeout(() => setReactionMessage(null), 3500);
  };

  // Mix / Pour Chemical with Animated 3D Transfer
  const handleMixChemicals = (sourceId: string, targetId: string) => {
    const sourceItem = tableItems.find((i) => i.instanceId === sourceId);
    const targetItem = tableItems.find((i) => i.instanceId === targetId);

    if (!sourceItem || !targetItem || sourceId === targetId) return;

    // Start 3D Pouring Animation Sequence
    let startTime = performance.now();
    const duration = 1800; // ms

    const stepAnimation = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setPourState({ sourceId, targetId, progress });

      if (progress < 1) {
        requestAnimationFrame(stepAnimation);
      } else {
        // Animation finished -> execute reaction
        finalizeReaction(sourceItem, targetItem);
        setPourState(null);
      }
    };

    requestAnimationFrame(stepAnimation);
  };

  const askNovaAboutContext = async (promptText: string) => {
    try {
      const response = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          experiment: labMode === 'guided' ? selectedExperiment?.name : 'Sandbox Mode',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && data.text) {
        setNovaMessage(data.text);
        speak(data.text);
        return;
      }
    } catch (err) {
      console.error('Nova explanation error:', err);
    }

    // Smart instant scientific fallback response if API is unreachable
    let fallbackText = "Observing reaction on the lab desk: Chemical species are interacting according to standard molar reaction kinetics.";
    if (promptText.includes('HCl') && promptText.includes('NaOH')) {
      fallbackText = "Acid-Base Neutralization: Hydrochloric Acid (HCl) reacts with Sodium Hydroxide (NaOH) to produce Sodium Chloride salt (NaCl) and Water (H2O). When Phenolphthalein indicator is added, excess OH- ions turn the solution vibrant MAGENTA PINK!";
    } else if (promptText.includes('CuSO4') || promptText.includes('Copper')) {
      fallbackText = "Copper Sulfate (CuSO4) solution contains aqueous Cu2+ ions responsible for the vivid deep blue hue. Adding NaOH forms a gelatinous light blue precipitate of Copper(II) Hydroxide [Cu(OH)2↓].";
    } else if (promptText.includes('KMnO4') || promptText.includes('Permanganate')) {
      fallbackText = "Potassium Permanganate (KMnO4) is a powerful purple oxidizing agent. Heating or reacting with reducing agents releases Oxygen gas bubbles (O2↑) and shifts color to manganese ions.";
    }

    setNovaMessage(fallbackText);
    speak(fallbackText);
  };

  const finalizeReaction = (sourceItem: TableItem, targetItem: TableItem) => {
    let newColor = targetItem.contents?.color || sourceItem.contents?.color || '#38bdf8';
    let reactionNote = `Poured ${sourceItem.name} into ${targetItem.name}.`;

    const sourceChemIds = sourceItem.contents?.chemicals.map((c) => c.id) || [];
    const targetChemIds = targetItem.contents?.chemicals.map((c) => c.id) || [];
    const allChemIds = [...sourceChemIds, ...targetChemIds, sourceItem.catalogId, targetItem.catalogId];

    if (allChemIds.includes('naoh') && allChemIds.includes('hcl')) {
      if (allChemIds.includes('phenolphthalein')) {
        newColor = '#ec4899'; // Vibrant Magenta Pink
        reactionNote = 'REACTION: Acid-Base Neutralization with Phenolphthalein turned solution MAGENTA PINK!';
      } else {
        newColor = '#e2e8f0'; // Neutral Salt Water
        reactionNote = 'REACTION: HCl + NaOH formed Neutral Salt Water (NaCl + H₂O). Heat released!';
      }
    } else if ((allChemIds.includes('cuso4') && allChemIds.includes('naoh')) || (allChemIds.includes('cuso4') && targetItem.name.includes('NaOH'))) {
      newColor = '#1d4ed8'; // Deep Indigo Blue Precipitate
      reactionNote = 'REACTION: CuSO₄ + 2NaOH ➔ Cu(OH)₂↓ (Gelatinous Blue Precipitate) + Na₂SO₄!';
    } else if (allChemIds.includes('cuso4')) {
      newColor = '#2563eb'; // Deep Sky Blue
      reactionNote = 'Copper Sulfate (CuSO₄) dissolved into brilliant DEEP BLUE solution.';
    } else if (allChemIds.includes('kmno4')) {
      newColor = '#7e22ce'; // Intense Purple
      reactionNote = 'Potassium Permanganate (KMnO₄) formed intense VIOLET PURPLE solution.';
    } else if (allChemIds.includes('phenolphthalein')) {
      newColor = '#fef08a'; // Light Indicator Yellow
      reactionNote = 'Phenolphthalein indicator added into solution.';
    }

    setTableItems((prev) =>
      prev.map((item) => {
        if (item.instanceId === targetItem.instanceId) {
          const updatedChemicals = [
            ...(item.contents?.chemicals || []),
            ...(sourceItem.contents?.chemicals || [{ id: sourceItem.catalogId, name: sourceItem.name, amount: 60, color: sourceItem.contents?.color || '#38bdf8' }]),
          ];
          return {
            ...item,
            contents: {
              chemicals: updatedChemicals,
              color: newColor,
            },
          };
        }
        return item;
      })
    );

    setReactionMessage(reactionNote);
    speak(reactionNote);

    // AI Nova Assistant Step Explanation in real-time
    askNovaAboutContext(
      `In our virtual chemistry lab, we just mixed ${sourceItem.name} into ${targetItem.name}. Result: ${reactionNote}. Explain the chemical reaction, formula, and what happens step by step.`
    );

    setTimeout(() => setReactionMessage(null), 5000);
  };

  const handleClearTable = () => {
    setTableItems([]);
    setSelectedTableItemId(null);
    setReactionMessage('Cleared workstation table.');
    setTimeout(() => setReactionMessage(null), 2500);
  };

  const handleAskNovaAboutTable = () => {
    if (tableItems.length === 0) {
      fetchNovaResponse('My workstation table is empty right now. What experiment should we set up?');
    } else {
      fetchNovaResponse('I have set up these items on my workstation table. What chemical reaction can I perform with them?');
    }
  };

  const handleAskNovaGuide = () => {
    if (selectedExperiment && labMode === 'guided') {
      fetchNovaResponse(
        `Experiment: ${selectedExperiment.name}. Aim: ${selectedExperiment.aim}. Procedure steps: [${selectedExperiment.steps.join(' | ')}]. State the aim of the experiment clearly and guide me step by step on how to perform it.`
      );
    } else {
      handleAskNovaAboutTable();
    }
  };

  const handleResetExperimentEquipment = () => {
    if (selectedExperiment && labMode === 'guided') {
      loadExperimentEquipment(selectedExperiment);
      const msg = `Reset pre-placed equipment for ${selectedExperiment.name} on the workstation table.`;
      setReactionMessage(msg);
      speak(msg);
      setTimeout(() => setReactionMessage(null), 3000);
    } else {
      handleClearTable();
    }
  };

  return (
    <div className="w-full h-screen bg-gray-950 overflow-hidden font-sans select-none">
      <UIOverlay
        mode={mode}
        countdown={countdown}
        selectedLab={selectedLab}
        setSelectedLab={setSelectedLab}
        labMode={labMode}
        setLabMode={handleSetLabMode}
        selectedExperiment={selectedExperiment}
        onSelectExperiment={handleSelectExperiment}
        onStartVR={startVR}
        novaMessage={novaMessage}
        isListening={isListening}
        voiceError={voiceError}
        onAskNovaGuide={handleAskNovaGuide}
        onResetExperimentEquipment={handleResetExperimentEquipment}
      />

      {mode === 'lab' && (
        <TableWorkbenchUI
          rackCategory={activeRackCategory}
          onCloseRackMenu={() => setActiveRackCategory(null)}
          onOpenRackMenu={(cat) => setActiveRackCategory(cat)}
          onAddItemToTable={handleAddItemToTable}
          tableItems={tableItems}
          selectedTableItemId={selectedTableItemId}
          onSelectTableItem={setSelectedTableItemId}
          onRemoveTableItem={(id) => setTableItems((prev) => prev.filter((i) => i.instanceId !== id))}
          onClearTable={handleClearTable}
          onMixChemicals={handleMixChemicals}
          isHeating={isHeating}
          onToggleHeating={() => setIsHeating(!isHeating)}
          onAskNovaAboutTable={handleAskNovaAboutTable}
          reactionMessage={reactionMessage}
        />
      )}

      {mode === 'lab' && <VRButton />}

      <Canvas
        dpr={[1, 1.5]}
        shadows={false}
        gl={{
          powerPreference: 'default',
          antialias: true,
          alpha: false,
          failIfMajorPerformanceCaveat: false,
        }}
        camera={{ position: [0, 1.8, 3.8], fov: 65 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost, preventing default crash...');
          });
        }}
      >
        <XR>
          <LabRoom
            labMode={labMode}
            selectedExperiment={selectedExperiment}
            tableItems={tableItems}
            selectedTableItemId={selectedTableItemId}
            onSelectTableItem={setSelectedTableItemId}
            onOpenRackMenu={(category) => setActiveRackCategory(category)}
            isHeating={isHeating}
            pourState={pourState}
          />

          <NovaAssistant message={novaMessage} />

          <Controllers />
          <Hands />

          {mode === 'menu' ? (
            <OrbitControls
              makeDefault
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2.1}
              autoRotate
              autoRotateSpeed={0.5}
            />
          ) : (
            <DesktopController mode={mode} />
          )}
        </XR>
      </Canvas>
    </div>
  );
}
