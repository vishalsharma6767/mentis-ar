import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InventoryItem, TableItem, LAB_CATALOG, totalVolume, totalCapacity, fillPercent } from '../types';
import {
  FlaskConical,
  Flame,
  Beaker,
  Sparkles,
  Plus,
  Trash2,
  Droplet,
  MessageSquare,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Info
} from 'lucide-react';

interface TableWorkbenchUIProps {
  rackCategory: 'glassware' | 'chemicals' | 'equipment' | null;
  onCloseRackMenu: () => void;
  onAddItemToTable: (catalogItem: InventoryItem) => void;
  tableItems: TableItem[];
  selectedTableItemId: string | null;
  onSelectTableItem: (id: string | null) => void;
  onRemoveTableItem: (instanceId: string) => void;
  onClearTable: () => void;
  onMixChemicals: (sourceId: string, targetId: string) => void;
  isHeating: boolean;
  onToggleHeating: () => void;
  onAskNovaAboutTable: () => void;
  reactionMessage: string | null;
  onOpenRackMenu: (category: 'glassware' | 'chemicals' | 'equipment') => void;
  immersive?: boolean;
  speak?: (text: string) => void;
}

export function TableWorkbenchUI({
  rackCategory,
  onCloseRackMenu,
  onAddItemToTable,
  tableItems,
  selectedTableItemId,
  onSelectTableItem,
  onRemoveTableItem,
  onClearTable,
  onMixChemicals,
  isHeating,
  onToggleHeating,
  onAskNovaAboutTable,
  reactionMessage,
  onOpenRackMenu,
  immersive = false,
  speak,
}: TableWorkbenchUIProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceForPour, setSourceForPour] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Filter items in catalog for selected rack category
  const activeCatalogItems = LAB_CATALOG.filter((item) => {
    const matchesCategory = rackCategory ? item.category === rackCategory : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.formula && item.formula.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedItem = tableItems.find((i) => i.instanceId === selectedTableItemId);

  // In the VR headset the phone screen only shows the 3D scene, so when a rack
  // opens we read the numbered item list aloud — the student hears exactly
  // which digit places which piece of glassware/chemical/equipment.
  useEffect(() => {
    if (!immersive || !rackCategory || !speak) return;
    const names = activeCatalogItems
      .slice(0, 6)
      .map((it, i) => `${i + 1} for ${it.name}`)
      .join(', ');
    speak(`${rackCategory} rack open. Press number. ${names}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersive, rackCategory, speak]);

  const handlePourAction = (targetInstanceId: string) => {
    if (sourceForPour && sourceForPour !== targetInstanceId) {
      onMixChemicals(sourceForPour, targetInstanceId);
      setSourceForPour(null);
    }
  };

  // Keyboard Navigation & Action Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;

      // 1. If Rack Menu is OPEN -> Press 1-9 to select item from activeCatalogItems
      if (rackCategory) {
        if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = parseInt(e.key, 10);
          if (!isNaN(num) && num >= 1 && num <= activeCatalogItems.length) {
            e.preventDefault();
            const pickedItem = activeCatalogItems[num - 1];
            onAddItemToTable(pickedItem);
            onCloseRackMenu();
            return;
          }
        }
        if (e.code === 'Escape') {
          onCloseRackMenu();
          return;
        }
      }

      // 2. Global Hotkeys when in Lab
      // Tab or Q/E or Arrow Keys -> Cycle Table Selection
      if (e.code === 'Tab' || e.code === 'KeyQ' || e.code === 'KeyE' || e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        if (tableItems.length > 0) {
          e.preventDefault();
          const currentIndex = tableItems.findIndex((i) => i.instanceId === selectedTableItemId);
          let nextIndex = 0;
          if (e.code === 'ArrowLeft' || e.code === 'KeyQ') {
            nextIndex = currentIndex <= 0 ? tableItems.length - 1 : currentIndex - 1;
          } else {
            nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tableItems.length;
          }
          onSelectTableItem(tableItems[nextIndex].instanceId);
        }
      }

      // Delete / Backspace / KeyX -> Remove Selected Table Item
      if (e.code === 'Delete' || e.code === 'Backspace' || e.code === 'KeyX') {
        if (selectedTableItemId) {
          e.preventDefault();
          onRemoveTableItem(selectedTableItemId);
          onSelectTableItem(null);
        }
      }

      // KeyP or KeyM -> Pour / Mix chemicals
      if (e.code === 'KeyP' || e.code === 'KeyM') {
        e.preventDefault();
        if (sourceForPour) {
          const targetItem = tableItems.find((i) => i.instanceId !== sourceForPour);
          if (targetItem) {
            onMixChemicals(sourceForPour, targetItem.instanceId);
            setSourceForPour(null);
          }
        } else if (selectedItem) {
          setSourceForPour(selectedItem.instanceId);
        } else if (tableItems.length >= 2) {
          onMixChemicals(tableItems[0].instanceId, tableItems[1].instanceId);
        }
      }

      // Escape -> Deselect item or close rack
      if (e.code === 'Escape') {
        if (rackCategory) {
          onCloseRackMenu();
        } else {
          onSelectTableItem(null);
          setSourceForPour(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    rackCategory,
    activeCatalogItems,
    tableItems,
    selectedTableItemId,
    sourceForPour,
    selectedItem,
    onAddItemToTable,
    onCloseRackMenu,
    onSelectTableItem,
    onRemoveTableItem,
    onMixChemicals,
  ]);

  return (
    <>
      {/* RACK ITEM SELECTION DROPDOWN MODAL */}
      <AnimatePresence>
        {rackCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] ${
                immersive ? 'max-w-4xl w-full' : 'max-w-2xl w-full'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    {rackCategory === 'glassware' && <Beaker className="w-5 h-5" />}
                    {rackCategory === 'chemicals' && <FlaskConical className="w-5 h-5" />}
                    {rackCategory === 'equipment' && <Flame className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white capitalize">
                      {rackCategory} Catalog
                    </h2>
                    <p className={`text-slate-400 ${immersive ? 'text-sm text-yellow-300/90 font-semibold' : 'text-xs'}`}>
                      Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-blue-300 rounded font-mono font-bold">1-9</kbd> to place item onto Central Workstation
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCloseRackMenu}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search Bar */}
              {!immersive && (
                <div className="my-4 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chemicals or apparatus (e.g. HCl, Beaker, Burner)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Items Grid with Number Badges */}
              <div className={`flex-1 overflow-y-auto pr-2 grid gap-3 my-2 ${immersive ? 'grid-cols-1 sm:grid-cols-2 text-lg' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {activeCatalogItems.map((catalogItem, idx) => (
                  <div
                    key={catalogItem.id}
                    onClick={() => {
                      onAddItemToTable(catalogItem);
                      onCloseRackMenu();
                    }}
                    className={`p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-blue-500/80 hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between group relative ${immersive ? 'py-5' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Number Key Trigger Badge */}
                      {idx < 9 && (
                        <div className={`rounded-md bg-blue-600/30 border border-blue-400/50 text-blue-300 font-mono font-bold flex items-center justify-center shrink-0 ${immersive ? 'w-9 h-9 text-lg' : 'w-6 h-6 text-xs'}`}>
                          {idx + 1}
                        </div>
                      )}

                      <div
                        className={`rounded-lg flex items-center justify-center text-white font-bold shrink-0 ${immersive ? 'w-12 h-12 text-sm' : 'w-8 h-8 text-xs'}`}
                        style={{ backgroundColor: catalogItem.color || '#3b82f6' }}
                      >
                        {catalogItem.formula || catalogItem.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={`font-bold text-white group-hover:text-blue-400 transition-colors ${immersive ? 'text-lg' : 'text-sm'}`}>
                          {catalogItem.name}
                        </div>
                        <div className={`text-slate-400 capitalize ${immersive ? 'text-sm' : 'text-[10px]'}`}>
                          {catalogItem.category} • {catalogItem.type}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP DIRECTORY BAR FOR QUICK RACK SELECTION (hidden in the VR headset) */}
      {!immersive && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-xl px-4 py-2 rounded-full shadow-xl">
        <button
          onClick={() => onOpenRackMenu('glassware')}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1.5"
        >
          <span className="bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded text-[10px] font-mono">1</span>
          <span className="hidden min-[460px]:inline">Glassware Rack</span>
        </button>

        <button
          onClick={() => onOpenRackMenu('chemicals')}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5"
        >
          <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-mono">2</span>
          <span className="hidden min-[460px]:inline">Chemical Reagents</span>
        </button>

        <button
          onClick={() => onOpenRackMenu('equipment')}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-500/30 hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1.5"
        >
          <span className="bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded text-[10px] font-mono">3</span>
          <span className="hidden min-[460px]:inline">Fire & Tools</span>
        </button>
      </div>
      )}

      {/* WORKBENCH BOTTOM CONTROL PANEL (hidden in the VR headset) */}
      {!immersive && (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2 max-w-2xl w-full px-3">
        {/* Chemical Reaction Banner Toast */}
        <AnimatePresence>
          {reactionMessage && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="bg-blue-600/90 border border-blue-400/50 text-white px-5 py-2 rounded-full backdrop-blur-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
              <span>{reactionMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPACT SMALL DOCK BAR WHEN MINIMIZED */}
        {isMinimized ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900/95 border border-slate-800/90 backdrop-blur-xl rounded-2xl px-4 py-2 shadow-2xl flex items-center justify-between gap-3 w-auto"
          >
            {/* Quick Selected Item Badge */}
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-400 shrink-0" />
              {selectedItem ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <span>{selectedItem.name}</span>
                  {selectedItem.contents?.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20"
                      style={{ backgroundColor: selectedItem.contents.color }}
                    />
                  )}
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  {tableItems.length} items on table
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-700/80 my-auto" />

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (sourceForPour) {
                    const targetItem = tableItems.find((i) => i.instanceId !== sourceForPour);
                    if (targetItem) {
                      onMixChemicals(sourceForPour, targetItem.instanceId);
                      setSourceForPour(null);
                    }
                  } else if (selectedItem) {
                    setSourceForPour(selectedItem.instanceId);
                  } else if (tableItems.length >= 2) {
                    onMixChemicals(tableItems[0].instanceId, tableItems[1].instanceId);
                  }
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                title="Pour / Mix Reaction (P)"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>Pour (P)</span>
              </button>

              <button
                onClick={onToggleHeating}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  isHeating
                    ? 'bg-red-600 text-white border-red-400 animate-pulse'
                    : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/30'
                }`}
                title="Burner Heat (F)"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{isHeating ? 'ON' : 'Heat (F)'}</span>
              </button>

              <button
                onClick={onAskNovaAboutTable}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                title="Ask AI (N)"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI (N)</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700/80 my-auto" />

            {/* Expand Toggle Button */}
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold px-2"
              title="Expand Workbench Info"
            >
              <span>Expand</span>
              <ChevronUp className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          /* EXPANDED WORKBENCH DOCK WITH COLLAPSE BUTTON */
          <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl w-full flex flex-col gap-2 relative">
            {/* Top Bar: Table Items Quick Selector Pills + Minimize Button */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1 overflow-x-auto max-w-sm py-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <FlaskConical className="w-3 h-3 text-sky-400" />
                  Table ({tableItems.length}):
                </span>

                {tableItems.map((item) => {
                  const isSelected = item.instanceId === selectedTableItemId;
                  const isSource = sourceForPour === item.instanceId;

                  return (
                    <button
                      key={item.instanceId}
                      onClick={() => onSelectTableItem(isSelected ? null : item.instanceId)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                          : isSource
                          ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <span>{item.name.split(' ')[0]}</span>
                      {item.contents?.color && (
                        <span
                          className="w-2 h-2 rounded-full border border-white/20"
                          style={{ backgroundColor: item.contents.color }}
                        />
                      )}
                    </button>
                  );
                })}

                {tableItems.length === 0 && (
                  <span className="text-xs text-slate-500 italic">
                    Table empty. Click [1] Glassware, [2] Chemicals, or [3] Tools above.
                  </span>
                )}
              </div>

              {/* Action Buttons & Minimize Toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                {tableItems.length > 0 && (
                  <button
                    onClick={onClearTable}
                    className="px-2 py-1 rounded-xl text-[11px] font-bold bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all flex items-center gap-1"
                    title="Clear Table (C)"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear (C)</span>
                  </button>
                )}

                {/* Minimize Toggle Button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold px-2"
                  title="Minimize Workbench Tab"
                >
                  <span>Compact</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Section: Selected Item Detail Inspection Card */}
            {selectedItem ? (
              <div className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2.5 shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
                {/* Container Swatch & Name */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl border border-white/20 shadow-md flex items-center justify-center text-white font-bold relative overflow-hidden shrink-0"
                    style={{ backgroundColor: selectedItem.contents?.color || '#334155' }}
                  >
                    <FlaskConical className="w-4 h-4 text-white drop-shadow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-white tracking-wide">{selectedItem.name}</h3>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-[9px] font-bold text-sky-300 uppercase">
                        {selectedItem.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Thermometer className="w-3 h-3 text-orange-400" />
                        {((selectedItem.contents?.temperature ?? 22)).toFixed(1)}°C
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Droplet className="w-3 h-3 text-sky-400" />
                        pH {selectedItem.contents?.ph !== undefined ? selectedItem.contents.ph.toFixed(1) : '7.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chemical Ingredients Breakdown */}
                <div className="flex-1 w-full bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                    <span>Chemical Composition ({selectedItem.contents?.chemicals?.length || 0})</span>
                    <span className="text-[9px] text-sky-400 font-mono">
                      Vol: {totalVolume(selectedItem)} / {totalCapacity(selectedItem)} mL
                    </span>
                  </div>

                  {/* Realistic liquid fill level bar */}
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-700/70 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round(fillPercent(selectedItem) * 100)}%`,
                          background: selectedItem.contents?.color || '#38bdf8',
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      {Math.round(fillPercent(selectedItem) * 100)}%
                    </span>
                  </div>

                  {selectedItem.contents?.chemicals && selectedItem.contents.chemicals.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.contents.chemicals.map((chem, idx) => (
                        <div key={idx} className="bg-slate-800/90 border border-slate-700/80 rounded-lg px-2 py-0.5 text-[11px] flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: chem.color || '#3b82f6' }}
                          />
                          <span className="font-bold text-slate-200">{chem.name}</span>
                          {chem.formula && <span className="text-[9px] text-sky-400 font-mono">({chem.formula})</span>}
                          <span className="font-mono text-emerald-400 font-bold text-[10px] ml-1">{chem.amount} mL</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Clean empty container. Ready for chemical reagents!
                    </div>
                  )}

                  {/* Reaction Observations */}
                  {(selectedItem.contents?.precipitate || selectedItem.contents?.gasEvolved) && (
                    <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-amber-300 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {selectedItem.contents?.precipitate && `Precipitate: ${selectedItem.contents.precipitate}`}
                        {selectedItem.contents?.precipitate && selectedItem.contents?.gasEvolved && ' • '}
                        {selectedItem.contents?.gasEvolved && `Gas Evolved: ${selectedItem.contents.gasEvolved}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : tableItems.length > 0 ? (
              <div className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Click any container pill above to inspect temperature, pH, and chemical components.</span>
              </div>
            ) : null}

            {/* Bottom Actions Toolbar */}
            <div className="flex flex-col gap-1.5">
              {/* Prominent Pour Source & Target Selection Banner */}
              {sourceForPour && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-950/90 border border-amber-400 p-2 rounded-xl shadow-xl flex items-center justify-between gap-2 text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase">
                      POURING FROM
                    </span>
                    <span className="text-xs font-bold text-amber-200">
                      <span className="text-amber-400 underline font-black">{tableItems.find((i) => i.instanceId === sourceForPour)?.name}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-amber-300">SELECT TARGET:</span>
                    {tableItems
                      .filter((i) => i.instanceId !== sourceForPour)
                      .map((targetItem) => (
                        <button
                          key={targetItem.instanceId}
                          onClick={() => handlePourAction(targetItem.instanceId)}
                          className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-md flex items-center gap-1 animate-pulse"
                        >
                          <Droplet className="w-3 h-3" />
                          <span>{targetItem.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    <button
                      onClick={() => setSourceForPour(null)}
                      className="px-1.5 py-0.5 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Pour Liquid Action Button */}
                  <button
                    onClick={() => {
                      if (sourceForPour) {
                        const targetItem = tableItems.find((i) => i.instanceId !== sourceForPour);
                        if (targetItem) {
                          onMixChemicals(sourceForPour, targetItem.instanceId);
                          setSourceForPour(null);
                        }
                      } else if (selectedItem) {
                        setSourceForPour(selectedItem.instanceId);
                      } else if (tableItems.length >= 2) {
                        onMixChemicals(tableItems[0].instanceId, tableItems[1].instanceId);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                      sourceForPour
                        ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                        : 'bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title="Pour / Mix Reaction (Hotkey: P)"
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>{sourceForPour ? 'Select Target...' : 'Pour / Mix (P)'}</span>
                  </button>

                  {/* Heating Action */}
                  <button
                    onClick={onToggleHeating}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                      isHeating
                        ? 'bg-red-600 text-white border-red-400 animate-pulse'
                        : 'bg-slate-800 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
                    }`}
                    title="Ignite Bunsen Burner (Hotkey: F)"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{isHeating ? 'Burner ON (F)' : 'Heat (F)'}</span>
                  </button>

                  {/* Remove Selected Item Button */}
                  {selectedTableItemId && (
                    <button
                      onClick={() => {
                        onRemoveTableItem(selectedTableItemId);
                        onSelectTableItem(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-600 hover:text-white transition-all flex items-center gap-1"
                      title="Remove Selected Item (Hotkey: X)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove (X)</span>
                    </button>
                  )}
                </div>

                {/* Ask Nova Voice AI Button */}
                <button
                  onClick={onAskNovaAboutTable}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-1 shadow border border-blue-400/30"
                  title="Ask Nova Voice Assistant (Hotkey: N)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask AI (N)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
}

