import React, { useState, useEffect } from 'react';
import { useStore, cleanOccurrenceTypeName, getProductionCode } from '../store';
import { Movement, ProductionControl, AvariaEntry, CustomAvariaType, DifferenceReasonBreakdown } from '../types';
import { 
  X, 
  Droplet, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  PlusCircle, 
  Info, 
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  Printer,
  Clock,
  Play,
  Lock
} from 'lucide-react';

const deduplicateAvarias = (entries: AvariaEntry[]): AvariaEntry[] => {
  const seen = new Set<string>();
  const result: AvariaEntry[] = [];
  for (const item of entries) {
    const cleanedName = cleanOccurrenceTypeName(item.type);
    const key = cleanedName.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...item, type: cleanedName });
    } else {
      const existing = result.find(r => cleanOccurrenceTypeName(r.type).toLowerCase().trim() === key);
      if (existing) {
        existing.qty += item.qty;
      }
    }
  }
  return result;
};

const isPurchaseType = (type: string, customAvariaTypesList: CustomAvariaType[] = []): boolean => {
  const cleaned = cleanOccurrenceTypeName(type).toLowerCase().trim();
  const found = customAvariaTypesList.find(t => cleanOccurrenceTypeName(t.type).toLowerCase().trim() === cleaned);
  if (found) {
    return found.category === 'compra' || found.category === 'vasilhame_rota';
  }
  const norm = type.toLowerCase().trim();
  return norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || norm.includes('são pedro') || norm.includes('sao pedro') || norm.includes('prime') || norm.includes('rota');
};

const isProprioOnlyAvariaType = (typeName: string): boolean => {
  const norm = typeName.toLowerCase().trim();
  return (
    norm === 'microfuro' ||
    norm === 'vencido do mês (seco)' ||
    norm === 'vencido do mes (seco)' ||
    norm === 'vencido (cheio)' ||
    norm === 'vencido' ||
    norm === 'cheiro' ||
    norm === 'lodo' ||
    norm === 'quebrado' ||
    norm === 'quebrado lacrado'
  );
};

interface ProductionControlModalProps {
  vehicle: Movement;
  onClose: () => void;
  focusPhase?: 'descarregamento' | 'carregamento' | 'all';
  transitionOnSave?: 'aguardando_carregamento' | 'concluido' | null;
}

export const ProductionControlModal: React.FC<ProductionControlModalProps> = ({ 
  vehicle, 
  onClose,
  focusPhase = 'all',
  transitionOnSave = null
}) => {
  const { movements, updateMovementDetails, updateKanbanStep, customAvariaTypes = [], addCustomAvariaType, removeCustomAvariaType, currentUser, companyLogo, productionOpen, driverSettlements = [] } = useStore();
  const hasWriteAccess = currentUser?.role !== 'visualizador';
  const isProductionOpen = productionOpen?.[currentUser?.unit || 'matriz'] !== false;

  const liveVehicle = movements.find(m => m.id === vehicle.id) || vehicle;

  const isSettled = React.useMemo(() => {
    if (!liveVehicle) return false;
    
    // 1. Direct match by movement ID
    const expectedDirectId = liveVehicle.type === 'entrada' ? `settled-${liveVehicle.id}` : liveVehicle.id;
    const directSettlement = driverSettlements.find(ds => 
      ds.status === 'completed' && ds.movementId === expectedDirectId
    );
    if (directSettlement) return true;

    // 2. If it is an 'entrada', check if its preceding 'saida' is settled
    if (liveVehicle.type === 'entrada') {
      const departures = movements.filter(x => 
        x.type === 'saida' && 
        x.plate.toLowerCase() === liveVehicle.plate.toLowerCase() && 
        x.id !== liveVehicle.id &&
        new Date(x.exitTimestamp || x.timestamp).getTime() < new Date(liveVehicle.entryTimestamp || liveVehicle.timestamp).getTime()
      );
      departures.sort((a, b) => new Date(b.exitTimestamp || b.timestamp).getTime() - new Date(a.exitTimestamp || a.timestamp).getTime());
      const precedingSaida = departures[0];
      if (precedingSaida) {
        return driverSettlements.some(ds => 
          ds.status === 'completed' && ds.movementId === precedingSaida.id
        );
      }
    }

    return false;
  }, [liveVehicle, driverSettlements, movements]);

  const isReadOnly = !hasWriteAccess || !isProductionOpen;
  const isConcluded = liveVehicle.kanbanStep === 'concluido';

  // Derived currentStep
  const currentStep = liveVehicle.kanbanStep || 'aguardando_descarregamento';

  const isStage1Editable = !isConcluded && (currentStep === 'descarregamento' || currentStep === 'aguardando_carregamento' || currentStep === 'carregamento') && !isReadOnly;
  const isStage2Editable = !isConcluded && currentStep === 'carregamento' && !isReadOnly;

  const canRevert = currentStep !== 'aguardando_descarregamento' && !isReadOnly;
  let revertTargetStep: 'aguardando_descarregamento' | 'descarregamento' | 'aguardando_carregamento' | 'carregamento' | 'concluido' = 'aguardando_descarregamento';
  let revertTargetLabel = '';
  let revertSourceLabel = '';

  if (currentStep === 'concluido') {
    revertTargetStep = 'carregamento';
    revertTargetLabel = 'Carregamento';
    revertSourceLabel = 'Concluído';
  } else if (currentStep === 'carregamento') {
    revertTargetStep = 'aguardando_carregamento';
    revertTargetLabel = 'Aguardando Carregamento';
    revertSourceLabel = 'Carregamento';
  } else if (currentStep === 'aguardando_carregamento') {
    revertTargetStep = 'descarregamento';
    revertTargetLabel = 'Descarregamento';
    revertSourceLabel = 'Aguardando Carregamento';
  } else if (currentStep === 'descarregamento') {
    revertTargetStep = 'aguardando_descarregamento';
    revertTargetLabel = 'Aguardando Descarregamento';
    revertSourceLabel = 'Descarregamento';
  }

  // Revert/Estorno state
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [revertError, setRevertError] = useState<string | null>(null);

  // Show ticket preview state
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [printReceiptType, setPrintReceiptType] = useState<'descarregamento' | 'carregamento'>(() => {
    if (focusPhase === 'descarregamento' || transitionOnSave === 'aguardando_carregamento') {
      return 'descarregamento';
    }
    if (vehicle.productionControl?.descarregadoQty && !vehicle.productionControl?.totalCarregado) {
      return 'descarregamento';
    }
    return 'carregamento';
  });
  const [isSaved, setIsSaved] = useState(false);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const isProprio = vehicle.ownerType === 'proprio';

  // Formula & discharging state
  const [formula, setFormula] = useState(vehicle.productionControl?.descarregadoFormula || '');
  const [descarregadoQty, setDescarregadoQty] = useState(vehicle.productionControl?.descarregadoQty || 0);
  const [retornoVasilhameCheio, setRetornoVasilhameCheio] = useState(vehicle.productionControl?.retornoVasilhameCheio || 0);
  const [retiradaVasilhameCarga, setRetiradaVasilhameCarga] = useState(vehicle.productionControl?.retiradaVasilhameCarga || 0);
  const effectiveRetornoCheio = isProprio ? retornoVasilhameCheio : 0;

  // List of parsed/entered lot quantities (Enter key system)
  const [numbers, setNumbers] = useState<number[]>(() => {
    if (!vehicle.productionControl?.descarregadoFormula) return [];
    return vehicle.productionControl.descarregadoFormula
      .split('+')
      .map(p => parseInt(p, 10))
      .filter(n => !isNaN(n) && n > 0);
  });
  const [numInput, setNumInput] = useState('');

  // Proprietary vehicle - expected discharge comparison
  const [expectedDischarge, setExpectedDischarge] = useState<number>(0);
  const [manualExpectedOverride, setManualExpectedOverride] = useState<boolean>(false);
  
  const [differenceReasonsBreakdown, setDifferenceReasonsBreakdown] = useState<DifferenceReasonBreakdown[]>(() => {
    return vehicle.productionControl?.differenceReasonsBreakdown || [
      { reason: 'venda', qty: 0 },
      { reason: 'vasilhame_cliente', qty: 0 },
      { reason: 'comodato', qty: 0 },
      { reason: 'falta', qty: 0 },
      { reason: 'outros', qty: 0 }
    ];
  });

  const c_qty = differenceReasonsBreakdown.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
  const com_qty = differenceReasonsBreakdown.find(b => b.reason === 'comodato')?.qty || 0;
  const totalUnloaded = descarregadoQty + (effectiveRetornoCheio || 0);
  const diffQty = expectedDischarge > 0 ? (expectedDischarge + c_qty + com_qty) - totalUnloaded : 0;
  
  const isDetailedDifference = true;

  // Avarias at descarregamento (Discharge damages)
  const [avariasDesc, setAvariasDesc] = useState<AvariaEntry[]>(() => {
    const isProprio = vehicle.ownerType === 'proprio';
    let list = vehicle.productionControl?.avariasDescarregamento || [
      { type: 'vencido', qty: 0 },
      { type: 'cheiro', qty: 0 },
      { type: 'lodo', qty: 0 },
      { type: 'quebrado', qty: 0 },
    ];
    if (isProprio) {
      const hasRota = list.some(item => item.type.toLowerCase().trim() === 'vasilhame de rota');
      if (!hasRota) {
        list = [...list, { type: 'vasilhame de rota', qty: 0 }];
      }
    }
    return deduplicateAvarias(list);
  });
  const [avariasDescPhoto, setAvariasDescPhoto] = useState<string>(vehicle.productionControl?.avariasDescarregamentoPhoto || '');

  // Avarias at carregamento (Loading damages)
  const [avariasCarreg, setAvariasCarreg] = useState<AvariaEntry[]>(() => {
    const isProprio = vehicle.ownerType === 'proprio';
    let list = vehicle.productionControl?.avariasCarregamento || [
      { type: 'quebra na maquina', qty: 0 },
      { type: 'quebra carregamento', qty: 0 },
      { type: 'vencido', qty: 0 },
      { type: 'ressecado', qty: 0 },
    ];
    if (isProprio) {
      const hasRota = list.some(item => item.type.toLowerCase().trim() === 'vasilhame de rota');
      if (!hasRota) {
        list = [...list, { type: 'vasilhame de rota', qty: 0 }];
      }
    }
    return deduplicateAvarias(list);
  });
  const [avariasCarregPhoto, setAvariasCarregPhoto] = useState<string>(vehicle.productionControl?.avariasCarregamentoPhoto || '');
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<string | null>(null);

  // Notes
  const [observacoes, setObservacoes] = useState(vehicle.productionControl?.observacoes || '');

  const handleBreakdownChange = (reason: 'venda' | 'vasilhame_cliente' | 'falta' | 'outros' | 'comodato', val: number) => {
    const cleanVal = isNaN(val) ? 0 : val;
    setDifferenceReasonsBreakdown(prev => {
      const exists = prev.some(item => item.reason === reason);
      let updated;
      if (exists) {
        updated = prev.map(item => item.reason === reason ? { ...item, qty: cleanVal } : item);
      } else {
        updated = [...prev, { reason, qty: cleanVal }];
      }
      const c = updated.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
      const com = updated.find(b => b.reason === 'comodato')?.qty || 0;
      const liveDiffQty = expectedDischarge > 0 ? (expectedDischarge + c + com) - totalUnloaded : 0;
      const totalFalta = Math.max(0, liveDiffQty);
      return updated.map(item => item.reason === 'falta' ? { ...item, qty: totalFalta } : item);
    });
  };

  // Keep breakdown synchronized with 'falta' calculated
  useEffect(() => {
    if (vehicle.ownerType === 'proprio' && expectedDischarge > 0) {
      const totalFalta = Math.max(0, diffQty);
      setDifferenceReasonsBreakdown(prev => {
        return prev.map(item => {
          if (item.reason === 'falta') return { ...item, qty: totalFalta };
          return item;
        });
      });
    }
  }, [diffQty]);

  // Add new damage type state
  const [newDamageType, setNewDamageType] = useState('');
  const [newDamageCategory, setNewDamageCategory] = useState<'desc' | 'carreg'>('desc');

  // Find previous cargo for proprietary vehicles
  useEffect(() => {
    if (vehicle.ownerType === 'proprio') {
      const prev = movements
        .filter(m => 
          m.plate.toUpperCase() === vehicle.plate.toUpperCase() && 
          m.id !== vehicle.id && 
          m.productionControl && 
          ((m.productionControl.totalCarregado || 0) > 0 || (m.productionControl.retornoVasilhameCheio || 0) > 0)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (prev?.productionControl) {
        const totalOut = (prev.productionControl.totalCarregado || 0) + (prev.productionControl.retornoVasilhameCheio || 0);
        if (totalOut > 0) {
          setExpectedDischarge(totalOut);
        }
      }
    }
  }, [vehicle.plate, vehicle.ownerType, movements, vehicle.id]);

  // Keep form fields synced if the process gets updated/reverted in real-time
  useEffect(() => {
    if (liveVehicle.productionControl) {
      setFormula(liveVehicle.productionControl.descarregadoFormula || '');
      setDescarregadoQty(liveVehicle.productionControl.descarregadoQty || 0);
      setRetornoVasilhameCheio(liveVehicle.productionControl.retornoVasilhameCheio || 0);
      setRetiradaVasilhameCarga(liveVehicle.productionControl.retiradaVasilhameCarga || 0);
      setObservacoes(liveVehicle.productionControl.observacoes || '');
      if (liveVehicle.productionControl.differenceReasonsBreakdown) {
        const loaded = liveVehicle.productionControl.differenceReasonsBreakdown;
        const defaults: DifferenceReasonBreakdown[] = [
          { reason: 'venda', qty: 0 },
          { reason: 'vasilhame_cliente', qty: 0 },
          { reason: 'comodato', qty: 0 },
          { reason: 'falta', qty: 0 },
          { reason: 'outros', qty: 0 }
        ];
        // Merge so any missing reason gets added
        const merged = defaults.map(d => {
          const found = loaded.find(l => l.reason === d.reason);
          return found ? found : d;
        });
        setDifferenceReasonsBreakdown(merged);
      } else {
        setDifferenceReasonsBreakdown([
          { reason: 'venda', qty: 0 },
          { reason: 'vasilhame_cliente', qty: 0 },
          { reason: 'comodato', qty: 0 },
          { reason: 'falta', qty: 0 },
          { reason: 'outros', qty: 0 }
        ] as DifferenceReasonBreakdown[]);
      }
      if (liveVehicle.productionControl.descarregadoFormula) {
        setNumbers(
          liveVehicle.productionControl.descarregadoFormula
            .split('+')
            .map(p => parseInt(p, 10))
            .filter(n => !isNaN(n) && n > 0)
        );
      } else {
        setNumbers([]);
      }
      if (liveVehicle.productionControl.avariasDescarregamento) {
        setAvariasDesc(deduplicateAvarias(liveVehicle.productionControl.avariasDescarregamento));
      }
      if (liveVehicle.productionControl.avariasDescarregamentoPhoto) {
        setAvariasDescPhoto(liveVehicle.productionControl.avariasDescarregamentoPhoto);
      }
      if (liveVehicle.productionControl.avariasCarregamento) {
        setAvariasCarreg(deduplicateAvarias(liveVehicle.productionControl.avariasCarregamento));
      }
      if (liveVehicle.productionControl.avariasCarregamentoPhoto) {
        setAvariasCarregPhoto(liveVehicle.productionControl.avariasCarregamentoPhoto);
      }
    }
  }, [liveVehicle.id, liveVehicle.kanbanStep]);

  // Load custom avaria types safely using atomic updates to prevent duplicate keys
  useEffect(() => {
    if (!customAvariaTypes) return;
    
    setAvariasDesc(prev => {
      let cleaned = deduplicateAvarias(prev);
      
      // Filter out types that are no longer in customAvariaTypes with descarregamento or ambos, ONLY if their qty is 0
      cleaned = cleaned.filter(a => {
        if (a.qty > 0) return true; // keep if there's active data
        const aClean = cleanOccurrenceTypeName(a.type).toLowerCase().trim();
        return customAvariaTypes.some(entry => 
          cleanOccurrenceTypeName(entry.type).toLowerCase().trim() === aClean &&
          (entry.classification === 'descarregamento' || entry.classification === 'ambos')
        );
      });

      customAvariaTypes.forEach(entry => {
        if (entry.classification === 'descarregamento' || entry.classification === 'ambos') {
          const formatted = cleanOccurrenceTypeName(entry.type).trim();
          if (!cleaned.some(a => cleanOccurrenceTypeName(a.type).toLowerCase().trim() === formatted.toLowerCase().trim())) {
            cleaned.push({ type: formatted, qty: 0 });
          }
        }
      });
      return cleaned;
    });

    setAvariasCarreg(prev => {
      let cleaned = deduplicateAvarias(prev);
      
      // Filter out types that are no longer in customAvariaTypes with carregamento or ambos, ONLY if their qty is 0
      cleaned = cleaned.filter(c => {
        if (c.qty > 0) return true; // keep if there's active data
        const cClean = cleanOccurrenceTypeName(c.type).toLowerCase().trim();
        return customAvariaTypes.some(entry => 
          cleanOccurrenceTypeName(entry.type).toLowerCase().trim() === cClean &&
          (entry.classification === 'carregamento' || entry.classification === 'ambos')
        );
      });

      customAvariaTypes.forEach(entry => {
        if (entry.classification === 'carregamento' || entry.classification === 'ambos') {
          const formatted = cleanOccurrenceTypeName(entry.type).trim();
          if (!cleaned.some(c => cleanOccurrenceTypeName(c.type).toLowerCase().trim() === formatted.toLowerCase().trim())) {
            cleaned.push({ type: formatted, qty: 0 });
          }
        }
      });
      return cleaned;
    });
  }, [customAvariaTypes]);

  // Handle Enter Key event to add numbers and calculate sum on the fly
  const handleNumInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isConcluded) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      addNumberedLot();
    }
  };

  const addNumberedLot = () => {
    if (isConcluded) return;
    const val = parseInt(numInput, 10);
    if (!isNaN(val) && val > 0) {
      const newNumbers = [...numbers, val];
      setNumbers(newNumbers);
      const newFormula = newNumbers.join('+');
      setFormula(newFormula);
      setDescarregadoQty(newNumbers.reduce((a, b) => a + b, 0));
      setNumInput('');
    }
  };

  const removeNumberIndex = (index: number) => {
    if (isConcluded) return;
    const newNumbers = numbers.filter((_, idx) => idx !== index);
    setNumbers(newNumbers);
    const newFormula = newNumbers.join('+');
    setFormula(newFormula);
    setDescarregadoQty(newNumbers.reduce((a, b) => a + b, 0));
  };

  const handleFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isConcluded) return;
    const value = e.target.value;
    setFormula(value);
    
    // Parse lot numbers from text
    const parsedNumbers = value
      .split('+')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    setNumbers(parsedNumbers);

    if (value.trim()) {
      const total = parsedNumbers.reduce((a, b) => a + b, 0);
      setDescarregadoQty(total);
    } else {
      setDescarregadoQty(0);
    }
  };

  const updateAvariaQty = (type: string, change: number, phase: 'desc' | 'carreg') => {
    if (isConcluded) return;
    const list = phase === 'desc' ? avariasDesc : avariasCarreg;
    const setList = phase === 'desc' ? setAvariasDesc : setAvariasCarreg;

    setList(
      list.map(item => {
        if (item.type === type) {
          return { ...item, qty: Math.max(0, item.qty + change) };
        }
        return item;
      })
    );
  };

  const setAvariaQtyDirectly = (type: string, value: number, phase: 'desc' | 'carreg') => {
    if (isConcluded) return;
    const list = phase === 'desc' ? avariasDesc : avariasCarreg;
    const setList = phase === 'desc' ? setAvariasDesc : setAvariasCarreg;
    const cleanVal = isNaN(value) ? 0 : Math.max(0, value);

    setList(
      list.map(item => {
        if (item.type === type) {
          return { ...item, qty: cleanVal };
        }
        return item;
      })
    );
  };

  const handleAddNewAvariaType = () => {
    if (isConcluded) return;
    const name = newDamageType.trim();
    if (!name) return;

    if (!customAvariaTypes.some(t => t.type.toLowerCase() === name.toLowerCase())) {
      addCustomAvariaType(name, newDamageCategory === 'desc' ? 'descarregamento' : 'carregamento');
    }

    if (newDamageCategory === 'desc') {
      setAvariasDesc(prev => {
        const cleaned = deduplicateAvarias(prev);
        if (!cleaned.some(a => a.type.toLowerCase().trim() === name.toLowerCase())) {
          return [...cleaned, { type: name, qty: 1 }];
        }
        return cleaned.map(a => a.type.toLowerCase().trim() === name.toLowerCase() ? { ...a, qty: a.qty + 1 } : a);
      });
    } else {
      setAvariasCarreg(prev => {
        const cleaned = deduplicateAvarias(prev);
        if (!cleaned.some(c => c.type.toLowerCase().trim() === name.toLowerCase())) {
          return [...cleaned, { type: name, qty: 1 }];
        }
        return cleaned.map(c => c.type.toLowerCase().trim() === name.toLowerCase() ? { ...c, qty: c.qty + 1 } : c);
      });
    }

    setNewDamageType('');
  };

  const compressAndResizeImage = (base64Str: string, callback: (compressed: string) => void) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxSize = 640;
      
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        callback(compressedBase64);
      } else {
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
    img.src = base64Str;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, phase: 'desc' | 'carreg') => {
    if (isConcluded) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        compressAndResizeImage(rawBase64, (compressedBase64) => {
          if (phase === 'desc') {
            const currentPhotos = avariasDescPhoto ? avariasDescPhoto.split('||').filter(Boolean) : [];
            setAvariasDescPhoto([...currentPhotos, compressedBase64].join('||'));
          } else {
            const currentPhotos = avariasCarregPhoto ? avariasCarregPhoto.split('||').filter(Boolean) : [];
            setAvariasCarregPhoto([...currentPhotos, compressedBase64].join('||'));
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const getTotals = () => {
    // Quebra na maquina quantity
    const quebraNaMaquinaQty = [...avariasDesc, ...avariasCarreg]
      .filter(x => cleanOccurrenceTypeName(x.type).toLowerCase().trim() === 'quebra na maquina')
      .reduce((sum, item) => sum + item.qty, 0);

    const descLosses = avariasDesc
      .filter(a => !isPurchaseType(a.type, customAvariaTypes))
      .reduce((sum, item) => sum + item.qty, 0);

    const descPurchases = avariasDesc
      .filter(a => isPurchaseType(a.type, customAvariaTypes))
      .reduce((sum, item) => sum + item.qty, 0);

    const carregLosses = avariasCarreg
      .filter(c => !isPurchaseType(c.type, customAvariaTypes))
      .reduce((sum, item) => sum + item.qty, 0);

    const carregPurchases = avariasCarreg
      .filter(c => isPurchaseType(c.type, customAvariaTypes))
      .reduce((sum, item) => sum + item.qty, 0);

    const totalCarregado = descarregadoQty - (isProprio ? (retiradaVasilhameCarga || 0) : 0) - descLosses - carregLosses + carregPurchases + descPurchases;

    // Normal avarias = all losses minus quebraNaMaquinaQty
    const normalAvariasQty = Math.max(0, (descLosses + carregLosses) - quebraNaMaquinaQty);

    // Group additions/purchases by product
    const additionsList = [...avariasDesc, ...avariasCarreg].filter(x => isPurchaseType(x.type, customAvariaTypes));
    const additionsByProduct: Record<string, number> = {};
    additionsList.forEach(item => {
      const name = cleanOccurrenceTypeName(item.type);
      additionsByProduct[name] = (additionsByProduct[name] || 0) + item.qty;
    });

    return {
      descLosses,
      descPurchases,
      carregLosses,
      carregPurchases,
      quebraNaMaquinaQty,
      normalAvariasQty,
      additionsByProduct,
      totalCarregado: Math.max(0, totalCarregado)
    };
  };

  const { 
    descLosses, 
    descPurchases, 
    carregLosses, 
    carregPurchases, 
    quebraNaMaquinaQty, 
    normalAvariasQty, 
    additionsByProduct, 
    totalCarregado 
  } = getTotals();

  // Difference detection for proprietary vehicle (Shortage/Excess logic)
  const showDiffWarning = vehicle.ownerType === 'proprio' && expectedDischarge > 0;

  const handleSave = (isConclude: boolean) => {
    if (isReadOnly) {
      setValidationError('Acesso Restrito: Usuários com perfil de visualização não podem salvar ou alterar lançamentos.');
      return;
    }
    if (isConclude) {
      // Validation based on focus phase (only when concluding)
      if (focusPhase === 'descarregamento' && descarregadoQty <= 0) {
        setValidationError('Por favor, informe a quantidade de vasilhames descarregados antes de concluir o descarregamento.');
        return;
      }
      if (focusPhase === 'carregamento' && totalCarregado <= 0) {
        setValidationError('Por favor, informe a quantidade envasada/carregada antes de concluir o carregamento.');
        return;
      }
    }

    if (vehicle.ownerType === 'proprio' && expectedDischarge > 0) {
      const requiredShortage = diffQty;
      
      if (requiredShortage < 0) {
        setValidationError(`Você possui uma sobra de ${-requiredShortage} vasilhame(s). Por favor, use "Trouxe Vasilhame de Cliente" ou "Retorno de Comodato" para justificar as sobras.`);
        return;
      }
    }

    setValidationError(null);

    const control: ProductionControl = {
      descarregadoFormula: formula,
      descarregadoQty,
      retornoVasilhameCheio: effectiveRetornoCheio,
      retiradaVasilhameCarga: isProprio ? retiradaVasilhameCarga : undefined,
      avariasDescarregamento: avariasDesc,
      avariasDescarregamentoPhoto: avariasDescPhoto,
      avariasCarregamento: avariasCarreg,
      avariasCarregamentoPhoto: avariasCarregPhoto,
      observacoes,
      totalCarregado,
      expectedDischargeQty: vehicle.ownerType === 'proprio' ? expectedDischarge : undefined,
      differenceQty: vehicle.ownerType === 'proprio' ? diffQty : undefined,
      differenceReason: undefined,
      differenceReasonsBreakdown: vehicle.ownerType === 'proprio' && expectedDischarge > 0 ? differenceReasonsBreakdown : undefined,
      stockRequests: vehicle.productionControl?.stockRequests
    };

    updateMovementDetails(vehicle.id, { productionControl: control });
    
    if (isConclude && transitionOnSave) {
      updateKanbanStep(vehicle.id, transitionOnSave);
      setIsSaved(true);
      setShowPrintSlip(true);
      return;
    }

    onClose();
  };

  // Render Print view
  if (showPrintSlip) {
    const isDescarregamentoReceipt = printReceiptType === 'descarregamento';

    const formatDateTime = (isoString?: string) => {
      if (!isoString) return '';
      return new Date(isoString).toLocaleString('pt-BR', {
        hour12: false
      });
    };

    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="fixed inset-0 z-55 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-ticket-area, #print-ticket-area * {
              visibility: visible !important;
            }
            #print-ticket-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>
        
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          <div className="bg-emerald-700 text-white p-4 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Printer size={18} />
              <span className="font-bold text-xs uppercase tracking-wider">
                {isDescarregamentoReceipt ? "Imprimir Comprovante de Descarregamento" : "Imprimir Comprovante de Carga"}
              </span>
            </div>
            <button onClick={onClose} className="p-1 text-white/70 hover:text-white hover:bg-emerald-800 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Tab Selector for reprinting */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex gap-2 print:hidden justify-center shrink-0">
            <button
              onClick={() => setPrintReceiptType('descarregamento')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                printReceiptType === 'descarregamento'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
              }`}
            >
              Comprovante Descarrego
            </button>
            <button
              onClick={() => setPrintReceiptType('carregamento')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                printReceiptType === 'carregamento'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
              }`}
            >
              Comprovante Carga/Saída
            </button>
          </div>

          <div className="p-6 bg-slate-100 flex-1 overflow-y-auto max-h-[70vh] flex flex-col items-center">
            {isSaved && (
              <div className="w-full text-center mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 text-xs font-bold font-sans print:hidden">
                {isDescarregamentoReceipt 
                  ? "✅ Descarregamento Concluído com Sucesso!" 
                  : "✅ Controle de Carregamento Concluído com Sucesso!"}
              </div>
            )}

            <div 
              id="print-ticket-area" 
              className="w-full bg-white border border-slate-300 rounded-xl shadow-md p-6 font-mono text-slate-800"
            >
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <div className="flex flex-col items-center justify-center gap-1.5 mb-2">
                  {companyLogo ? (
                    <img 
                      src={companyLogo} 
                      alt="Logo Empresa" 
                      className="max-h-12 max-w-[150px] object-contain mb-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-200">
                      <Droplet className="text-blue-600 fill-blue-300 stroke-[2.5]" size={24} />
                      <Sparkles className="text-amber-500 absolute top-1.5 right-1.5" size={12} />
                    </div>
                  )}
                  <div className="font-sans font-black tracking-widest text-[#0c2a5c] text-xl uppercase">
                    CRISTAL SUL
                  </div>
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isDescarregamentoReceipt ? "Comprovante de Descarregamento" : "Controle de Produção e Carga"}
                </div>
                <div className="text-[9px] text-slate-400 mt-1 font-bold">
                  Data/Hora: {formatDateTime(vehicle.timestamp)}
                </div>
              </div>

              <div className="py-4 space-y-3.5 text-xs text-slate-700">
                <div>
                  <div className="text-[9px] uppercase font-black text-slate-400 mb-0.5">Identificação do Veículo</div>
                  <div className="flex justify-between">
                    <span>Placa:</span>
                    <span className="font-extrabold text-slate-900">{vehicle.plate.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span>Motorista:</span>
                    <span className="font-extrabold text-slate-900 truncate max-w-[180px]">{vehicle.driver}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span>Tipo:</span>
                    <span className="font-extrabold text-slate-900 uppercase">
                      {vehicle.ownerType === 'proprio' ? 'Frota Própria' : 'Cliente/Terceiro'}
                    </span>
                  </div>
                  {vehicle.client && (
                    <div className="flex justify-between mt-0.5">
                      <span>Cliente:</span>
                      <span className="font-extrabold text-slate-900">{vehicle.client}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3">
                  <div className="text-[9px] uppercase font-black text-slate-400 mb-1">1. Registro de Entrada (Descarregamento)</div>
                  
                  {vehicle.ownerType === 'proprio' ? (
                    <div className="space-y-1 mt-1 text-xs">
                      <div className="flex justify-between">
                        <span>Deveria Ter (Saída):</span>
                        <span className="font-bold text-slate-900">{expectedDischarge} un</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Descarregado Vazio (Físico):</span>
                        <span className="text-indigo-700">{descarregadoQty || 0} un</span>
                      </div>
                      {effectiveRetornoCheio > 0 && (
                        <div className="flex justify-between font-bold text-emerald-700">
                          <span>Retorno Cheio (no Veículo):</span>
                          <span>{effectiveRetornoCheio} un</span>
                        </div>
                      )}
                      
                      {/* Breakdown reasons */}
                      {(() => {
                        const v = differenceReasonsBreakdown.find(b => b.reason === 'venda')?.qty || 0;
                        const f = differenceReasonsBreakdown.find(b => b.reason === 'falta')?.qty || 0;
                        const o = differenceReasonsBreakdown.find(b => b.reason === 'outros')?.qty || 0;
                        const c = differenceReasonsBreakdown.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
                        const com = differenceReasonsBreakdown.find(b => b.reason === 'comodato')?.qty || 0;
                        return (
                          <div className="pt-2 mt-2 border-t border-dotted border-slate-200 space-y-0.5 text-[11px] text-slate-600">
                            {c > 0 && (
                              <div className="flex justify-between">
                                <span>- Trouxe de Cliente:</span>
                                <span className="font-semibold">+{c} un</span>
                              </div>
                            )}
                            {v > 0 && (
                              <div className="flex justify-between">
                                <span>- Venda Realizada:</span>
                                <span className="font-semibold">{v} un</span>
                              </div>
                            )}
                            {com > 0 && (
                              <div className="flex justify-between">
                                <span>- Comodato:</span>
                                <span className="font-semibold">{com} un</span>
                              </div>
                            )}
                            {f > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>- Falta / Desconto:</span>
                                <span className="font-semibold">{f} un</span>
                              </div>
                            )}
                            {o > 0 && (
                              <div className="flex justify-between">
                                <span>- Outros:</span>
                                <span className="font-semibold">{o} un</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between font-bold">
                        <span>Vasilhames Secos:</span>
                        <span className="text-indigo-700">{descarregadoQty || 0} un</span>
                      </div>
                      {effectiveRetornoCheio > 0 && (
                        <div className="flex justify-between font-bold text-amber-700 mt-0.5">
                          <span>Vasilhames Cheios Retornados:</span>
                          <span>{effectiveRetornoCheio} un</span>
                        </div>
                      )}
                    </>
                  )}

                  {formula && (
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium mt-1">
                      <span>Composição Fórmula:</span>
                      <span>({formula})</span>
                    </div>
                  )}
                  
                  {avariasDesc.some(a => !isPurchaseType(a.type, customAvariaTypes) && a.qty > 0) && (
                    <div className="mt-1.5 pl-2 border-l-2 border-red-200">
                      <div className="text-[10px] font-bold text-red-650 mb-0.5">Avarias no Descarrego:</div>
                      {avariasDesc.filter(a => !isPurchaseType(a.type, customAvariaTypes) && a.qty > 0).map((a, idx) => (
                        <div key={`${a.type}-${idx}`} className="flex justify-between text-[10px] text-slate-500 capitalize">
                          <span>- {a.type}:</span>
                          <span>{a.qty} un</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {avariasDesc.some(a => isPurchaseType(a.type, customAvariaTypes) && a.qty > 0) && (
                    <div className="mt-1.5 pl-2 border-l-2 border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-650 mb-0.5">Vasilhames Adicionados:</div>
                      {avariasDesc.filter(a => isPurchaseType(a.type, customAvariaTypes) && a.qty > 0).map((a, idx) => (
                        <div key={`${a.type}-${idx}`} className="flex justify-between text-[10px] text-slate-500 capitalize">
                          <span>- {a.type}:</span>
                          <span>{a.qty} un</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isDescarregamentoReceipt && (
                  <>
                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <div className="text-[9px] uppercase font-black text-slate-400 mb-1">2. Registro de Saída / Envase</div>
                      {avariasCarreg.some(c => !isPurchaseType(c.type, customAvariaTypes) && c.qty > 0) && (
                        <div className="mb-2 pl-2 border-l-2 border-amber-200">
                          <div className="text-[10px] font-bold text-amber-650 mb-0.5">Avarias Carregamento / Envase:</div>
                          {avariasCarreg.filter(c => !isPurchaseType(c.type, customAvariaTypes) && c.qty > 0).map((c, idx) => (
                            <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-500 capitalize">
                              <span>- {c.type}:</span>
                              <span>{c.qty} un</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {avariasCarreg.some(c => isPurchaseType(c.type, customAvariaTypes) && c.qty > 0) && (
                        <div className="mb-2 pl-2 border-l-2 border-emerald-200">
                          <div className="text-[10px] font-bold text-emerald-650 mb-0.5">Vasilhames Adicionados (Saída):</div>
                          {avariasCarreg.filter(c => isPurchaseType(c.type, customAvariaTypes) && c.qty > 0).map((c, idx) => (
                            <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-500 capitalize">
                              <span>- {c.type}:</span>
                              <span>{c.qty} un</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 print:bg-transparent print:border-none">
                      <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Resumo do Carregamento</div>
                      <div className="flex justify-between text-xs mt-0.5">
                        <span>Avarias de Produção:</span>
                        <span className="font-bold">{descarregadoQty || 0} un</span>
                      </div>
                      
                      <div className="flex justify-between text-xs mt-0.5 text-amber-750">
                        <span>(-) Avarias:</span>
                        <span className="font-bold">-{normalAvariasQty} un</span>
                      </div>

                      {isProprio && (retiradaVasilhameCarga || 0) > 0 && (
                        <div className="flex justify-between text-xs mt-0.5 text-indigo-700">
                          <span>(-) Retirada Vasilhame Rota:</span>
                          <span className="font-bold">-{retiradaVasilhameCarga} un</span>
                        </div>
                      )}

                      {quebraNaMaquinaQty > 0 && (
                        <div className="flex justify-between text-xs mt-0.5 text-red-700">
                          <span>(-) Quebra na Máquina:</span>
                          <span className="font-semibold">-{quebraNaMaquinaQty} un</span>
                        </div>
                      )}

                      <div className="mt-2 pt-1 border-t border-dashed border-slate-200">
                        <span className="text-[10px] text-slate-450 uppercase block font-bold mb-0.5">(+) Adições/Vasilhames Adicionados:</span>
                        {Object.entries(additionsByProduct).length > 0 ? (
                          Object.entries(additionsByProduct).map(([prodName, qty]) => (
                            <div key={prodName} className="flex justify-between text-xs text-emerald-650 font-medium pl-2">
                              <span className="capitalize">- {prodName}:</span>
                              <span className="font-bold">+{qty} un</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-slate-400 pl-2">Nenhuma adição</div>
                        )}
                      </div>

                      <div className="flex justify-between text-xs pt-2 border-t border-slate-300 font-bold text-slate-700 mt-1.5 uppercase">
                        <span>Produção / Carga Nova:</span>
                        <span className="text-indigo-600 font-extrabold text-xs">{totalCarregado || 0} un</span>
                      </div>
                      {effectiveRetornoCheio > 0 && (
                        <>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mt-0.5 uppercase">
                            <span>(+) Retorno Cheio (no veículo):</span>
                            <span className="text-emerald-600 font-extrabold text-xs">+{effectiveRetornoCheio} un</span>
                          </div>
                          <div className="flex justify-between text-sm pt-1.5 border-t border-dotted border-slate-300 font-extrabold text-slate-900 mt-1 uppercase">
                            <span>Saída Total do Veículo:</span>
                            <span className="text-emerald-700 font-black text-sm">{totalCarregado + effectiveRetornoCheio} un</span>
                          </div>
                        </>
                      )}
                      {effectiveRetornoCheio <= 0 && (
                        <div className="flex justify-between text-sm pt-2 border-t border-slate-300 font-extrabold text-slate-900 mt-1.5 uppercase">
                          <span>Total Carregado Final:</span>
                          <span className="text-emerald-700 font-extrabold text-base">{totalCarregado || 0} un</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {observacoes && (
                  <div className="border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-500 leading-relaxed font-sans">
                    <span className="font-bold uppercase block text-slate-400 mb-0.5">Observações:</span>
                    {observacoes}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
                <div className="font-bold mb-8 uppercase text-[9px]">Assinatura Responsável</div>
                <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-bold">PRODUÇÃO</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={15} />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Header and title customization based on active layout
  const modalTitle = focusPhase === 'descarregamento'
    ? 'Controle de Entrada (Vasilhames Descarregados)'
    : focusPhase === 'carregamento'
    ? 'Controle de Saída (Envase e Carregamento)'
    : 'Controle de Produção de Vasilhames (20L)';

  return (
    <div className="fixed inset-0 z-55 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-905 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Droplet size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">{modalTitle}</h2>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap gap-x-2 items-center">
                <span>Veículo: <span className="font-bold text-white">{vehicle.plate}</span></span>
                <span>|</span>
                <span>Motorista: <span className="text-white">{vehicle.driver}</span></span>
                <span>({vehicle.ownerType === 'proprio' ? 'Frota Própria' : 'Cliente/Terceiro'})</span>
                {vehicle.ownerType === 'proprio' && (
                  <>
                    <span>|</span>
                    <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">CÓD: {getProductionCode(vehicle)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-805 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50 space-y-5 font-sans">
          
           {isSettled && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs shrink-0">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span><strong>Acerto Concluído:</strong> O acerto desta viagem já foi finalizado na Prestação de Contas. Novos lançamentos ou ajustes permanecem disponíveis para o motorista ou operador autorizado.</span>
            </div>
          )}
          {isReadOnly && !isSettled && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs shrink-0">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span><strong>Perfil de Visualização (Apenas Leitura):</strong> Você pode verificar todos os detalhes desta produção, mas não possui permissão para preencher, salvar, alterar dados ou processar etapas.</span>
            </div>
          )}
          
          {/* Reversion Info Banner */}
          {liveVehicle.productionReverted && (
            <div className="bg-rose-50 border border-rose-200 text-rose-805 p-4 rounded-xl text-xs font-sans flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-3xs">
              <div className="flex items-start gap-3">
                <RefreshCw className="text-rose-500 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} size={18} />
                <div className="space-y-1 flex-1">
                  <div className="font-extrabold uppercase tracking-wider text-rose-950">🔄 Processo Estornado / Revertido</div>
                  <div className="text-slate-650 font-medium leading-relaxed">
                    Este processo de produção foi estornado por <strong className="text-slate-800">{liveVehicle.productionRevertBy || 'Sistema'}</strong>
                    {liveVehicle.productionRevertAt && (
                      <> em <strong className="text-slate-800">{new Date(liveVehicle.productionRevertAt).toLocaleString('pt-BR')}</strong></>
                    )}.
                    O veículo retornou para a etapa de <strong className="text-slate-900">
                      {liveVehicle.kanbanStep === 'aguardando_descarregamento' ? 'Aguardando Descarregamento' :
                       liveVehicle.kanbanStep === 'descarregamento' ? 'Descarregamento (Entrada)' :
                       liveVehicle.kanbanStep === 'aguardando_carregamento' ? 'Aguardando Carregamento' :
                       liveVehicle.kanbanStep === 'carregamento' ? 'Carregamento (Saída)' : 'Concluído'}
                    </strong>.
                  </div>
                  {liveVehicle.productionRevertReason && (
                    <div className="bg-white/90 border border-rose-100 p-2.5 rounded-lg text-[11px] text-rose-950 font-medium mt-1">
                      <span className="font-bold text-rose-900 block text-[9px] uppercase tracking-wide mb-0.5">Motivo do Estorno:</span>
                      "{liveVehicle.productionRevertReason}"
                    </div>
                  )}
                </div>
              </div>

              {/* History of reverts if multiple exist */}
              {liveVehicle.productionReverts && liveVehicle.productionReverts.length > 1 && (
                <div className="mt-2 pt-2 border-t border-rose-150">
                  <span className="block text-[9px] font-black uppercase text-rose-900 tracking-wider mb-1.5">Histórico de Estornos Anteriores:</span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {liveVehicle.productionReverts.slice(0, -1).reverse().map((rev, rIdx) => (
                      <div key={rIdx} className="bg-white/60 border border-rose-100 rounded-lg p-2 text-[10px] space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>👤 {rev.revertedBy}</span>
                          <span>📅 {new Date(rev.revertedAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="text-slate-500 font-medium text-[9px]">
                          Etapa: {rev.fromStep === 'concluido' ? 'Concluído' : 
                                  rev.fromStep === 'carregamento' ? 'Carregamento' :
                                  rev.fromStep === 'aguardando_carregamento' ? 'Aguardando Carregamento' :
                                  rev.fromStep === 'descarregamento' ? 'Descarregamento' : rev.fromStep} 
                          → 
                          {rev.toStep === 'concluido' ? 'Concluído' :
                           rev.toStep === 'carregamento' ? 'Carregamento' :
                           rev.toStep === 'aguardando_carregamento' ? 'Aguardando Carregamento' :
                           rev.toStep === 'descarregamento' ? 'Descarregamento' :
                           rev.toStep === 'aguardando_descarregamento' ? 'Aguardando Descarregamento' : rev.toStep}
                        </div>
                        <div className="text-slate-600 italic">" {rev.revertReason} "</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Error Alert */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-bold font-sans flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <div>{validationError}</div>
            </div>
          )}

          {/* Owner Type Warning / Validation (Frota Própria Charge Association) */}
          {vehicle.ownerType === 'proprio' && (focusPhase === 'descarregamento' || focusPhase === 'all') && (
            <div className="bg-slate-100/80 p-5 rounded-2xl border border-slate-200 flex flex-col gap-5">
              {/* Top part: Centered Triagem Inteligente */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 border-b border-slate-200/65 pb-4">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500 animate-pulse" />
                  Triagem Inteligente - Frota Própria
                </div>
                <p className="text-xs text-slate-600 max-w-xl">
                  Veículos de frota própria devem retornar com a mesma quantidade de vasilhames levados na viagem anterior.
                </p>
                <div className="flex justify-center mt-1">
                  <span className="text-[11px] font-bold bg-white text-slate-700 border border-slate-300 rounded-lg px-3 py-1 flex items-center gap-2 shadow-sm">
                    <span className="text-slate-500">Saída anterior detectada:</span>
                    {manualExpectedOverride ? (
                      <input 
                        type="number" 
                        value={expectedDischarge} 
                        disabled={!isStage1Editable}
                        onChange={e => setExpectedDischarge(Math.max(0, parseInt(e.target.value) || 0))} 
                        className="w-16 text-center text-xs font-black border-b border-blue-500 focus:outline-none focus:border-blue-600 font-mono"
                      />
                    ) : (
                      <span className="font-black text-blue-600 text-sm font-mono">{expectedDischarge || 'Nenhuma'}</span>
                    )}
                    {isStage1Editable && (
                      <button 
                        onClick={() => setManualExpectedOverride(!manualExpectedOverride)}
                        className="text-blue-500 hover:text-blue-700 ml-1 font-semibold text-[10px] underline"
                      >
                        {manualExpectedOverride ? 'Utilizar histórico' : 'Editar Manual'}
                      </button>
                    )}
                  </span>
                </div>
              </div>

              {/* Bottom part: Side-by-side Justification and Resumo (when expectedDischarge > 0) */}
              {showDiffWarning && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full items-stretch animate-in fade-in duration-300">
                  {/* Left Column: Values to be filled (Justificativa de Diferença) */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col gap-3 shadow-sm justify-between">
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          Justificativa de Diferença / Detalhamento
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 leading-normal mb-3">
                        {diffQty > 0 ? (
                          <>
                            Faltam <span className="font-bold text-amber-700">{diffQty}</span> vasilhame(s) no descarrego comparado à saída anterior (<span className="font-semibold">{expectedDischarge}</span>). Distribua a diferença nos campos abaixo.
                          </>
                        ) : diffQty < 0 ? (
                          <>
                            Estão sobrando <span className="font-bold text-emerald-700">{Math.abs(diffQty)}</span> vasilhame(s) no descarrego comparado à saída anterior (<span className="font-semibold">{expectedDischarge}</span>).
                          </>
                        ) : (
                          <>
                            Quantidade descarregada coincide com a saída anterior (<span className="font-semibold">{expectedDischarge}</span>).
                          </>
                        )}
                      </p>

                      <div className="space-y-4">
                        {(() => {
                          const cEntry = differenceReasonsBreakdown.find(b => b.reason === 'vasilhame_cliente');
                          const val = cEntry ? cEntry.qty : 0;
                          const comEntry = differenceReasonsBreakdown.find(b => b.reason === 'comodato');
                          const valCom = comEntry ? comEntry.qty : 0;
                          const totalFaltaCarga = Math.max(0, diffQty);
                          return (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-blue-900 uppercase block tracking-tight">
                                      Trouxe Vasilhame de Cliente?
                                    </label>
                                    <span className="text-[9px] text-blue-700 leading-tight block mt-0.5">
                                      Informe vasilhames descarregados recolhidos de clientes.
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-blue-900 font-bold">Quantidade:</span>
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        type="button"
                                        onClick={() => isStage1Editable && handleBreakdownChange('vasilhame_cliente', Math.max(0, val - 1))}
                                        disabled={!isStage1Editable}
                                        className="w-7 h-7 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-black flex items-center justify-center transition-colors disabled:opacity-50"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={!isStage1Editable}
                                        value={val || ''}
                                        onChange={e => handleBreakdownChange('vasilhame_cliente', parseInt(e.target.value, 10))}
                                        className="w-14 border rounded text-xs text-center font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white border-blue-200 py-1"
                                        placeholder="0"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => isStage1Editable && handleBreakdownChange('vasilhame_cliente', val + 1)}
                                        disabled={!isStage1Editable}
                                        className="w-7 h-7 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-black flex items-center justify-center transition-colors disabled:opacity-50"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex flex-col gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-indigo-900 uppercase block tracking-tight">
                                      Retorno de Comodato?
                                    </label>
                                    <span className="text-[9px] text-indigo-700 leading-tight block mt-0.5">
                                      Informe comodatos devolvidos por clientes.
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-indigo-900 font-bold">Quantidade:</span>
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        type="button"
                                        onClick={() => isStage1Editable && handleBreakdownChange('comodato', Math.max(0, valCom - 1))}
                                        disabled={!isStage1Editable}
                                        className="w-7 h-7 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black flex items-center justify-center transition-colors disabled:opacity-50"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={!isStage1Editable}
                                        value={valCom || ''}
                                        onChange={e => handleBreakdownChange('comodato', parseInt(e.target.value, 10))}
                                        className="w-14 border rounded text-xs text-center font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white border-indigo-200 py-1"
                                        placeholder="0"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => isStage1Editable && handleBreakdownChange('comodato', valCom + 1)}
                                        disabled={!isStage1Editable}
                                        className="w-7 h-7 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black flex items-center justify-center transition-colors disabled:opacity-50"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-xs text-amber-900 font-semibold">
                                <div className="flex justify-between items-center">
                                  <span>Falta de vasilhames na carga:</span>
                                  <span className="font-bold font-mono text-sm">{totalFaltaCarga} un</span>
                                </div>
                                <span className="block text-[9px] text-amber-700 leading-tight font-normal mt-1">
                                  Estes {totalFaltaCarga} vasilhames deverão ser justificados (venda / comodato / motorista) durante o acerto de contas.
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Table/Card showing expected, physical, and reconciliation status */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          Resumo e Conciliação da Carga
                        </span>
                      </div>

                      {(() => {
                        const c = differenceReasonsBreakdown.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
                        const com = differenceReasonsBreakdown.find(b => b.reason === 'comodato')?.qty || 0;
                        const totalExpectedDischarge = expectedDischarge + c + com;
                        const totalPhysicalUnloaded = descarregadoQty + effectiveRetornoCheio;
                        const requiredShortage = totalExpectedDischarge - totalPhysicalUnloaded;
                        const isOk = requiredShortage >= 0;
                        
                        return (
                          <div className="flex flex-col gap-4">
                            {/* Math equation summary card */}
                            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col gap-2 font-mono">
                              <div className="flex justify-between">
                                <span>Deveria ter (Saída):</span>
                                <span className="font-bold">{expectedDischarge} un</span>
                              </div>
                              <div className="flex justify-between text-indigo-700">
                                <span>(+) Vasilhames de Cliente:</span>
                                <span className="font-bold">+{c} un</span>
                              </div>
                              <div className="flex justify-between text-indigo-700">
                                <span>(+) Retorno de Comodato:</span>
                                <span className="font-bold">+{com} un</span>
                              </div>
                              <div className="border-t border-slate-200 my-1"></div>
                              <div className="flex justify-between font-bold text-slate-950 text-sm">
                                <span>(=) Total a Descarregar:</span>
                                <span>{totalExpectedDischarge} un</span>
                              </div>
                              <div className="flex justify-between text-emerald-700">
                                <span>(-) Descarregado Vazio:</span>
                                <span className="font-bold">-{descarregadoQty} un</span>
                              </div>
                              {effectiveRetornoCheio > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>(-) Retorno Cheio:</span>
                                  <span className="font-bold">-{effectiveRetornoCheio} un</span>
                                </div>
                              )}
                              <div className="border-t border-slate-200 my-1"></div>
                              {requiredShortage > 0 ? (
                                <div className="flex justify-between text-amber-700 font-bold">
                                  <span>(=) Faltas a Justificar:</span>
                                  <span>{requiredShortage} un</span>
                                </div>
                              ) : requiredShortage < 0 ? (
                                <div className="flex justify-between text-rose-700 font-bold animate-pulse">
                                  <span>(=) Sobra não justificada:</span>
                                  <span>{Math.abs(requiredShortage)} un</span>
                                </div>
                              ) : (
                                <div className="flex justify-between text-emerald-700 font-bold">
                                  <span>(=) Carga 100% Conciliada!</span>
                                  <span>0 un</span>
                                </div>
                              )}
                            </div>

                            {/* Verification Status Banner */}
                            <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${
                              requiredShortage < 0
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : requiredShortage > 0
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}>
                              <div className="flex justify-between items-center font-bold text-xs">
                                <div className="flex items-center gap-1.5">
                                  {requiredShortage < 0 ? (
                                    <span className="text-rose-700">⚠️ Sobra não justificada: {Math.abs(requiredShortage)} un</span>
                                  ) : requiredShortage > 0 ? (
                                    <span>Possui faltas a justificar: <span className="font-mono text-sm">{requiredShortage}</span> un</span>
                                  ) : (
                                    <span>✓ Carga 100% Conciliada!</span>
                                  )}
                                </div>
                                <span className="uppercase text-[9px] tracking-wider bg-white px-2 py-0.5 rounded shadow-sm border font-sans font-black">
                                  {requiredShortage === 0 ? '✓ Tudo Certo' : requiredShortage > 0 ? 'Faltas Pendentes' : 'Ajustar Valores'}
                                </span>
                              </div>
                              <p className="text-[10px] opacity-90 leading-tight font-medium">
                                {requiredShortage < 0
                                  ? 'Aumente o valor de "Trouxe Vasilhame de Cliente" para justificar a sobra.'
                                  : requiredShortage > 0
                                    ? 'Estas faltas serão mostradas e justificadas pelo motorista na etapa de Prestação de Contas.'
                                    : 'A quantidade descarregada bate perfeitamente com a saída e retorno do veículo.'
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

              {/* Quick reference for loaded vehicles in Carregamento phase */}
              {(focusPhase === 'carregamento' || focusPhase === 'all') && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Resumo da Entrada</h4>
                    <p className="text-xs text-indigo-700 mt-0.5">Vasilhames já contados no descarrego do veículo.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-3xs text-center">
                      <div className="text-[10px] uppercase text-slate-400 font-bold leading-none">Descarregado</div>
                      <div className="text-sm font-black text-indigo-700 font-mono mt-0.5">{descarregadoQty} un</div>
                    </div>
                    {formula && (
                      <div className="bg-white/80 px-2.5 py-1 rounded border border-indigo-100 text-[10px] text-slate-500 font-mono font-bold leading-none self-center">
                        ({formula})
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Core Flow Inputs Grid */}
              <div className="space-y-4">
                
                <div className={`grid grid-cols-1 ${focusPhase === 'all' || currentStep === 'concluido' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-5`}>
                  
                  {/* ETAPA 1: DESCARREGAMENTO */}
                  {(focusPhase === 'descarregamento' || focusPhase === 'all' || currentStep === 'concluido') && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      1. Descarregamento (Entrada)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">Contagem de Vasilhames</span>
                  </div>

                  {/* Keyboard friendly Adder (Enter triggers saves) */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Digitar Quantidade e Teclar [Enter]:
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={numInput}
                          disabled={!isStage1Editable}
                          onChange={e => setNumInput(e.target.value)}
                          onKeyDown={handleNumInputKeyDown}
                          placeholder={!isStage1Editable ? "Etapa concluída ou pendente - Visualização" : "Digite quantidade (ex: 140) e dê Enter"}
                          className={`w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold ${!isStage1Editable ? 'bg-slate-50 cursor-not-allowed border-slate-200 text-slate-400' : ''}`}
                          autoFocus={focusPhase === 'descarregamento' && isStage1Editable}
                        />
                        {numInput && isStage1Editable && (
                          <button
                            type="button"
                            onClick={addNumberedLot}
                            className="absolute right-1.5 top-1 px-2.5 py-1 text-[9px] uppercase font-bold bg-blue-50 text-blue-700 rounded hover:bg-blue-105"
                          >
                            + Adicionar
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 rounded-lg flex items-center justify-center font-mono font-black text-xs min-w-[80px]">
                        = {descarregadoQty}
                      </div>
                    </div>

                    {/* Chips showing current inputs */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-h-[45px] flex flex-wrap gap-1.5 items-center">
                      {numbers.length === 0 ? (
                        <span className="text-[10px] text-slate-400 font-medium">Digite os valores e aperte Enter para somar os lotes.</span>
                      ) : (
                        numbers.map((val, idx) => (
                          <span 
                            key={idx} 
                            onClick={() => isStage1Editable && removeNumberIndex(idx)}
                            className={`inline-flex items-center gap-1 bg-white border border-slate-300 font-mono font-black text-xs px-2 py-1 rounded-md shadow-3xs select-none transition-all ${
                              !isStage1Editable 
                                ? 'text-slate-500 cursor-not-allowed border-slate-200' 
                                : 'hover:border-red-300 hover:bg-red-50 text-slate-800 hover:text-red-700 cursor-pointer group'
                            }`}
                            title={!isStage1Editable ? undefined : "Remover Lote"}
                          >
                            {val}
                            {isStage1Editable && <span className="text-slate-300 group-hover:text-red-500 text-[10px] font-normal font-sans ml-1">×</span>}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Manual formula string reference */}
                  <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      Código de Cálculo Manual (Referência):
                    </label>
                    <input
                      type="text"
                      value={formula}
                      disabled={!isStage1Editable}
                      onChange={handleFormulaChange}
                      placeholder="Fórmula gerada automaticamente (pode ser editada)"
                      className={`w-full text-xs py-1 border-none bg-transparent focus:outline-none font-mono text-slate-705 ${!isStage1Editable ? 'cursor-not-allowed text-slate-400' : ''}`}
                    />
                  </div>

                  {/* Retorno de Vasilhame Cheio Option */}
                  {isProprio && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-amber-50/50 border border-amber-200/60 p-3 rounded-lg flex flex-col gap-1">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Retorno de Vasilhame Cheio:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={retornoVasilhameCheio || ''}
                            disabled={!isStage1Editable}
                            onChange={e => setRetornoVasilhameCheio(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            placeholder={!isStage1Editable ? "Zero" : "Qtd de vasilhames cheios retornados"}
                            className={`flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold ${!isStage1Editable ? 'bg-slate-50 cursor-not-allowed border-slate-200 text-slate-400' : ''}`}
                          />
                        </div>
                        <span className="text-[9px] text-amber-700/80 font-medium">
                          Indica que o vasilhame retornou cheio e, portanto, <strong className="font-bold">não foi feita a venda da água</strong>.
                        </span>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-200/60 p-3 rounded-lg flex flex-col gap-1">
                        <label className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Retirar Vasilhame da Carga:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={retiradaVasilhameCarga || ''}
                            disabled={isConcluded || isReadOnly}
                            onChange={e => setRetiradaVasilhameCarga(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            placeholder="Qtd de vasilhames retirados da carga"
                            className={`flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold ${(isConcluded || isReadOnly) ? 'bg-slate-50 cursor-not-allowed border-slate-200 text-slate-400' : ''}`}
                          />
                        </div>
                        <span className="text-[9px] text-indigo-700/80 font-medium">
                          Retira vasilhames da carga diretamente para o <strong className="font-bold">estoque de vasilhame de rota</strong> (reduz o total carregado).
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Damages at descarregamento */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Avarias no Descarregamento (Vasilhames Retirados)
                    </span>
                    
                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs bg-white">
                      {avariasDesc.map((a, idx) => {
                        if (!isProprio && isProprioOnlyAvariaType(a.type)) return null;
                        return (
                          <div key={`${a.type}-${idx}`} className="flex items-center justify-between p-2 hover:bg-slate-50/50">
                            <span className="capitalize font-medium text-slate-700 flex items-center gap-1.5">
                              {isPurchaseType(a.type, customAvariaTypes) ? (
                                <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 px-1 py-0.2 rounded uppercase border border-emerald-100 flex items-center gap-0.5">
                                  ➕ Adição de Carga
                                </span>
                              ) : (
                                <span className="text-red-500 font-bold text-[10px] bg-red-50 px-1 py-0.2 rounded uppercase border border-red-100">
                                  Avaria
                                </span>
                              )}
                              {a.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => isStage1Editable && updateAvariaQty(a.type, -1, 'desc')}
                                disabled={!isStage1Editable}
                                className={`w-6 h-6 rounded font-black text-center flex items-center justify-center select-none ${
                                  !isStage1Editable 
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer'
                                }`}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                disabled={!isStage1Editable}
                                value={a.qty || ''}
                                placeholder="0"
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  setAvariaQtyDirectly(a.type, isNaN(val) ? 0 : val, 'desc');
                                }}
                                className="w-12 text-center font-mono font-bold text-slate-800 text-xs bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                              />
                              <button 
                                onClick={() => isStage1Editable && updateAvariaQty(a.type, 1, 'desc')}
                                disabled={!isStage1Editable}
                                className={`w-6 h-6 rounded font-black text-center flex items-center justify-center select-none ${
                                  !isStage1Editable 
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer'
                                }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Photo Component Descarregamento */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Registro Fotográfico (Avarias Descarregamento)
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {isStage1Editable && (
                        <label className="cursor-pointer shrink-0 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                          <Camera size={14} />
                          Adicionar Foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => handlePhotoUpload(e, 'desc')}
                            className="hidden"
                          />
                        </label>
                      )}
                      
                      {avariasDescPhoto ? (
                        <div className="flex flex-wrap gap-2">
                          {avariasDescPhoto.split('||').filter(Boolean).map((photo, index) => (
                            <div key={index} className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden group">
                              <img 
                                src={photo} 
                                alt={`Discharge Damage ${index + 1}`} 
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer"
                                onClick={() => setActiveLightboxPhoto(photo)}
                              />
                              {isStage1Editable && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const array = avariasDescPhoto.split('||').filter(Boolean);
                                    array.splice(index, 1);
                                    setAvariasDescPhoto(array.join('||'));
                                  }}
                                  className="absolute inset-0 bg-red-500/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                                  title="Remover Foto"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Nenhuma foto adicionada</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

                  {/* ETAPA 2: PRODUÇÃO & CARREGAMENTO */}
                  {(focusPhase === 'carregamento' || focusPhase === 'all' || currentStep === 'concluido') && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      2. Carga / Envase (Produção)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">Vasilhames Envasados</span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    Registre as perdas ocorridas por quebras operacionais durante o envase, testes de laboratório ou carregamento final.
                  </p>

                  {/* Damages list carregamento */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Avarias no Envase, Carga ou Perdas
                    </span>

                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs bg-white">
                      {avariasCarreg.map((c, idx) => {
                        if (!isProprio && isProprioOnlyAvariaType(c.type)) return null;
                        return (
                          <div key={`${c.type}-${idx}`} className="flex items-center justify-between p-2 hover:bg-slate-50/50">
                            <span className="capitalize font-medium text-slate-700 flex items-center gap-1.5">
                              {isPurchaseType(c.type, customAvariaTypes) ? (
                                <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 px-1 py-0.2 rounded uppercase border border-emerald-100 flex items-center gap-0.5">
                                  ➕ Adição de Carga
                                </span>
                              ) : (
                                <span className="text-red-500 font-bold text-[10px] bg-red-50 px-1 py-0.2 rounded uppercase border border-red-100">
                                  Avaria
                                </span>
                              )}
                              {c.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => isStage2Editable && updateAvariaQty(c.type, -1, 'carreg')}
                                disabled={!isStage2Editable}
                                className={`w-6 h-6 rounded font-black text-center flex items-center justify-center select-none ${
                                  !isStage2Editable 
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer'
                                }`}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                disabled={!isStage2Editable}
                                value={c.qty || ''}
                                placeholder="0"
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  setAvariaQtyDirectly(c.type, isNaN(val) ? 0 : val, 'carreg');
                                }}
                                className="w-12 text-center font-mono font-bold text-slate-800 text-xs bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                              />
                              <button 
                                onClick={() => isStage2Editable && updateAvariaQty(c.type, 1, 'carreg')}
                                disabled={!isStage2Editable}
                                className={`w-6 h-6 rounded font-black text-center flex items-center justify-center select-none ${
                                  !isStage2Editable 
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer'
                                }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Photo component carregamento */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 bg-white p-1 rounded-lg">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Registro Fotográfico (Ocorrências de Carregamento)
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {isStage2Editable && (
                        <label className="cursor-pointer shrink-0 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                          <Camera size={14} />
                          Adicionar Foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => handlePhotoUpload(e, 'carreg')}
                            className="hidden"
                          />
                        </label>
                      )}
                      
                      {avariasCarregPhoto ? (
                        <div className="flex flex-wrap gap-2">
                          {avariasCarregPhoto.split('||').filter(Boolean).map((photo, index) => (
                            <div key={index} className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden group">
                              <img 
                                src={photo} 
                                alt={`Loading Damage ${index + 1}`} 
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer"
                                onClick={() => setActiveLightboxPhoto(photo)}
                              />
                              {isStage2Editable && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const array = avariasCarregPhoto.split('||').filter(Boolean);
                                    array.splice(index, 1);
                                    setAvariasCarregPhoto(array.join('||'));
                                  }}
                                  className="absolute inset-0 bg-red-500/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                                  title="Remover Foto"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Nenhuma foto adicionada</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>



            {/* Observations */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Observações Gerais do Controle de Produção
              </label>
              <textarea
                value={observacoes}
                disabled={isConcluded}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: vasilhames com alta sujidade descartados, observações sobre avarias..."
                rows={2}
                className={`w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1 ${isConcluded ? 'bg-slate-50 cursor-not-allowed border-slate-205 text-slate-400' : ''}`}
              />
            </div>

            {/* Equation calculation preview */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col gap-4">
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <Sparkles size={12} className="text-blue-400" />
                Matemática de Carga Real-Time
              </div>

              <div className={`grid grid-cols-2 ${isProprio ? 'sm:grid-cols-7' : 'sm:grid-cols-5'} gap-3 text-center text-xs font-sans items-center`}>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Descarregado</span>
                  <span className="text-lg font-black text-slate-100 font-mono">{descarregadoQty}</span>
                </div>
                {isProprio && (
                  <>
                    <div className="hidden sm:flex text-slate-500 font-black text-xl justify-center select-none">-</div>
                    <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/40 flex flex-col gap-1">
                      <span className="text-[9px] text-indigo-300 uppercase font-black">Retirada Rota</span>
                      <span className="text-lg font-black text-indigo-300 font-mono">{retiradaVasilhameCarga || 0}</span>
                    </div>
                  </>
                )}
                <div className="hidden sm:flex text-slate-500 font-black text-xl justify-center select-none">-</div>
                <div className="bg-red-950/40 p-3 rounded-xl border border-red-900/40 flex flex-col gap-1">
                  <span className="text-[9px] text-red-300 uppercase font-black">Avarias</span>
                  <span className="text-lg font-black text-red-300 font-mono">{(descLosses + carregLosses)}</span>
                </div>
                <div className="hidden sm:flex text-slate-500 font-black text-xl justify-center select-none">+</div>
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-950 flex flex-col gap-1">
                  <span className="text-[9px] text-emerald-300 uppercase font-black">Novos Comprados</span>
                  <span className="text-lg font-black text-emerald-300 font-mono">{(descPurchases + carregPurchases)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Carga do Veículo</div>
                  <div className="text-sm font-semibold text-slate-200">
                    {effectiveRetornoCheio > 0 
                      ? 'Produção Nova / Carregamento e Saída Total' 
                      : 'Total Líquido Estimado a ser Carregado (20L)'}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <div className="bg-blue-600 border border-blue-500 text-white font-black rounded-2xl px-5 py-2.5 shadow-md flex items-center gap-2.5">
                    <Droplet className="fill-current text-white shrink-0" size={20} />
                    <div className="text-right">
                      <div className="text-[20px] leading-none tracking-tight font-mono font-black">{totalCarregado}</div>
                      <div className="text-[8px] uppercase tracking-widest font-extrabold mt-0.5">Produzido</div>
                    </div>
                  </div>
                  
                  {effectiveRetornoCheio > 0 && (
                    <div className="bg-emerald-600 border border-emerald-500 text-white font-black rounded-2xl px-5 py-2.5 shadow-md flex items-center gap-2.5">
                      <Droplet className="fill-current text-white shrink-0" size={20} />
                      <div className="text-right">
                        <div className="text-[20px] leading-none tracking-tight font-mono font-black">{totalCarregado + effectiveRetornoCheio}</div>
                        <div className="text-[8px] uppercase tracking-widest font-extrabold mt-0.5">Saída Veículo</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center gap-2">
            {(currentStep === 'concluido' || isConcluded || (vehicle.productionControl?.descarregadoQty && vehicle.productionControl.descarregadoQty > 0) || descarregadoQty > 0) && (
              <button
                type="button"
                onClick={() => setShowPrintSlip(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={14} />
                Gerar Comprovante / PDF
              </button>
            )}

            {canRevert && (
              <button
                type="button"
                onClick={() => setShowRevertModal(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Estornar/reverter de ${revertSourceLabel} para ${revertTargetLabel}`}
              >
                ↩️ Estornar Processo
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {!isConcluded && (
              <>
                {/* Salvar Parcialmente */}
                {(focusPhase === 'descarregamento' || focusPhase === 'carregamento') && (
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Salvar lançamento parcial sem avançar de etapa no Kanban"
                  >
                    Salvar Parcial 💾
                  </button>
                )}
                
                {focusPhase === 'descarregamento' ? (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle size={15} />
                    Concluir Descarregamento ➡️
                  </button>
                ) : focusPhase === 'carregamento' ? (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle size={15} />
                    Salvar & Concluir Carregamento ✅
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle size={15} />
                    Salvar Produção
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Revert / Estorno Modal Overlay */}
      {showRevertModal && (
        <div className="fixed inset-0 z-56 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={16} /> Estornar Processo de Produção
              </span>
              <button 
                onClick={() => { setShowRevertModal(false); setRevertReason(''); setRevertError(null); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Esta ação irá reverter o status deste veículo de <strong className="text-slate-900 font-bold">{revertSourceLabel}</strong> de volta para a etapa de <strong className="text-slate-900 font-bold">{revertTargetLabel}</strong>, permitindo que novas alterações sejam feitas na produção.
              </p>
              
              <div className="mb-4">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Motivo do Estorno (Obrigatório) *
                </label>
                <textarea
                  rows={3}
                  value={revertReason}
                  onChange={(e) => {
                    setRevertReason(e.target.value);
                    if (e.target.value.trim()) setRevertError(null);
                  }}
                  placeholder="Por favor, informe detalhadamente o motivo para realizar o estorno deste processo..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                {revertError && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold">{revertError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setShowRevertModal(false); setRevertReason(''); setRevertError(null); }} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (!revertReason.trim()) {
                      setRevertError('O motivo do estorno é obrigatório.');
                      return;
                    }
                    const newLog = {
                      revertedBy: currentUser?.name || 'Sistema',
                      revertedAt: new Date().toISOString(),
                      revertReason: revertReason.trim(),
                      fromStep: currentStep,
                      toStep: revertTargetStep
                    };
                    const existingReverts = liveVehicle.productionReverts || [];
                    const updatedReverts = [...existingReverts, newLog];

                    // Execute Revert to target step and save fields plus audit log
                    const stepName = revertTargetStep === 'aguardando_descarregamento' ? 'Fila p/ Descarr.' 
                      : revertTargetStep === 'descarregamento' ? 'Oper. Descarreg.' 
                      : revertTargetStep === 'carregamento' ? 'Oper. Carreg.' 
                      : revertTargetStep;

                    updateMovementDetails(liveVehicle.id, { 
                      kanbanStep: revertTargetStep, 
                      status: 'na_fila',
                      productionReverted: true, 
                      productionRevertReason: revertReason.trim(), 
                      productionRevertBy: currentUser?.name || 'Sistema', 
                      productionRevertAt: new Date().toISOString(),
                      productionReverts: updatedReverts,
                      wasEdited: true,
                      editedAt: new Date().toISOString(),
                      editedBy: currentUser?.name || 'Sistema',
                      editReason: revertReason.trim(),
                      alteredFields: `Estorno Kanban para: ${stepName}`
                    });
                    
                    setShowRevertModal(false);
                    setRevertReason('');
                    setRevertError(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer transition-colors"
                >
                  Confirmar Estorno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeLightboxPhoto && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setActiveLightboxPhoto(null)}
              className="text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-full cursor-pointer transition-colors"
              title="Fechar Visualização"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-full max-h-[85vh] flex items-center justify-center">
            <img 
              src={activeLightboxPhoto} 
              alt="Visualização Ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded border border-slate-800" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

    </div>
  );
};
