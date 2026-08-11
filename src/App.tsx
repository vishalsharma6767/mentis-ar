import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { VRButton, XR, Controllers, Hands } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import { LabRoom } from './components/LabRoom';
import { NovaAssistant } from './components/LabAssistant';
import { UIOverlay } from './components/UIOverlay';
import { DesktopController } from './components/DesktopController';
import { TableWorkbenchUI } from './components/TableWorkbenchUI';
import { LabGamepad } from './components/LabGamepad';
import { LabControlsPanel } from './components/LabControlsPanel';
import { XRWalk } from './components/XRWalk';
import { RemoteBridge, onRemoteExit } from './remote/RemoteBridge';
import { SolarSystem } from './solar/SolarSystem';
import { AcademyHUD } from './solar/AcademyHUD';
import { MRCamera } from './solar/MRCamera';
import { solarState, solarCmd, resetPlanets } from './solar/solarState';
import { parseSolarCommand } from './solar/solarCommands';
import { StereoRig } from './headset/StereoRig';
import { SplitVRToggle } from './headset/SplitVRToggle';
import { headState, startHeadTracking, stopHeadTracking, recenter } from './headset/headRig';
import { Experiment, EXPERIMENTS, InventoryItem, TableItem, totalVolume, mixColors, NovaModelInfo, NovaLanguage } from './types';
import { useVoice } from './hooks/useVoice';

export default function App() {
  const [mode, setMode] = useState<'menu' | 'dashboard' | 'countdown' | 'lab' | 'solar'>('menu');
  const [countdown, setCountdown] = useState(5);

  const [world, setWorld] = useState<'chemistry' | 'solar'>('chemistry');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [splitView, setSplitView] = useState(() => {
    try {
      return localStorage.getItem('mentis-split-vr') === '1';
    } catch {
      return false;
    }
  });
  const [labMode, setLabMode] = useState<'guided' | 'sandbox'>('guided');
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(EXPERIMENTS[0]);

  // Nova AI message state
  const [novaMessage, setNovaMessage] = useState(
    'Welcome to the Mentis Chemistry Laboratory. Select a predefined experiment or enter sandbox mode.'
  );

  // Nova AI language + model router state
  const [language, setLanguage] = useState<NovaLanguage>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('mentis-language') : null;
    return saved === 'en-GB' ? 'en-GB' : 'hi-IN';
  });
  const [activeModel, setActiveModel] = useState<string>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('mentis-model') : null;
    return saved || 'local:tutor';
  });
  const [availableModels, setAvailableModels] = useState<NovaModelInfo[]>([]);

  // Table items state
  const [tableItems, setTableItems] = useState<TableItem[]>([]);

  const [selectedTableItemId, setSelectedTableItemId] = useState<string | null>(null);
  const [activeRackCategory, setActiveRackCategory] = useState<'glassware' | 'chemicals' | 'equipment' | null>(null);
  const [isHeating, setIsHeating] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);
  const kmno4DecomposedRef = useRef(false);

  const loadExperimentEquipment = useCallback((exp: Experiment) => {
    if (exp && exp.initialTableItems) {
      const clonedItems: TableItem[] = JSON.parse(JSON.stringify(exp.initialTableItems));
      setTableItems(clonedItems);
      setSelectedTableItemId(clonedItems[0]?.instanceId || null);
    }
  }, []);

  const handleUserSpeech = useCallback(
    (text: string) => {
      // In the Solar Academy, first try direct interactive commands (select,
      // spin, scale, facts) so the planets react instantly to speech.
      if (world === 'solar' && mode === 'solar') {
        const result = parseSolarCommand(text);
        if (result.applied) {
          if (result.text) {
            setNovaMessage(result.text);
            speak(result.text);
          }
          return;
        }
        // Otherwise let Nova answer as an astronomy teacher.
        fetchNovaResponse(
          `Student said: "${text}". Answer briefly and warmly as an astronomy teacher about the solar system, planets, the Sun, the Moon, orbits or gravity.`
        );
        return;
      }
      fetchNovaResponse(text);
    },
    [world, mode]
  );

  const { isListening, isSupported, voiceError, voiceLanguage, setVoiceLanguageMode, startListening, stopListening, speak } = useVoice(handleUserSpeech);

  // Fetch the list of usable AI models from the router (based on configured keys).
  useEffect(() => {
    fetch('/api/nova/models')
      .then((r) => r.json())
      .then((data) => {
        if (data?.models?.length) {
          setAvailableModels(data.models);
          const stillAvailable = data.models.some((m: NovaModelInfo) => m.id === activeModel);
          if (!stillAvailable) {
            // Current choice is gone — pick the best available model.
            const next = data.models[0]?.id || 'local:tutor';
            setActiveModel(next);
            try {
              localStorage.setItem('mentis-model', next);
            } catch {
              // ignore
            }
          } else if (activeModel === 'local:tutor') {
            // A real API key is configured — auto-upgrade from the offline tutor
            // to the first live model so the lab uses true AI immediately.
            const live = data.models.find((m: NovaModelInfo) => m.needsKey && m.provider !== 'pollinations');
            if (live) {
              setActiveModel(live.id);
              try {
                localStorage.setItem('mentis-model', live.id);
              } catch {
                // ignore
              }
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Keep the TTS voice in sync with the chosen language (hi-IN vs en-GB).
  useEffect(() => {
    setVoiceLanguageMode(language);
  }, [language, setVoiceLanguageMode]);

  const handleLanguageChange = (lang: NovaLanguage) => {
    setLanguage(lang);
    try {
      localStorage.setItem('mentis-language', lang);
    } catch {
      // ignore
    }
  };

  const handleModelChange = (modelId: string) => {
    setActiveModel(modelId);
    try {
      localStorage.setItem('mentis-model', modelId);
    } catch {
      // ignore
    }
  };

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
    // Phone-in-headset: go fullscreen + landscape as soon as the student taps
    // Start (browsers require this to be inside the tap gesture).
    if (isTouchDevice) enterPhoneFullscreen();
    setCountdown(5);
    setMode('countdown');
    if (world === 'solar') {
      speak('Welcome to the Mentis Solar System Academy. The camera will open and the planets will float in your room. Look at a planet to select it, pinch with your hand to grab it, or ask Nova to teach you.');
    } else {
      speak('Entering chemistry lab room. Use WASD to walk, mouse to look around, and keys 1, 2, 3 for racks. A Bluetooth game controller or the phone remote also works — press CONTROLS on screen to see every button.');
    }
  };

  const openLab = (w: 'chemistry' | 'solar') => {
    setWorld(w);
    setMode('dashboard');
  };

  const backToLabs = () => {
    stopHeadTracking();
    headState.splitActive = false;
    setSplitView(false);
    try {
      localStorage.setItem('mentis-split-vr', '0');
    } catch {
      // ignore
    }
    setMode('menu');
  };

  // ---- Phone-in-headset fullscreen flow ----
  const isTouchDevice =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const enterPhoneFullscreen = () => {
    const el = document.documentElement as any;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rfs) {
      try {
        const p = rfs.call(el);
        p?.catch?.(() => {});
      } catch {
        // ignore
      }
    }
    const so = (screen as any)?.orientation;
    if (so?.lock) {
      try {
        so.lock('landscape').catch(() => {});
      } catch {
        // ignore
      }
    }
  };

  const exitPhoneFullscreen = () => {
    const d = document as any;
    const ex = d.exitFullscreen || d.webkitExitFullscreen;
    if (ex) {
      try {
        ex.call(d);
      } catch {
        // ignore
      }
    }
    const so = (screen as any)?.orientation;
    if (so?.unlock) {
      try {
        so.unlock();
      } catch {
        // ignore
      }
    }
  };

  // Controller EXIT button -> take the lab phone out of fullscreen + split VR.
  const handleControllerExit = useCallback(() => {
    stopHeadTracking();
    headState.splitActive = false;
    setSplitView(false);
    try {
      localStorage.setItem('mentis-split-vr', '0');
    } catch {
      // ignore
    }
    exitPhoneFullscreen();
  }, []);

  useEffect(() => {
    onRemoteExit(handleControllerExit);
    return () => onRemoteExit(null);
  }, [handleControllerExit]);

  const exitAcademy = () => {
    setCameraEnabled(false);
    resetPlanets();
    backToLabs();
  };

  // Manual split-screen stereo for Cardboard-style headsets (no WebXR needed).
  const toggleSplit = useCallback(async () => {
    if (splitView) {
      stopHeadTracking();
      headState.splitActive = false;
      setSplitView(false);
      try {
        localStorage.setItem('mentis-split-vr', '0');
      } catch {
        // ignore
      }
    } else {
      const ok = await startHeadTracking();
      headState.splitActive = true;
      recenter();
      setSplitView(true);
      try {
        localStorage.setItem('mentis-split-vr', '1');
      } catch {
        // ignore
      }
      speak(
        ok
          ? 'Split screen VR mode on. Hold the phone in the headset and look around. Press the recenter button to reset your view.'
          : 'Split screen VR mode on, but head tracking was not allowed. Use the right stick to look around.'
      );
    }
  }, [splitView, speak]);

  // Follow one-shot camera toggles from the HUD / voice commands.
  useEffect(() => {
    if (solarCmd.cameraToggle > 0) {
      solarCmd.cameraToggle = 0;
      setCameraEnabled((prev) => !prev);
    }
  }, [solarCmd.cameraToggle]);

  // When the academy is open and camera is enabled, ask Nova to welcome the
  // student and explain the controls (once).
  useEffect(() => {
    if (mode === 'solar' && world === 'solar' && cameraEnabled) {
      const t = setTimeout(() => {
        fetchNovaResponse(
          'You are now in the Solar System Academy mixed reality view. The Sun and all eight planets plus the Moon float in the room. Tell me what I am seeing and how I can interact: look with the reticle, pinch to grab, or ask you questions. Welcome me warmly.'
        );
      }, 800);
      return () => clearTimeout(t);
    }
  }, [mode, world, cameraEnabled]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (mode === 'countdown' && countdown === 0) {
      if (world === 'solar') {
        setCameraEnabled(true);
        setMode('solar');
        resetPlanets();
        fetchNovaResponse(
          'Welcome to the Solar System Academy! I am Nova, your astronomy teacher. You will see the Sun, all eight planets and the Moon floating in front of you. Say a planet name, for example "show Jupiter", or "tell me about Mars", to learn. You can also pinch in front of the camera to grab a planet and drag it.'
        );
      } else {
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
    }
    return () => clearTimeout(timer);
  }, [mode, countdown, labMode, selectedExperiment, loadExperimentEquipment, world]);

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
      // Key V: toggle split-screen stereo
      else if (e.code === 'KeyV') {
        toggleSplit();
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
  }, [mode, isSupported, isListening, startListening, stopListening, tableItems, toggleSplit]);

  // Solar Academy keyboard shortcuts: Space push-to-talk, C camera toggle,
  // R reset planets.
  useEffect(() => {
    if (mode !== 'solar') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space' && !e.repeat && !isListening && isSupported) {
        startListening();
      } else if (e.code === 'KeyC') {
        setCameraEnabled((prev) => !prev);
      } else if (e.code === 'KeyR') {
        resetPlanets();
      } else if (e.code === 'KeyV') {
        toggleSplit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [mode, isSupported, isListening, startListening, stopListening, toggleSplit]);

  // Continuous heating simulation: temperature climbs, liquids boil/evaporate,
  // and KMnO₄ thermally decomposes releasing Oxygen gas.
  useEffect(() => {
    if (mode !== 'lab' || !isHeating) return;
    kmno4DecomposedRef.current = false;

    const tick = setInterval(() => {
      setTableItems((prev) =>
        prev.map((it) => {
          if (!it.contents || !it.contents.chemicals?.length) return it;
          const base = it.contents.temperature ?? 22;
          const nextTemp = Math.min(320, base + 2.2);

          let chems = it.contents.chemicals;
          if (nextTemp > 98) {
            chems = chems.map((c) => ({
              ...c,
              amount: Math.max(0, c.amount - (it.type === 'test-tube' ? 0.05 : 0.08)),
            }));
            chems = chems.filter((c) => c.amount > 0);
          }

          let contents: TableItem['contents'] = {
            ...it.contents,
            temperature: nextTemp,
            chemicals: chems,
          };

          const hasKmno4 = chems.some((c) => c.id === 'kmno4');
          if (hasKmno4 && nextTemp >= 200 && !kmno4DecomposedRef.current) {
            kmno4DecomposedRef.current = true;
            contents = {
              ...contents,
              color: '#581c87',
              gasEvolved: 'O₂ gas — 2KMnO₄ → K₂MnO₄ + MnO₂ + O₂↑ (thermal decomposition)',
            };
            setReactionMessage('KMnO₄ decomposes at 200°C releasing Oxygen gas (O₂↑)!');
            speak('Potassium Permanganate decomposes above two hundred degrees, releasing Oxygen gas.');
            setTimeout(() => setReactionMessage(null), 6000);
          }

          return { ...it, contents };
        })
      );
    }, 600);

    return () => clearInterval(tick);
  }, [mode, isHeating]);

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
          experiment:
            world === 'solar'
              ? 'Solar System Academy'
              : labMode === 'guided'
                ? selectedExperiment?.name
                : 'Sandbox Mode',
          model: activeModel,
          language,
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
          model: activeModel,
          language,
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

  // Simple pH estimation from an acid/base mL balance.
  const estimatePh = (baseMl: number, acidMl: number) => {
    const diff = baseMl - acidMl;
    if (Math.abs(diff) < 0.5) return 7 + diff;
    if (diff > 0) {
      // Excess base: pH climbs toward the ~13 max.
      return Math.min(13, 7 + Math.log10(diff / 3 + 0.1) + 0.6);
    }
    // Excess acid: pH drops toward ~0.5.
    return Math.max(0.5, 7 - Math.log10(-diff / 3 + 0.1) - 0.6);
  };

  const finalizeReaction = (sourceItem: TableItem, targetItem: TableItem) => {
    const sourceChems = sourceItem.contents?.chemicals || [];
    const targetChems = targetItem.contents?.chemicals || [];
    const sourceVol = totalVolume(sourceItem);
    const targetVol = totalVolume(targetItem);

    // 1. Transfer a solid measured amount per pour (never a shrinking fraction,
    //    otherwise the source gets asymptotically smaller and the reaction never
    //    reaches its endpoint — the colour would never change).
    const pourAmount = Math.min(sourceVol, Math.max(8, Math.round(sourceVol * 0.7)));
    const transferredChems = sourceChems.map((c) => {
      if (sourceVol <= 0) return { ...c, amount: 0 };
      const frac = pourAmount / sourceVol;
      return { ...c, amount: Math.round(c.amount * frac) };
    });
    const remainingChems = sourceChems
      .map((c, i) => ({ ...c, amount: c.amount - transferredChems[i].amount }))
      .filter((c) => c.amount > 0);
    const transferredVol = transferredChems.reduce((a, c) => a + c.amount, 0);

    // 2. Merge the poured liquid into the target (sum the same species).
    const mergedChems: { id: string; name: string; amount: number; color: string; formula?: string }[] = [...targetChems];
    for (const tc of transferredChems) {
      const idx = mergedChems.findIndex((x) => x.id === tc.id);
      if (idx >= 0) {
        mergedChems[idx] = { ...mergedChems[idx], amount: mergedChems[idx].amount + tc.amount };
      } else if (tc.amount > 0) {
        mergedChems.push(tc);
      }
    }

    const hclMl = mergedChems.find((c) => c.id === 'hcl')?.amount || 0;
    const naohMl = mergedChems.find((c) => c.id === 'naoh')?.amount || 0;
    const indicatorMl = mergedChems.find((c) => c.id === 'phenolphthalein')?.amount || 0;
    const cuso4Ml = mergedChems.find((c) => c.id === 'cuso4')?.amount || 0;
    const kmno4Ml = mergedChems.find((c) => c.id === 'kmno4')?.amount || 0;
    const h2oMl = mergedChems.find((c) => c.id === 'h2o')?.amount || 0;
    const hasIndicator = indicatorMl > 0;
    const ph = estimatePh(naohMl, hclMl);

    // 3. Decide the outcome of the mixed contents.
    let newColor: string;
    let reactionNote = `Poured ${sourceItem.name} into ${targetItem.name}.`;
    let outcomePrecipitate: string | undefined;
    let outcomeGas: string | undefined;
    let tempDelta = 0;

    if (hclMl > 0 && naohMl > 0) {
      // Acid–base neutralisation, shaded through the phenolphthalein endpoint.
      tempDelta = 3;
      const excess = naohMl - hclMl;
      if (hasIndicator) {
        if (excess >= 3) {
          newColor = '#ec4899';
          reactionNote = `Neutralisation: pH ${ph.toFixed(1)} — base in excess, phenolphthalein is MAGENTA PINK. HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l) + heat`;
        } else if (excess >= 0) {
          newColor = '#f9a8d4';
          reactionNote = `Neutralisation: pH ${ph.toFixed(1)} — the endpoint! First permanent pink tint of phenolphthalein, HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l).`;
        } else {
          newColor = '#e9edf2';
          reactionNote = `Neutralisation: pH ${ph.toFixed(1)} — still acidic, indicator colourless. Keep pouring the base, HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l).`;
        }
      } else {
        newColor = '#c9d4de';
        reactionNote = 'Neutralised clear solution — NaCl(aq) + H₂O(l) formed, exothermic heat released.';
      }
    } else if (kmno4Ml > 0 && hclMl > 0) {
      newColor = '#a8a29e';
      tempDelta = 2;
      outcomeGas = 'Cl₂(g) — KMnO₄ oxidises HCl, releasing toxic Chlorine gas (work under the fume hood!)';
      reactionNote = '2KMnO₄ + 16HCl(aq) → 2MnCl₂(aq) + 5Cl₂(g)↑ + 2KCl(aq) + 8H₂O(l) — vigorous oxidation, toxic Chlorine evolved.';
    } else if (cuso4Ml > 0 && naohMl > 0) {
      newColor = '#1d4ed8';
      outcomePrecipitate = 'Cu(OH)₂(s) — gelatinous blue precipitate';
      reactionNote = 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ (gelatinous blue precipitate) + Na₂SO₄(aq).';
    } else if (cuso4Ml > 0) {
      newColor = '#2563eb';
      reactionNote = 'Copper Sulfate solution — aqueous Cu²⁺ ions give the brilliant deep-blue colour.';
    } else if (kmno4Ml > 0) {
      newColor = '#7e22ce';
      reactionNote = 'Potassium Permanganate solution — intense violet-purple from the MnO₄⁻ ion.';
    } else if (hasIndicator && naohMl > 0) {
      newColor = '#ec4899';
      reactionNote = 'Phenolphthalein turns MAGENTA PINK in alkaline Sodium Hydroxide — the indicator base form.';
    } else if (hasIndicator) {
      newColor = '#fef08a';
      reactionNote = 'Phenolphthalein indicator added into the solution — colourless in acid, pink above pH 8.2.';
    } else {
      // Generic mixing: volume-weighted blend of the two liquids.
      let blended = mixColors(
        targetItem.contents?.color || '#38bdf8',
        sourceItem.contents?.color || '#38bdf8',
        targetVol / Math.max(1, targetVol + transferredVol)
      );
      // Distilled water dilutes/lightens the mixture.
      if (h2oMl > 0) blended = mixColors(blended, '#dff3ff', 0.3);
      newColor = blended;
      reactionNote = `${sourceItem.name} poured into ${targetItem.name}: liquids blended.`;
    }

    // 4. Apply: target receives & reacts, source is depleted.
    setTableItems((prev) =>
      prev.map((item) => {
        if (item.instanceId === targetItem.instanceId) {
          const merged: TableItem['contents'] = {
            chemicals: mergedChems,
            temperature: (targetItem.contents?.temperature ?? 22) + tempDelta,
            color: newColor,
          };
          if (hclMl > 0 && naohMl > 0) merged.ph = ph;
          if (outcomePrecipitate !== undefined) merged.precipitate = outcomePrecipitate;
          if (outcomeGas !== undefined) merged.gasEvolved = outcomeGas;
          return { ...item, contents: merged };
        }
        if (item.instanceId === sourceItem.instanceId) {
          return {
            ...item,
            contents: {
              chemicals: remainingChems,
              color: remainingChems.length > 0 ? remainingChems[remainingChems.length - 1].color : '#d5dde3',
              temperature: sourceItem.contents?.temperature ?? 22,
            },
          };
        }
        return item;
      })
    );

    setReactionMessage(reactionNote);
    speak(reactionNote);

    // Nova AI explains the reaction in real time.
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

  // Immersive headset mode (split-screen VR): hide all 2D lab chrome so the
  // experiment fills the screen when the phone sits in the headset. Only inside
  // the live 3D worlds — menu/dashboard/countdown must always stay visible.
  const immersive = splitView && (mode === 'lab' || mode === 'solar');

  // Scene rendered into each eye of the split-screen stereo view.
  const renderWorld = (eye: 'left' | 'right') => (    <>
      {world === 'solar' && mode === 'solar' ? (
        <SolarSystem
          onSelect={(id) => {
            if (id) {
              fetchNovaResponse(
                `I just selected ${id}. Briefly say the name of this celestial body and one amazing fact about it.`
              );
            }
          }}
        />
      ) : (
        <>
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
        </>
      )}
      <StereoRig eye={eye} clampMode={world === 'solar' ? 'solar' : 'lab'} />
    </>
  );

  return (
    <div className="w-full h-screen bg-gray-950 overflow-hidden font-sans select-none">
      <RemoteBridge />
      {mode === 'lab' && <LabGamepad />}
      {mode === 'lab' && !immersive && <LabControlsPanel />}
      {cameraEnabled && world === 'solar' && mode === 'solar' && <MRCamera enabled={cameraEnabled} />}
      {!immersive && (
        <UIOverlay
        mode={mode}
        countdown={countdown}
        world={world}
        onOpenLab={openLab}
        onBack={backToLabs}
        labMode={labMode}
        setLabMode={handleSetLabMode}
        selectedExperiment={selectedExperiment}
        onSelectExperiment={handleSelectExperiment}
        onStartVR={startVR}
        isListening={isListening}
        voiceError={voiceError}
        language={language}
        onLanguageChange={handleLanguageChange}
        models={availableModels}
        activeModel={activeModel}
        onModelChange={handleModelChange}
        onAskNovaGuide={handleAskNovaGuide}
        onResetExperimentEquipment={handleResetExperimentEquipment}
        />
      )}

      {mode === 'solar' && world === 'solar' && !immersive && (
        <AcademyHUD
          onExit={exitAcademy}
          isListening={isListening}
          voiceError={voiceError}
          onToggleMic={() => {
            if (isListening) stopListening();
            else startListening();
          }}
        />
      )}

      {mode === 'lab' && !immersive && (
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

      {(mode === 'lab' || mode === 'solar') && (
        <SplitVRToggle on={splitView} onToggle={toggleSplit} onRecenter={recenter} />
      )}

      {(mode === 'lab' || mode === 'solar') && !splitView && <VRButton />}

      {splitView && (mode === 'lab' || mode === 'solar') ? (
        <div className="flex flex-row w-full h-full">
          <div className="w-1/2 h-full">
            <Canvas
              dpr={[1, 1.25]}
              shadows={false}
              gl={{ powerPreference: 'default', antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
              camera={{ position: [0, 1.8, 3.8], fov: 65 }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  console.warn('WebGL context lost, preventing default crash...');
                });
              }}
            >
              <XR>{renderWorld('left')}</XR>
            </Canvas>
          </div>
          <div className="w-1/2 h-full">
            <Canvas
              dpr={[1, 1.25]}
              shadows={false}
              gl={{ powerPreference: 'default', antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
              camera={{ position: [0, 1.8, 3.8], fov: 65 }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  console.warn('WebGL context lost, preventing default crash...');
                });
              }}
            >
              <XR>{renderWorld('right')}</XR>
            </Canvas>
          </div>
        </div>
      ) : (
        <Canvas
          dpr={[1, 1.5]}
          shadows={false}
          gl={{
            powerPreference: 'default',
            antialias: true,
            alpha: true,
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
            {world === 'solar' && mode === 'solar' ? (
              <SolarSystem
                onSelect={(id) => {
                  if (id) {
                    fetchNovaResponse(
                      `I just selected ${id}. Briefly say the name of this celestial body and one amazing fact about it.`
                    );
                  }
                }}
              />
            ) : (
              <>
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
              </>
            )}

            <Controllers />
            <Hands />

            {mode === 'menu' || mode === 'dashboard' ? (
              <OrbitControls
                makeDefault
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.1}
                autoRotate
                autoRotateSpeed={0.5}
              />
            ) : mode === 'solar' ? null : (
              <>
                <DesktopController mode={mode as 'menu' | 'countdown' | 'lab'} />
                {mode === 'lab' && <XRWalk />}
              </>
            )}
          </XR>
        </Canvas>
      )}
    </div>
  );
}
