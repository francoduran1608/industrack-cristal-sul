import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { SupplyType, Checklist } from '../types';
import { Check, X, Fuel, Gauge, AlertCircle, Plus, Archive, BarChart, TrendingUp, Trash2, Edit3, AlertTriangle, FileText } from 'lucide-react';

export const Abastecimento: React.FC = () => {
  const { 
    movements, 
    supplies, 
    dieselPurchases, 
    initialDieselStock, 
    dieselTankCapacity = 15000,
    arlaPurchases = [],
    initialArlaStock = 1000,
    arlaTankCapacity = 3000,
    addSupply, 
    addDieselPurchase,
    addArlaPurchase,
    customChecklistItems = [],
    addCustomChecklistItem,
    removeCustomChecklistItem,
    currentUser,
    updateMovementDetails
  } = useStore();
  
  // Requirement: Posto interno operates exclusively for own company fleet ('proprio')
  const alreadyFueledMovementIds = new Set(supplies.map(s => s.movementId));

  // Eligible own-fleet vehicles in yard that have NOT been fueled yet during this entry
  const eligibleVehicles = movements.filter(
    m => m.status !== 'saida' && m.ownerType === 'proprio' && !alreadyFueledMovementIds.has(m.id) && (m.unit || 'matriz') === (currentUser?.unit || 'matriz')
  );

  // Own-fleet vehicles currently in the yard that ALREADY fueled
  const alreadyFueledActiveVehicles = movements.filter(
    m => m.status !== 'saida' && m.ownerType === 'proprio' && alreadyFueledMovementIds.has(m.id) && (m.unit || 'matriz') === (currentUser?.unit || 'matriz')
  );

  // All own-fleet vehicles currently in the yard (for checklist management)
  const yardProprioMovements = movements.filter(
    m => m.status !== 'saida' && m.ownerType === 'proprio' && (m.unit || 'matriz') === (currentUser?.unit || 'matriz')
  );

  // Fueling form states
  const [vehicleId, setVehicleId] = useState('');
  const [supplyType, setSupplyType] = useState<SupplyType>('diesel');
  const [amount, setAmount] = useState<number | ''>('');
  const [odometer, setOdometer] = useState<number | ''>('');
  const [supplyPrice, setSupplyPrice] = useState<number | ''>('');

  // Checklist states (to be filled during fueling)
  const [checklistBrakes, setChecklistBrakes] = useState(true);
  const [checklistTires, setChecklistTires] = useState(true);
  const [checklistLights, setChecklistLights] = useState(true);
  const [checklistLeaks, setChecklistLeaks] = useState(false); // false signifies NO leaks
  const [checklistPassed, setChecklistPassed] = useState(true);
  const [checklistNotes, setChecklistNotes] = useState('');

  // Active yard inspection editing states
  const [editingInspectionMovement, setEditingInspectionMovement] = useState<any | null>(null);
  const [editBrakes, setEditBrakes] = useState(true);
  const [editTires, setEditTires] = useState(true);
  const [editLights, setEditLights] = useState(true);
  const [editLeaks, setEditLeaks] = useState(false);
  const [editPassed, setEditPassed] = useState(true);
  const [editNotes, setEditNotes] = useState('');
  const [editCustomChecked, setEditCustomChecked] = useState<Record<string, boolean>>({});
  const [editEvaluator, setEditEvaluator] = useState('');

  // Custom added items state for the current fueling operation
  const [customCheckState, setCustomCheckState] = useState<Record<string, boolean>>({});
  const [newItemText, setNewItemText] = useState('');

  // Pending items list to allow registering multiple products/services at once
  const [pendingItems, setPendingItems] = useState<{ id: string; type: SupplyType; amount: number; price?: number }[]>([]);

  // Diesel Purchase form states
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [purchaseProduct, setPurchaseProduct] = useState<'diesel' | 'arla'>('diesel');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  // UI toast notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isFilial = currentUser?.unit === 'filial';
  const selectedVehicle = movements.find(m => m.id === vehicleId);
  const isOdometerRequired = selectedVehicle && !selectedVehicle.odometer;

  // Auto-fill odometer when a vehicle is picked
  useEffect(() => {
    if (vehicleId) {
      const vehicle = movements.find(m => m.id === vehicleId);
      if (vehicle && vehicle.odometer) {
        setOdometer(vehicle.odometer);
      } else {
        setOdometer('');
      }
    } else {
      setOdometer('');
    }
  }, [vehicleId]);

  // Sync customChecklistItems to customCheckState when custom items or selected vehicle ID shifts
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    customChecklistItems.forEach(item => {
      initial[item] = true; // default to passed/clean
    });
    setCustomCheckState(initial);
  }, [customChecklistItems, vehicleId]);

  // Calculations for Diesel stockpile levels
  const totalDieselSupplied = supplies
    .filter(s => s.type === 'diesel' && s.stationType !== 'externo' && (s.unit || 'matriz') === (currentUser?.unit || 'matriz'))
    .reduce((sum, s) => sum + s.amount, 0);

  const totalDieselPurchased = (dieselPurchases || [])
    .filter(p => (p.unit || 'matriz') === (currentUser?.unit || 'matriz'))
    .reduce((sum, p) => sum + p.amount, 0);

  const currentStock = (initialDieselStock !== undefined ? initialDieselStock : 5000) + totalDieselPurchased - totalDieselSupplied;
  const percentageStock = Math.min(100, Math.max(0, Math.round((currentStock / dieselTankCapacity) * 100)));

  // Calculations for Arla stockpile levels
  const totalArlaSupplied = supplies
    .filter(s => s.type === 'arla' && s.stationType !== 'externo' && (s.unit || 'matriz') === (currentUser?.unit || 'matriz'))
    .reduce((sum, s) => sum + s.amount, 0);

  const totalArlaPurchased = (arlaPurchases || [])
    .filter(p => (p.unit || 'matriz') === (currentUser?.unit || 'matriz'))
    .reduce((sum, p) => sum + p.amount, 0);

  const currentArlaStock = (initialArlaStock !== undefined ? initialArlaStock : 1000) + totalArlaPurchased - totalArlaSupplied;
  const percentageArlaStock = Math.min(100, Math.max(0, Math.round((currentArlaStock / arlaTankCapacity) * 100)));

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseAmount || Number(purchaseAmount) <= 0) {
      showToast('error', 'Favor especificar uma quantidade válida de compra.');
      return;
    }

    if (purchaseProduct === 'diesel') {
      addDieselPurchase({
        id: crypto.randomUUID(),
        amount: Number(purchaseAmount),
        supplier: purchaseSupplier.trim() || 'Fornecedor Padrão',
        pricePerLiter: purchasePrice ? Number(purchasePrice) : undefined,
        timestamp: new Date().toISOString(),
        registeredBy: currentUser?.name || 'Sistema'
      });
      showToast('success', 'Entrada de diesel adicionada ao estoque com sucesso!');
    } else {
      addArlaPurchase({
        id: crypto.randomUUID(),
        amount: Number(purchaseAmount),
        supplier: purchaseSupplier.trim() || 'Fornecedor Padrão',
        pricePerLiter: purchasePrice ? Number(purchasePrice) : undefined,
        timestamp: new Date().toISOString(),
        registeredBy: currentUser?.name || 'Sistema'
      });
      showToast('success', 'Entrada de ARLA 32 adicionada ao estoque com sucesso!');
    }

    setPurchaseAmount('');
    setPurchaseSupplier('');
    setPurchasePrice('');
    setShowPurchaseForm(false);
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newItemText.trim();
    if (!clean) return;
    if (customChecklistItems.some(i => i.toLowerCase() === clean.toLowerCase())) {
      showToast('error', `O item "${clean}" já existe na lista de inspeção.`);
      return;
    }
    addCustomChecklistItem(clean);
    setNewItemText('');
    showToast('success', `Item "${clean}" adicionado à vistoria!`);
  };

  const startEditingInspection = (m: any) => {
    setEditingInspectionMovement(m);
    setEditBrakes(m.checklist?.brakes ?? true);
    setEditTires(m.checklist?.tires ?? true);
    setEditLights(m.checklist?.lights ?? true);
    setEditLeaks(m.checklist?.leaks ?? false);
    setEditPassed(m.checklist?.passed ?? true);
    setEditNotes(m.checklist?.notes ?? '');
    setEditEvaluator(m.checklistEvaluator || currentUser?.name || 'Sistema');
    
    const initialCustom: Record<string, boolean> = {};
    customChecklistItems.forEach(item => {
      initialCustom[item] = true;
    });
    if (m.checklist?.customItems) {
      Object.entries(m.checklist.customItems).forEach(([k, v]) => {
        initialCustom[k] = !!v;
      });
    }
    setEditCustomChecked(initialCustom);
  };

  const handleSaveInspectionEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspectionMovement) return;

    const updatedChecklist: Checklist = {
      brakes: editBrakes,
      tires: editTires,
      lights: editLights,
      leaks: editLeaks,
      passed: editPassed,
      notes: editNotes.trim() !== '' ? editNotes.trim() : undefined,
      customItems: editCustomChecked
    };

    updateMovementDetails(editingInspectionMovement.id, {
      checklist: updatedChecklist,
      checklistEvaluator: editEvaluator.trim() || currentUser?.name || 'Sistema'
    });

    setEditingInspectionMovement(null);
    showToast('success', `Vistoria / Inspeção de ${editingInspectionMovement.plate} alterada com sucesso!`);
  };

  const handleRemoveItem = (item: string) => {
    removeCustomChecklistItem(item);
    showToast('success', `Item "${item}" removido.`);
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || (isOdometerRequired && odometer === '')) {
      showToast('error', 'Favor preencher todos os campos obrigatórios do atendimento (incluindo o odômetro pois este não foi informado na entrada).');
      return;
    }

    if (pendingItems.length === 0) {
      showToast('error', 'Favor adicionar ao menos um produto ou serviço à lista de atendimento antes de registrar.');
      return;
    }

    const vehicle = movements.find(m => m.id === vehicleId);
    if (!vehicle) return;

    // Strict constraint check: double fueling protection
    if (alreadyFueledMovementIds.has(vehicle.id)) {
      showToast('error', 'Este veículo já possui um abastecimento nesta estada. Registre sua saída e uma nova entrada antes de abastecer novamente.');
      return;
    }

    // Fuel constraint checking on totals of selected items
    const requestedDiesel = pendingItems
      .filter(item => item.type === 'diesel')
      .reduce((sum, item) => sum + item.amount, 0);

    const requestedArla = pendingItems
      .filter(item => item.type === 'arla')
      .reduce((sum, item) => sum + item.amount, 0);

    if (!isFilial && requestedDiesel > currentStock) {
      showToast('error', `Estoque insuficiente de diesel! Solicitado ${requestedDiesel.toLocaleString('pt-BR')}L, mas temos apenas ${currentStock.toLocaleString('pt-BR')}L em estoque.`);
      return;
    }

    if (!isFilial && requestedArla > currentArlaStock) {
      showToast('error', `Estoque insuficiente de ARLA! Solicitado ${requestedArla.toLocaleString('pt-BR')}L, mas temos apenas ${currentArlaStock.toLocaleString('pt-BR')}L em estoque.`);
      return;
    }

    // Assemble checklist state validated on fueling
    const updatedChecklist: Checklist = {
      brakes: checklistBrakes,
      tires: checklistTires,
      lights: checklistLights,
      leaks: checklistLeaks,
      passed: checklistPassed,
      notes: checklistNotes.trim() !== '' ? checklistNotes.trim() : undefined,
      customItems: customCheckState
    };

    // Save each item
    pendingItems.forEach(item => {
      addSupply({
        id: crypto.randomUUID(),
        movementId: vehicle.id,
        plate: vehicle.plate,
        type: item.type,
        amount: item.amount,
        odometer: odometer !== '' ? Number(odometer) : (vehicle.odometer || 0),
        timestamp: new Date().toISOString(),
        operator: currentUser?.name || 'Sistema',
        stationType: isFilial ? 'externo' : 'interno',
        price: item.price
      }, updatedChecklist, currentUser?.name || 'Sistema');
    });

    // Reset fields
    setVehicleId('');
    setAmount('');
    setOdometer('');
    setSupplyPrice('');
    setPendingItems([]);
    setChecklistBrakes(true);
    setChecklistTires(true);
    setChecklistLights(true);
    setChecklistLeaks(false);
    setChecklistPassed(true);
    setChecklistNotes('');

    showToast('success', `Serviços (${pendingItems.length} itens) e Checklist de Vistoria salvos com sucesso para ${vehicle.plate}.`);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 relative pb-10">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="p-1 rounded-full bg-white shadow-sm">
            <Check size={16} className={notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
          </div>
          <span className="text-xs font-bold uppercase tracking-tight">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stock Levels Dashboard Cards */}
      {isFilial ? (
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-5 flex items-start gap-4 shadow-xs mt-4 animate-in fade-in duration-300">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <Fuel size={20} />
          </div>
          <div className="space-y-1.5 flex-1 select-none">
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest leading-none">Posto Externo Conveniado (Unidade Filial)</h3>
            <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
              Esta filial não possui base de abastecimento interno de fluidos ou reservatórios físicos de Diesel e ARLA 32. 
              Todos os abastecimentos e vistorias de segurança de novos veículos ocorrem externamente em postos credenciados parceiros.
            </p>
            <p className="text-[10px] text-slate-400 font-semibold italic">
              * O registro do volume, do odômetro e do checklist operacional nesta área serve exclusivamente para controle do painel de monitoramento, conciliação de faturas externas, médias de consumo e auditoria, sem subtrair do estoque físico centralizado da empresa Matriz.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Diesel Tank */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Combustível — Diesel S10</span>
                  <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight flex items-baseline gap-1">
                    {currentStock.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="text-xs font-semibold text-slate-400">Litros</span>
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                  <Archive size={16} />
                </div>
              </div>

              {/* Progress stock bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                  <span>Nível do Reservatório Principal (Cap: {(dieselTankCapacity/1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K L)</span>
                  <span className={currentStock < 1000 ? 'text-rose-600 animate-pulse' : 'text-slate-650'}>
                    {percentageStock}% ({currentStock < 1000 ? 'ESTOQUE CRÍTICO' : 'NORMAL'})
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 flex">
                  <div 
                    style={{ width: `${percentageStock}%` }} 
                    className={`h-full transition-all duration-500 ${
                      currentStock < 1000 
                        ? 'bg-rose-500 animate-pulse' 
                        : currentStock < 2500 
                          ? 'bg-amber-400' 
                          : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Quick stats inline */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                <div>
                  <span className="text-slate-400 block leading-tight">Total Comprado</span>
                  <span className="font-bold text-slate-705 font-mono">{totalDieselPurchased.toLocaleString('pt-BR')} L</span>
                </div>
                <div>
                  <span className="text-slate-400 block leading-tight">Total Consumido</span>
                  <span className="font-bold text-slate-705 font-mono">{totalDieselSupplied.toLocaleString('pt-BR')} L</span>
                </div>
              </div>

              {currentStock < 1000 && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[10px] p-2 rounded flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Nível crítico abaixo de 1.000L. Solicitar reabastecimento imediato!</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-3 text-[10px] text-slate-500">
              <span>Frota Própria Ativa</span>
              <button 
                type="button"
                onClick={() => {
                  setPurchaseProduct('diesel');
                  setShowPurchaseForm(true);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-wide flex items-center gap-0.5"
              >
                <Plus size={12} /> Compra Diesel
              </button>
            </div>
          </div>

          {/* ARLA Tank */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reagente — ARLA 32</span>
                  <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight flex items-baseline gap-1">
                    {currentArlaStock.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="text-xs font-semibold text-slate-400">Litros</span>
                  </h3>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-650 rounded">
                  <Fuel size={16} />
                </div>
              </div>

              {/* Progress stock bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                  <span>Nível do Reservatório Arla (Cap: {(arlaTankCapacity/1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K L)</span>
                  <span className={currentArlaStock < 200 ? 'text-rose-600 animate-pulse' : 'text-slate-650'}>
                    {percentageArlaStock}% ({currentArlaStock < 200 ? 'ESTOQUE CRÍTICO' : 'NORMAL'})
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 flex">
                  <div 
                    style={{ width: `${percentageArlaStock}%` }} 
                    className={`h-full transition-all duration-500 ${
                      currentArlaStock < 200 
                        ? 'bg-rose-500 animate-pulse' 
                        : currentArlaStock < 500 
                          ? 'bg-amber-400' 
                          : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Quick stats inline */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                <div>
                  <span className="text-slate-400 block leading-tight">Total Comprado</span>
                  <span className="font-bold text-slate-705 font-mono">{totalArlaPurchased.toLocaleString('pt-BR')} L</span>
                </div>
                <div>
                  <span className="text-slate-400 block leading-tight">Total Consumido</span>
                  <span className="font-bold text-slate-705 font-mono">{totalArlaSupplied.toLocaleString('pt-BR')} L</span>
                </div>
              </div>

              {currentArlaStock < 200 && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[10px] p-2 rounded flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Nível crítico abaixo de 200L. Solicitar reabastecimento de ARLA!</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-3 text-[10px] text-slate-500">
              <span>Frota Própria Ativa</span>
              <button 
                type="button"
                onClick={() => {
                  setPurchaseProduct('arla');
                  setShowPurchaseForm(true);
                }}
                className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 hover:underline uppercase tracking-wide flex items-center gap-0.5"
              >
                <Plus size={12} /> Compra Arla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Purchase Form for Diesel / Arla */}
      {showPurchaseForm && (
        <section className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm w-full max-w-2xl mx-auto p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-blue-600" /> Registrar Compra / Nova Carga de Fluidos
            </h3>
            <button onClick={() => setShowPurchaseForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handlePurchaseSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Insumo / Produto</label>
                <select
                  value={purchaseProduct}
                  onChange={e => setPurchaseProduct(e.target.value as 'diesel' | 'arla')}
                  className="w-full bg-white border border-slate-300 rounded text-xs p-2 outline-none focus:border-blue-500 font-bold text-slate-700"
                >
                  <option value="diesel">Diesel S10</option>
                  <option value="arla">ARLA 32</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Volume Comprado (L)</label>
                <input 
                  required
                  type="number" 
                  placeholder="Ex: 2500" 
                  value={purchaseAmount} 
                  onChange={e => setPurchaseAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded text-xs p-2 outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Fornecedor / Distribuidor</label>
                <input 
                  type="text" 
                  placeholder="Ex: Ipiranga / BR" 
                  value={purchaseSupplier} 
                  onChange={e => setPurchaseSupplier(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs p-2 outline-none focus:border-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Preço p/ Litro (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 5.89" 
                  value={purchasePrice} 
                  onChange={e => setPurchasePrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded text-xs p-2 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
              <button 
                type="button" 
                onClick={() => setShowPurchaseForm(false)} 
                className="px-3 py-1.5 text-xs text-slate-500 uppercase font-bold tracking-wider hover:text-slate-700"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Adicionar ao Estoque
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Main Refuel + Checklist Form */}
      <section className="bg-white mx-auto border border-slate-200 rounded-lg shadow-sm flex flex-col w-full max-w-2xl">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
            <Fuel size={14} className="text-blue-500" /> Registro de Atendimento e Vistoria de Segurança
          </h2>
        </div>

        <div className="p-5">
          <form onSubmit={handleFuelSubmit} className="space-y-6">
            {eligibleVehicles.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 text-center rounded flex flex-col items-center justify-center gap-2">
                <AlertCircle className="text-slate-400" size={24} />
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Nenhum veículo próprio elegível p/ novos serviços
                </div>
                <p className="text-[11px] text-slate-400">O Posto Interno atende apenas veículos próprios sem serviço prévio pendentes de saída.</p>
                {alreadyFueledActiveVehicles.length > 0 && (
                  <div className="mt-3 text-[10px] text-slate-500 bg-amber-50 p-2.5 border border-amber-200 rounded text-left max-w-md">
                    <strong className="text-amber-800 uppercase block mb-1">Veículos já abastecidos nesta estada (Aguardando Saída):</strong>
                    <div className="flex flex-wrap gap-1.5">
                      {alreadyFueledActiveVehicles.map(v => (
                        <span key={v.id} className="bg-white border border-amber-200 px-2 py-0.5 rounded font-mono font-bold text-amber-700 text-xs shadow-xs">
                          {v.plate}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Operational block */}
                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Operação de Serviços de Base</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Veículo Autuado (Frota Própria no Pátio)</label>
                      <select 
                        required 
                        value={vehicleId} 
                        onChange={e => setVehicleId(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-medium text-slate-700"
                      >
                        <option value="" disabled>Selecione um veículo próprio para atendimento...</option>
                        {eligibleVehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.plate} ({v.vehicleType.toUpperCase()}) - Condutor: {v.driver}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Add products and services panel */}
                    <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">
                        Adicionar Produto ou Serviço ao Atendimento
                      </span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Insumo / Operação</label>
                          <select 
                            value={supplyType} 
                            onChange={e => {
                              setSupplyType(e.target.value as SupplyType);
                              setAmount('');
                              setSupplyPrice('');
                            }} 
                            className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs font-semibold text-slate-700 h-[34px]"
                          >
                            <option value="diesel">Diesel S10/S500</option>
                            <option value="arla">Arla 32</option>
                            <option value="lubrificacao">Lubrificação</option>
                            <option value="calibracao">Calibragem</option>
                          </select>
                        </div>

                        {['diesel', 'arla'].includes(supplyType) ? (
                          <>
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Volume (Litros)
                              </label>
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0.1"
                                placeholder="Ex: 20" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value !== '' ? Number(e.target.value) : '')} 
                                className="w-full font-mono bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs text-slate-800 h-[34px]" 
                              />
                            </div>
                            
                            {isFilial ? (
                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                  Valor Pago (R$)
                                </label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  min="0.01"
                                  placeholder="Ex: 125.50" 
                                  value={supplyPrice} 
                                  onChange={e => setSupplyPrice(e.target.value !== '' ? Number(e.target.value) : '')} 
                                  className="w-full font-mono bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs text-slate-800 h-[34px]" 
                                />
                              </div>
                            ) : (
                              <div className="sm:col-span-1 flex items-center justify-center p-2 bg-slate-100 rounded text-[10px] text-slate-500 font-bold uppercase tracking-wider h-[34px]">
                                Posto Próprio / Interno
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="sm:col-span-2 flex items-center p-2.5 bg-slate-150/60 rounded border border-slate-200/50 text-[10px] text-slate-600 font-semibold uppercase tracking-wider leading-tight h-[34px]">
                            <Check size={14} className="text-emerald-500 mr-1.5" />
                            Serviço de {supplyType === 'lubrificacao' ? 'Lubrificação' : 'Calibragem'} selecionado. Não requer volume.
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            // Validate
                            let parsedAmount = 0;
                            if (['diesel', 'arla'].includes(supplyType)) {
                              if (!amount || Number(amount) <= 0) {
                                showToast('error', 'Por favor, informe uma quantidade/volume válido.');
                                return;
                              }
                              parsedAmount = Number(amount);
                            }

                            let parsedPrice: number | undefined = undefined;
                            if (isFilial && ['diesel', 'arla'].includes(supplyType)) {
                              if (!supplyPrice || Number(supplyPrice) <= 0) {
                                showToast('error', 'Por favor, informe o valor pago.');
                                return;
                              }
                              parsedPrice = Number(supplyPrice);
                            }

                            if (pendingItems.some(i => i.type === supplyType)) {
                              showToast('error', 'Este item já foi adicionado ao atendimento.');
                              return;
                            }

                            setPendingItems([
                              ...pendingItems,
                              {
                                id: crypto.randomUUID(),
                                type: supplyType,
                                amount: parsedAmount,
                                price: parsedPrice
                              }
                            ]);
                            // Reset inputs
                            setAmount('');
                            setSupplyPrice('');
                            showToast('success', 'Produto ou serviço adicionado ao atendimento!');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm cursor-pointer h-[32px]"
                        >
                          <Plus size={14} /> Adicionar à Lista
                        </button>
                      </div>

                      {/* Display pending items list */}
                      <div className="border-t border-slate-200/65 pt-2">
                        <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">
                          Lista de Insumos & Serviços Selecionados ({pendingItems.length})
                        </label>
                        
                        {pendingItems.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-[11px] font-semibold italic uppercase bg-white border border-dashed border-slate-200 rounded-lg">
                            Nenhum item adicionado à lista. Selecione os produtos acima.
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3">Produto/Serviço</th>
                                  <th className="py-2 px-3 text-right">Volume</th>
                                  {isFilial && <th className="py-2 px-3 text-right">Valor Pago</th>}
                                  <th className="py-2 px-3 text-center">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {pendingItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50 font-medium">
                                    <td className="py-2 px-3 flex items-center">
                                      {item.type === 'diesel' && (
                                        <span className="font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                          Diesel S10/S500
                                        </span>
                                      )}
                                      {item.type === 'arla' && (
                                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                          Arla 32
                                        </span>
                                      )}
                                      {item.type === 'lubrificacao' && (
                                        <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                          Lubrificação
                                        </span>
                                      )}
                                      {item.type === 'calibracao' && (
                                        <span className="font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                          Calibragem
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                      {['diesel', 'arla'].includes(item.type) ? `${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L` : '—'}
                                    </td>
                                    {isFilial && (
                                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                                        {item.price ? `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                      </td>
                                    )}
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => setPendingItems(pendingItems.filter(i => i.id !== item.id))}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Remover"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5 leading-none">
                            <Gauge size={13} className="text-blue-500" /> KM do Odômetro Atual {isOdometerRequired && <span className="text-red-550 font-extrabold text-xs">*</span>}
                          </label>
                          <span className="text-[9px] text-slate-400 block font-medium">
                            {isOdometerRequired 
                              ? 'Obrigatório: digite o KM do veículo, pois este não foi informado na entrada.' 
                              : 'Opcional: usando o KM de entrada padrão.'}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 items-center w-full justify-end max-w-[240px]">
                          <input 
                            required={!!isOdometerRequired} 
                            type="number" 
                            min="1"
                            placeholder={isOdometerRequired ? "Obrigatório" : "Ex: 154120"} 
                            value={odometer} 
                            onChange={e => setOdometer(e.target.value !== '' ? Number(e.target.value) : '')} 
                            className={`w-full font-mono bg-white border rounded text-xs p-2 outline-none focus:ring-1 text-center font-bold ${isOdometerRequired ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-400 text-amber-900 bg-amber-50/20' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-slate-800'}`} 
                          />
                          {selectedVehicle && odometer !== '' && Number(odometer) !== selectedVehicle.odometer && (
                            <button
                              type="button"
                              onClick={() => {
                                updateMovementDetails(selectedVehicle.id, { odometer: Number(odometer) });
                                showToast('success', `KM do veículo ${selectedVehicle.plate} atualizado na entrada para ${odometer} KM!`);
                              }}
                              className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-[10px] font-black uppercase transition-colors shrink-0 shadow-xs cursor-pointer"
                              title="Salvar KM na Portaria/Entrada"
                            >
                              Salvar KM
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive safety checklist block shown upon fueling */}
                {vehicleId && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-300">
                    <div className="flex gap-2 border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        2. Checklist Padrão de Vistoria de Segurança (Exigido no Abastecimento)
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 shadow-xs">
                      <div className="sm:col-span-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                        Inspecione os itens do veículo próprio e assinale o estado:
                      </div>

                      <label className="flex items-center space-x-3 cursor-pointer bg-white p-2 border border-slate-150 rounded shadow-xs hover:border-blue-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={checklistBrakes} 
                          onChange={e => setChecklistBrakes(e.target.checked)} 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-700 block leading-tight">Freios OK</span>
                          <span className="text-[9px] text-slate-400">Freio de serviço e de estacionamento operacionais</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer bg-white p-2 border border-slate-150 rounded shadow-xs hover:border-blue-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={checklistTires} 
                          onChange={e => setChecklistTires(e.target.checked)} 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-700 block leading-tight">Pneus em Bom Estado</span>
                          <span className="text-[9px] text-slate-400">Sulcos e calibragem corretos, sem bolhas</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer bg-white p-2 border border-slate-150 rounded shadow-xs hover:border-blue-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={checklistLights} 
                          onChange={e => setChecklistLights(e.target.checked)} 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-700 block leading-tight">Sinalização OK</span>
                          <span className="text-[9px] text-slate-400">Lanternas, setas, faróis e pisca-alerta funcionando</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer bg-white p-2 border border-slate-150 rounded shadow-xs hover:border-blue-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={checklistLeaks} 
                          onChange={e => setChecklistLeaks(e.target.checked)} 
                          className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" 
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-700 block leading-tight">Vazamento Aparente</span>
                          <span className="text-[9px] text-slate-400">Existe gotejamento ou vazamento de fluído do motor/Arla</span>
                        </div>
                      </label>

                      {/* Render custom user checklist items dynamically */}
                      {customChecklistItems.map((item) => (
                        <label key={item} className="flex items-center space-x-3 cursor-pointer bg-white p-2 border border-slate-150 rounded shadow-xs hover:border-blue-200 transition-colors animate-in zoom-in-95 duration-150">
                          <input 
                            type="checkbox" 
                            checked={!!customCheckState[item]} 
                            onChange={e => setCustomCheckState(prev => ({ ...prev, [item]: e.target.checked }))} 
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          />
                          <div className="text-xs flex-1 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-700 block leading-tight truncate max-w-[180px]" title={item}>{item}</span>
                              <span className="text-[9px] text-slate-400">Verificação operacional</span>
                            </div>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveItem(item);
                              }}
                              className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"
                              title="Remover este item permanentemente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </label>
                      ))}

                      {/* Add dynamic check item inline element */}
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 mt-1">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Acrescentar Novos Itens à Inspeção Operacional</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Insira novo item de verificação (Ex: Nível do Óleo de Câmbio)" 
                            value={newItemText} 
                            onChange={e => setNewItemText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewItem(e);
                              }
                            }}
                            className="flex-1 bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
                          />
                          <button 
                            type="button" 
                            onClick={handleAddNewItem}
                            className="bg-slate-800 hover:bg-slate-700 text-white rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
                          >
                            + Incluir Item
                          </button>
                        </div>
                      </div>

                      {/* Notes / Observation Field */}
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 mt-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Observações / Notas da Vistoria
                        </label>
                        <textarea
                          placeholder="Digite considerações adicionais sobre o estado de conservação ou falhas identificadas no veículo..."
                          value={checklistNotes}
                          onChange={e => setChecklistNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium animate-in fade-in duration-200"
                        />
                      </div>

                      <div className="sm:col-span-2 pt-3 mt-1.5 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Laudo da Vistoria:</span>
                        <label className="flex items-center space-x-2.5 cursor-pointer bg-emerald-50 text-emerald-800 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 rounded-full border border-emerald-200">
                          <input 
                            type="checkbox" 
                            checked={checklistPassed} 
                            onChange={e => setChecklistPassed(e.target.checked)} 
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                          />
                          <span>Veículo Aprovado para Viagem</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={!vehicleId || pendingItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-6 py-2.5 rounded shadow-sm transition-colors uppercase tracking-widest cursor-pointer"
              >
                Registrar Movimento e Vistoria
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* SECÇÃO ADICIONADA: VISTORIAS ATIVAS NO PÁTIO */}
      <section className="bg-white mx-auto border border-slate-200 rounded-lg shadow-sm flex flex-col w-full max-w-2xl mt-4">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
            <Edit3 size={14} className="text-blue-500" /> Alteração de Vistoria (Veículos no Pátio)
          </h2>
        </div>

        <div className="p-4">
          <p className="text-[11px] text-slate-500 mb-4">
            Enquanto o veículo estiver no pátio, você pode alterar o laudo de vistoria (mudar de reprovado para aprovado, atualizar itens inspecionados ou adicionar observações) sem precisar de novo registro de entrada.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-2 px-3 font-semibold">Veículo</th>
                  <th className="py-2 px-3 font-semibold">Condutor</th>
                  <th className="py-2 px-3 font-semibold">Itens</th>
                  <th className="py-2 px-3 font-semibold text-center">Laudo</th>
                  <th className="py-2 px-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {yardProprioMovements.map(m => {
                  const hasInspection = !!m.checklistEvaluator;
                  
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-800">{m.plate}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {m.driver}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {hasInspection ? (
                            <>
                              <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase ${m.checklist?.brakes ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>Freios</span>
                              <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase ${m.checklist?.tires ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>Pneus</span>
                              <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase ${m.checklist?.lights ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>Sinal</span>
                              <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase ${!m.checklist?.leaks ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>Vazam</span>
                              {m.checklist?.notes && (
                                <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[80px]" title={m.checklist.notes}>Obs: {m.checklist.notes}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-700 uppercase">Pendente / Não Vistoriado</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hasInspection ? (
                          m.checklist?.passed ? (
                            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                              ✔ Aprovado
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wide">
                              ✘ Reprovado
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wide">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEditingInspection(m)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase hover:underline flex items-center justify-end gap-0.5 ml-auto cursor-pointer"
                        >
                          <Edit3 size={12} /> Alterar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {yardProprioMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Nenhum veículo próprio no pátio atualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MODAL DE EDIÇÃO DE VISTORIA */}
      {editingInspectionMovement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center whitespace-nowrap">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={15} className="text-blue-600" /> Alterar Inspeção de Vistoria
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingInspectionMovement(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInspectionEdit} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Veículo</span>
                  <span className="font-mono font-bold text-slate-800">{editingInspectionMovement.plate}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Motorista</span>
                  <span className="font-semibold text-slate-800">{editingInspectionMovement.driver}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Itens de Segurança</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 p-2 border border-slate-200 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editBrakes} 
                      onChange={e => setEditBrakes(e.target.checked)} 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block leading-none">Freios OK</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 p-2 border border-slate-200 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editTires} 
                      onChange={e => setEditTires(e.target.checked)} 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block leading-none">Pneus OK</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 p-2 border border-slate-200 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editLights} 
                      onChange={e => setEditLights(e.target.checked)} 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block leading-none">Sinalização OK</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 p-2 border border-slate-200 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editLeaks} 
                      onChange={e => setEditLeaks(e.target.checked)} 
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-700 block leading-none">Vazamento Aparente</span>
                    </div>
                  </label>

                  {/* Render copy-able custom checklist checked states */}
                  {Object.keys(editCustomChecked).map(item => (
                    <label key={item} className="flex items-center space-x-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 p-2 border border-slate-200 rounded transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editCustomChecked[item]} 
                        onChange={e => setEditCustomChecked(prev => ({ ...prev, [item]: e.target.checked }))} 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-700 block leading-none truncate max-w-[150px]">{item}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vistoriador Responsável */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Vistoriador Responsável
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Nome do operador que vistoriou"
                  value={editEvaluator}
                  onChange={e => setEditEvaluator(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-semibold"
                />
              </div>

              {/* Campo de observação no Modal */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Observações / Notas do Laudo
                </label>
                <textarea
                  placeholder="Se necessário, justifique as correções ou reparos que autorizam a viagem..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
                />
              </div>

              {/* Outcome Check */}
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Novo Resultado do Laudo:</span>
                <label className={`flex items-center space-x-2 cursor-pointer text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${editPassed ? 'bg-emerald-50 text-emerald-800 border-emerald-255' : 'bg-rose-50 text-rose-800 border-rose-255'}`}>
                  <input 
                    type="checkbox" 
                    checked={editPassed} 
                    onChange={e => setEditPassed(e.target.checked)} 
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 focus:ring-emerald-500" 
                  />
                  <span>{editPassed ? 'Veículo Aprovado' : 'Veículo Reprovado'}</span>
                </label>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingInspectionMovement(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded text-xs font-black uppercase tracking-wider hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
