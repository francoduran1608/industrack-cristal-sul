import React, { useState, useEffect, useRef } from 'react';
import { useStore, getProductionCode } from '../store';
import { 
  Package, 
  Box,
  Truck, 
  Users,
  Receipt, 
  Plus, 
  Trash2, 
  PackageOpen, 
  Info, 
  CreditCard, 
  Banknote, 
  Landmark, 
  FileText, 
  Calendar, 
  Gift, 
  RefreshCw, 
  Coins, 
  Eye, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  CheckCircle,
  X, 
  AlertTriangle,
  Printer,
  Lock,
  Edit2
} from 'lucide-react';
import { SettlementSale, SettlementExpense, Movement, DriverSettlement } from '../types';
import { SignaturePad } from '../components/SignaturePad';
import { printElementDirectly } from '../utils/printReceipt';

interface GroupedSale {
  saleNumber: string;
  clientName: string;
  products: {
    itemDisplayName: string;
    qty: number;
    unitPrice: number;
    productType?: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca';
    exchangeRatio?: number;
  }[];
  payments: {
    method: string;
    amount: number;
    note?: string;
  }[];
  totalValue: number;
  rawIds: string[];
  signature?: string;
}

function groupSales(salesList: SettlementSale[]): GroupedSale[] {
  const groups: Record<string, SettlementSale[]> = {};
  const ungrouped: SettlementSale[] = [];

  salesList.forEach(s => {
    if (s.saleNumber) {
      if (!groups[s.saleNumber]) {
        groups[s.saleNumber] = [];
      }
      groups[s.saleNumber].push(s);
    } else {
      ungrouped.push(s);
    }
  });

  const result: GroupedSale[] = [];

  // Process grouped sales
  Object.entries(groups).forEach(([saleNumber, items]) => {
    const firstItem = items[0];
    const clientName = firstItem.clientName || (firstItem.item.includes(' - ') ? firstItem.item.split(' - ')[0] : firstItem.item);
    const signature = items.find(i => i.signature)?.signature;

    const productsMap: Record<string, { itemDisplayName: string; qty: number; unitPrice: number; productType?: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca'; exchangeRatio?: number }> = {};
    items.forEach(item => {
      let itemDisplayName = item.item;
      if (item.clientName && item.item.startsWith(item.clientName + ' - ')) {
        itemDisplayName = item.item.substring(item.clientName.length + 3);
      } else if (item.item.includes(' - ')) {
        itemDisplayName = item.item.split(' - ').slice(1).join(' - ');
      }
      const key = itemDisplayName + '_' + (item.productType || '');
      if (!productsMap[key]) {
        productsMap[key] = {
          itemDisplayName,
          qty: 0,
          unitPrice: item.value,
          productType: item.productType as any,
          exchangeRatio: item.exchangeRatio
        };
      }
      productsMap[key].qty += item.qty;
    });

    const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
    items.forEach(item => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
      if (isZeroVal) return;

      if (item.paymentsBreakdown) {
        const bd = item.paymentsBreakdown;
        const methodsToProcess: Array<{ m: string; amt: number }> = [];
        if ((bd.dinheiro || 0) > 0) methodsToProcess.push({ m: 'dinheiro', amt: bd.dinheiro });
        if ((bd.pix || 0) > 0) methodsToProcess.push({ m: 'pix', amt: bd.pix });
        if ((bd.boleto || 0) > 0) methodsToProcess.push({ m: 'boleto', amt: bd.boleto });
        if ((bd.cheque || 0) > 0) methodsToProcess.push({ m: 'cheque', amt: bd.cheque });
        if ((bd.outros || 0) > 0) methodsToProcess.push({ m: 'outros', amt: bd.outros });

        methodsToProcess.forEach(({ m, amt }) => {
          if (!paymentsMap[m]) {
            paymentsMap[m] = {
              method: m,
              amount: 0,
              note: item.paymentMethodNote
            };
          }
          paymentsMap[m].amount += amt;
        });
      } else {
        const method = (item.paymentMethod || 'dinheiro').toLowerCase().trim();
        const amount = item.qty * item.value;
        
        if (!paymentsMap[method]) {
          paymentsMap[method] = {
            method,
            amount: 0,
            note: item.paymentMethodNote
          };
        }
        paymentsMap[method].amount += amount;
      }
    });

    const totalValue = items.reduce((sum, item) => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
      return sum + (isZeroVal ? 0 : item.qty * item.value);
    }, 0);

    result.push({
      saleNumber,
      clientName,
      products: Object.values(productsMap),
      payments: Object.values(paymentsMap),
      totalValue,
      rawIds: items.map(i => i.id),
      signature
    });
  });

  // Process ungrouped sales
  ungrouped.forEach(s => {
    const clientName = s.clientName || (s.item.includes(' - ') ? s.item.split(' - ')[0] : s.item);
    let itemDisplayName = s.item;
    if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
      itemDisplayName = s.item.substring(s.clientName.length + 3);
    } else if (s.item.includes(' - ')) {
      itemDisplayName = s.item.split(' - ').slice(1).join(' - ');
    }
    const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.productType === 'troca' || s.item.toLowerCase().includes('bonifica') || s.item.toLowerCase().includes('comodato') || s.item.toLowerCase().includes('retorno') || s.item.toLowerCase().includes('troca');
    
    result.push({
      saleNumber: 'S/N',
      clientName,
      products: [{
        itemDisplayName,
        qty: s.qty,
        unitPrice: s.value,
        productType: s.productType as any,
        exchangeRatio: s.exchangeRatio
      }],
      payments: isZeroVal ? [] : (s.paymentsBreakdown ? (() => {
        const list: Array<{ method: string; amount: number; note?: string }> = [];
        const bd = s.paymentsBreakdown;
        if ((bd.dinheiro || 0) > 0) list.push({ method: 'dinheiro', amount: bd.dinheiro, note: s.paymentMethodNote });
        if ((bd.pix || 0) > 0) list.push({ method: 'pix', amount: bd.pix, note: s.paymentMethodNote });
        if ((bd.boleto || 0) > 0) list.push({ method: 'boleto', amount: bd.boleto, note: s.paymentMethodNote });
        if ((bd.cheque || 0) > 0) list.push({ method: 'cheque', amount: bd.cheque, note: s.paymentMethodNote });
        if ((bd.outros || 0) > 0) list.push({ method: 'outros', amount: bd.outros, note: s.paymentMethodNote });
        return list;
      })() : [{
        method: s.paymentMethod || 'dinheiro',
        amount: s.qty * s.value,
        note: s.paymentMethodNote
      }]),
      totalValue: isZeroVal ? 0 : s.qty * s.value,
      rawIds: [s.id],
      signature: s.signature
    });
  });

  return result;
}

interface CartProduct {
  productType: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca';
  qty: number;
  unitPrice: number;
  exchangeRatio?: number;
  exchangeAvariasQty?: number;
}

export const MinhaViagem: React.FC = () => {
  const { 
    movements, 
    updateMovementDetails, 
    currentUser, 
    driverSettlements, 
    registeredClients = [], 
    companyLogo,
    preSales = [],
    addPreSale,
    updatePreSale,
    deletePreSale,
    registeredDrivers = [],
    registeredSupervisors = [],
    registeredVehicles = [],
    driverTripLoads = [],
    driverTripDeliveries = [],
    updateDriverTripLoad,
    addDriverTripDelivery,
    disposableProducts = []
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'viagem' | 'prevenda' | 'relatorio'>(
    currentUser?.role === 'supervisor' ? 'prevenda' : 'viagem'
  );

  // Helper to get return movement for a departure
  const getReturnMovement = React.useCallback((mov: any) => {
    if (!mov) return null;
    if (mov.type === 'entrada') return mov;
    
    const refTime = new Date(mov.exitTimestamp || mov.timestamp).getTime();
    const plateLower = mov.plate.toLowerCase();
    
    const returns = movements.filter(m => 
      m.id !== mov.id &&
      m.plate.toLowerCase() === plateLower && 
      new Date(m.entryTimestamp || m.timestamp).getTime() > refTime
    );
    
    if (returns.length === 0) return null;
    returns.sort((a, b) => new Date(a.entryTimestamp || a.timestamp).getTime() - new Date(b.entryTimestamp || b.timestamp).getTime());
    
    const candidate = returns[0];
    const candidateTime = new Date(candidate.entryTimestamp || candidate.timestamp).getTime();
    
    // Check if there is another 'saida' movement of the same plate between mov and candidate
    const hasIntermediateSaida = movements.some(m => 
      m.type === 'saida' &&
      m.plate.toLowerCase() === plateLower &&
      m.id !== mov.id &&
      m.id !== candidate.id &&
      (() => {
        const t = new Date(m.exitTimestamp || m.timestamp).getTime();
        return t > refTime && t < candidateTime;
      })()
    );
    
    if (hasIntermediateSaida) return null;
    
    return candidate;
  }, [movements]);

  // Helper to determine if a movement is fully settled (finalized with status 'completed')
  const isTripSettled = React.useCallback((m: any) => {
    if (!m) return false;
    
    // 1. Direct match by movement ID (checking both raw and prefixed IDs)
    const directSettlement = driverSettlements.find(ds => 
      ds.status === 'completed' && (ds.movementId === m.id || ds.movementId === `settled-${m.id}`)
    );
    if (directSettlement) return true;

    // 2. If it is an 'entrada', check if its preceding 'saida' is settled
    if (m.type === 'entrada') {
      const departures = movements.filter(x => 
        x.type === 'saida' &&
        x.plate.toLowerCase() === m.plate.toLowerCase() && 
        x.id !== m.id &&
        new Date(x.exitTimestamp || x.timestamp).getTime() < new Date(m.entryTimestamp || m.timestamp).getTime()
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
  }, [driverSettlements, movements]);

  // Find own active trip (exclude if already fully settled/completed)
  const ownTrip = movements.filter(m => 
    m.driver.toLowerCase() === currentUser?.name.toLowerCase() && 
    m.type === 'saida' &&
    !isTripSettled(m)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // List all active (non-settled) exit movements for simulation/admin view
  const adminTrips = React.useMemo(() => {
    return movements.filter(m => 
      m.type === 'saida' &&
      !isTripSettled(m)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, isTripSettled]);

  // List all exit movements of this driver (only non-settled ones are active)
  const driverTrips = React.useMemo(() => {
    return movements.filter(m => 
      m.driver.toLowerCase() === currentUser?.name.toLowerCase() && 
      m.type === 'saida' &&
      !isTripSettled(m)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, currentUser?.name, isTripSettled]);

  const isAdminOrOperator = currentUser?.role === 'admin' || currentUser?.role === 'operador' || currentUser?.role === 'supervisor';

  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // Determine active trip being viewed/edited
  const activeTrip = isAdminOrOperator
    ? (adminTrips.find(t => t.id === selectedTripId) || ownTrip || adminTrips.find(t => !isTripSettled(t)) || adminTrips[0])
    : (driverTrips.find(t => t.id === selectedTripId) || ownTrip || driverTrips[0]);

  // Check if a finalized driver settlement exists for this activeTrip
  const isSettled = React.useMemo(() => {
    return isTripSettled(activeTrip);
  }, [activeTrip, isTripSettled]);

  const returnMovement = React.useMemo(() => {
    return getReturnMovement(activeTrip);
  }, [activeTrip, getReturnMovement]);

  const isUnloaded = React.useMemo(() => {
    if (!returnMovement) return false;
    const currentStep = returnMovement.kanbanStep || 'aguardando_descarregamento';
    return returnMovement.type === 'saida' || returnMovement.bypassProduction || (currentStep !== 'aguardando_descarregamento' && currentStep !== 'descarregamento');
  }, [returnMovement]);

  const isReadOnly = activeTrip 
    ? (
        currentUser?.role === 'supervisor' ||
        currentUser?.role === 'visualizador' ||
        // Not own driver and not admin/operator
        (activeTrip.driver.toLowerCase() !== currentUser?.name.toLowerCase() && !isAdminOrOperator) ||
        // Is settled (even for non-admins)
        isSettled ||
        // Is own driver, but already returned and finished unloading
        (activeTrip.driver.toLowerCase() === currentUser?.name.toLowerCase() && !isAdminOrOperator && returnMovement && isUnloaded)
      ) 
    : true;

  const readOnlyReason = React.useMemo(() => {
    if (!activeTrip) return '';
    if (activeTrip.driver.toLowerCase() !== currentUser?.name.toLowerCase() && !isAdminOrOperator) {
      return 'outro_motorista';
    }
    if (isSettled) {
      return 'acertada';
    }
    if (activeTrip.driver.toLowerCase() === currentUser?.name.toLowerCase() && !isAdminOrOperator && returnMovement && isUnloaded) {
      return 'retornada_e_descarregada';
    }
    return '';
  }, [activeTrip, currentUser?.name, isAdminOrOperator, isSettled, returnMovement, isUnloaded]);

  useEffect(() => {
    if (!isAdminOrOperator) {
      const validIds = driverTrips.map(t => t.id);
      if (ownTrip && !validIds.includes(selectedTripId)) {
        setSelectedTripId(ownTrip.id);
      } else if (!ownTrip && validIds.length > 0 && !validIds.includes(selectedTripId)) {
        setSelectedTripId(driverTrips[0].id);
      } else if (validIds.length === 0) {
        setSelectedTripId('');
      }
    } else {
      if (ownTrip && ownTrip.id !== selectedTripId) {
        setSelectedTripId(ownTrip.id);
      } else if (activeTrip && !selectedTripId) {
        setSelectedTripId(activeTrip.id);
      }
    }
  }, [ownTrip?.id, activeTrip?.id, driverTrips, isAdminOrOperator, selectedTripId]);

  const [sales, setSales] = useState<SettlementSale[]>([]);
  const [expenses, setExpenses] = useState<SettlementExpense[]>([]);

  const [comodatoQty, setComodatoQty] = useState(0);
  const [comodatoReturnQty, setComodatoReturnQty] = useState(0);
  const [bonificationQty, setBonificationQty] = useState(0);
  
  // Cart state for multi-product checkout
  const [clientName, setClientName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [linkedPreSaleId, setLinkedPreSaleId] = useState<string | null>(null);

  // Pre-sale specific local state
  const [preSaleClientName, setPreSaleClientName] = useState('');
  const [preSaleShowClientDropdown, setPreSaleShowClientDropdown] = useState(false);
  const [preSaleCart, setPreSaleCart] = useState<CartProduct[]>([]);
  const [preSaleQty, setPreSaleQty] = useState<number | ''>('');
  const [preSaleValue, setPreSaleValue] = useState<number | ''>('');
  const [preSaleProductType, setPreSaleProductType] = useState<'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca'>('agua');
  const [preSaleExchangeRatio, setPreSaleExchangeRatio] = useState<number | ''>(4);
  const [selectedPreSaleDriver, setSelectedPreSaleDriver] = useState<string>('');
  const [selectedPreSaleSupervisor, setSelectedPreSaleSupervisor] = useState<string>('');
  const [assigningPreSale, setAssigningPreSale] = useState<import('../types').PreSale | null>(null);
  const [assignDriverName, setAssignDriverName] = useState<string>('');
  const [assignVehiclePlate, setAssignVehiclePlate] = useState<string>('');

  // Sync selectedPreSaleDriver with activeTrip's driver and auto-fill supervisor for supervisor users
  React.useEffect(() => {
    if (currentUser?.role === 'supervisor' && !selectedPreSaleSupervisor) {
      setSelectedPreSaleSupervisor(currentUser.name);
    }
    if (activeTrip && !selectedPreSaleDriver) {
      setSelectedPreSaleDriver(activeTrip.driver);
    }
  }, [activeTrip, selectedPreSaleDriver, selectedPreSaleSupervisor, currentUser]);
  
  // Adding product state inside the checkout
  const [newSaleQty, setNewSaleQty] = useState<number | ''>('');
  const [newSaleValue, setNewSaleValue] = useState<number | ''>('');
  const [newSaleProductType, setNewSaleProductType] = useState<'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca'>('agua');
  const [newSaleExchangeRatio, setNewSaleExchangeRatio] = useState<number | ''>(4);
  
  // Split payment state
  const [payDinheiro, setPayDinheiro] = useState<string>('');
  const [payPix, setPayPix] = useState<string>('');
  const [payBoleto, setPayBoleto] = useState<string>('');
  const [payCheque, setPayCheque] = useState<string>('');
  const [payOutros, setPayOutros] = useState<string>('');
  const [payOutrosNote, setPayOutrosNote] = useState<string>('');
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [lastSaleForPrint, setLastSaleForPrint] = useState<{saleNumber: string, sales: SettlementSale[]} | null>(null);

  const [newExpenseItem, setNewExpenseItem] = useState('');
  const [newExpenseValue, setNewExpenseValue] = useState<number | ''>(0);

  // Currency masking and auto-formating (0,00 format without typing comma)
  const [useEasyMask, setUseEasyMask] = useState<boolean>(true);

  // Inline edit state for pre-sale cart
  const [editingPreSaleCartIdx, setEditingPreSaleCartIdx] = useState<number | null>(null);
  const [editingPreSaleQty, setEditingPreSaleQty] = useState<number>(1);
  const [editingPreSaleValueState, setEditingPreSaleValueState] = useState<number | ''>('');

  // Inline edit state for checkout cart
  const [editingCartIdx, setEditingCartIdx] = useState<number | null>(null);
  const [editingCartQty, setEditingCartQty] = useState<number>(1);
  const [editingCartPrice, setEditingCartPrice] = useState<number | ''>('');

  const getSafeStockAgua = () => {
    if (!activeTrip) return 0;
    const productionCarregado = activeTrip.productionControl?.totalCarregado || 0;
    const retornoVasilhameCheio = activeTrip.productionControl?.retornoVasilhameCheio || 0;
    const stockCarregado = productionCarregado + retornoVasilhameCheio;

    const totalSoldAguaNormal = sales
      .filter(s => s.productType === 'agua' || (s.productType === undefined && (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua')) && !s.item.toLowerCase().includes('bonifica')))
      .reduce((acc, s) => acc + s.qty, 0);

    const totalSoldAguaTroca = sales
      .filter(s => s.productType === 'troca')
      .reduce((acc, s) => acc + s.qty, 0);

    const totalSoldAgua = totalSoldAguaNormal + totalSoldAguaTroca;

    return Math.max(0, stockCarregado - totalSoldAgua - bonificationQty);
  };

  const isDriverUser = currentUser?.role === 'motorista';

  // Helper to strictly match a pre-sale to the logged in driver
  const isPreSaleForCurrentDriver = React.useCallback((pDriverName?: string | null) => {
    if (!pDriverName) return false;
    const cleanP = pDriverName.trim().toLowerCase();
    if (currentUser?.name && cleanP === currentUser.name.trim().toLowerCase()) return true;
    if (activeTrip?.driver && cleanP === activeTrip.driver.trim().toLowerCase()) return true;
    if ((activeTrip as any)?.driverName && cleanP === (activeTrip as any).driverName.trim().toLowerCase()) return true;
    return false;
  }, [currentUser?.name, activeTrip]);

  const driverNameForPreSales = isDriverUser 
    ? (currentUser?.name || activeTrip?.driver || (activeTrip as any)?.driverName || '') 
    : (selectedPreSaleDriver || '');

  const pendingPreSales = preSales.filter(p => {
    if (p.isUsed || p.deleted) return false;
    if (isDriverUser) {
      return isPreSaleForCurrentDriver(p.driverName);
    }
    if (selectedPreSaleSupervisor && p.supervisorName !== selectedPreSaleSupervisor) {
      return false;
    }
    if (selectedPreSaleDriver) {
      if (selectedPreSaleDriver === 'A Destinar') {
        return !p.driverName || p.driverName === 'A Destinar';
      }
      return (p.driverName || '').trim().toLowerCase() === selectedPreSaleDriver.trim().toLowerCase();
    }
    return true;
  });

  const completedPreSales = preSales.filter(p => {
    if ((!p.isUsed && !p.expeditionApproved) || p.deleted) return false;
    if (isDriverUser) {
      return isPreSaleForCurrentDriver(p.driverName);
    }
    if (selectedPreSaleSupervisor && p.supervisorName !== selectedPreSaleSupervisor) {
      return false;
    }
    if (selectedPreSaleDriver) {
      if (selectedPreSaleDriver === 'A Destinar') {
        return !p.driverName || p.driverName === 'A Destinar';
      }
      return (p.driverName || '').trim().toLowerCase() === selectedPreSaleDriver.trim().toLowerCase();
    }
    return true;
  });

  const deletedPreSales = preSales.filter(p => {
    if (!p.deleted) return false;
    if (isDriverUser) {
      return isPreSaleForCurrentDriver(p.driverName);
    }
    if (selectedPreSaleSupervisor && p.supervisorName !== selectedPreSaleSupervisor) {
      return false;
    }
    if (selectedPreSaleDriver) {
      if (selectedPreSaleDriver === 'A Destinar') {
        return !p.driverName || p.driverName === 'A Destinar';
      }
      return (p.driverName || '').trim().toLowerCase() === selectedPreSaleDriver.trim().toLowerCase();
    }
    return true;
  });
  const currentRealStock = getSafeStockAgua();
  const pendingPreSalesWaterQty = pendingPreSales.reduce((sum, ps) => {
    return sum + ps.products
      .filter(p => ['agua', 'bonificacao', 'troca'].includes(p.productType))
      .reduce((pSum, p) => pSum + p.qty, 0);
  }, 0);
  const stockWithPreSaleDeduction = Math.max(0, currentRealStock - pendingPreSalesWaterQty);

  const formatToBRLMask = (num: number | ''): string => {
    if (num === '' || num === undefined || num === null || isNaN(num)) return '0,00';
    const fixed = num.toFixed(2);
    const [integerPart, decimalPart] = fixed.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInteger},${decimalPart}`;
  };

  const parseBRLString = (str: string | number): number => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    if (str.includes(',')) {
      const clean = str.replace(/\./g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    } else {
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    }
  };

  const handleCurrencyMaskChange = (rawText: string, setter: (val: number | '') => void) => {
    const digits = rawText.replace(/\D/g, '');
    if (!digits) {
      setter('');
      return;
    }
    const numericValue = parseFloat(digits) / 100;
    setter(numericValue);
  };

  const handlePaymentMaskChange = (rawText: string, setter: (val: string) => void) => {
    if (!useEasyMask) {
      setter(rawText);
      return;
    }
    const digits = rawText.replace(/\D/g, '');
    if (!digits) {
      setter('');
      return;
    }
    const numericValue = parseFloat(digits) / 100;
    setter(formatToBRLMask(numericValue));
  };
  
  // Stock warning modal state
  const [showStockWarningModal, setShowStockWarningModal] = useState<boolean>(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartProduct | null>(null);

  // Pre-sale deletion modal state
  const [deletingPreSaleId, setDeletingPreSaleId] = useState<string | null>(null);
  const [deletePreSaleReason, setDeletePreSaleReason] = useState<string>('');
  const [confirmNfCancelled, setConfirmNfCancelled] = useState<boolean>(false);

  // States for viewing trip details in the report
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [reportDriverFilter, setReportDriverFilter] = useState<string>(currentUser?.name || '');

  // Keep track of the last productionControl state saved by the local user,
  // to avoid overwriting their inputs during active mutations but allow initial DB sync
  const lastSavedControlRef = useRef<any>(null);
  const lastLocalMutationTimeRef = useRef<number>(0);
  const lastTripIdRef = useRef<string | null>(null);
  const hasLocallyMutatedRef = useRef<boolean>(false);

  // Sync state with activeTrip
  useEffect(() => {
    if (!activeTrip) {
      setSales([]);
      setExpenses([]);
      lastSavedControlRef.current = null;
      lastTripIdRef.current = null;
      hasLocallyMutatedRef.current = false;
      return;
    }

    const currentControl = activeTrip.productionControl;
    const isDifferentTrip = activeTrip.id !== lastTripIdRef.current;

    if (isDifferentTrip) {
      hasLocallyMutatedRef.current = false;
    }

    // If it is the same trip and we have had any local mutation during this session,
    // or if we had a local mutation in the last 5 seconds,
    // do not overwrite the user's active/ongoing typing inputs
    if (!isDifferentTrip && (hasLocallyMutatedRef.current || Date.now() - lastLocalMutationTimeRef.current < 5000)) {
      lastSavedControlRef.current = currentControl;
      return;
    }

    const stringifiedCurrent = JSON.stringify(currentControl || {});
    const stringifiedLastSaved = JSON.stringify(lastSavedControlRef.current || {});

    // Sync if control changed externally/remotely or if this is a different trip
    const isDifferentControl = stringifiedCurrent !== stringifiedLastSaved;

    if (isDifferentTrip || isDifferentControl) {
      if (currentControl) {
        const incomingSales = currentControl.mobileSales || [];
        setSales(prevSales => {
          // Build map of existing local signatures
          const sigMap: Record<string, string> = {};
          prevSales.forEach(s => {
            if (s.signature) {
              if (s.id) sigMap[s.id] = s.signature;
              if (s.saleNumber) sigMap[s.saleNumber] = s.signature;
            }
          });
          return incomingSales.map((s: any) => ({
            ...s,
            signature: s.signature || (s.id ? sigMap[s.id] : undefined) || (s.saleNumber ? sigMap[s.saleNumber] : undefined)
          }));
        });
        setExpenses(currentControl.mobileExpenses || []);
      } else {
        setSales([]);
        setExpenses([]);
      }
      lastSavedControlRef.current = currentControl;
      lastTripIdRef.current = activeTrip.id;
    }
  }, [activeTrip?.id, activeTrip?.productionControl]);

  // Derived stock / logistics counts whenever sales change
  useEffect(() => {
    const calculatedComodato = sales
      .filter(s => s.productType === 'comodato' || s.item.toLowerCase().includes('comodato'))
      .reduce((sum, s) => sum + s.qty, 0);

    const calculatedComodatoReturn = sales
      .filter(s => s.productType === 'retorno' || s.item.toLowerCase().includes('retorno'))
      .reduce((sum, s) => sum + s.qty, 0);

    const calculatedBonification = sales
      .filter(s => s.productType === 'bonificacao' || s.item.toLowerCase().includes('bonifica'))
      .reduce((sum, s) => sum + s.qty, 0);

    const calculatedExchange = sales
      .filter(s => s.productType === 'troca' || s.item.toLowerCase().includes('troca'))
      .reduce((sum, s) => sum + s.qty, 0);

    setComodatoQty(calculatedComodato);
    setComodatoReturnQty(calculatedComodatoReturn);
    setBonificationQty(calculatedBonification);
    // Not setting a state for exchange right now unless needed, but we can set it if we want.
  }, [sales]);

  // Auto-fill price suggestion when product type changes
  useEffect(() => {
    const isZeroVal = newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' || newSaleProductType === 'troca';
    if (isZeroVal) {
      setNewSaleValue(0);
    } else {
      setNewSaleValue('');
    }
  }, [newSaleProductType]);

  // Auto-fill price suggestion when pre-sale product type changes
  useEffect(() => {
    const isZeroVal = preSaleProductType === 'bonificacao' || preSaleProductType === 'comodato' || preSaleProductType === 'retorno' || preSaleProductType === 'troca';
    if (isZeroVal) {
      setPreSaleValue(0);
    } else {
      setPreSaleValue('');
    }
  }, [preSaleProductType]);

  const saveToStore = (
    s: SettlementSale[], 
    e: SettlementExpense[]
  ) => {
    hasLocallyMutatedRef.current = true;
    lastLocalMutationTimeRef.current = Date.now();
    if (activeTrip) {
      const calculatedComodato = s
        .filter(sale => sale.productType === 'comodato' || sale.item.toLowerCase().includes('comodato'))
        .reduce((sum, sale) => sum + sale.qty, 0);

      const calculatedComodatoReturn = s
        .filter(sale => sale.productType === 'retorno' || sale.item.toLowerCase().includes('retorno'))
        .reduce((sum, sale) => sum + sale.qty, 0);

      const calculatedBonification = s
        .filter(sale => sale.productType === 'bonificacao' || sale.item.toLowerCase().includes('bonifica'))
        .reduce((sum, sale) => sum + sale.qty, 0);

      const calculatedExchange = s
        .filter(sale => sale.productType === 'troca' || sale.item.toLowerCase().includes('troca'))
        .reduce((sum, sale) => sum + sale.qty, 0);

      const newControl = {
        ...activeTrip.productionControl,
        mobileSales: s,
        mobileExpenses: e,
        mobileComodato: calculatedComodato,
        mobileComodatoReturn: calculatedComodatoReturn,
        mobileBonifications: calculatedBonification,
        mobileExchanges: calculatedExchange
      };

      // Set ref before calling updateMovementDetails to ensure subsequent renders bypass useEffect rewrite
      lastSavedControlRef.current = newControl;

      updateMovementDetails(activeTrip.id, {
        productionControl: newControl,
        editedAt: new Date().toISOString()
      });
    }
  };

  const getProductDisplayName = (type: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca' | string) => {
    switch (type) {
      case 'agua':
        return 'Água 20L';
      case 'agua_copo':
        return 'Água Copo 200ml (Cx c/ 48un)';
      case 'garrafa510':
        return 'Água Garrafa 510ml (Fd c/ 12un)';
      case 'garrafa15l':
        return 'Água Garrafa 1,5L (Fd c/ 6un)';
      case 'vasilhame':
        return 'Vasilhame';
      case 'troca':
        return 'Troca Água/Vasilhame';
      case 'bonificacao':
        return 'Bonificação';
      case 'comodato':
        return 'Comodato';
      case 'retorno':
        return 'Retorno';
      default:
        return type;
    }
  };

  // Confirm adding cart item when stock is insufficient
  const handleConfirmAddStockWarning = () => {
    if (pendingCartItem) {
      setCart([...cart, pendingCartItem]);
    }
    setPendingCartItem(null);
    setShowStockWarningModal(false);
    
    // Reset product input area
    setNewSaleQty('');
    setNewSaleValue('');
    setNewSaleProductType('agua');
  };

  const handleCancelAddStockWarning = () => {
    setPendingCartItem(null);
    setShowStockWarningModal(false);
  };

  // Add product to the current cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor, informe o Cliente primeiro!');
      return;
    }
    const qtyNum = Number(newSaleQty);
    if (newSaleQty === '' || isNaN(qtyNum) || qtyNum < 0) {
      alert('Por favor, informe uma quantidade válida!');
      return;
    }

    const isZeroVal = newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' || newSaleProductType === 'troca';
    const priceNum = Number(newSaleValue);
    if (!isZeroVal && (newSaleValue === '' || isNaN(priceNum) || priceNum < 0)) {
      alert('Por favor, informe o preço unitário!');
      return;
    }

    const currentRatio = newSaleExchangeRatio === '' ? 4 : newSaleExchangeRatio;

    const newItem: CartProduct = {
      productType: newSaleProductType,
      qty: qtyNum,
      unitPrice: isZeroVal ? 0 : priceNum,
      exchangeRatio: newSaleProductType === 'troca' ? currentRatio : undefined,
      exchangeAvariasQty: newSaleProductType === 'troca' ? (qtyNum * currentRatio) : undefined
    };

    // Check water stock (cheio)
    const isConsumingCheios = ['agua', 'bonificacao', 'troca'].includes(newSaleProductType);
    if (isConsumingCheios) {
      const cartCheiosQty = cart
        .filter(item => ['agua', 'bonificacao', 'troca'].includes(item.productType))
        .reduce((sum, item) => sum + item.qty, 0);
      const availableStock = currentStockAgua - cartCheiosQty;

      if (qtyNum > availableStock) {
        // Stock is insufficient or zero. Ask user confirmation
        setPendingCartItem(newItem);
        setShowStockWarningModal(true);
        return;
      }
    }

    setCart([...cart, newItem]);
    
    // Reset product input area, but keep the client name and set fields to empty
    setNewSaleQty('');
    setNewSaleValue('');
    setNewSaleProductType('agua');
  };

  const handleRemoveFromCart = (idx: number) => {
    const updated = cart.filter((_, i) => i !== idx);
    setCart(updated);
  };

  // Calculations for current checkout cart
  const cartTotal = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  
  const valDinheiro = parseBRLString(payDinheiro);
  const valPix = parseBRLString(payPix);
  const valBoleto = parseBRLString(payBoleto);
  const valCheque = parseBRLString(payCheque);
  const valOutros = parseBRLString(payOutros);
  
  const totalPaid = valDinheiro + valPix + valBoleto + valCheque + valOutros;
  const paymentDiff = cartTotal - totalPaid;

  // Auto-fill payment method helper
  const handleAutoFillPayment = (method: 'dinheiro' | 'pix' | 'boleto' | 'cheque' | 'outros') => {
    // Fill this method with the total amount to be paid (cartTotal) and clear others
    setPayDinheiro(method === 'dinheiro' ? (useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2)) : '');
    setPayPix(method === 'pix' ? (useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2)) : '');
    setPayBoleto(method === 'boleto' ? (useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2)) : '');
    setPayCheque(method === 'cheque' ? (useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2)) : '');
    setPayOutros(method === 'outros' ? (useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2)) : '');
    if (method !== 'outros') {
      setPayOutrosNote('');
    }
  };

  // Helper to clear payment inputs
  const handleClearPayments = () => {
    setPayDinheiro('');
    setPayPix('');
    setPayBoleto('');
    setPayCheque('');
    setPayOutros('');
    setPayOutrosNote('');
    setClientSignature(null);
  };

  // Auto-assign 100% to Cash on total change if no other payment has been typed
  useEffect(() => {
    if (cartTotal > 0 && valDinheiro === 0 && valPix === 0 && valBoleto === 0 && valCheque === 0 && valOutros === 0) {
      setPayDinheiro(useEasyMask ? formatToBRLMask(cartTotal) : cartTotal.toFixed(2));
    } else if (cartTotal === 0) {
      handleClearPayments();
    }
  }, [cartTotal]);

  // Finalize multi-product checkout
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      alert('O carrinho está vazio!');
      return;
    }
    if (cartTotal > 0 && Math.abs(paymentDiff) > 0.01) {
      alert('O total informado nas formas de pagamento não coincide com o valor total da venda!');
      return;
    }

    const clientClean = clientName.trim();
    
    // Distribute payments across products using our math distribution algorithm
    // This allows exact matching of s.qty * s.value for compatibility with administrative settlements!
    const paidItems = cart.filter(item => item.unitPrice > 0);
    const freeItems = cart.filter(item => item.unitPrice === 0);

    const generatedSaleNumber = 'VD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
    const saleTimestamp = new Date().toISOString();
    const finalSalesToAdd: SettlementSale[] = [];

    const originalPreSale = linkedPreSaleId ? preSales.find(ps => ps.id === linkedPreSaleId) : null;
    const wasPreSale = !!originalPreSale;
    const preSaleProducts = originalPreSale ? originalPreSale.products : undefined;

    // 1. Process free items directly (Zero value)
    freeItems.forEach(item => {
      finalSalesToAdd.push({
        id: 'msale-' + Math.random().toString(36).substring(2, 9),
        saleNumber: generatedSaleNumber,
        item: `${clientClean} - ${getProductDisplayName(item.productType)}${item.productType === 'troca' ? ` [${item.exchangeRatio}x1]` : ''}`,
        qty: item.qty,
        value: 0,
        paymentMethod: undefined,
        productType: item.productType,
        exchangeRatio: item.exchangeRatio,
        exchangeAvariasQty: item.exchangeAvariasQty,
        clientName: clientClean,
        signature: clientSignature || undefined,
        timestamp: saleTimestamp,
        wasPreSale,
        preSaleProducts,
        nfIssued: originalPreSale?.nfIssued,
        nfNumber: originalPreSale?.nfNumber,
        nfQty: originalPreSale?.nfQty,
        boletoIssued: originalPreSale?.boletoIssued
      });
    });

    // 2. Process paid items and distribute payments proportionally
    if (paidItems.length > 0) {
      let allocatedDinheiro = 0;
      let allocatedPix = 0;
      let allocatedBoleto = 0;
      let allocatedCheque = 0;
      let allocatedOutros = 0;

      const cartTotal = paidItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);

      paidItems.forEach((item, index) => {
        const isLast = index === paidItems.length - 1;
        const itemTotal = item.qty * item.unitPrice;
        const ratio = itemTotal / cartTotal;

        const itemDinheiro = isLast ? (valDinheiro - allocatedDinheiro) : Number((valDinheiro * ratio).toFixed(2));
        const itemPix = isLast ? (valPix - allocatedPix) : Number((valPix * ratio).toFixed(2));
        const itemBoleto = isLast ? (valBoleto - allocatedBoleto) : Number((valBoleto * ratio).toFixed(2));
        const itemCheque = isLast ? (valCheque - allocatedCheque) : Number((valCheque * ratio).toFixed(2));
        const itemOutros = isLast ? (valOutros - allocatedOutros) : Number((valOutros * ratio).toFixed(2));

        allocatedDinheiro += itemDinheiro;
        allocatedPix += itemPix;
        allocatedBoleto += itemBoleto;
        allocatedCheque += itemCheque;
        allocatedOutros += itemOutros;

        // Build payment method display string
        const methods: string[] = [];
        if (itemDinheiro > 0) methods.push('dinheiro');
        if (itemPix > 0) methods.push('pix');
        if (itemBoleto > 0) methods.push('boleto');
        if (itemCheque > 0) methods.push('cheque');
        if (itemOutros > 0) methods.push('outros');

        const primaryMethod = methods.length === 1 ? methods[0] : (methods.length > 1 ? 'misto' : 'dinheiro');

        // Build payment method note
        const noteParts: string[] = [];
        if (itemDinheiro > 0) noteParts.push(`Dinheiro: R$ ${itemDinheiro.toFixed(2)}`);
        if (itemPix > 0) noteParts.push(`PIX: R$ ${itemPix.toFixed(2)}`);
        if (itemBoleto > 0) noteParts.push(`Boleto: R$ ${itemBoleto.toFixed(2)}`);
        if (itemCheque > 0) noteParts.push(`Cheque: R$ ${itemCheque.toFixed(2)}`);
        if (itemOutros > 0) noteParts.push(`A Prazo: R$ ${itemOutros.toFixed(2)}`);
        const generatedNote = noteParts.join(' | ') || undefined;

        finalSalesToAdd.push({
          id: 'msale-' + Math.random().toString(36).substring(2, 9),
          saleNumber: generatedSaleNumber,
          item: `${clientClean} - ${getProductDisplayName(item.productType)}${item.productType === 'troca' ? ` [${item.exchangeRatio}x1]` : ''}`,
          qty: Math.round(item.qty),
          value: item.unitPrice,
          paymentMethod: primaryMethod,
          paymentMethodNote: generatedNote || payOutrosNote.trim() || undefined,
          productType: item.productType,
          exchangeRatio: item.exchangeRatio,
          exchangeAvariasQty: item.exchangeAvariasQty,
          clientName: clientClean,
          signature: clientSignature || undefined,
          timestamp: saleTimestamp,
          wasPreSale,
          preSaleProducts,
          linkedPreSaleId: linkedPreSaleId || undefined,
          nfIssued: originalPreSale?.nfIssued,
          nfNumber: originalPreSale?.nfNumber,
          nfQty: originalPreSale?.nfQty,
          boletoIssued: originalPreSale?.boletoIssued,
          paymentsBreakdown: {
            dinheiro: itemDinheiro,
            pix: itemPix,
            boleto: itemBoleto,
            cheque: itemCheque,
            outros: itemOutros
          }
        });
      });
    }

    const updatedSales = [...sales, ...finalSalesToAdd];
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);

    const loadsToUpdate: Record<string, number> = {};
    finalSalesToAdd.forEach(s => {
      if (s.productType === 'agua_copo' || s.productType === 'garrafa510' || s.productType === 'garrafa15l') {
        let productId = '';
        if (s.productType === 'agua_copo') productId = 'disp-prod-200ml-copo';
        else if (s.productType === 'garrafa510') productId = 'disp-prod-510ml-garrafa';
        else if (s.productType === 'garrafa15l') productId = 'disp-prod-15l-garrafa';
        
        if (activeTrip && productId) {
          const currentDrv = (((activeTrip as any).driverName || activeTrip.driver || '')).toLowerCase().trim();
          const currentPlt = (activeTrip.plate || '').toUpperCase().trim();
          const matchingLoads = (driverTripLoads || []).filter(t => 
            t.productId === productId && 
            ((currentDrv && t.driverName?.toLowerCase().trim() === currentDrv) || (currentPlt && t.vehiclePlate?.toUpperCase().trim() === currentPlt)) && 
            t.status === 'em_viagem' &&
            (!t.gateMovementId || !activeTrip?.id || t.gateMovementId === activeTrip.id)
          );

          let qtyToDeduct = s.qty;
          for (const load of matchingLoads) {
            if (qtyToDeduct <= 0) break;
            const currentAllocated = loadsToUpdate[load.id] || 0;
            const availableInLoad = Math.max(0, load.currentTruckStock - currentAllocated);
            if (availableInLoad > 0) {
              const deduct = Math.min(availableInLoad, qtyToDeduct);
              loadsToUpdate[load.id] = currentAllocated + deduct;
              qtyToDeduct -= deduct;
            }
          }
          if (qtyToDeduct > 0 && matchingLoads.length > 0) {
            loadsToUpdate[matchingLoads[0].id] = (loadsToUpdate[matchingLoads[0].id] || 0) + qtyToDeduct;
          }
        }
      }
    });

    Object.keys(loadsToUpdate).forEach(loadId => {
      const load = driverTripLoads.find(t => t.id === loadId);
      if (load) {
         const newStock = Math.max(0, load.currentTruckStock - loadsToUpdate[loadId]);
         updateDriverTripLoad(loadId, {
            currentTruckStock: newStock,
            status: newStock === 0 ? 'finalizada' : 'em_viagem'
         });
      }
    });

    if (linkedPreSaleId) {
      updatePreSale(linkedPreSaleId, { isUsed: true });
      setLinkedPreSaleId(null);
    }

    setLastSaleForPrint({
      saleNumber: generatedSaleNumber,
      sales: finalSalesToAdd
    });

    // Clear checkout state completely
    setClientName('');
    setCart([]);
    setLinkedPreSaleId(null);
    handleClearPayments();
  };

  const handleSaveSignatureForSale = (saleNumber: string, signature: string | null) => {
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'visualizador') {
      alert('Supervisores e visualizadores têm permissão apenas para visualizar ou imprimir o comprovante. Assinaturas não podem ser adicionadas ou excluídas.');
      return;
    }
    const updatedSales = sales.map(s => s.saleNumber === saleNumber ? { ...s, signature: signature || undefined } : s);
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);
    if (lastSaleForPrint && lastSaleForPrint.saleNumber === saleNumber) {
      setLastSaleForPrint({
        ...lastSaleForPrint,
        sales: lastSaleForPrint.sales.map(s => ({ ...s, signature: signature || undefined }))
      });
    }
  };

   const handleRemoveSale = (id: string) => {
    const saleToRemove = sales.find(s => s.id === id);
    if (saleToRemove && saleToRemove.linkedPreSaleId) {
      updatePreSale(saleToRemove.linkedPreSaleId, { isUsed: false });
    }

    if (saleToRemove && (saleToRemove.productType === 'agua_copo' || saleToRemove.productType === 'garrafa510' || saleToRemove.productType === 'garrafa15l')) {
      let productId = '';
      if (saleToRemove.productType === 'agua_copo') productId = 'disp-prod-200ml-copo';
      else if (saleToRemove.productType === 'garrafa510') productId = 'disp-prod-510ml-garrafa';
      else if (saleToRemove.productType === 'garrafa15l') productId = 'disp-prod-15l-garrafa';
      
      if (activeTrip && productId) {
        const load = driverTripLoads.find(t => 
          t.productId === productId && 
          (t.driverName === ((activeTrip as any).driverName || activeTrip.driver) || t.vehiclePlate === activeTrip.plate) && 
          (!t.gateMovementId || !activeTrip?.id || t.gateMovementId === activeTrip.id)
        );
        if (load) {
          updateDriverTripLoad(load.id, {
            currentTruckStock: load.currentTruckStock + saleToRemove.qty,
            status: 'em_viagem'
          });
        }
      }
    }

    const updatedSales = sales.filter(s => s.id !== id);
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);
  };

  const handleRemoveSaleGroup = (rawIds: string[]) => {
    const loadsToUpdate: Record<string, number> = {};
    
    sales.forEach(s => {
      if (rawIds.includes(s.id)) {
        if (s.linkedPreSaleId) {
          updatePreSale(s.linkedPreSaleId, { isUsed: false });
        }
        
        if (s.productType === 'agua_copo' || s.productType === 'garrafa510' || s.productType === 'garrafa15l') {
          let productId = '';
          if (s.productType === 'agua_copo') productId = 'disp-prod-200ml-copo';
          else if (s.productType === 'garrafa510') productId = 'disp-prod-510ml-garrafa';
          else if (s.productType === 'garrafa15l') productId = 'disp-prod-15l-garrafa';
          
          if (activeTrip && productId) {
            const load = driverTripLoads.find(t => 
              t.productId === productId && 
              (t.driverName === ((activeTrip as any).driverName || activeTrip.driver) || t.vehiclePlate === activeTrip.plate) && 
              (!t.gateMovementId || !activeTrip?.id || t.gateMovementId === activeTrip.id)
            );
            if (load) {
              loadsToUpdate[load.id] = (loadsToUpdate[load.id] || 0) + s.qty;
            }
          }
        }
      }
    });

    Object.keys(loadsToUpdate).forEach(loadId => {
      const load = driverTripLoads.find(t => t.id === loadId);
      if (load) {
         updateDriverTripLoad(loadId, {
            currentTruckStock: load.currentTruckStock + loadsToUpdate[loadId],
            status: 'em_viagem'
         });
      }
    });

    const updatedSales = sales.filter(s => !rawIds.includes(s.id));
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newExpenseValue) || 0;
    if (!newExpenseItem.trim() || val <= 0) return;
    const newExpense: SettlementExpense = {
      id: 'mexp-' + Date.now().toString(36),
      item: newExpenseItem.trim(),
      value: val
    };
    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    setNewExpenseItem('');
    setNewExpenseValue(0);
    saveToStore(sales, updatedExpenses);
  };

  const handleRemoveExpense = (id: string) => {
    const updatedExpenses = expenses.filter(ex => ex.id !== id);
    setExpenses(updatedExpenses);
    saveToStore(sales, updatedExpenses);
  };

  const handleAddToPreSaleCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preSaleClientName.trim()) {
      alert('Por favor, informe o Cliente primeiro!');
      return;
    }
    const qtyNum = Number(preSaleQty);
    if (preSaleQty === '' || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Por favor, informe uma quantidade válida maior que zero!');
      return;
    }
    
    const isZeroVal = preSaleProductType === 'bonificacao' || preSaleProductType === 'comodato' || preSaleProductType === 'retorno' || preSaleProductType === 'troca';
    const valueNum = isZeroVal ? 0 : Number(preSaleValue);
    if (!isZeroVal && (preSaleValue === '' || isNaN(valueNum) || valueNum < 0)) {
      alert('Por favor, informe um valor unitário válido!');
      return;
    }

    const newPreSaleProduct: CartProduct = {
      productType: preSaleProductType,
      qty: qtyNum,
      unitPrice: valueNum,
      exchangeRatio: preSaleProductType === 'troca' ? Number(preSaleExchangeRatio || 4) : undefined
    };

    setPreSaleCart([...preSaleCart, newPreSaleProduct]);
    setPreSaleQty('');
    setPreSaleValue('');
  };

  const handleSavePreSale = () => {
    if (!preSaleClientName.trim()) {
      alert('Por favor, informe o cliente!');
      return;
    }
    if (preSaleCart.length === 0) {
      alert('A pré-venda precisa ter pelo menos 1 produto!');
      return;
    }

    const supObj = (registeredSupervisors || []).find(s => s.name === selectedPreSaleSupervisor);

    addPreSale({
      driverName: driverNameForPreSales || 'A Destinar',
      clientName: preSaleClientName.trim(),
      products: preSaleCart,
      supervisorId: supObj?.id,
      supervisorName: selectedPreSaleSupervisor || (currentUser?.role === 'supervisor' ? currentUser?.name : undefined),
      createdBy: currentUser?.name,
      createdByRole: currentUser?.role,
      unit: activeTrip?.unit || currentUser?.unit || 'matriz'
    });

    alert('Pré-Venda gravada com sucesso!');
    setPreSaleClientName('');
    setPreSaleCart([]);
  };

  function renderPreSalesTab() {
    const isVisualizador = currentUser?.role === 'visualizador';
    // Client autocomplete filtering
    const query = preSaleClientName.toLowerCase().trim();
    const filteredPreSaleClients = registeredClients
      .filter(c => {
        if (!query) return true;
        const nameMatch = c.name.toLowerCase().includes(query);
        const codeMatch = c.codigo ? c.codigo.toLowerCase().includes(query) : false;
        const fantasyMatch = c.apelidoFantasia ? c.apelidoFantasia.toLowerCase().includes(query) : false;
        const cpfCnpjMatch = c.cpfCnpj ? c.cpfCnpj.toLowerCase().includes(query) : false;
        return nameMatch || codeMatch || fantasyMatch || cpfCnpjMatch;
      })
      .sort((a, b) => {
        const codeA = parseInt(a.codigo || '', 10);
        const codeB = parseInt(b.codigo || '', 10);
        const isANum = !isNaN(codeA) && /^\d+$/.test((a.codigo || '').trim());
        const isBNum = !isNaN(codeB) && /^\d+$/.test((b.codigo || '').trim());
        if (isANum && isBNum) {
          return codeA - codeB;
        }
        return a.name.localeCompare(b.name);
      });

    return (
      <div className="flex flex-col space-y-4">
        {/* Seletor de Supervisor e Motorista para Lançamento e Filtro */}
        {!isDriverUser ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-700" />
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  Lançamento & Gestão de Pré-Vendas
                </span>
              </div>
              {selectedPreSaleSupervisor && (
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-black px-2 py-0.5 rounded-full uppercase">
                  Supervisor: {selectedPreSaleSupervisor}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Supervisor de Vendas Responsável
                </label>
                <select
                  value={selectedPreSaleSupervisor}
                  onChange={(e) => setSelectedPreSaleSupervisor(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-extrabold text-slate-800 shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">-- Sem Supervisor / Venda Direta --</option>
                  {registeredSupervisors.filter(s => s.active !== false).map(sup => (
                    <option key={sup.id} value={sup.name}>
                      👤 {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Motorista Destinatário
                </label>
                <select
                  value={selectedPreSaleDriver}
                  onChange={(e) => setSelectedPreSaleDriver(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-extrabold text-slate-800 shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">Todos os Motoristas / Sem Filtro</option>
                  <option value="A Destinar">⚠️ A Destinar (Sem Motorista Atribuído)</option>
                  {registeredDrivers.map(drv => (
                    <option key={drv.id} value={drv.name}>
                      🚚 {drv.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-blue-700" />
              <span className="text-xs font-extrabold text-blue-950 uppercase tracking-tight">
                Pré-Vendas Destinadas a Mim
              </span>
            </div>
            <span className="text-xs font-black text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 uppercase">
              {currentUser?.name || activeTrip?.driver || (activeTrip as any)?.driverName || 'Motorista'}
            </span>
          </div>
        )}

        {/* Painel de Estoque e Pré-Venda */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-150 shadow-sm grid grid-cols-3 gap-2">
          <div className="text-center p-1.5 bg-white rounded-lg border border-blue-100 shadow-xs">
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">Estoque Caminhão</div>
            <div className="text-sm font-black text-slate-800 mt-0.5">{activeTrip ? currentRealStock : '0'} un</div>
          </div>
          <div className="text-center p-1.5 bg-white rounded-lg border border-blue-100 shadow-xs">
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">Reserva Pré-Venda</div>
            <div className="text-sm font-black text-amber-600 mt-0.5">{pendingPreSalesWaterQty} un</div>
          </div>
          <div className="text-center p-1.5 bg-indigo-100/40 rounded-lg border border-indigo-150 shadow-xs">
            <div className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-tight">Líquido p/ Vender</div>
            <div className="text-sm font-black text-indigo-800 mt-0.5">{activeTrip ? stockWithPreSaleDeduction : '0'} un</div>
          </div>
        </div>

        {/* Card 1: Criar Pré-Venda */}
        {!isVisualizador && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 uppercase tracking-tight">
            <div className="flex items-center gap-2">
              <Plus size={16} /> Lançar Nova Pré-Venda
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-full cursor-pointer hover:bg-slate-50 transition-all select-none normal-case">
              <input
                type="checkbox"
                checked={useEasyMask}
                onChange={e => setUseEasyMask(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5"
              />
              <span>Digitação s/ Vírgula (0,00)</span>
            </label>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Search client input */}
            <div className="relative">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">1. Cliente / Destinatário</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={preSaleClientName} 
                  onChange={e => {
                    setPreSaleClientName(e.target.value);
                    setPreSaleShowClientDropdown(true);
                  }} 
                  onFocus={() => setPreSaleShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setPreSaleShowClientDropdown(false), 200)}
                  className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800 placeholder:text-slate-400 pr-8" 
                  placeholder="Pesquise por Código, CNPJ, Nome..." 
                />
                {preSaleClientName && (
                  <button
                    type="button"
                    onClick={() => setPreSaleClientName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer font-bold text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {preSaleShowClientDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                  {filteredPreSaleClients.slice(0, 30).map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => {
                        setPreSaleClientName(c.name);
                        setPreSaleShowClientDropdown(false);
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer text-xs space-y-0.5 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{c.name}</span>
                        {c.codigo && (
                          <span className="bg-slate-100 text-slate-600 text-[9px] px-1 rounded font-mono font-bold">
                            #{c.codigo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product selection inputs */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">2. Adicionar Produto à Pré-Venda</div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase block mb-1">Operação/Produto</label>
                  <select
                    value={preSaleProductType}
                    onChange={(e) => setPreSaleProductType(e.target.value as any)}
                    className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-bold text-slate-700"
                  >
                    <option value="agua">Água 20L (Galão)</option>
                    <option value="agua_copo">Água Copo 200ml (Cx c/ 48un)</option>
                    <option value="garrafa510">Água Garrafa 510ml (Fd c/ 12un)</option>
                    <option value="garrafa15l">Água Garrafa 1,5L (Fd c/ 6un)</option>
                    <option value="vasilhame">Vasilhame 20L</option>
                    <option value="bonificacao">Bonificação</option>
                    <option value="comodato">Comodato</option>
                    <option value="retorno">Retorno</option>
                    <option value="troca">Troca Galões</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase block mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={preSaleQty}
                    onChange={e => setPreSaleQty(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                    className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-bold text-slate-700 text-center"
                  />
                </div>
              </div>

              {preSaleProductType === 'troca' && (
                <div>
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase block mb-1">Proporção da Troca (ex: 4 para 1)</label>
                  <input
                    type="number"
                    placeholder="Proporção"
                    value={preSaleExchangeRatio}
                    onChange={e => setPreSaleExchangeRatio(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-bold text-slate-700 text-center"
                  />
                </div>
              )}

              {!(preSaleProductType === 'bonificacao' || preSaleProductType === 'comodato' || preSaleProductType === 'retorno' || preSaleProductType === 'troca') && (
                <div>
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase block mb-1">Preço Unitário (R$)</label>
                  <input
                    type={useEasyMask ? "text" : "number"}
                    inputMode={useEasyMask ? "numeric" : "decimal"}
                    step={useEasyMask ? undefined : "0.01"}
                    min="0"
                    placeholder="Ex: 10,00"
                    value={
                      useEasyMask ? formatToBRLMask(preSaleValue) : preSaleValue
                    }
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      if (useEasyMask) {
                        handleCurrencyMaskChange(val, setPreSaleValue);
                      } else {
                        setPreSaleValue(val === '' ? '' : Number(val));
                      }
                    }}
                    className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-bold text-slate-700 text-right"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToPreSaleCart}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Inserir Produto
              </button>
            </div>

            {/* Pre-sale cart items */}
            {preSaleCart.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase">
                  Produtos Selecionados
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {preSaleCart.map((item, index) => {
                    const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca';
                    const isEditing = editingPreSaleCartIdx === index;

                    if (isEditing) {
                      return (
                        <div key={index} className="p-2.5 text-xs bg-blue-50/40 rounded-md border border-blue-100 my-1 mx-2">
                          <div className="font-extrabold text-slate-800 mb-1.5">{getProductDisplayName(item.productType)}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex-1 min-w-[70px]">
                              <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Qtd:</label>
                              <input 
                                type="number"
                                min="1"
                                value={editingPreSaleQty}
                                onChange={e => setEditingPreSaleQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full text-xs p-1 border border-slate-300 rounded bg-white font-bold text-slate-700 text-center"
                              />
                            </div>
                            {!isZeroVal && (
                              <div className="flex-1 min-w-[100px]">
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Preço (R$):</label>
                                <input 
                                  type={useEasyMask ? "text" : "number"}
                                  inputMode={useEasyMask ? "numeric" : "decimal"}
                                  value={useEasyMask ? formatToBRLMask(editingPreSaleValueState) : editingPreSaleValueState}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (useEasyMask) {
                                      handleCurrencyMaskChange(val, setEditingPreSaleValueState);
                                    } else {
                                      setEditingPreSaleValueState(val === '' ? '' : Number(val));
                                    }
                                  }}
                                  className="w-full text-xs p-1 border border-slate-300 rounded bg-white font-bold text-slate-700 text-right"
                                />
                              </div>
                            )}
                            <div className="flex items-end gap-1.5 pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedCart = [...preSaleCart];
                                  updatedCart[index] = {
                                    ...item,
                                    qty: editingPreSaleQty,
                                    unitPrice: isZeroVal ? 0 : Number(editingPreSaleValueState || 0)
                                  };
                                  setPreSaleCart(updatedCart);
                                  setEditingPreSaleCartIdx(null);
                                }}
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition-colors"
                                title="Salvar"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPreSaleCartIdx(null)}
                                className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded cursor-pointer transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="flex items-center justify-between p-2.5 text-xs">
                        <div className="text-left space-y-0.5">
                          <span className="font-extrabold text-slate-800">{getProductDisplayName(item.productType)}</span>
                          {item.productType === 'troca' && (
                            <span className="block text-[9px] text-slate-400 font-bold">Proporção: {item.exchangeRatio}x1</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-700">{item.qty}x</div>
                            {!isZeroVal && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                R$ {item.unitPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPreSaleCartIdx(index);
                                setEditingPreSaleQty(item.qty);
                                setEditingPreSaleValueState(item.unitPrice);
                              }}
                              className="text-blue-500 hover:text-blue-700 cursor-pointer p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Editar Produto"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreSaleCart(preSaleCart.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-3 bg-slate-100 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleSavePreSale}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Gravar Pré-Venda
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Card 2: Pré-vendas Pendentes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight">
            <Receipt size={16} /> {isAdminOrOperator ? `Pré-Vendas Pendentes (${pendingPreSales.length})` : `Minhas Pré-Vendas Lançadas (${pendingPreSales.length})`}
          </div>

          <div className="p-3 space-y-2">
            {pendingPreSales.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-bold">
                {isAdminOrOperator ? 'Nenhuma pré-venda pendente encontrada para os filtros selecionados.' : 'Nenhuma pré-venda pendente de uso para sua conta.'}
              </div>
            ) : (
              pendingPreSales.map(ps => (
                <div key={ps.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="text-left space-y-1.5 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-tight">{ps.clientName}</span>
                      {ps.supervisorName && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          👤 Supervisor: {ps.supervisorName}
                        </span>
                      )}
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        ps.driverName && ps.driverName !== 'A Destinar'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse'
                      }`}>
                        🚚 Motorista: {ps.driverName || 'A Destinar'}
                      </span>
                      {(ps.expeditionApproved || ps.isUsed) && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          ps.isUsed
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {ps.isUsed ? '✓ Concluída em Viagem' : '📦 Carga Expedida'}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold">
                      Lançado em: {new Date(ps.timestamp).toLocaleString('pt-BR')}
                    </div>

                    <div className="pt-1 space-y-1">
                      {ps.products.map((p, idx) => {
                        const isZeroVal = p.productType === 'bonificacao' || p.productType === 'comodato' || p.productType === 'retorno' || p.productType === 'troca';
                        return (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            <span className="font-bold">
                              {p.qty}x {getProductDisplayName(p.productType)} 
                              {!isZeroVal && ` (R$ ${p.unitPrice.toFixed(2)} un)`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!isVisualizador && (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      {(() => {
                        const isExpedited = !!ps.expeditionApproved || !!ps.isUsed;
                        const isSupervisorPreSale = !!ps.supervisorName || !!ps.supervisorId || ps.createdByRole === 'supervisor';
                        const isDriver = currentUser?.role === 'motorista';
                        const canChangeDriver = !isExpedited && (!isDriver || !isSupervisorPreSale);
                        const canDelete = !isExpedited && (!isDriver || !isSupervisorPreSale);

                        return (
                          <>
                            {canChangeDriver ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningPreSale(ps);
                                  setAssignDriverName(ps.driverName === 'A Destinar' ? '' : ps.driverName || '');
                                  setAssignVehiclePlate(ps.vehiclePlate || '');
                                }}
                                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                                title={ps.driverName && ps.driverName !== 'A Destinar' ? 'Alterar motorista da pré-venda' : 'Destinar motorista à pré-venda'}
                              >
                                <Truck size={13} />
                                <span>{ps.driverName && ps.driverName !== 'A Destinar' ? 'Alterar Motorista' : 'Destinar Motorista'}</span>
                              </button>
                            ) : isExpedited ? (
                              <div
                                className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-not-allowed select-none shadow-2xs"
                                title="Carga já expedida para este motorista e veículo. A alteração de motorista está bloqueada após a expedição."
                              >
                                <Lock size={12} className="text-amber-700 shrink-0" />
                                <span>Expedido (Fixo)</span>
                              </div>
                            ) : (
                              <div
                                className="text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-not-allowed select-none"
                                title="Pré-venda realizada pelo supervisor. O motorista não pode alterar o motorista desta pré-venda."
                              >
                                <Lock size={12} className="text-slate-400 shrink-0" />
                                <span>Motorista Fixo</span>
                              </div>
                            )}

                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingPreSaleId(ps.id);
                                  setDeletePreSaleReason('');
                                  setConfirmNfCancelled(false);
                                }}
                                className="text-red-500 hover:text-red-700 cursor-pointer p-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Excluir Pré-Venda"
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : isExpedited ? (
                              <div
                                className="text-amber-400 p-1.5 rounded cursor-not-allowed select-none flex items-center"
                                title="Carga já expedida para o veículo/motorista. A exclusão desta pré-venda está bloqueada após a expedição."
                              >
                                <Lock size={15} className="text-amber-600" />
                              </div>
                            ) : (
                              <div
                                className="text-slate-300 p-1.5 rounded cursor-not-allowed select-none flex items-center"
                                title="Pré-venda realizada pelo supervisor. O motorista não possui permissão para excluí-la."
                              >
                                <Lock size={15} className="text-slate-400" />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Pré-vendas Expedidas / Atendidas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-emerald-50/70 font-bold text-emerald-800 text-sm flex items-center justify-between uppercase tracking-tight">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" /> Pré-Vendas Expedidas / Atendidas ({completedPreSales.length})
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {completedPreSales.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-bold">
                Nenhuma pré-venda expedida ou finalizada para este motorista.
              </div>
            ) : (
              completedPreSales.map(ps => (
                <div key={ps.id} className="p-3 border border-emerald-200 rounded-lg bg-emerald-50/20 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="text-left space-y-0.5">
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-tight">{ps.clientName}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Lançado em: {new Date(ps.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wide ${
                      ps.isUsed ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ps.isUsed ? 'Concluída em Viagem' : 'Expedida pelo Operador'}
                    </span>
                  </div>

                  {ps.expeditionApproved && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded p-2 text-left space-y-1 text-xs">
                      <div className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider">Aprovação da Expedição:</div>
                      <div className="text-[10px] text-emerald-800 font-semibold flex flex-wrap gap-x-2.5">
                        <span><span className="font-bold">Aprovado por:</span> {ps.expeditionApprovedBy || 'Operador'}</span>
                        <span><span className="font-bold">Em:</span> {ps.expeditionApprovedAt ? new Date(ps.expeditionApprovedAt).toLocaleString('pt-BR') : ''}</span>
                      </div>
                      {ps.expeditionAttachmentUrl && (
                        <a 
                          href={ps.expeditionAttachmentUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline mt-1 bg-white px-2 py-1 rounded border border-blue-200"
                        >
                          📄 Ver Comprovante do Pedido
                        </a>
                      )}
                    </div>
                  )}

                  <div className="pt-1 space-y-1 text-left border-t border-slate-100">
                    {ps.products.map((p, idx) => {
                      const isZeroVal = p.productType === 'bonificacao' || p.productType === 'comodato' || p.productType === 'retorno' || p.productType === 'troca';
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          <span>
                            {p.qty}x {getProductDisplayName(p.productType)} 
                            {!isZeroVal && ` (R$ ${p.unitPrice.toFixed(2)} un)`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 4: Pré-vendas Excluídas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-red-50/50 font-bold text-red-700 text-sm flex items-center gap-2 uppercase tracking-tight">
            <Trash2 size={16} className="text-red-600" /> Histórico de Pré-Vendas Excluídas ({deletedPreSales.length})
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {deletedPreSales.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-bold">
                Nenhuma pré-venda excluída para este motorista.
              </div>
            ) : (
              deletedPreSales.map(ps => (
                <div key={ps.id} className="p-3 border border-red-100 rounded-lg bg-red-50/10 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="text-left space-y-0.5">
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-tight">{ps.clientName}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Lançado em: {new Date(ps.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-100 text-red-700 rounded-full uppercase tracking-wide">
                      Excluído
                    </span>
                  </div>

                  <div className="bg-red-50/40 border border-red-100 rounded p-2 text-left space-y-1 text-xs">
                    <div className="text-[10px] text-red-800 font-bold uppercase tracking-wider">Informações da Exclusão:</div>
                    <div className="text-slate-700 font-medium">
                      <span className="font-bold text-slate-850">Motivo:</span> {ps.deleteReason}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold flex flex-wrap gap-x-2.5">
                      <span><span className="font-bold">Por:</span> {ps.deletedBy}</span>
                      <span><span className="font-bold">Em:</span> {ps.deletedAt ? new Date(ps.deletedAt).toLocaleString('pt-BR') : ''}</span>
                    </div>
                  </div>

                  <div className="pt-1 space-y-1 text-left border-t border-slate-100">
                    {ps.products.map((p, idx) => {
                      const isZeroVal = p.productType === 'bonificacao' || p.productType === 'comodato' || p.productType === 'retorno' || p.productType === 'troca';
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                          <span>
                            {p.qty}x {getProductDisplayName(p.productType)} 
                            {!isZeroVal && ` (R$ ${p.unitPrice.toFixed(2)} un)`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <div className="flex flex-col bg-slate-50/50 p-4 w-full max-w-lg mx-auto space-y-4 pb-24">
        {/* Tab Switcher */}
        <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('viagem')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'viagem'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={12} /> <span className="hidden sm:inline">Viagem Ativa</span><span className="sm:hidden">Viagem</span>
          </button>
          <button
            onClick={() => setActiveTab('prevenda')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'prevenda'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Receipt size={12} /> <span className="hidden sm:inline">Pré-Venda</span><span className="sm:hidden">Pré-Vda</span>
          </button>
          <button
            onClick={() => setActiveTab('relatorio')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'relatorio'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={12} /> <span className="hidden sm:inline">Relatório</span><span className="sm:hidden">Relat</span>
          </button>
        </div>

        {activeTab === 'viagem' && (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Truck size={48} className="mb-4 text-slate-300 animate-pulse" />
            <p className="text-lg font-bold text-slate-600">Nenhuma viagem ativa encontrada.</p>
            <p className="text-sm mt-2 text-center max-w-sm text-slate-400">
              Você não possui nenhuma saída de rota registrada no momento. O acerto/venda só pode ser feito durante uma viagem.
            </p>
          </div>
        )}

        {activeTab === 'prevenda' && renderPreSalesTab()}

        {activeTab === 'relatorio' && renderTripReport()}
      </div>
    );
  }

  const productionCarregado = activeTrip.productionControl?.totalCarregado || 0;
  const retornoVasilhameCheio = activeTrip.productionControl?.retornoVasilhameCheio || 0;
  const stockCarregado = productionCarregado + retornoVasilhameCheio;
  const vasilhamesRetirados = activeTrip.productionControl?.retiradaVasilhameCarga || 0;
  const initialStock = stockCarregado + vasilhamesRetirados; // As loaded
  
  // Calculate quantities sold based on row quantities
  const totalSoldAguaNormal = sales
    .filter(s => s.productType === 'agua' || (s.productType === undefined && (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua')) && !s.item.toLowerCase().includes('bonifica')))
    .reduce((acc, s) => acc + s.qty, 0);

  const totalSoldAguaTroca = sales
    .filter(s => s.productType === 'troca')
    .reduce((acc, s) => acc + s.qty, 0);

  const totalSoldAgua = totalSoldAguaNormal + totalSoldAguaTroca;

  const totalTrocaVasilhames = sales
    .filter(s => s.productType === 'troca')
    .reduce((acc, s) => acc + (s.exchangeAvariasQty || 0), 0);

  const totalSoldVasilhame = sales
    .filter(s => s.productType === 'vasilhame' || (s.productType === undefined && s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('comodato') && !s.item.toLowerCase().includes('retorno')))
    .reduce((acc, s) => acc + s.qty, 0);

  const currentStockAgua = Math.max(0, stockCarregado - totalSoldAgua - bonificationQty);
  const currentStockVasilhame = Math.max(0, 
    vasilhamesRetirados 
    + totalSoldAguaNormal 
    + totalSoldAguaTroca
    + totalTrocaVasilhames 
    + bonificationQty 
    - comodatoQty 
    + comodatoReturnQty 
    - totalSoldVasilhame
  ); 

  // Compute absolute totals using unit price * quantity
  const totalValueSales = sales.reduce((acc, s) => acc + (s.qty * s.value), 0);
  const totalValueExpenses = expenses.reduce((acc, e) => acc + e.value, 0);

  // Group sales by payment method (qty * value)
  const salesByPayment: Record<string, number> = {
    dinheiro: 0,
    pix: 0,
    boleto: 0,
    cheque: 0,
    outros: 0
  };
  sales.forEach(s => {
    if (s.paymentsBreakdown) {
      salesByPayment.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
      salesByPayment.pix += Number(s.paymentsBreakdown.pix) || 0;
      salesByPayment.boleto += Number(s.paymentsBreakdown.boleto) || 0;
      salesByPayment.cheque += Number(s.paymentsBreakdown.cheque) || 0;
      salesByPayment.outros += Number(s.paymentsBreakdown.outros) || 0;
    } else {
      const method = s.paymentMethod || 'dinheiro';
      const rowTotal = s.qty * s.value;
      if (method in salesByPayment) {
        salesByPayment[method] += rowTotal;
      } else {
        salesByPayment.outros += rowTotal;
      }
    }
  });

  const totalCashAdvances = activeTrip?.cashAdvances?.reduce((acc, adv) => acc + adv.value, 0) || 0;

  const handlePrintCashAdvance = (advance: {
    id: string;
    driverName: string;
    plate: string;
    value: number;
    reason: string;
    timestamp: string;
    operator: string;
  }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Adiantamento de Caixa - \${advance.driverName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 20px; 
              margin: 0; 
              color: #1e293b; 
              line-height: 1.5; 
              font-size: 12px;
            }
            .voucher {
              border: 2px dashed #94a3b8;
              padding: 30px;
              border-radius: 12px;
              max-width: 650px;
              margin: 0 auto;
              background: #fff;
            }
            .header { 
              text-align: center;
              border-bottom: 2px solid #334155; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .title { 
              font-size: 18px; 
              font-weight: 800; 
              margin: 0; 
              text-transform: uppercase; 
              color: #0f172a; 
              letter-spacing: 1px;
            }
            .subtitle { 
              font-size: 11px; 
              color: #64748b; 
              margin: 5px 0 0 0; 
              font-weight: 600; 
              text-transform: uppercase; 
            }
            .value-box {
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
            }
            .value-label {
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 700;
              color: #475569;
              letter-spacing: 0.5px;
            }
            .value-amount {
              font-size: 24px;
              font-weight: 900;
              color: #0f172a;
              margin-top: 5px;
            }
            .details-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .details-table td {
              padding: 10px 5px;
              border-bottom: 1px solid #f1f5f9;
            }
            .details-table td.label {
              font-weight: 700;
              color: #475569;
              width: 140px;
              text-transform: uppercase;
              font-size: 11px;
            }
            .details-table td.value {
              color: #0f172a;
              font-weight: 500;
            }
            .signatures {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              text-align: center;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              margin-top: 40px;
              padding-top: 8px;
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
            }
            .footer-info {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 50px;
              border-top: 1px solid #f1f5f9;
              padding-top: 15px;
              text-transform: uppercase;
              font-weight: 600;
            }
            @media print {
              body { padding: 0; }
              .voucher { border: 2px solid #000; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="voucher">
            <div class="header">
              <div class="title">Comprovante de Adiantamento de Caixa</div>
              <div class="subtitle">SISTEMA INTEGRADO DE GESTÃO DE FROTA - VIA GERAL</div>
            </div>
            
            <div class="value-box">
              <div class="value-label">VALOR DO REPASSE</div>
              <div class="value-amount">R$ \${advance.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <table class="details-table">
              <tr>
                <td class="label">ID Comprovante:</td>
                <td class="value">\${advance.id}</td>
              </tr>
              <tr>
                <td class="label">Motorista:</td>
                <td class="value">\${advance.driverName}</td>
              </tr>
              <tr>
                <td class="label">Veículo / Placa:</td>
                <td class="value">\${advance.plate}</td>
              </tr>
              <tr>
                <td class="label">Motivo do Repasse:</td>
                <td class="value">\${advance.reason}</td>
              </tr>
              <tr>
                <td class="label">Data de Emissão:</td>
                <td class="value">\${new Date(advance.timestamp).toLocaleString('pt-BR')}</td>
              </tr>
              <tr>
                <td class="label">Conferente Responsável:</td>
                <td class="value">\${advance.operator}</td>
              </tr>
            </table>

            <div class="signatures">
              <div>
                <div class="sig-line">Assinatura do Motorista</div>
              </div>
              <div>
                <div class="sig-line">Assinatura do Conferente</div>
              </div>
            </div>

            <div class="footer-info">
              Este documento serve como autorização para recebimento do valor especificado junto ao caixa interno da empresa.<br/>
              Emissão via terminal logístico - \${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getPaymentBadge = (method?: string) => {
    const m = method || 'dinheiro';
    switch (m) {
      case 'dinheiro':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Dinheiro</span>;
      case 'pix':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">PIX</span>;
      case 'boleto':
        return <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Boleto</span>;
      case 'cheque':
        return <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Cheque</span>;
      case 'outros':
        return <span className="bg-slate-50 text-slate-700 border border-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Outros</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{m}</span>;
    }
  };

  // Trip Report rendering function
  function renderTripReport() {
    // Determine which trips to show
    const tripsToQuery = movements.filter(m => {
      // A trip MUST always be a 'saida' movement
      if (m.type !== 'saida') return false;

      // Filter by driver name
      const matchDriver = isAdminOrOperator 
        ? (reportDriverFilter ? m.driver.toLowerCase() === reportDriverFilter.toLowerCase() : true)
        : m.driver.toLowerCase() === currentUser?.name.toLowerCase();
      
      return matchDriver;
    }).sort((a, b) => {
      const retA = getReturnMovement(a);
      const retB = getReturnMovement(b);
      const dateA = retA ? (retA.entryTimestamp || retA.timestamp) : (a.exitTimestamp || a.timestamp);
      const dateB = retB ? (retB.entryTimestamp || retB.timestamp) : (b.exitTimestamp || b.timestamp);
      return new Date(dateB || '').getTime() - new Date(dateA || '').getTime();
    });

    // Get list of unique drivers for the filter using unified trip logic
    const uniqueDrivers = Array.from(new Set(
      movements
        .filter(m => m.type === 'saida')
        .map(m => m.driver)
    )).sort();

    return (
      <div className="space-y-4">
        {isAdminOrOperator && (
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filtrar por Motorista (Admin)</label>
            <select
              value={reportDriverFilter}
              onChange={(e) => setReportDriverFilter(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-medium"
            >
              <option value="">-- Todos os Motoristas --</option>
              {uniqueDrivers.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            {isAdminOrOperator ? 'Viagens Registradas' : 'Minhas Viagens'}
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tripsToQuery.length} viagem(ns)</span>
        </div>

        {tripsToQuery.length === 0 ? (
          <div className="text-center p-8 bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
            Nenhuma viagem registrada encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {tripsToQuery.map(m => {
              const returns = movements.filter(x => 
                x.plate.toLowerCase() === m.plate.toLowerCase() && 
                x.id !== m.id &&
                new Date(x.entryTimestamp || x.timestamp).getTime() > new Date(m.exitTimestamp || m.timestamp).getTime()
              );
              returns.sort((a, b) => new Date(a.entryTimestamp || a.timestamp).getTime() - new Date(b.entryTimestamp || b.timestamp).getTime());
              const correspondingEntrada = returns[0];
              const settlement = driverSettlements?.find(ds => 
                ds.status === 'completed' && (ds.movementId === m.id || ds.movementId === `settled-${m.id}`)
              );
              const isSettled = !!settlement;
              
              // Get sales and expenses
              const tripSales = isSettled 
                ? settlement.sales 
                : (m.productionControl?.mobileSales || []);
              
              const tripExpenses = isSettled 
                ? settlement.expenses 
                : (m.productionControl?.mobileExpenses || []);

              const tripSalesTotal = isSettled 
                ? settlement.totalSales 
                : tripSales.reduce((acc, s) => acc + (s.qty * s.value), 0);

              const tripExpensesTotal = isSettled 
                ? settlement.totalExpenses 
                : tripExpenses.reduce((acc, e) => acc + e.value, 0);

              const netBalance = tripSalesTotal - tripExpensesTotal;
              const isExpanded = expandedTripId === m.id;

              return (
                <div 
                  key={m.id} 
                  className={`bg-white rounded-xl border transition-all overflow-hidden ${
                    isExpanded 
                      ? 'border-blue-300 ring-2 ring-blue-50' 
                      : isSettled 
                        ? 'border-emerald-100 hover:border-slate-300' 
                        : 'border-blue-100 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div 
                    onClick={() => setExpandedTripId(isExpanded ? null : m.id)}
                    className="p-3.5 flex justify-between items-start cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{m.plate}</span>
                        <span className="font-mono text-indigo-700 font-bold text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {getProductionCode(m)}
                        </span>
                        {isSettled ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">CONCLUÍDA</span>
                        ) : correspondingEntrada ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">NO PÁTIO</span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">EM ROTA</span>
                        )}
                      </div>
                      <div className="flex flex-col text-[10px] text-slate-400 font-semibold gap-0.5">
                        <span>Motorista: {m.driver}</span>
                        <span>Partida: {new Date(m.timestamp).toLocaleDateString('pt-BR')} às {new Date(m.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-xs text-slate-400 font-bold uppercase">Saldo Caixa</div>
                      <div className={`font-black text-sm ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        R$ {netBalance.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold flex items-center justify-end gap-0.5">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Detalhes
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-4 text-xs">
                      {/* Financial Balance Summary */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs space-y-2">
                        <div className="font-bold text-slate-700 uppercase tracking-tight text-[10px] border-b pb-1.5 flex items-center gap-1.5">
                          <Coins size={14} className="text-slate-500" /> Resumo Financeiro da Viagem
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">Vendas</div>
                            <div className="font-extrabold text-slate-800 text-xs">R$ {tripSalesTotal.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">Despesas</div>
                            <div className="font-extrabold text-red-500 text-xs">- R$ {tripExpensesTotal.toFixed(2)}</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100">
                            <div className="text-[9px] font-bold text-blue-500 uppercase">Saldo Caixa</div>
                            <div className="font-black text-blue-700 text-xs">R$ {netBalance.toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Payment Split info inside trip report */}
                        {tripSalesTotal > 0 && (
                          <div className="border-t pt-2.5 mt-2">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">Arrecadação por Meio de Pagamento:</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {['dinheiro', 'pix', 'boleto', 'cheque', 'outros'].map(method => {
                                const sum = tripSales
                                  .reduce((acc, s) => {
                                    if (s.paymentsBreakdown) {
                                      return acc + ((s.paymentsBreakdown as any)[method] || 0);
                                    }
                                    const sMethod = s.paymentMethod || 'dinheiro';
                                    if (sMethod === method) {
                                      return acc + (s.qty * s.value);
                                    }
                                    return acc;
                                  }, 0);
                                if (sum === 0) return null;
                                return (
                                  <div key={method} className="flex justify-between items-center p-1 px-2 bg-slate-50 rounded text-[10px]">
                                    <span className="capitalize font-semibold text-slate-500">{method}</span>
                                    <strong className="text-slate-700 font-mono">R$ {sum.toFixed(2)}</strong>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sales by Product inside trip report */}
                        {tripSalesTotal > 0 && (
                          <div className="border-t pt-2.5 mt-2">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">Venda Total por Produto:</div>
                            <div className="grid grid-cols-1 gap-1">
                              {(() => {
                                const prodSummary: Record<string, { qty: number, total: number }> = {};
                                tripSales.forEach(s => {
                                  let name = s.item;
                                  if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
                                    name = s.item.substring(s.clientName.length + 3);
                                  } else if (s.item.includes(' - ')) {
                                    name = s.item.split(' - ').slice(1).join(' - ');
                                  }
                                  const key = name.trim();
                                  const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.productType === 'troca' || s.item.toLowerCase().includes('bonifica') || s.item.toLowerCase().includes('comodato') || s.item.toLowerCase().includes('retorno') || s.item.toLowerCase().includes('troca');

                                  if (!prodSummary[key]) {
                                    prodSummary[key] = { qty: 0, total: 0 };
                                  }
                                  prodSummary[key].qty += s.qty;
                                  if (!isZeroVal) {
                                    prodSummary[key].total += s.qty * s.value;
                                  }
                                });

                                return Object.entries(prodSummary).map(([prodName, data]) => (
                                  <div key={prodName} className="flex justify-between items-center p-1 px-2 bg-slate-50 rounded text-[10px]">
                                    <span className="font-semibold text-slate-600 uppercase truncate max-w-[200px]">{prodName}</span>
                                    <div className="flex gap-2 shrink-0">
                                      <span className="text-slate-400 font-bold">{data.qty} un</span>
                                      <strong className="text-emerald-700 font-mono">R$ {data.total.toFixed(2)}</strong>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stocks / Logistics Summary */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs space-y-2">
                        <div className="font-bold text-slate-700 uppercase tracking-tight text-[10px] border-b pb-1.5 flex items-center gap-1.5">
                          <Package size={14} className="text-slate-500" /> Movimentação de Estoque e Comodatos
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Total Carregado:</span>
                              <span className="text-slate-800 font-bold">{(m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0)} un</span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Água 20L Vendida:</span>
                              <span className="text-blue-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'agua' || (s.productType === undefined && (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua')) && !s.item.toLowerCase().includes('bonifica')))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Troca Água/Avaria:</span>
                              <span className="text-rose-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'troca' || s.item.toLowerCase().includes('troca'))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Bonificações (Grátis):</span>
                              <span className="text-purple-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'bonificacao' || s.item.toLowerCase().includes('bonifica'))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1 border-l pl-3">
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Comodatos Deixados:</span>
                              <span className="text-indigo-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'comodato' || s.item.toLowerCase().includes('comodato'))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Comodatos Recolhidos:</span>
                              <span className="text-amber-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'retorno' || s.item.toLowerCase().includes('retorno'))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Vasilhames Vendidos:</span>
                              <span className="text-emerald-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'vasilhame' || (s.productType === undefined && s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('comodato') && !s.item.toLowerCase().includes('retorno') && !s.item.toLowerCase().includes('troca')))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>Troca/Avarias (Entrada):</span>
                              <span className="text-rose-600 font-bold">
                                {tripSales
                                  .filter(s => s.productType === 'troca' || s.item.toLowerCase().includes('troca'))
                                  .reduce((acc, s) => acc + (s.exchangeAvariasQty || s.qty), 0)} un
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* List of Sales */}
                      {tripSales.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-500 uppercase tracking-tight text-[9px] px-1">Lançamentos / Vendas Consolidadas</div>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y">
                            {groupSales(tripSales).map(g => {
                              return (
                                <div key={g.saleNumber} className="p-3 flex justify-between items-start bg-white gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-slate-800 text-xs">{g.clientName}</span>
                                      <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-100 border px-1 rounded">
                                        {g.saleNumber}
                                      </span>
                                    </div>
                                    <div className="space-y-0.5">
                                      {g.products.map((p, pIdx) => (
                                        <div key={pIdx} className="text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                                          <span className="font-bold text-slate-400">{p.qty} un</span>
                                          <span>{p.itemDisplayName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="text-right space-y-1">
                                    {g.payments.length > 0 ? (
                                      g.payments.map((p, pIdx) => (
                                        <div key={pIdx} className="text-[10px] font-mono font-bold text-slate-700 flex justify-end gap-1.5 items-center">
                                          <span className="text-[8px] font-bold uppercase text-slate-400 font-sans">{p.method}</span>
                                          <span>R$ {p.amount.toFixed(2)}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 uppercase tracking-wide">
                                        Grátis / Comodato
                                      </span>
                                    )}
                                    {g.payments.length > 1 && (
                                      <div className="text-[9px] text-slate-400 font-bold border-t border-dashed border-slate-200 pt-0.5 mt-0.5 font-mono">
                                        TOTAL: R$ {g.totalValue.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* List of Expenses */}
                      {tripExpenses.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-500 uppercase tracking-tight text-[9px] px-1">Despesas Lançadas ({tripExpenses.length})</div>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y">
                            {tripExpenses.map(e => (
                              <div key={e.id} className="p-2 px-3 flex justify-between items-center bg-white">
                                <span className="font-semibold text-slate-700">{e.item}</span>
                                <span className="font-bold text-red-500 font-mono">- R$ {e.value.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-50/50 p-4 w-full max-w-lg mx-auto space-y-4 pb-24">
      
      {/* Tab Switcher */}
      <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab('viagem')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'viagem'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck size={12} /> <span className="hidden sm:inline">Viagem Ativa</span><span className="sm:hidden">Viagem</span>
        </button>
        <button
          onClick={() => setActiveTab('prevenda')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'prevenda'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt size={12} /> <span className="hidden sm:inline">Pré-Venda</span><span className="sm:hidden">Pré-Vda</span>
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'relatorio'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={12} /> <span className="hidden sm:inline">Relatório</span><span className="sm:hidden">Relat</span>
        </button>
      </div>

      {activeTab === 'viagem' && (
        <>
          {/* Admin/Operator selector to preview other drivers' voyages */}
          {isAdminOrOperator && adminTrips.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-amber-600" />
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Simulador de Viagens (Modo Admin)</span>
              </div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Selecione uma Viagem Ativa</label>
              <select 
                value={selectedTripId} 
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-medium"
              >
                {adminTrips.map(trip => {
                  const settled = isTripSettled(trip);
                  const tripCode = getProductionCode(trip);
                  const hasReturned = getReturnMovement(trip) !== null;
                  return (
                    <option key={trip.id} value={trip.id}>
                      {tripCode} - {trip.plate} - {trip.driver} ({new Date(trip.timestamp).toLocaleDateString('pt-BR')}) {settled ? '[CONCLUÍDA]' : (hasReturned ? '[NO PÁTIO]' : '[EM ROTA]')}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Driver's own trip selector */}
          {!isAdminOrOperator && driverTrips.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={14} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Minhas Viagens</span>
              </div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Selecione a Viagem</label>
              <select 
                value={selectedTripId} 
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded bg-white font-medium"
              >
                {driverTrips.map(trip => {
                  const settled = isTripSettled(trip);
                  const tripCode = getProductionCode(trip);
                  const hasReturned = getReturnMovement(trip) !== null;
                  return (
                    <option key={trip.id} value={trip.id}>
                      {tripCode} - {trip.plate} ({new Date(trip.timestamp).toLocaleDateString('pt-BR')}) {settled ? '[CONCLUÍDA]' : (hasReturned ? '[NO PÁTIO]' : '[EM ROTA]')}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight">Veículo: {activeTrip.plate}</h2>
                <div className="text-[11px] font-black font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block mt-1">
                  Código da Viagem: {getProductionCode(activeTrip)}
                </div>
              </div>
              {isSettled ? (
                <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider">CONCLUÍDA</span>
              ) : returnMovement ? (
                <span className="text-amber-600 bg-amber-100 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border border-amber-200 animate-pulse">NO PÁTIO</span>
              ) : (
                <span className="text-blue-600 bg-blue-100 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider">EM ROTA</span>
              )}
            </div>
            <div className="flex flex-col text-xs text-slate-500 font-semibold gap-0.5">
              <span>Condutor: {activeTrip.driver}</span>
              <span>Saída: {new Date(activeTrip.timestamp).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {isSettled ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-800 shadow-3xs">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[11px] font-black uppercase tracking-wider">Acerto Finalizado</span>
                <span className="text-[10px] font-medium leading-tight">O acerto desta viagem foi concluído na Prestação de Contas. Ela está disponível apenas para consulta no Relatório.</span>
              </div>
            </div>
          ) : isReadOnly ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-800 shadow-3xs">
              <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {readOnlyReason === 'retornada_e_descarregada' ? 'Viagem Encerrada' : 'Apenas Leitura'}
                </span>
                <span className="text-[10px] font-medium leading-tight">
                  {readOnlyReason === 'retornada_e_descarregada' 
                    ? 'Esta viagem foi encerrada pois o veículo já retornou e o descarregamento foi concluído na empresa. Alterações não são mais permitidas.'
                    : 'Você está visualizando a viagem de outro motorista. Alterações são bloqueadas para manter a integridade dos dados.'
                  }
                </span>
              </div>
            </div>
          ) : null}

          {/* Estoque */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-600 text-white rounded-xl p-3 shadow-sm border border-blue-700 flex flex-col items-center justify-center">
              <PackageOpen size={20} className="mb-1 opacity-80" />
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-90 text-center">Água (Cheios)</span>
              <span className="text-2xl font-black">{currentStockAgua}</span>
            </div>
            <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-sm border border-emerald-700 flex flex-col items-center justify-center">
              <Package size={20} className="mb-1 opacity-80" />
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-90 text-center">Vasilhames (Vazios)</span>
              <span className="text-2xl font-black">{currentStockVasilhame}</span>
            </div>
          </div>
          
          {(() => {
            const activeDisposableLoads = (driverTripLoads || []).filter(t => {
              if (t.status === 'finalizada' || t.currentTruckStock <= 0 || isSettled) return false;
              
              const currentDrv = ((activeTrip as any)?.driverName || activeTrip?.driver || '').toLowerCase().trim();
              const currentPlt = (activeTrip?.plate || '').toUpperCase().trim();
              const loadDrv = (t.driverName || '').toLowerCase().trim();
              const loadPlt = (t.vehiclePlate || '').toUpperCase().trim();

              const driverOrPlateMatch = (currentDrv && loadDrv === currentDrv) || (currentPlt && loadPlt === currentPlt);
              if (!driverOrPlateMatch) return false;

              // If load has gateMovementId, it MUST match activeTrip.id
              if (t.gateMovementId) {
                return !!activeTrip?.id && t.gateMovementId === activeTrip.id;
              }

              // If load has no gateMovementId, check timestamp against activeTrip
              if (activeTrip?.timestamp || (activeTrip as any)?.dateDeparture) {
                const tripStart = new Date(activeTrip.timestamp || (activeTrip as any).dateDeparture).getTime();
                const loadTime = new Date(t.timestamp).getTime();
                return loadTime >= (tripStart - 120000);
              }

              return true;
            });
            if (activeDisposableLoads.length === 0) return null;

            // Agrupa os itens por produto somando a quantidade expedida/atual
            const groupedMap = activeDisposableLoads.reduce((acc, load) => {
              const cleanName = load.productName.split('(')[0].trim();
              const key = load.productId || cleanName.toLowerCase();
              if (!acc[key]) {
                acc[key] = {
                  id: key,
                  productName: cleanName,
                  currentTruckStock: 0,
                  initialQty: 0
                };
              }
              acc[key].currentTruckStock += (load.currentTruckStock || 0);
              acc[key].initialQty += (load.initialQty || 0);
              return acc;
            }, {} as Record<string, { id: string; productName: string; currentTruckStock: number; initialQty: number }>);

            const groupedList = Object.values(groupedMap);
            if (groupedList.length === 0) return null;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {groupedList.map(item => (
                  <div key={item.id} className="bg-cyan-600 text-white rounded-xl p-3 shadow-sm border border-cyan-700 flex flex-col items-center justify-center">
                    <Box size={20} className="mb-1 opacity-80" />
                    <span className="text-[9px] uppercase tracking-wider font-bold opacity-90 text-center leading-tight line-clamp-2">{item.productName}</span>
                    <span className="text-2xl font-black">{item.currentTruckStock}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          
          <p className="text-[9px] text-slate-400 text-center italic mt-[-8px]">Estoque inicial carregado: {initialStock}</p>

          {/* Resultado do Caixa */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-800 font-bold text-white text-sm flex items-center justify-between uppercase tracking-tight">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-400" />
                Resultado do Caixa
              </div>
              <span className="text-xs font-black text-amber-400">Geral: R$ {(totalValueSales - totalValueExpenses).toFixed(2)}</span>
            </div>
            <div className="p-3.5 space-y-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Saldos Finais por Operação</div>
              
              <div className="space-y-1.5 text-xs">
                {/* Cash Method with subtracted expenses and added cash advances */}
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-600">Dinheiro (Cash)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800">R$ {salesByPayment.dinheiro.toFixed(2)}</div>
                    {totalCashAdvances > 0 && (
                      <div className="text-[9px] text-emerald-600 font-bold">+ R$ {totalCashAdvances.toFixed(2)} adiantamento</div>
                    )}
                    {totalValueExpenses > 0 && (
                      <div className="text-[9px] text-red-500 font-bold">- R$ {totalValueExpenses.toFixed(2)} despesas</div>
                    )}
                    <div className={`text-[10px] font-black ${(salesByPayment.dinheiro - totalValueExpenses + totalCashAdvances) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      Mão: R$ {(salesByPayment.dinheiro - totalValueExpenses + totalCashAdvances).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Cash advances list for reprinting */}
                {activeTrip.cashAdvances && activeTrip.cashAdvances.length > 0 && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Coins size={12} /> Adiantamentos Recebidos
                    </div>
                    <div className="space-y-1">
                      {activeTrip.cashAdvances.map(adv => (
                        <div key={adv.id} className="flex justify-between items-center text-[10px] text-emerald-900 bg-white/70 p-1 rounded border border-emerald-100">
                          <span className="font-semibold">{adv.reason}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">R$ {adv.value.toFixed(2)}</span>
                            <button
                              onClick={() => handlePrintCashAdvance({
                                id: adv.id,
                                driverName: activeTrip.driver,
                                plate: activeTrip.plate,
                                value: adv.value,
                                reason: adv.reason,
                                timestamp: adv.timestamp,
                                operator: adv.operator
                              })}
                              className="text-emerald-600 hover:text-emerald-800 font-bold underline text-[9px]"
                              title="Imprimir comprovante"
                            >
                              Imprimir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PIX */}
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    <span className="font-semibold text-slate-600">PIX</span>
                  </div>
                  <strong className="text-indigo-700 font-mono">R$ {salesByPayment.pix.toFixed(2)}</strong>
                </div>

                {/* Boleto */}
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="font-semibold text-slate-600">Boleto Bancário</span>
                  </div>
                  <strong className="text-blue-700 font-mono">R$ {salesByPayment.boleto.toFixed(2)}</strong>
                </div>

                {/* Cheque */}
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-slate-600">Cheque</span>
                  </div>
                  <strong className="text-amber-700 font-mono">R$ {salesByPayment.cheque.toFixed(2)}</strong>
                </div>

                {/* Outros */}
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                    <span className="font-semibold text-slate-600">Outros</span>
                  </div>
                  <strong className="text-slate-700 font-mono">R$ {salesByPayment.outros.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Registrar Lançamento Multi-produtos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 uppercase tracking-tight">
              <div className="flex items-center gap-2">
                <Receipt size={16} /> {isReadOnly ? 'Vendas / Lançamentos Efetuados' : 'Registrar Venda / Operação'}
              </div>
              {!isReadOnly && (
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-full cursor-pointer hover:bg-slate-50 transition-all select-none normal-case">
                  <input
                    type="checkbox"
                    checked={useEasyMask}
                    onChange={e => setUseEasyMask(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5"
                  />
                  <span>Digitação s/ Vírgula (0,00)</span>
                </label>
              )}
            </div>

            {!isReadOnly && (
              (() => {
                const availablePreSales = preSales.filter(p => {
                  if (p.isUsed || p.deleted) return false;
                  if (isDriverUser) {
                    return isPreSaleForCurrentDriver(p.driverName);
                  }
                  const tripDrv = (activeTrip?.driver || (activeTrip as any)?.driverName || '').trim().toLowerCase();
                  if (tripDrv) {
                    return (p.driverName || '').trim().toLowerCase() === tripDrv;
                  }
                  return false;
                });
                if (availablePreSales.length === 0) return null;
                return (
                  <div className="p-3 bg-blue-50/50 border-b border-blue-100">
                    <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Receipt size={12} /> Pré-Vendas Disponíveis para Esta Viagem
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {availablePreSales.map(ps => (
                        <div key={ps.id} className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded-lg shadow-xs hover:border-blue-400 transition-colors">
                          <div className="text-left space-y-0.5 max-w-[70%]">
                            <div className="text-xs font-bold text-slate-800 truncate">{ps.clientName}</div>
                            <div className="text-[9px] text-slate-500 font-bold">
                              {ps.products.map(p => `${p.qty}x ${getProductDisplayName(p.productType)}`).join(', ')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setClientName(ps.clientName);
                              setCart(ps.products as any);
                              setLinkedPreSaleId(ps.id);
                            }}
                            className="px-2.5 py-1 text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs transition-colors cursor-pointer uppercase tracking-tight flex items-center gap-1 shrink-0"
                          >
                            Abrir Pré-Venda
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
            
            {!isReadOnly && (() => {
              const query = clientName.toLowerCase().trim();
              const filteredDropdownClients = registeredClients
                .filter(c => {
                  if (!query) return true;
                  const nameMatch = c.name.toLowerCase().includes(query);
                  const codeMatch = c.codigo ? c.codigo.toLowerCase().includes(query) : false;
                  const fantasyMatch = c.apelidoFantasia ? c.apelidoFantasia.toLowerCase().includes(query) : false;
                  const cpfCnpjMatch = c.cpfCnpj ? c.cpfCnpj.toLowerCase().includes(query) : false;
                  return nameMatch || codeMatch || fantasyMatch || cpfCnpjMatch;
                })
                .sort((a, b) => {
                  const codeA = parseInt(a.codigo || '', 10);
                  const codeB = parseInt(b.codigo || '', 10);
                  const isANum = !isNaN(codeA) && /^\d+$/.test((a.codigo || '').trim());
                  const isBNum = !isNaN(codeB) && /^\d+$/.test((b.codigo || '').trim());
                  if (isANum && isBNum) {
                    return codeA - codeB;
                  }
                  if (isANum) return -1;
                  if (isBNum) return 1;
                  const valA = a.codigo || '';
                  const valB = b.codigo || '';
                  if (valA || valB) {
                    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                  }
                  return a.name.localeCompare(b.name);
                });

              return (
                <div className="p-3.5 space-y-4">
                  {/* Painel de Estoque e Pré-Venda */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-150 shadow-sm grid grid-cols-3 gap-2">
                    <div className="text-center p-1.5 bg-white rounded-lg border border-blue-100 shadow-xs">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">Estoque Caminhão</div>
                      <div className="text-sm font-black text-slate-800 mt-0.5">{activeTrip ? currentRealStock : '0'} un</div>
                    </div>
                    <div className="text-center p-1.5 bg-white rounded-lg border border-blue-100 shadow-xs">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">Reserva Pré-Venda</div>
                      <div className="text-sm font-black text-amber-600 mt-0.5">{pendingPreSalesWaterQty} un</div>
                    </div>
                    <div className="text-center p-1.5 bg-indigo-100/40 rounded-lg border border-indigo-150 shadow-xs">
                      <div className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-tight">Líquido p/ Vender</div>
                      <div className="text-sm font-black text-indigo-800 mt-0.5">{activeTrip ? stockWithPreSaleDeduction : '0'} un</div>
                    </div>
                  </div>

                  {/* Step 1: Client Name Input */}
                  <div className="space-y-2">
                    <div className="relative">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">1. Cliente / Destinatário</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          value={clientName} 
                          onChange={e => {
                            setClientName(e.target.value);
                            setShowClientDropdown(true);
                          }} 
                          onFocus={() => setShowClientDropdown(true)}
                          onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                          className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800 placeholder:text-slate-400 pr-8" 
                          placeholder="Pesquise por Código, CNPJ, Nome, Fantasia..." 
                        />
                        {clientName && (
                          <button
                            type="button"
                            onClick={() => setClientName('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer font-bold text-sm"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {showClientDropdown && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {filteredDropdownClients.slice(0, 50).map(c => (
                            <div
                              key={c.id}
                              onMouseDown={() => {
                                setClientName(c.name);
                                setShowClientDropdown(false);
                              }}
                              className="p-2 hover:bg-blue-50 cursor-pointer text-xs space-y-0.5 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800">{c.name}</span>
                                {c.codigo && (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] px-1 rounded font-mono font-bold">
                                    #{c.codigo}
                                  </span>
                                )}
                              </div>
                              {c.apelidoFantasia && (
                                <div className="text-[10px] text-slate-500 italic">
                                  Fantasia: {c.apelidoFantasia}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 font-mono">
                                {c.cpfCnpj && <span>{c.personType === 'fisica' ? 'CPF' : 'CNPJ'}: {c.cpfCnpj}</span>}
                                {c.comprasNaEmpresa && <span className="bg-emerald-50 text-emerald-700 font-bold px-1 rounded">🏢 Portaria</span>}
                              </div>
                              {(c.endereco || c.bairro || c.cidade || c.uf) && (
                                <div className="text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex flex-wrap gap-1 items-center mt-1">
                                  <span className="font-semibold text-slate-500">📍</span>
                                  <span>{c.endereco || ''}{c.numero ? `, ${c.numero}` : ''}</span>
                                  {c.bairro && <span className="text-slate-400">· {c.bairro}</span>}
                                  {(c.cidade || c.uf) && (
                                    <span className="text-slate-400">· {c.cidade || ''}-{c.uf || ''}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {filteredDropdownClients.length === 0 && (
                            <div className="p-3 text-xs text-slate-400 italic text-center">
                              Nenhum cliente encontrado. Digite para cadastrar um novo.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Step 2: Add Product to Cart */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-3">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">2. Adicionar Produto</div>
                    
                    {/* Product Type Selector */}
                    <div className="flex flex-col gap-1.5">
                      {[
                        { type: 'agua', label: 'Água 20L', desc: 'Galão de 20 Litros', icon: <PackageOpen size={14} className="text-blue-500" /> },
                        { type: 'agua_copo', label: 'Água Copo 200ml', desc: 'Caixa com 48 unidades', icon: <Box size={14} className="text-cyan-600" /> },
                        { type: 'garrafa510', label: 'Água Garrafa 510ml', desc: 'Fardo com 12 unidades', icon: <Box size={14} className="text-teal-600" /> },
                        { type: 'garrafa15l', label: 'Água Garrafa 1,5L', desc: 'Fardo com 6 unidades', icon: <Box size={14} className="text-emerald-600" /> },
                        { type: 'vasilhame', label: 'Vasilhame', desc: 'Venda de vasilhame vazio', icon: <Package size={14} className="text-emerald-500" /> },
                        { type: 'troca', label: 'Troca Água/Vasilhame', desc: 'Troca de água por vasilhames', icon: <RefreshCw size={14} className="text-rose-500" /> },
                        { type: 'bonificacao', label: 'Bonificação', desc: 'Brinde/Cortesia (Grátis)', icon: <Gift size={14} className="text-purple-500" /> },
                        { type: 'comodato', label: 'Comodato', desc: 'Empréstimo de vasilhame (Grátis)', icon: <FileText size={14} className="text-indigo-500" /> },
                        { type: 'retorno', label: 'Retorno', desc: 'Devolução de vasilhame (Grátis)', icon: <RefreshCw size={14} className="text-amber-500" /> }
                      ].map((prod) => (
                        <button
                          key={prod.type}
                          type="button"
                          onClick={() => setNewSaleProductType(prod.type as any)}
                          className={`w-full py-1.5 px-2.5 rounded-md text-left text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition-all ${
                            newSaleProductType === prod.type
                              ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-3xs'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {prod.icon}
                            <div className="flex flex-col items-start normal-case text-slate-700">
                              <span className="font-bold text-[11px] uppercase tracking-wide leading-tight">{prod.label}</span>
                              <span className="text-[9px] text-slate-400 font-medium leading-none">{prod.desc}</span>
                            </div>
                          </div>
                          {newSaleProductType === prod.type && (
                            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Exchange Factor Selector for 'troca' */}
                    {newSaleProductType === 'troca' && (
                      <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg space-y-2">
                        <label className="text-[9px] font-bold text-rose-700 uppercase block">Fator de Troca (Água x Vasilhame)</label>
                        <div className="flex items-center gap-2 max-w-[180px]">
                          <span className="text-xs text-rose-700 font-bold whitespace-nowrap">Fator:</span>
                          <div className="relative flex items-center flex-1">
                            <input
                              type="number"
                              min="1"
                              required
                              value={newSaleExchangeRatio}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setNewSaleExchangeRatio('');
                                } else {
                                  const parsed = parseInt(val);
                                  setNewSaleExchangeRatio(isNaN(parsed) ? '' : Math.max(1, parsed));
                                }
                              }}
                              className="w-full text-center text-xs p-1.5 pr-8 border border-rose-200 rounded font-bold text-rose-700 outline-none bg-white focus:ring-1 focus:ring-rose-500"
                            />
                            <span className="absolute right-2 text-[10px] font-bold text-rose-400 pointer-events-none">x1</span>
                          </div>
                        </div>
                        {newSaleQty !== '' && Number(newSaleQty) > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold leading-tight mt-1 text-left">
                            Será gerada uma baixa de <span className="font-bold">{newSaleQty} un. de Água</span> e a entrada de <span className="font-bold">{Number(newSaleQty) * (newSaleExchangeRatio || 4)} un. de Vasilhames</span> (como avarias) no estoque do veículo.
                          </div>
                        )}
                      </div>
                    )}

                {/* Qty and Unit Price Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Quantidade (Un)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0" 
                      required 
                      value={newSaleQty} 
                      onFocus={(e) => e.target.select()}
                      onChange={e => {
                        const val = e.target.value;
                        setNewSaleQty(val === '' ? '' : Number(val));
                      }} 
                      className="w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Preço Unitário (R$)</label>
                    <input 
                      type={useEasyMask ? "text" : "number"} 
                      inputMode={useEasyMask ? "numeric" : "decimal"}
                      step={useEasyMask ? undefined : "0.01"} 
                      min="0" 
                      required 
                      disabled={newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' || newSaleProductType === 'troca'} 
                      value={
                        newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' || newSaleProductType === 'troca'
                          ? (useEasyMask ? '0,00' : 0) 
                          : (useEasyMask ? formatToBRLMask(newSaleValue) : newSaleValue)
                      } 
                      onFocus={(e) => e.target.select()}
                      onChange={e => {
                        const val = e.target.value;
                        if (useEasyMask) {
                          handleCurrencyMaskChange(val, setNewSaleValue);
                        } else {
                          setNewSaleValue(val === '' ? '' : Number(val));
                        }
                      }} 
                      className={`w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                        newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' || newSaleProductType === 'troca'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
                          : 'bg-white font-bold text-slate-700 text-right'
                      }`} 
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddToCart}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Inserir no Carrinho
                </button>
              </div>

              {/* Step 3: Shopping Cart Items List & Total to Pay */}
              {cart.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">3. Produtos Adicionados</span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">{cart.length} item(ns)</span>
                  </div>

                  {linkedPreSaleId && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 rounded p-2 text-[11px] font-bold">
                      <div className="flex items-center gap-1">
                        <span>📝 Carrinho via Pré-Venda</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkedPreSaleId(null);
                          setCart([]);
                          setClientName('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Desvincular Pré-Venda"
                      >
                        Desvincular
                      </button>
                    </div>
                  )}

                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {cart.map((item, idx) => {
                      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca';
                      const isEditing = editingCartIdx === idx;

                      if (isEditing) {
                        return (
                          <li key={idx} className="py-2.5 bg-blue-50/40 rounded-md border border-blue-100 my-1 px-2 text-xs">
                            <div className="font-extrabold text-slate-800 mb-1.5">{getProductDisplayName(item.productType)}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex-1 min-w-[70px]">
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Qtd:</label>
                                <input 
                                  type="number"
                                  min="1"
                                  value={editingCartQty}
                                  onChange={e => setEditingCartQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="w-full text-xs p-1 border border-slate-300 rounded bg-white font-bold text-slate-700 text-center"
                                />
                              </div>
                              {!isZeroVal && (
                                <div className="flex-1 min-w-[100px]">
                                  <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Preço (R$):</label>
                                  <input 
                                    type={useEasyMask ? "text" : "number"}
                                    inputMode={useEasyMask ? "numeric" : "decimal"}
                                    value={useEasyMask ? formatToBRLMask(editingCartPrice) : editingCartPrice}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (useEasyMask) {
                                        handleCurrencyMaskChange(val, setEditingCartPrice);
                                      } else {
                                        setEditingCartPrice(val === '' ? '' : Number(val));
                                      }
                                    }}
                                    className="w-full text-xs p-1 border border-slate-300 rounded bg-white font-bold text-slate-700 text-right"
                                  />
                                </div>
                              )}
                              <div className="flex items-end gap-1.5 pt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedCart = [...cart];
                                    updatedCart[idx] = {
                                      ...item,
                                      qty: editingCartQty,
                                      unitPrice: isZeroVal ? 0 : Number(editingCartPrice || 0)
                                    };
                                    setCart(updatedCart);
                                    setEditingCartIdx(null);
                                  }}
                                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition-colors"
                                  title="Salvar"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCartIdx(null)}
                                  className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded cursor-pointer transition-colors"
                                  title="Cancelar"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={idx} className="py-2 flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-800">{getProductDisplayName(item.productType)}</span>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {item.qty} un × R$ {item.unitPrice.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-700 mr-2">R$ {(item.qty * item.unitPrice).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCartIdx(idx);
                                setEditingCartQty(item.qty);
                                setEditingCartPrice(item.unitPrice);
                              }}
                              className="text-blue-500 p-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Editar Produto"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFromCart(idx)} 
                              className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100 transition-colors cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total a Pagar:</span>
                    <strong className="text-base font-black text-blue-700 font-mono">R$ {cartTotal.toFixed(2)}</strong>
                  </div>

                  {/* Step 4: Split Payments Form */}
                  {cartTotal > 0 ? (
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 space-y-3.5">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">4. Formas de Pagamento</div>
                      
                      <div className="space-y-2.5">
                        {/* Dinheiro */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-slate-100/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-slate-200/40 sm:border-0">
                          <span className="w-full sm:w-20 font-bold text-xs text-slate-600 capitalize shrink-0">Dinheiro</span>
                          <div className="flex items-center gap-1.5 flex-1 w-full min-w-0">
                            <input 
                              type={useEasyMask ? "text" : "number"} 
                              inputMode={useEasyMask ? "numeric" : "decimal"}
                              placeholder="0,00" 
                              value={payDinheiro} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => handlePaymentMaskChange(e.target.value, setPayDinheiro)} 
                              className="flex-1 min-w-0 text-xs h-8 px-2 border border-slate-300 rounded font-bold text-slate-700 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAutoFillPayment('dinheiro')}
                              className="text-[9px] h-8 px-2.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded cursor-pointer shrink-0 transition"
                            >
                              Tudo
                            </button>
                          </div>
                        </div>

                        {/* PIX */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-slate-100/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-slate-200/40 sm:border-0">
                          <span className="w-full sm:w-20 font-bold text-xs text-slate-600 capitalize shrink-0">PIX</span>
                          <div className="flex items-center gap-1.5 flex-1 w-full min-w-0">
                            <input 
                              type={useEasyMask ? "text" : "number"} 
                              inputMode={useEasyMask ? "numeric" : "decimal"}
                              placeholder="0,00" 
                              value={payPix} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => handlePaymentMaskChange(e.target.value, setPayPix)} 
                              className="flex-1 min-w-0 text-xs h-8 px-2 border border-slate-300 rounded font-bold text-slate-700 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAutoFillPayment('pix')}
                              className="text-[9px] h-8 px-2.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded cursor-pointer shrink-0 transition"
                            >
                              Tudo
                            </button>
                          </div>
                        </div>

                        {/* Boleto */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-slate-100/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-slate-200/40 sm:border-0">
                          <span className="w-full sm:w-20 font-bold text-xs text-slate-600 capitalize shrink-0">Boleto</span>
                          <div className="flex items-center gap-1.5 flex-1 w-full min-w-0">
                            <input 
                              type={useEasyMask ? "text" : "number"} 
                              inputMode={useEasyMask ? "numeric" : "decimal"}
                              placeholder="0,00" 
                              value={payBoleto} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => handlePaymentMaskChange(e.target.value, setPayBoleto)} 
                              className="flex-1 min-w-0 text-xs h-8 px-2 border border-slate-300 rounded font-bold text-slate-700 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAutoFillPayment('boleto')}
                              className="text-[9px] h-8 px-2.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded cursor-pointer shrink-0 transition"
                            >
                              Tudo
                            </button>
                          </div>
                        </div>

                        {/* Cheque */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-slate-100/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-slate-200/40 sm:border-0">
                          <span className="w-full sm:w-20 font-bold text-xs text-slate-600 capitalize shrink-0">Cheque</span>
                          <div className="flex items-center gap-1.5 flex-1 w-full min-w-0">
                            <input 
                              type={useEasyMask ? "text" : "number"} 
                              inputMode={useEasyMask ? "numeric" : "decimal"}
                              placeholder="0,00" 
                              value={payCheque} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => handlePaymentMaskChange(e.target.value, setPayCheque)} 
                              className="flex-1 min-w-0 text-xs h-8 px-2 border border-slate-300 rounded font-bold text-slate-700 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAutoFillPayment('cheque')}
                              className="text-[9px] h-8 px-2.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded cursor-pointer shrink-0 transition"
                            >
                              Tudo
                            </button>
                          </div>
                        </div>

                        {/* Outros */}
                        <div className="flex flex-col gap-1.5 border-t pt-2 mt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 bg-slate-100/50 p-2 sm:p-0 rounded-lg sm:bg-transparent border border-slate-200/40 sm:border-0">
                            <span className="w-full sm:w-20 font-bold text-xs text-slate-600 capitalize shrink-0">Outros</span>
                            <div className="flex items-center gap-1.5 flex-1 w-full min-w-0">
                              <input 
                                type={useEasyMask ? "text" : "number"} 
                                inputMode={useEasyMask ? "numeric" : "decimal"}
                                placeholder="0,00" 
                                value={payOutros} 
                                onFocus={(e) => e.target.select()}
                                onChange={e => handlePaymentMaskChange(e.target.value, setPayOutros)} 
                                className="flex-1 min-w-0 text-xs h-8 px-2 border border-slate-300 rounded font-bold text-slate-700 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAutoFillPayment('outros')}
                                className="text-[9px] h-8 px-2.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded cursor-pointer shrink-0 transition"
                              >
                                Tudo
                              </button>
                            </div>
                          </div>
                          {valOutros > 0 && (
                            <div className="w-full">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Especifique a Forma / Observação</label>
                              <input 
                                type="text" 
                                required 
                                value={payOutrosNote} 
                                onChange={e => setPayOutrosNote(e.target.value)} 
                                className="w-full text-xs p-1.5 border border-slate-300 rounded outline-none bg-white text-slate-700 font-bold" 
                                placeholder="Ex: Débito, Prazo faturado..." 
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Matching Check Box */}
                      <div className="pt-2 border-t flex justify-between items-center">
                        <div className="flex flex-col text-[10px] text-slate-400">
                          <span>Recebido: <strong>R$ {totalPaid.toFixed(2)}</strong></span>
                          <span>Restante: <strong>R$ {Math.abs(paymentDiff).toFixed(2)}</strong></span>
                        </div>
                        {Math.abs(paymentDiff) < 0.01 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <Check size={10} /> Pagamento Batendo
                          </span>
                        ) : paymentDiff > 0 ? (
                          <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                            Faltam R$ {paymentDiff.toFixed(2)}
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                            Excesso R$ {Math.abs(paymentDiff).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-purple-50 text-purple-800 border border-purple-100 p-2.5 rounded-lg text-center font-bold text-xs">
                      Esta é uma operação puramente logística (Grátis). Nenhum pagamento é necessário!
                    </div>
                  )}

                  {/* Signature Pad */}
                  <div className="py-3 mt-2 border-t border-slate-200 pb-6 mb-2">
                    <SignaturePad 
                      onSign={(sig) => setClientSignature(sig)} 
                      height={120}
                    />
                  </div>

                  {/* Final Action Checkouts */}
                  <div className="pt-2">
                    <button 
                      type="button" 
                      onClick={handleFinalizeSale}
                      disabled={cartTotal > 0 && Math.abs(paymentDiff) > 0.01}
                      className={`w-full py-2.5 text-white rounded font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        cartTotal > 0 && Math.abs(paymentDiff) > 0.01
                          ? 'bg-slate-300 cursor-not-allowed opacity-60'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                      }`}
                    >
                      <CheckCircle2 size={16} /> Finalizar e Salvar Venda
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

            {sales.length > 0 && (
              <div className="px-3 pb-3 border-t border-slate-100 bg-slate-50/50">
                {/* Payment Summary Box */}
                <div className="py-2.5 mt-2 border-b border-slate-200">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Resumo por Forma de Pagamento</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {salesByPayment.dinheiro > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center justify-center text-center shadow-3xs">
                        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Dinheiro</span>
                        <strong className="text-emerald-700 text-xs mt-0.5">R$ {salesByPayment.dinheiro.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.pix > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center justify-center text-center shadow-3xs">
                        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">PIX</span>
                        <strong className="text-indigo-700 text-xs mt-0.5">R$ {salesByPayment.pix.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.boleto > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center justify-center text-center shadow-3xs">
                        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Boleto</span>
                        <strong className="text-blue-700 text-xs mt-0.5">R$ {salesByPayment.boleto.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.cheque > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center justify-center text-center shadow-3xs">
                        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Cheque</span>
                        <strong className="text-amber-700 text-xs mt-0.5">R$ {salesByPayment.cheque.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.outros > 0 && (
                      <div className="bg-white p-2 rounded border border-slate-200 flex flex-col items-center justify-center text-center shadow-3xs" title="Outras formas de pagamento especificadas nas observações">
                        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Outros</span>
                        <strong className="text-slate-700 text-xs mt-0.5">R$ {salesByPayment.outros.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mb-2 mt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Histórico de Lançamentos</span>
                  <span className="text-sm font-black text-slate-800">Total: R$ {totalValueSales.toFixed(2)}</span>
                </div>
                <ul className="space-y-2">
                  {(() => {
                    const getProductBadge = (type?: string, itemText: string = '') => {
                      const t = type || (itemText.toLowerCase().includes('copo') ? 'agua_copo' : itemText.toLowerCase().includes('510') ? 'garrafa510' : itemText.toLowerCase().includes('1,5') || itemText.toLowerCase().includes('1.5') ? 'garrafa15l' : itemText.toLowerCase().includes('troca') ? 'troca' : itemText.toLowerCase().includes('bonifica') ? 'bonificacao' : itemText.toLowerCase().includes('comodato') ? 'comodato' : itemText.toLowerCase().includes('retorno') ? 'retorno' : itemText.toLowerCase().includes('vasilhame') ? 'vasilhame' : 'agua');
                      switch (t) {
                        case 'agua':
                          return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Água 20L</span>;
                        case 'agua_copo':
                          return <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Copo 200ml</span>;
                        case 'garrafa510':
                          return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Garrafa 510ml</span>;
                        case 'garrafa15l':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Garrafa 1,5L</span>;
                        case 'vasilhame':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Vasilhame</span>;
                        case 'troca':
                          return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Troca</span>;
                        case 'bonificacao':
                          return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Bonificação</span>;
                        case 'comodato':
                          return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Comodato</span>;
                        case 'retorno':
                          return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Retorno</span>;
                        default:
                          return null;
                      }
                    };

                    const groupedSales = groupSales(sales);

                    return groupedSales.map(g => {
                      return (
                        <li key={g.saleNumber} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-800 text-sm break-words">{g.clientName}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                {g.saleNumber}
                              </span>
                            </div>
                            
                            {/* Products List */}
                            <div className="space-y-1.5">
                              {g.products.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs flex-wrap">
                                  <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{p.qty} un.</span>
                                  {getProductBadge(p.productType, p.itemDisplayName)}
                                  {p.productType === 'troca' && (
                                    <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-200">
                                      Fator: {p.exchangeRatio || 4}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payments & Actions */}
                          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
                            {/* Payments Breakdown */}
                            <div className="space-y-1 text-left md:text-right min-w-[120px]">
                              {g.payments.length > 0 ? (
                                g.payments.map((p, idx) => {
                                  const isAutoNote = p.note && (
                                    p.note.includes('Dinheiro: R$') || 
                                    p.note.includes('PIX: R$') || 
                                    p.note.includes('Boleto: R$') || 
                                    p.note.includes('Cheque: R$') ||
                                    p.note.includes('A Prazo: R$')
                                  );
                                  return (
                                    <div key={idx} className="flex items-center md:justify-end gap-1.5 text-xs">
                                      <span className="text-[9px] font-bold uppercase text-slate-400">{p.method}</span>
                                      <span className="font-mono font-bold text-slate-800">R$ {p.amount.toFixed(2)}</span>
                                      {p.note && !isAutoNote && <span className="text-[9px] italic text-slate-400 font-semibold max-w-[150px] truncate" title={p.note}>({p.note})</span>}
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="inline-block text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wide">
                                  Grátis / Comodato
                                </span>
                              )}
                              {g.payments.length > 1 && (
                                <div className="text-[9px] text-slate-400 font-bold border-t border-dashed border-slate-200 pt-0.5 mt-0.5 font-mono">
                                  TOTAL: R$ {g.totalValue.toFixed(2)}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Print / Sign Action */}
                              <button 
                                onClick={() => setLastSaleForPrint({
                                  saleNumber: g.saleNumber,
                                  sales: sales.filter(s => s.saleNumber === g.saleNumber)
                                })} 
                                className="text-blue-600 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider border border-blue-200 shrink-0"
                                title="Ver / Imprimir / Assinar Pedido"
                              >
                                <Printer size={14} /> <span>Imprimir / Assinar</span>
                              </button>

                              {/* Delete Action */}
                              {!isReadOnly && (
                                <button 
                                  onClick={() => handleRemoveSaleGroup(g.rawIds)} 
                                  className="text-red-500 p-2 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors border border-red-200 flex items-center justify-center shrink-0"
                                  title="Excluir Venda"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            )}
          </div>

          {/* Despesas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight">
              <Receipt size={16} /> Despesas de Viagem
            </div>
            
            {!isReadOnly && (
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Atalhos de Descrição</div>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setNewExpenseItem('Almoço')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        newExpenseItem.toLowerCase() === 'almoço' || newExpenseItem.toLowerCase() === 'almoco'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      🍴 Almoço
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewExpenseItem('Ajudante')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        newExpenseItem.toLowerCase() === 'ajudante'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      👥 Ajudante
                    </button>
                  </div>

                  <form onSubmit={handleAddExpense} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Descrição</label>
                      <input 
                        type="text" 
                        required 
                        value={newExpenseItem} 
                        onChange={e => setNewExpenseItem(e.target.value)} 
                        className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="Ex: Pedágio, Combustível..." 
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Valor (R$)</label>
                      <input 
                        type={useEasyMask ? "text" : "number"} 
                        inputMode={useEasyMask ? "numeric" : "decimal"}
                        step={useEasyMask ? undefined : "0.01"} 
                        min="0" 
                        required 
                        value={useEasyMask ? formatToBRLMask(newExpenseValue) : (newExpenseValue || '')} 
                        onFocus={(e) => e.target.select()}
                        onChange={e => {
                          if (useEasyMask) {
                            handleCurrencyMaskChange(e.target.value, setNewExpenseValue);
                          } else {
                            setNewExpenseValue(Number(e.target.value));
                          }
                        }} 
                        className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-right bg-white" 
                      />
                    </div>
                    <button type="submit" className="h-[34px] px-3 bg-slate-800 text-white rounded font-bold hover:bg-slate-700 transition cursor-pointer">
                      <Plus size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {expenses.length > 0 && (
              <div className="px-3 pb-3 border-t border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center mb-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lançamentos</span>
                  <span className="text-xs font-black text-slate-800">Total: R$ {totalValueExpenses.toFixed(2)}</span>
                </div>
                <ul className="space-y-2">
                  {expenses.map(ex => (
                    <li key={ex.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-sm shadow-2xs">
                      <span className="font-bold text-slate-700">{ex.item}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">R$ {ex.value.toFixed(2)}</span>
                        {!isReadOnly && (
                          <button onClick={() => handleRemoveExpense(ex.id)} className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100 cursor-pointer transition-colors"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'prevenda' && renderPreSalesTab()}
      {activeTab === 'relatorio' && renderTripReport()}

      {/* Print Order Modal */}
      {lastSaleForPrint && (() => {
        const groupedPrintSale = groupSales(lastSaleForPrint.sales)[0];
        const clientClean = groupedPrintSale?.clientName || 'Consumidor';
        const driverName = activeTrip?.driver || 'Motorista';
        const totalAmount = lastSaleForPrint.sales.reduce((sum, s) => sum + (s.qty * s.value), 0);
        const hasSignature = groupedPrintSale?.signature;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:w-full print:max-w-full print:max-h-none">
              <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center shrink-0 print:hidden">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={16} /> Venda Concluída
                </span>
                <button 
                  onClick={() => setLastSaleForPrint(null)} 
                  className="text-emerald-600 hover:text-emerald-800 transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div id="print-order-content" className="p-4 flex flex-col font-mono text-sm overflow-y-auto flex-1 print:p-0 print:text-black print:overflow-visible">
                {/* Receipt Header */}
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3 print:border-black">
                  <div className="mb-2">
                    {companyLogo ? (
                      <img 
                        src={companyLogo || undefined} 
                        alt="Logo" 
                        className="max-h-12 max-w-[150px] object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="font-sans font-black tracking-widest text-[#0c2a5c] text-lg uppercase">
                        CRISTAL SUL
                      </div>
                    )}
                  </div>
                  <h2 className="font-black text-sm uppercase tracking-wider">PEDIDO DE VENDA</h2>
                  <div className="text-xs text-slate-500 mt-1 print:text-black">{new Date().toLocaleString('pt-BR')}</div>
                  <div className="text-xs font-bold mt-1">PEDIDO Nº: {lastSaleForPrint.saleNumber}</div>
                </div>

                {/* Client Info */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3 space-y-1 text-xs print:border-black">
                  <div className="flex justify-between">
                    <span className="font-bold">CLIENTE:</span>
                    <span className="text-right max-w-[200px]">{clientClean}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">MOTORISTA:</span>
                    <span className="text-right">{driverName}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3 print:border-black">
                  <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1 mb-2 print:border-black">
                    <span>ITEM</span>
                    <span>QTD</span>
                    <span>V.UNIT</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {groupedPrintSale?.products.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <span className="flex-1 pr-2 truncate">{p.itemDisplayName}</span>
                        <span className="w-8 text-center">{Math.round(p.qty)}</span>
                        <span className="w-14 text-right">{p.unitPrice.toFixed(2)}</span>
                        <span className="w-16 text-right font-bold">{(p.qty * p.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-4 space-y-1 text-xs print:border-black">
                  <div className="flex justify-between font-black text-sm">
                    <span>TOTAL:</span>
                    <span>R$ {totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 uppercase print:text-black">Forma de Pagamento:</div>
                  {groupedPrintSale?.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="uppercase">{p.method}:</span>
                      <span>R$ {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!groupedPrintSale?.payments || groupedPrintSale.payments.length === 0) && (
                    <div className="text-[10px] text-slate-500 mt-1 uppercase print:text-black italic">
                      Grátis / Comodato / Devolução
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div className="text-center pt-2">
                  {hasSignature ? (
                    <div className="flex flex-col items-center">
                      <img src={groupedPrintSale.signature || undefined} alt="Assinatura" className="max-h-16 object-contain mb-1" />
                      <div className="border-t border-slate-400 w-4/5 mx-auto print:border-black"></div>
                      <span className="text-[9px] uppercase mt-1 text-slate-500 font-bold">Assinatura do Cliente</span>
                      {!isReadOnly && currentUser?.role !== 'supervisor' && currentUser?.role !== 'visualizador' && (
                        <button
                          type="button"
                          onClick={() => handleSaveSignatureForSale(lastSaleForPrint.saleNumber, null)}
                          className="text-[9px] text-red-500 hover:underline mt-1 print:hidden block mx-auto font-bold cursor-pointer"
                        >
                          Limpar/Refazer Assinatura
                        </button>
                      )}
                    </div>
                  ) : (
                    !isReadOnly && currentUser?.role !== 'supervisor' && currentUser?.role !== 'visualizador' ? (
                      <div className="flex flex-col items-center mt-2 print:hidden">
                        <div className="w-full max-w-[280px] border border-dashed border-slate-300 rounded p-1.5 bg-slate-50">
                          <SignaturePad 
                            onSign={(sig) => {
                              if (sig) {
                                handleSaveSignatureForSale(lastSaleForPrint.saleNumber, sig);
                              }
                            }} 
                            height={90}
                          />
                        </div>
                        <span className="text-[9px] uppercase mt-1 text-slate-400 font-bold">Assinar pelo celular</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic print:hidden mt-2 font-medium">
                        {currentUser?.role === 'supervisor' || currentUser?.role === 'visualizador'
                          ? 'Comprovante em modo visualização (Assinatura não permitida)'
                          : 'Sem assinatura registrada'}
                      </div>
                    )
                  )}
                  {!hasSignature && (
                    <div className="hidden print:flex flex-col items-center mt-12">
                      <div className="border-t border-slate-400 w-4/5 mx-auto"></div>
                      <span className="text-[9px] uppercase mt-1">Assinatura do Cliente</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 print:hidden">
                <button
                  onClick={() => {
                    const saleNum = lastSaleForPrint.saleNumber;
                    window.open(`?printSale=${saleNum}`, '_blank');
                  }}
                  className="w-full px-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Abrir em Nova Guia (Imprimir / PDF)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => printElementDirectly('print-order-content', `Pedido_${lastSaleForPrint.saleNumber}`)}
                    className="px-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Printer size={13} /> Imprimir Direto
                  </button>
                  <button
                    onClick={() => setLastSaleForPrint(null)}
                    className="px-2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    Nova Venda
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showStockWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">
                Atenção: Estoque Insuficiente
              </span>
            </div>
            
            <div className="p-4 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                O estoque de <span className="font-bold text-slate-800">Água (Cheios)</span> no veículo é insuficiente para a quantidade solicitada nesta operação.
              </p>
              
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estoque Disponível:</span>
                  <span className="font-bold text-slate-850">
                    {currentStockAgua - cart.filter(item => ['agua', 'bonificacao', 'troca'].includes(item.productType)).reduce((sum, item) => sum + item.qty, 0)} un.
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                  <span className="text-slate-500">Quantidade Solicitada:</span>
                  <span className="font-bold text-amber-600">{pendingCartItem?.qty} un.</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic text-center">
                Deseja lançar e continuar com essa venda mesmo assim?
              </p>
            </div>

            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancelAddStockWarning}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
              >
                Não, Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAddStockWarning}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold uppercase rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sim, Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingPreSaleId && (() => {
        const currentPreSale = preSales.find(ps => ps.id === deletingPreSaleId);
        const isNfIssued = !!currentPreSale?.nfIssued;
        const isExpedited = !!currentPreSale?.expeditionApproved || !!currentPreSale?.isUsed;
        const isSupervisorPreSale = !!currentPreSale?.supervisorName || !!currentPreSale?.supervisorId || currentPreSale?.createdByRole === 'supervisor';
        const isDriverBlocked = currentUser?.role === 'motorista' && isSupervisorPreSale;
        const cannotDelete = (isNfIssued && !confirmNfCancelled) || isDriverBlocked || isExpedited;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
              <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2.5">
                <Trash2 className="text-red-500 shrink-0" size={20} />
                <span className="text-sm font-bold text-red-800 uppercase tracking-wider">
                  Excluir Pré-Venda
                </span>
              </div>
              
              <div className="p-4 space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Por favor, informe o motivo da exclusão desta pré-venda. Esta ação não poderá ser desfeita.
                </p>

                {isExpedited && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-red-800 text-xs font-bold leading-tight">
                      <Lock size={14} className="shrink-0 text-red-600" />
                      <span>Exclusão Bloqueada - Carga Já Expedida</span>
                    </div>
                    <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                      Esta pré-venda já teve sua carga/produto expedido para o motorista <strong>{currentPreSale?.driverName || 'Motorista'}</strong> {currentPreSale?.vehiclePlate ? `(Veículo ${currentPreSale.vehiclePlate})` : ''}. Por integridade física e fiscal de estoque, a exclusão não é permitida para nenhum usuário após a expedição.
                    </p>
                  </div>
                )}

                {isDriverBlocked && !isExpedited && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-red-800 text-xs font-bold leading-tight">
                      <Lock size={14} className="shrink-0 text-red-600" />
                      <span>Exclusão Bloqueada para Motoristas</span>
                    </div>
                    <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                      Esta pré-venda foi realizada pelo supervisor <strong>{currentPreSale?.supervisorName || 'Supervisor'}</strong>. Motoristas não possuem permissão para excluir pré-vendas cadastradas por supervisores.
                    </p>
                  </div>
                )}
                
                {isNfIssued && !isExpedited && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-left">
                    <div className="flex items-start gap-2 text-amber-800 text-xs font-bold leading-tight">
                      <span className="shrink-0 text-sm">⚠️</span>
                      <div>
                        Esta pré-venda possui Nota Fiscal emitida (NF nº {currentPreSale?.nfNumber || 'não informada'}).
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Não é permitida a exclusão de pré-vendas com NF ativa. Por favor, confirme que a NF foi devidamente cancelada antes de prosseguir.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                      <input
                        type="checkbox"
                        checked={confirmNfCancelled}
                        onChange={(e) => setConfirmNfCancelled(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-900">
                        Confirmo que a NF foi cancelada
                      </span>
                    </label>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Motivo da Exclusão
                  </label>
                  <textarea
                    value={deletePreSaleReason}
                    onChange={(e) => setDeletePreSaleReason(e.target.value)}
                    placeholder="Ex: Cliente cancelou o pedido, erro de digitação, etc..."
                    rows={3}
                    disabled={cannotDelete}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingPreSaleId(null);
                    setDeletePreSaleReason('');
                    setConfirmNfCancelled(false);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!deletePreSaleReason.trim() || cannotDelete}
                  onClick={() => {
                    if (!deletePreSaleReason.trim()) return;
                    if (cannotDelete) return;

                    updatePreSale(deletingPreSaleId, {
                      deleted: true,
                      deleteReason: deletePreSaleReason.trim() + (isNfIssued ? ' [NF CANCELADA CONFIRMADA]' : ''),
                      deletedBy: currentUser?.name || 'Operador',
                      deletedAt: new Date().toISOString(),
                      nfCancelled: isNfIssued ? true : undefined,
                      nfIssued: isNfIssued ? false : currentPreSale?.nfIssued
                    });
                    setDeletingPreSaleId(null);
                    setDeletePreSaleReason('');
                    setConfirmNfCancelled(false);
                  }}
                  className={`px-3 py-2 text-white text-[10px] font-extrabold uppercase rounded-lg shadow-sm transition-colors cursor-pointer ${
                    deletePreSaleReason.trim() && !cannotDelete
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {isExpedited ? 'Bloqueado (Expedido)' : isDriverBlocked ? 'Bloqueado (Supervisor)' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {assigningPreSale && (() => {
        const isExpedited = !!assigningPreSale.expeditionApproved || !!assigningPreSale.isUsed;
        const isSupervisorPreSale = !!assigningPreSale.supervisorName || !!assigningPreSale.supervisorId || assigningPreSale.createdByRole === 'supervisor';
        const isDriverBlocked = currentUser?.role === 'motorista' && isSupervisorPreSale;
        const isBlocked = isExpedited || isDriverBlocked;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
              <div className="bg-blue-600 px-4 py-3 border-b border-blue-700 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Truck size={18} />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {assigningPreSale.driverName && assigningPreSale.driverName !== 'A Destinar' ? 'Alterar Motorista da Pré-Venda' : 'Destinar Motorista à Pré-Venda'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAssigningPreSale(null)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 space-y-3.5">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Cliente: <strong className="text-blue-700">{assigningPreSale.clientName}</strong></span>
                  </div>
                  {assigningPreSale.supervisorName && (
                    <div className="text-[10px] text-amber-800 flex items-center gap-1 font-bold">
                      <span>👤 Supervisor:</span> <span>{assigningPreSale.supervisorName}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/80 flex items-center justify-between">
                    <span>Motorista Atual:</span>
                    <span className={`px-2 py-0.5 rounded font-extrabold ${
                      assigningPreSale.driverName && assigningPreSale.driverName !== 'A Destinar' 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {assigningPreSale.driverName || 'A Destinar'}
                    </span>
                  </div>
                  {isExpedited && (
                    <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded flex items-center gap-1 font-bold">
                      <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                      <span>Expedição/Carregamento Concluído</span>
                    </div>
                  )}
                </div>

                {isExpedited ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                      <Lock size={14} className="shrink-0 text-amber-700" />
                      <span>Alteração Bloqueada - Carga Já Expedida</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      Esta pré-venda já foi expedida para o motorista <strong>{assigningPreSale.driverName}</strong> {assigningPreSale.vehiclePlate ? `e veículo ${assigningPreSale.vehiclePlate}` : ''}. Não é permitido alterar o motorista nem o veículo após a expedição do produto ter sido realizada.
                    </p>
                  </div>
                ) : isDriverBlocked ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                      <Lock size={14} className="shrink-0 text-amber-700" />
                      <span>Alteração Bloqueada para Motoristas</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      Esta pré-venda foi realizada pelo supervisor <strong>{assigningPreSale.supervisorName || 'Supervisor'}</strong>. O motorista não tem permissão para alterar o motorista responsável.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                        Motorista Responsável
                      </label>
                      <select
                        value={assignDriverName}
                        onChange={(e) => setAssignDriverName(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A Destinar">⚠️ A Destinar (Manter Sem Motorista Atribuído)</option>
                        {registeredDrivers.map(drv => (
                          <option key={drv.id} value={drv.name}>
                            🚚 {drv.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                        Placa do Veículo (Opcional)
                      </label>
                      <select
                        value={assignVehiclePlate}
                        onChange={(e) => setAssignVehiclePlate(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Selecione a Placa --</option>
                        {registeredVehicles.map(v => (
                          <option key={v.id} value={v.plate}>
                            {v.plate} {v.vehicleType ? `- ${v.vehicleType}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAssigningPreSale(null)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {isBlocked ? 'Fechar' : 'Cancelar'}
                </button>
                {!isBlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      if (assigningPreSale) {
                        updatePreSale(assigningPreSale.id, {
                          driverName: assignDriverName || 'A Destinar',
                          vehiclePlate: assignVehiclePlate || undefined
                        });
                        setAssigningPreSale(null);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Confirmar Atribuição
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
