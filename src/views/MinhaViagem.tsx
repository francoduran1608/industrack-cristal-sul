import React, { useState, useEffect } from 'react';
import { useStore, getProductionCode } from '../store';
import { 
  Package, 
  Truck, 
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
  X, 
  AlertTriangle,
  Printer,
  Lock
} from 'lucide-react';
import { SettlementSale, SettlementExpense, Movement, DriverSettlement } from '../types';
import { SignaturePad } from '../components/SignaturePad';

interface GroupedSale {
  saleNumber: string;
  clientName: string;
  products: {
    itemDisplayName: string;
    qty: number;
    unitPrice: number;
    productType?: 'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno';
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
    const clientName = firstItem.item.includes(' - ') ? firstItem.item.split(' - ')[0] : firstItem.item;
    const signature = items.find(i => i.signature)?.signature;

    const productsMap: Record<string, { itemDisplayName: string; qty: number; unitPrice: number; productType?: 'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' }> = {};
    items.forEach(item => {
      const itemDisplayName = item.item.includes(' - ') ? item.item.split(' - ').slice(1).join(' - ') : item.item;
      const key = itemDisplayName + '_' + (item.productType || '');
      if (!productsMap[key]) {
        productsMap[key] = {
          itemDisplayName,
          qty: 0,
          unitPrice: item.value,
          productType: item.productType as any
        };
      }
      productsMap[key].qty += item.qty;
    });

    const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
    items.forEach(item => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno');
      if (isZeroVal) return;

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
    });

    const totalValue = items.reduce((sum, item) => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno');
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
    const clientName = s.item.includes(' - ') ? s.item.split(' - ')[0] : s.item;
    const itemDisplayName = s.item.includes(' - ') ? s.item.split(' - ').slice(1).join(' - ') : s.item;
    const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.item.toLowerCase().includes('bonifica') || s.item.toLowerCase().includes('comodato') || s.item.toLowerCase().includes('retorno');
    
    result.push({
      saleNumber: 'S/N',
      clientName,
      products: [{
        itemDisplayName,
        qty: s.qty,
        unitPrice: s.value,
        productType: s.productType as any
      }],
      payments: isZeroVal ? [] : [{
        method: s.paymentMethod || 'dinheiro',
        amount: s.qty * s.value,
        note: s.paymentMethodNote
      }],
      totalValue: isZeroVal ? 0 : s.qty * s.value,
      rawIds: [s.id],
      signature: s.signature
    });
  });

  return result;
}

interface CartProduct {
  productType: 'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno';
  qty: number;
  unitPrice: number;
}

export const MinhaViagem: React.FC = () => {
  const { movements, updateMovementDetails, currentUser, driverSettlements, registeredClients = [], companyLogo } = useStore();
  
  const [activeTab, setActiveTab] = useState<'viagem' | 'relatorio'>('viagem');

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

  const isAdminOrOperator = currentUser?.role === 'admin' || currentUser?.role === 'operador';

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
  
  // Cart state for multi-product checkout
  const [clientName, setClientName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [cart, setCart] = useState<CartProduct[]>([]);
  
  // Adding product state inside the checkout
  const [newSaleQty, setNewSaleQty] = useState<number | ''>('');
  const [newSaleValue, setNewSaleValue] = useState<number | ''>('');
  const [newSaleProductType, setNewSaleProductType] = useState<'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno'>('agua');
  
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
  const [newExpenseValue, setNewExpenseValue] = useState(0);
  
  const [comodatoQty, setComodatoQty] = useState(0);
  const [comodatoReturnQty, setComodatoReturnQty] = useState(0);
  const [bonificationQty, setBonificationQty] = useState(0);

  // States for viewing trip details in the report
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [reportDriverFilter, setReportDriverFilter] = useState<string>(currentUser?.name || '');

  // Sync state with activeTrip
  useEffect(() => {
    if (activeTrip?.productionControl) {
      setSales(activeTrip.productionControl.mobileSales || []);
      setExpenses(activeTrip.productionControl.mobileExpenses || []);
    } else {
      setSales([]);
      setExpenses([]);
    }
  }, [activeTrip?.id]);

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

    setComodatoQty(calculatedComodato);
    setComodatoReturnQty(calculatedComodatoReturn);
    setBonificationQty(calculatedBonification);
  }, [sales]);

  // Auto-fill price suggestion when product type changes
  useEffect(() => {
    const isZeroVal = newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno';
    if (isZeroVal) {
      setNewSaleValue(0);
    } else {
      setNewSaleValue('');
    }
  }, [newSaleProductType]);

  const saveToStore = (
    s: SettlementSale[], 
    e: SettlementExpense[]
  ) => {
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

      updateMovementDetails(activeTrip.id, {
        productionControl: {
          ...activeTrip.productionControl,
          mobileSales: s,
          mobileExpenses: e,
          mobileComodato: calculatedComodato,
          mobileComodatoReturn: calculatedComodatoReturn,
          mobileBonifications: calculatedBonification
        }
      });
    }
  };

  const getProductDisplayName = (type: 'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno') => {
    switch (type) {
      case 'agua':
        return 'Água 20L';
      case 'vasilhame':
        return 'Vasilhame';
      case 'bonificacao':
        return 'Bonificação';
      case 'comodato':
        return 'Comodato';
      case 'retorno':
        return 'Retorno';
    }
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

    const isZeroVal = newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno';
    const priceNum = Number(newSaleValue);
    if (!isZeroVal && (newSaleValue === '' || isNaN(priceNum) || priceNum < 0)) {
      alert('Por favor, informe o preço unitário!');
      return;
    }

    const newItem: CartProduct = {
      productType: newSaleProductType,
      qty: qtyNum,
      unitPrice: isZeroVal ? 0 : priceNum
    };

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
  
  const valDinheiro = parseFloat(payDinheiro) || 0;
  const valPix = parseFloat(payPix) || 0;
  const valBoleto = parseFloat(payBoleto) || 0;
  const valCheque = parseFloat(payCheque) || 0;
  const valOutros = parseFloat(payOutros) || 0;
  
  const totalPaid = valDinheiro + valPix + valBoleto + valCheque + valOutros;
  const paymentDiff = cartTotal - totalPaid;

  // Auto-fill payment method helper
  const handleAutoFillPayment = (method: 'dinheiro' | 'pix' | 'boleto' | 'cheque' | 'outros') => {
    // Fill this method with the total amount to be paid (cartTotal) and clear others
    setPayDinheiro(method === 'dinheiro' ? cartTotal.toFixed(2) : '');
    setPayPix(method === 'pix' ? cartTotal.toFixed(2) : '');
    setPayBoleto(method === 'boleto' ? cartTotal.toFixed(2) : '');
    setPayCheque(method === 'cheque' ? cartTotal.toFixed(2) : '');
    setPayOutros(method === 'outros' ? cartTotal.toFixed(2) : '');
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
      setPayDinheiro(cartTotal.toFixed(2));
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

    // 1. Process free items directly (Zero value)
    freeItems.forEach(item => {
      finalSalesToAdd.push({
        id: 'msale-' + Math.random().toString(36).substring(2, 9),
        saleNumber: generatedSaleNumber,
        item: `${clientClean} - ${getProductDisplayName(item.productType)}`,
        qty: item.qty,
        value: 0,
        paymentMethod: undefined,
        productType: item.productType,
        clientName: clientClean,
        signature: clientSignature || undefined,
        timestamp: saleTimestamp
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
          item: `${clientClean} - ${getProductDisplayName(item.productType)}`,
          qty: Math.round(item.qty),
          value: item.unitPrice,
          paymentMethod: primaryMethod,
          paymentMethodNote: generatedNote || payOutrosNote.trim() || undefined,
          productType: item.productType,
          clientName: clientClean,
          signature: clientSignature || undefined,
          timestamp: saleTimestamp,
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

    setLastSaleForPrint({
      saleNumber: generatedSaleNumber,
      sales: finalSalesToAdd
    });

    // Clear checkout state completely
    setClientName('');
    setCart([]);
    handleClearPayments();
  };

  const handleSaveSignatureForSale = (saleNumber: string, signature: string | null) => {
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
    const updatedSales = sales.filter(s => s.id !== id);
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);
  };

  const handleRemoveSaleGroup = (rawIds: string[]) => {
    const updatedSales = sales.filter(s => !rawIds.includes(s.id));
    setSales(updatedSales);
    saveToStore(updatedSales, expenses);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseItem.trim() || newExpenseValue <= 0) return;
    const newExpense: SettlementExpense = {
      id: 'mexp-' + Date.now().toString(36),
      item: newExpenseItem.trim(),
      value: newExpenseValue
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

  if (!activeTrip) {
    return (
      <div className="flex flex-col bg-slate-50/50 p-4 w-full max-w-lg mx-auto space-y-4 pb-24">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('viagem')}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'viagem'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={14} /> Viagem Ativa
          </button>
          <button
            onClick={() => setActiveTab('relatorio')}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'relatorio'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} /> Relatório de Viagens
          </button>
        </div>

        {activeTab === 'viagem' ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Truck size={48} className="mb-4 text-slate-300 animate-pulse" />
            <p className="text-lg font-bold text-slate-600">Nenhuma viagem ativa encontrada.</p>
            <p className="text-sm mt-2 text-center max-w-sm text-slate-400">
              Você não possui nenhuma saída de rota registrada no momento. O acerto/venda só pode ser feito durante uma viagem.
            </p>
          </div>
        ) : (
          renderTripReport()
        )}
      </div>
    );
  }

  const productionCarregado = activeTrip.productionControl?.totalCarregado || 0;
  const retornoVasilhameCheio = activeTrip.productionControl?.retornoVasilhameCheio || 0;
  const stockCarregado = productionCarregado + retornoVasilhameCheio;
  const vasilhamesRetirados = activeTrip.productionControl?.retiradaVasilhameCarga || 0;
  const initialStock = stockCarregado + vasilhamesRetirados; // As loaded
  
  // Calculate quantities sold based on row quantities
  const totalSoldAgua = sales
    .filter(s => s.productType === 'agua' || (s.productType === undefined && (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua')) && !s.item.toLowerCase().includes('bonifica')))
    .reduce((acc, s) => acc + s.qty, 0);

  const totalSoldVasilhame = sales
    .filter(s => s.productType === 'vasilhame' || (s.productType === undefined && s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('comodato') && !s.item.toLowerCase().includes('retorno')))
    .reduce((acc, s) => acc + s.qty, 0);

  const currentStockAgua = Math.max(0, stockCarregado - totalSoldAgua - bonificationQty);
  const currentStockVasilhame = Math.max(0, vasilhamesRetirados + totalSoldAgua + bonificationQty - comodatoQty + comodatoReturnQty - totalSoldVasilhame); 

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
    const method = s.paymentMethod || 'dinheiro';
    const rowTotal = s.qty * s.value;
    if (method in salesByPayment) {
      salesByPayment[method] += rowTotal;
    } else {
      salesByPayment.outros += rowTotal;
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
                                  .filter(s => (s.paymentMethod || 'dinheiro') === method)
                                  .reduce((acc, s) => acc + (s.qty * s.value), 0);
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
                                  const name = s.item.includes(' - ') ? s.item.split(' - ').slice(1).join(' - ') : s.item;
                                  const key = name.trim();
                                  const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.item.toLowerCase().includes('bonifica') || s.item.toLowerCase().includes('comodato') || s.item.toLowerCase().includes('retorno');

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
                                  .filter(s => s.productType === 'vasilhame' || (s.productType === undefined && s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('comodato') && !s.item.toLowerCase().includes('retorno')))
                                  .reduce((acc, s) => acc + s.qty, 0)} un
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
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab('viagem')}
          className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'viagem'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck size={14} /> Viagem Ativa
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'relatorio'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={14} /> Relatório de Viagens
        </button>
      </div>

      {activeTab === 'viagem' ? (
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight">
              <Receipt size={16} /> {isReadOnly ? 'Vendas / Lançamentos Efetuados' : 'Registrar Venda / Operação'}
            </div>
            
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
                  {/* Step 1: Client Name Input */}
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

                  {/* Step 2: Add Product to Cart */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-3">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">2. Adicionar Produto</div>
                    
                    {/* Product Type Selector */}
                    <div className="flex flex-col gap-1.5">
                      {[
                        { type: 'agua', label: 'Água 20L', desc: 'Venda de água cheia', icon: <PackageOpen size={14} className="text-blue-500" /> },
                        { type: 'vasilhame', label: 'Vasilhame', desc: 'Venda de vasilhame vazio', icon: <Package size={14} className="text-emerald-500" /> },
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

                {/* Qty and Unit Price Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Quantidade (Un)</label>
                    <input 
                      type="number" 
                      min="0" 
                      required 
                      value={newSaleQty} 
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
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      disabled={newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno'} 
                      value={newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno' ? 0 : newSaleValue} 
                      onChange={e => {
                        const val = e.target.value;
                        setNewSaleValue(val === '' ? '' : Number(val));
                      }} 
                      className={`w-full text-xs p-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none ${
                        newSaleProductType === 'bonificacao' || newSaleProductType === 'comodato' || newSaleProductType === 'retorno'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
                          : 'bg-white font-bold text-slate-700'
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

                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {cart.map((item, idx) => (
                      <li key={idx} className="py-2 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800">{getProductDisplayName(item.productType)}</span>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {item.qty} un × R$ {item.unitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-slate-700">R$ {(item.qty * item.unitPrice).toFixed(2)}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFromCart(idx)} 
                            className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </li>
                    ))}
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
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-semibold text-xs text-slate-500 capitalize">Dinheiro</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            value={payDinheiro} 
                            onChange={e => setPayDinheiro(e.target.value)} 
                            className="flex-1 text-xs p-1 px-2 border rounded font-bold text-slate-700 text-right bg-white"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAutoFillPayment('dinheiro')}
                            className="text-[9px] px-2 py-1 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded"
                          >
                            Tudo
                          </button>
                        </div>

                        {/* PIX */}
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-semibold text-xs text-slate-500 capitalize">PIX</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            value={payPix} 
                            onChange={e => setPayPix(e.target.value)} 
                            className="flex-1 text-xs p-1 px-2 border rounded font-bold text-slate-700 text-right bg-white"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAutoFillPayment('pix')}
                            className="text-[9px] px-2 py-1 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded"
                          >
                            Tudo
                          </button>
                        </div>

                        {/* Boleto */}
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-semibold text-xs text-slate-500 capitalize">Boleto</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            value={payBoleto} 
                            onChange={e => setPayBoleto(e.target.value)} 
                            className="flex-1 text-xs p-1 px-2 border rounded font-bold text-slate-700 text-right bg-white"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAutoFillPayment('boleto')}
                            className="text-[9px] px-2 py-1 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded"
                          >
                            Tudo
                          </button>
                        </div>

                        {/* Cheque */}
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-semibold text-xs text-slate-500 capitalize">Cheque</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            value={payCheque} 
                            onChange={e => setPayCheque(e.target.value)} 
                            className="flex-1 text-xs p-1 px-2 border rounded font-bold text-slate-700 text-right bg-white"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAutoFillPayment('cheque')}
                            className="text-[9px] px-2 py-1 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded"
                          >
                            Tudo
                          </button>
                        </div>

                        {/* Outros */}
                        <div className="flex flex-col gap-1.5 border-t pt-2 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="w-16 font-semibold text-xs text-slate-500 capitalize">Outros</span>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              value={payOutros} 
                              onChange={e => setPayOutros(e.target.value)} 
                              className="flex-1 text-xs p-1 px-2 border rounded font-bold text-slate-700 text-right bg-white"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAutoFillPayment('outros')}
                              className="text-[9px] px-2 py-1 bg-white border border-slate-300 hover:border-blue-400 text-slate-600 font-bold rounded"
                            >
                              Tudo
                            </button>
                          </div>
                          {valOutros > 0 && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Especifique a Forma / Observação</label>
                              <input 
                                type="text" 
                                required 
                                value={payOutrosNote} 
                                onChange={e => setPayOutrosNote(e.target.value)} 
                                className="w-full text-xs p-1.5 border rounded outline-none bg-white text-slate-700" 
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
                  <div className="py-3 mt-2 border-t border-slate-200">
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
                      <div className="bg-white p-1.5 rounded border border-slate-200 flex justify-between">
                        <span className="text-slate-500 font-medium">Dinheiro:</span>
                        <strong className="text-emerald-700">R$ {salesByPayment.dinheiro.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.pix > 0 && (
                      <div className="bg-white p-1.5 rounded border border-slate-200 flex justify-between">
                        <span className="text-slate-500 font-medium">PIX:</span>
                        <strong className="text-indigo-700">R$ {salesByPayment.pix.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.boleto > 0 && (
                      <div className="bg-white p-1.5 rounded border border-slate-200 flex justify-between">
                        <span className="text-slate-500 font-medium">Boleto:</span>
                        <strong className="text-blue-700">R$ {salesByPayment.boleto.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.cheque > 0 && (
                      <div className="bg-white p-1.5 rounded border border-slate-200 flex justify-between">
                        <span className="text-slate-500 font-medium">Cheque:</span>
                        <strong className="text-amber-700">R$ {salesByPayment.cheque.toFixed(2)}</strong>
                      </div>
                    )}
                    {salesByPayment.outros > 0 && (
                      <div className="bg-white p-1.5 rounded border border-slate-200 flex justify-between" title="Outras formas de pagamento especificadas nas observações">
                        <span className="text-slate-500 font-medium">Outros:</span>
                        <strong className="text-slate-700">R$ {salesByPayment.outros.toFixed(2)}</strong>
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
                      const t = type || (itemText.toLowerCase().includes('bonifica') ? 'bonificacao' : itemText.toLowerCase().includes('comodato') ? 'comodato' : itemText.toLowerCase().includes('retorno') ? 'retorno' : itemText.toLowerCase().includes('vasilhame') ? 'vasilhame' : 'agua');
                      switch (t) {
                        case 'agua':
                          return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Água 20L</span>;
                        case 'vasilhame':
                          return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Vasilhame</span>;
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
                        <li key={g.saleNumber} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/95 text-sm shadow-xs gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-800 text-sm">{g.clientName}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                {g.saleNumber}
                              </span>
                            </div>
                            
                            {/* Products List */}
                            <div className="space-y-1">
                              {g.products.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <span className="font-bold text-slate-500">{p.qty} un.</span>
                                  <span className="text-slate-700 font-medium">{p.itemDisplayName}</span>
                                  {getProductBadge(p.productType, p.itemDisplayName)}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payments & Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0">
                            {/* Payments Breakdown */}
                            <div className="space-y-1 text-right">
                              {g.payments.length > 0 ? (
                                g.payments.map((p, idx) => (
                                  <div key={idx} className="flex items-center justify-end gap-1.5 text-xs">
                                    <span className="text-[9px] font-bold uppercase text-slate-400">{p.method}</span>
                                    <span className="font-mono font-bold text-slate-800">R$ {p.amount.toFixed(2)}</span>
                                    {p.note && <span className="text-[9px] italic text-slate-400 font-semibold">({p.note})</span>}
                                  </div>
                                ))
                              ) : (
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wide">
                                  Grátis / Comodato
                                </span>
                              )}
                              {g.payments.length > 1 && (
                                <div className="text-[9px] text-slate-400 font-bold border-t border-dashed border-slate-200 pt-0.5 mt-0.5">
                                  TOTAL: R$ {g.totalValue.toFixed(2)}
                                </div>
                              )}
                            </div>

                            {/* Print / Sign Action */}
                            <button 
                              onClick={() => setLastSaleForPrint({
                                saleNumber: g.saleNumber,
                                sales: sales.filter(s => s.saleNumber === g.saleNumber)
                              })} 
                              className="text-blue-600 p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1 font-bold text-[10px] uppercase"
                              title="Ver / Imprimir / Assinar Pedido"
                            >
                              <Printer size={13} /> <span className="hidden sm:inline">Imprimir / Assinar</span>
                            </button>

                            {/* Delete Action */}
                            {!isReadOnly && (
                              <button 
                                onClick={() => handleRemoveSaleGroup(g.rawIds)} 
                                className="text-red-500 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors shrink-0"
                                title="Excluir Venda"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
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
              <form onSubmit={handleAddExpense} className="p-3 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                  <input type="text" required value={newExpenseItem} onChange={e => setNewExpenseItem(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Almoço, Pedágio..." />
                </div>
                <div className="w-24">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" required value={newExpenseValue || ''} onChange={e => setNewExpenseValue(Number(e.target.value))} className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button type="submit" className="h-[38px] px-3 bg-slate-800 text-white rounded font-bold hover:bg-slate-700 transition cursor-pointer">
                  <Plus size={16} />
                </button>
              </form>
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
      ) : (
        renderTripReport()
      )}

      {/* Print Order Modal */}
      {lastSaleForPrint && (() => {
        const groupedPrintSale = groupSales(lastSaleForPrint.sales)[0];
        const clientClean = groupedPrintSale?.clientName || 'Consumidor';
        const driverName = activeTrip?.driver || 'Motorista';
        const totalAmount = lastSaleForPrint.sales.reduce((sum, s) => sum + (s.qty * s.value), 0);
        const hasSignature = groupedPrintSale?.signature;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:w-full print:max-w-full">
              <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center print:hidden">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={16} /> Venda Concluída
                </span>
                <button 
                  onClick={() => setLastSaleForPrint(null)} 
                  className="text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              
              <div id="print-order-content" className="p-4 flex flex-col font-mono text-sm print:p-0 print:text-black">
                {/* Receipt Header */}
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3 print:border-black">
                  <div className="mb-2">
                    {companyLogo ? (
                      <img 
                        src={companyLogo} 
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
                      <img src={groupedPrintSale.signature} alt="Assinatura" className="max-h-16 object-contain mb-1" />
                      <div className="border-t border-slate-400 w-4/5 mx-auto print:border-black"></div>
                      <span className="text-[9px] uppercase mt-1 text-slate-500">Assinatura do Cliente</span>
                      <button
                        type="button"
                        onClick={() => handleSaveSignatureForSale(lastSaleForPrint.saleNumber, null)}
                        className="text-[9px] text-red-500 hover:underline mt-1 print:hidden block mx-auto font-bold cursor-pointer"
                      >
                        Limpar/Refazer Assinatura
                      </button>
                    </div>
                  ) : (
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
                    onClick={() => window.print()}
                    className="px-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    Imprimir Direto
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

    </div>
  );
};
