import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { cleanOccurrenceTypeName, normalizeStockProductKey } from '../store';
import { 
  Boxes, Plus, CheckCircle, Calendar, Trash2, Sliders, RefreshCw,
  Loader, History, User, Check, AlertTriangle, ArrowUpRight, ArrowDownRight, Package, Truck,
  ChevronDown, ChevronUp
} from 'lucide-react';

export const Estoque: React.FC = () => {
  const { 
    movements, 
    customStockProducts = [], 
    initialStockLevels = {}, 
    manualStockAdjustments = [], 
    resolvedStockAlerts = [], 
    verifiedScrapAlerts = [],
    scrapConferences = [],
    customAvariaTypes = [],
    addCustomStockProduct,
    removeCustomStockProduct,
    updateCustomStockProduct,
    updateInitialStockLevel,
    addManualStockAdjustment,
    resolveStockAlert,
    unresolveStockAlert,
    verifyScrapAlert,
    unverifyScrapAlert,
    addScrapConference,
    deleteScrapConference,
    currentUser
  } = useStore();

  const currentUserUnit = currentUser?.unit || 'matriz';
  const unitMovements = (movements || []).filter(m => (m.unit || 'matriz') === currentUserUnit);

  const [activeTab, setActiveTabTab] = useState<'balance' | 'alerts' | 'adjustments' | 'log' | 'scrap-verification'>('balance');
  const [newProductName, setNewProductName] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAdjustInitialModal, setShowAdjustInitialModal] = useState(false);
  const [showManualAdjustmentModal, setShowManualAdjustmentModal] = useState(false);

  // Editing state for products
  const [editingProductOldName, setEditingProductOldName] = useState<string | null>(null);
  const [editingProductNewName, setEditingProductNewName] = useState('');
  const [deletingProductName, setDeletingProductName] = useState<string | null>(null);

  // New adjustment fields
  const [adjustProduct, setAdjustProduct] = useState('');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida'>('entrada');
  const [adjustReason, setAdjustReason] = useState('');

  // Initial stock temp levels
  const [tempInitialLevels, setTempInitialLevels] = useState<Record<string, number>>({});

  // Filters for Movement logs
  const [logFilterProduct, setLogFilterProduct] = useState('todos');
  const [logFilterType, setLogFilterType] = useState('todos');
  const [logFilterClient, setLogFilterClient] = useState('');
  const [logFilterDriver, setLogFilterDriver] = useState('');

  // Bulk scrap conference input state
  const [realScrapInput, setRealScrapInput] = useState<string>('');
  const [showConfirmBulkScrap, setShowConfirmBulkScrap] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [scrapSubTab, setScrapSubTab] = useState<'descarregamento' | 'carregamento'>('descarregamento');
  const [expandedConferenceId, setExpandedConferenceId] = useState<string | null>(null);

  const [logFilterPlate, setLogFilterPlate] = useState('');
  const [logFilterStartDate, setLogFilterStartDate] = useState('');
  const [logFilterEndDate, setLogFilterEndDate] = useState('');

  // Helper check for purchases
  const isPurchaseType = (type: string): boolean => {
    const cleaned = cleanOccurrenceTypeName(type).toLowerCase().trim();
    const found = customAvariaTypes.find(t => cleanOccurrenceTypeName(t.type).toLowerCase().trim() === cleaned);
    if (found) {
      return found.category === 'compra' || found.category === 'vasilhame_rota';
    }
    const norm = type.toLowerCase().trim();
    return norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || norm.includes('são pedro') || norm.includes('sao pedro') || norm.includes('prime') || norm.includes('rota');
  };

  // Helper to parse and calculate the approved quantity of a product from resolvedStockAlerts
  const getApprovedQuantity = (
    mId: string,
    normName: string,
    stage: 'descarregamento' | 'carregamento',
    currentTotalQty: number,
    resolvedAlerts: string[]
  ): {
    approvedSum: number;
    matchedResolvedEntries: { id: string; qty: number }[];
  } => {
    const prefix = `${mId}-${normName}-${stage}`;
    let approvedSum = 0;
    const matchedResolvedEntries: { id: string; qty: number }[] = [];

    (resolvedAlerts || []).forEach(alertId => {
      if (alertId === prefix) {
        // Legacy format without quantity suffix
        approvedSum += currentTotalQty;
        matchedResolvedEntries.push({ id: alertId, qty: currentTotalQty });
      } else if (alertId.startsWith(`${prefix}-active-`)) {
        // New format: prefix-active-total-incremental
        const activePart = alertId.substring(`${prefix}-active-`.length);
        const parts = activePart.split('-');
        // Under new format, the last part is the incremental approved quantity
        const incrementalQty = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(incrementalQty)) {
          approvedSum += incrementalQty;
          matchedResolvedEntries.push({ id: alertId, qty: incrementalQty });
        }
      } else if (alertId.startsWith(`${prefix}-`)) {
        // Legacy format with quantity: prefix-qty
        const legacyQtyStr = alertId.substring(`${prefix}-`.length);
        const legacyQty = parseInt(legacyQtyStr, 10);
        if (!isNaN(legacyQty)) {
          approvedSum += legacyQty;
          matchedResolvedEntries.push({ id: alertId, qty: legacyQty });
        }
      }
    });

    return {
      approvedSum,
      matchedResolvedEntries
    };
  };

  // Helper to calculate active, remaining, and resolved alerts for a given stage
  const getAlertsForItem = (
    m: any,
    item: any,
    stage: 'descarregamento' | 'carregamento'
  ) => {
    const rawName = cleanOccurrenceTypeName(item.type);
    const normName = normalizeStockProductKey(item.type);
    const prefix = `${m.id}-${normName}-${stage}`;

    // If movement has stockRequests, compute directly from it!
    if (m.productionControl?.stockRequests) {
      const productRequests = (m.productionControl.stockRequests as any[]).filter(r => 
        r.stage === stage && 
        normalizeStockProductKey(r.product) === normName
      );

      const isRequestResolved = (r: any) => {
        if (r.resolved) return true;
        if ((resolvedStockAlerts || []).includes(r.id)) return true;
        
        // Dynamic ID prefix-based check
        const prefix = `${m.id}-${normName}-${stage}`;
        return (resolvedStockAlerts || []).some(alertId => 
          alertId === prefix || 
          alertId.startsWith(`${prefix}-active-`) ||
          alertId.startsWith(`${prefix}-`)
        );
      };

      const approvedSum = productRequests
        .filter(isRequestResolved)
        .reduce((sum, r) => sum + r.qty, 0);

      const remainingQty = item.qty - Math.min(item.qty, approvedSum);

      const matchedResolvedEntries = productRequests
        .filter(isRequestResolved)
        .map(r => ({ id: r.id, qty: r.qty }));

      return {
        clampedApprovedQty: Math.min(item.qty, approvedSum),
        remainingQty,
        matchedResolvedEntries,
        normName
      };
    }

    const { approvedSum, matchedResolvedEntries } = getApprovedQuantity(
      m.id,
      normName,
      stage,
      item.qty,
      resolvedStockAlerts
    );

    const clampedApprovedQty = Math.min(item.qty, Math.max(0, approvedSum));
    const remainingQty = item.qty - clampedApprovedQty;

    return {
      clampedApprovedQty,
      remainingQty,
      matchedResolvedEntries,
      normName
    };
  };

  // Live stock calculator formula
  const calculateStockLevels = () => {
    const initial = initialStockLevels || {};
    const stock: Record<string, number> = {
      'sucata': initial[`${currentUserUnit}_sucata`] || 0,
      'vasilhame são pedro': initial[`${currentUserUnit}_vasilhame são pedro`] || 0,
      'vasilhame prime': initial[`${currentUserUnit}_vasilhame prime`] || 0,
      'vasilhame de rota': initial[`${currentUserUnit}_vasilhame de rota`] || 0,
    };

    (customStockProducts || []).forEach(p => {
      const norm = p.toLowerCase().trim();
      stock[norm] = initial[`${currentUserUnit}_${norm}`] || 0;
    });

    unitMovements.forEach(m => {
      if (!m.productionControl) return;

      const descList = m.productionControl.avariasDescarregamento || [];
      const descLosses = descList.filter(a => !isPurchaseType(a.type));
      const descPurchases = descList.filter(a => isPurchaseType(a.type));

      const carregList = m.productionControl.avariasCarregamento || [];
      const carregLosses = carregList.filter(c => !isPurchaseType(c.type));
      const carregPurchases = carregList.filter(c => isPurchaseType(c.type));

      const isUnloadingFinished = 
        m.status === 'concluido' || 
        m.status === 'saida' || 
        (m.kanbanStep !== undefined && m.kanbanStep !== 'aguardando_descarregamento' && m.kanbanStep !== 'descarregamento');

      const isLoadingFinished = 
        m.status === 'concluido' || 
        m.status === 'saida' || 
        (m.kanbanStep === 'concluido');

      const isUnloadingSentToProduction = isUnloadingFinished && !m.productionReverted;
      const isLoadingSentToProduction = isLoadingFinished && !m.productionReverted;

      // 1. Losses (avarias / perdas) decrease usable inventory once that stage of the movement is finished/unloaded.
      if (isUnloadingSentToProduction) {
        descLosses.forEach(item => {
          const normName = normalizeStockProductKey(item.type);
          if (stock[normName] !== undefined) {
            stock[normName] -= item.qty;
          }
        });
      }

      if (isLoadingSentToProduction) {
        carregLosses.forEach(item => {
          const normName = normalizeStockProductKey(item.type);
          if (stock[normName] !== undefined) {
            stock[normName] -= item.qty;
          }
        });
      }

      // 2. Purchases/Additions (Adições de Carga) are added or deducted from empty stock IMMEDIATELY once approved/resolved
      // (which corresponds to "sent to production"), without waiting for the movement's step to be fully concluded.
      if (!m.productionReverted) {
        descPurchases.forEach(item => {
          const normName = normalizeStockProductKey(item.type);
          const { clampedApprovedQty } = getAlertsForItem(m, item, 'descarregamento');
          if (clampedApprovedQty > 0) {
            if (stock[normName] === undefined) {
              stock[normName] = 0;
            }
            stock[normName] -= clampedApprovedQty;
          }
        });

        carregPurchases.forEach(item => {
          const normName = normalizeStockProductKey(item.type);
          const { clampedApprovedQty } = getAlertsForItem(m, item, 'carregamento');
          if (clampedApprovedQty > 0) {
            if (stock[normName] === undefined) {
              stock[normName] = 0;
            }
            stock[normName] -= clampedApprovedQty;
          }
        });

        // 3. Add retiradaVasilhameCarga to "vasilhame de rota" stock IMMEDIATELY once it has been saved in the productionControl,
        // without waiting for the movement's unloading step to be fully concluded.
        if (m.productionControl.retiradaVasilhameCarga) {
          if (stock['vasilhame de rota'] === undefined) {
            stock['vasilhame de rota'] = 0;
          }
          stock['vasilhame de rota'] += m.productionControl.retiradaVasilhameCarga;
        }
      }
    });

    // Manual Adjustments application
    (manualStockAdjustments || []).filter(a => !a.unit || a.unit === currentUserUnit).forEach(adj => {
      const normName = adj.product.toLowerCase().trim();
      if (stock[normName] === undefined) {
        stock[normName] = 0;
      }
      if (adj.type === 'entrada') {
        stock[normName] += adj.qty;
      } else {
        stock[normName] -= adj.qty;
      }
    });

    return stock;
  };

  const currentStocks = calculateStockLevels();

  // Gathering live notifications / alerts
  const getProductStockAlerts = () => {
    const alerts: {
      id: string;
      movementId: string;
      plate: string;
      product: string;
      qty: number;
      stage: 'Descarregamento' | 'Carregamento';
      timestamp: string;
      resolved: boolean;
      driver: string;
      client: string;
    }[] = [];

    unitMovements.forEach(m => {
      if (!m.productionControl) return;

      // If stockRequests exist, we map them directly for 100% precision!
      if (m.productionControl.stockRequests && m.productionControl.stockRequests.length > 0) {
        m.productionControl.stockRequests.forEach(req => {
          alerts.push({
            id: req.id,
            movementId: m.id,
            plate: m.plate.toUpperCase(),
            product: req.product === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : req.product === 'vasilhame prime' ? 'Vasilhame Prime' : cleanOccurrenceTypeName(req.product),
            qty: req.qty,
            stage: req.stage === 'descarregamento' ? 'Descarregamento' : 'Carregamento',
            timestamp: req.timestamp || m.entryTimestamp || m.timestamp,
            resolved: req.resolved,
            driver: m.driver || 'Não informado',
            client: m.client || 'Não informado'
          });
        });
        return; // skip parsing from descList and carregList for this movement
      }

      const descList = m.productionControl.avariasDescarregamento || [];
      const carregList = m.productionControl.avariasCarregamento || [];

      const targetAlertProducts = ['vasilhame são pedro', 'vasilhame prime', 'vasilhame de rota'];
      (customStockProducts || []).forEach(p => {
        const normName = p.toLowerCase().trim();
        if (!targetAlertProducts.includes(normName)) {
          targetAlertProducts.push(normName);
        }
      });

      // Unloading phase alert events
      descList.forEach(item => {
        const normName = normalizeStockProductKey(item.type);
        if (targetAlertProducts.includes(normName) && item.qty > 0) {
          const { clampedApprovedQty, remainingQty, matchedResolvedEntries } = getAlertsForItem(m, item, 'descarregamento');

          // Process active/remaining alert
          if (remainingQty > 0) {
            alerts.push({
              id: `${m.id}-${normName}-descarregamento-active-${item.qty}-${remainingQty}`,
              movementId: m.id,
              plate: m.plate.toUpperCase(),
              product: normName === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : normName === 'vasilhame prime' ? 'Vasilhame Prime' : normName === 'vasilhame de rota' ? 'Vasilhame de Rota' : cleanOccurrenceTypeName(item.type),
              qty: remainingQty,
              stage: 'Descarregamento',
              timestamp: m.entryTimestamp || m.timestamp,
              resolved: false,
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado'
            });
          }

          // Process matched resolved alerts
          matchedResolvedEntries.forEach((entry, rIdx) => {
            alerts.push({
              id: entry.id,
              movementId: m.id,
              plate: m.plate.toUpperCase(),
              product: normName === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : normName === 'vasilhame prime' ? 'Vasilhame Prime' : normName === 'vasilhame de rota' ? 'Vasilhame de Rota' : cleanOccurrenceTypeName(item.type),
              qty: entry.qty,
              stage: 'Descarregamento',
              timestamp: m.entryTimestamp || m.timestamp,
              resolved: true,
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado'
            });
          });
        }
      });

      // Loading phase alert events
      carregList.forEach(item => {
        const normName = normalizeStockProductKey(item.type);
        if (targetAlertProducts.includes(normName) && item.qty > 0) {
          const { clampedApprovedQty, remainingQty, matchedResolvedEntries } = getAlertsForItem(m, item, 'carregamento');

          // Process active/remaining alert
          if (remainingQty > 0) {
            alerts.push({
              id: `${m.id}-${normName}-carregamento-active-${item.qty}-${remainingQty}`,
              movementId: m.id,
              plate: m.plate.toUpperCase(),
              product: normName === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : normName === 'vasilhame prime' ? 'Vasilhame Prime' : normName === 'vasilhame de rota' ? 'Vasilhame de Rota' : cleanOccurrenceTypeName(item.type),
              qty: remainingQty,
              stage: 'Carregamento',
              timestamp: m.entryTimestamp || m.timestamp,
              resolved: false,
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado'
            });
          }

          // Process matched resolved alerts
          matchedResolvedEntries.forEach((entry, rIdx) => {
            alerts.push({
              id: entry.id,
              movementId: m.id,
              plate: m.plate.toUpperCase(),
              product: normName === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : normName === 'vasilhame prime' ? 'Vasilhame Prime' : normName === 'vasilhame de rota' ? 'Vasilhame de Rota' : cleanOccurrenceTypeName(item.type),
              qty: entry.qty,
              stage: 'Carregamento',
              timestamp: m.entryTimestamp || m.timestamp,
              resolved: true,
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado'
            });
          });
        }
      });
    });

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const allAlerts = getProductStockAlerts();
  const pendingAlerts = allAlerts.filter(a => !a.resolved);
  const resolvedAlerts = allAlerts.filter(a => a.resolved);

  // 1. Descarregamento Avarias
  const descarregamentoScrapMovements = unitMovements.filter(m => {
    if (!m.productionControl) return false;
    const descList = m.productionControl.avariasDescarregamento || [];
    const descLosses = descList.filter(a => !isPurchaseType(a.type));
    const totalDescAvarias = descLosses.reduce((sum, item) => sum + item.qty, 0);
    return totalDescAvarias > 0;
  });

  const pendingDescMovements = descarregamentoScrapMovements.filter(m => 
    !(verifiedScrapAlerts || []).includes(`${m.id}-desc`) &&
    !(verifiedScrapAlerts || []).includes(m.id) &&
    !(scrapConferences || []).some(c => (c.movementIds || []).includes(`${m.id}-desc`) || (c.movementIds || []).includes(m.id))
  );
  const pendingDescCount = pendingDescMovements.length;
  const totalPendingDescQty = pendingDescMovements.reduce((sum, m) => {
    const descList = m.productionControl?.avariasDescarregamento || [];
    const descLosses = descList.filter(a => !isPurchaseType(a.type));
    return sum + descLosses.reduce((s, item) => s + item.qty, 0);
  }, 0);

  // 2. Carregamento Avarias
  const carregamentoScrapMovements = unitMovements.filter(m => {
    if (!m.productionControl) return false;
    const carregList = m.productionControl.avariasCarregamento || [];
    const carregLosses = carregList.filter(c => !isPurchaseType(c.type));
    const totalCarregAvarias = carregLosses.reduce((sum, item) => sum + item.qty, 0);
    return totalCarregAvarias > 0;
  });

  const pendingCarregMovements = carregamentoScrapMovements.filter(m => 
    !(verifiedScrapAlerts || []).includes(`${m.id}-carr`) &&
    !(verifiedScrapAlerts || []).includes(m.id) &&
    !(scrapConferences || []).some(c => (c.movementIds || []).includes(`${m.id}-carr`) || (c.movementIds || []).includes(m.id))
  );
  const pendingCarregCount = pendingCarregMovements.length;
  const totalPendingCarregQty = pendingCarregMovements.reduce((sum, m) => {
    const carregList = m.productionControl?.avariasCarregamento || [];
    const carregLosses = carregList.filter(c => !isPurchaseType(c.type));
    return sum + carregLosses.reduce((s, item) => s + item.qty, 0);
  }, 0);

  // Selector mappings
  const currentPendingMovements = scrapSubTab === 'descarregamento' ? pendingDescMovements : pendingCarregMovements;
  const currentPendingCount = scrapSubTab === 'descarregamento' ? pendingDescCount : pendingCarregCount;
  const currentPendingQty = scrapSubTab === 'descarregamento' ? totalPendingDescQty : totalPendingCarregQty;

  const totalPendingScrapQty = totalPendingDescQty + totalPendingCarregQty;

  useEffect(() => {
    if (activeTab === 'scrap-verification') {
      setRealScrapInput(currentPendingQty.toString());
    }
  }, [activeTab, scrapSubTab, currentPendingQty]);

  // Unified Historic transactions table entries
  const getUnifiedHistoryLogs = () => {
    const logs: {
      id: string;
      product: string;
      qty: number;
      type: 'entrada' | 'saida';
      origin: 'automatico' | 'manual';
      reason: string;
      timestamp: string;
      operator: string;
      plate?: string;
      driver?: string;
      client?: string;
      stage?: 'descarregamento' | 'carregamento';
      isResolved?: boolean;
    }[] = [];

    // 1. Gather logs from completed production control movements
    unitMovements.forEach(m => {
      if (!m.productionControl) return;

      const descList = m.productionControl.avariasDescarregamento || [];
      const carregList = m.productionControl.avariasCarregamento || [];

      // Avarias logged as incoming scrap
      const descLosses = descList.filter(a => !isPurchaseType(a.type));
      const carregLosses = carregList.filter(c => !isPurchaseType(c.type));

      const descQty = descLosses.reduce((sum, item) => sum + item.qty, 0);
      const carregQty = carregLosses.reduce((sum, item) => sum + item.qty, 0);

      const isUnloadingFinished = 
        m.status === 'concluido' || 
        m.status === 'saida' || 
        (m.kanbanStep !== undefined && m.kanbanStep !== 'aguardando_descarregamento' && m.kanbanStep !== 'descarregamento');

      const isLoadingFinished = 
        m.status === 'concluido' || 
        m.status === 'saida' || 
        (m.kanbanStep === 'concluido');

      const isUnloadingSentToProduction = isUnloadingFinished && !m.productionReverted;
      const isLoadingSentToProduction = isLoadingFinished && !m.productionReverted;

      // 1. Descarregamento Loss Entry
      if (descQty > 0 && isUnloadingSentToProduction) {
        const descVerified = (verifiedScrapAlerts || []).includes(`${m.id}-desc`) || 
                             (verifiedScrapAlerts || []).includes(m.id) ||
                             (scrapConferences || []).some(c => 
                               (c.movementIds || []).includes(`${m.id}-desc`) || 
                               (c.movementIds || []).includes(m.id)
                             );
        logs.push({
          id: `auto-loss-desc-${m.id}`,
          product: 'Sucata',
          qty: descQty,
          type: 'entrada',
          origin: 'automatico',
          reason: `Avarias de Descarregamento (Retorno) no veículo ${m.plate.toUpperCase()} (${descVerified ? 'Estoque Conferido' : 'Aguardando Conferência'})`,
          timestamp: m.entryTimestamp || m.timestamp,
          operator: m.checklistEvaluator || m.createdBy || 'Sistema',
          plate: m.plate.toUpperCase(),
          driver: m.driver || 'Não informado',
          client: m.client || 'Não informado',
          stage: 'descarregamento',
          isResolved: descVerified
        });
      }

      // 2. Carregamento Loss Entry
      if (carregQty > 0 && isLoadingSentToProduction) {
        const carrVerified = (verifiedScrapAlerts || []).includes(`${m.id}-carr`) || 
                             (verifiedScrapAlerts || []).includes(m.id) ||
                             (scrapConferences || []).some(c => 
                               (c.movementIds || []).includes(`${m.id}-carr`) || 
                               (c.movementIds || []).includes(m.id)
                             );
        logs.push({
          id: `auto-loss-carr-${m.id}`,
          product: 'Sucata',
          qty: carregQty,
          type: 'entrada',
          origin: 'automatico',
          reason: `Avarias de Carregamento (Envase) no veículo ${m.plate.toUpperCase()} (${carrVerified ? 'Estoque Conferido' : 'Aguardando Conferência'})`,
          timestamp: m.entryTimestamp || m.timestamp,
          operator: m.checklistEvaluator || m.createdBy || 'Sistema',
          plate: m.plate.toUpperCase(),
          driver: m.driver || 'Não informado',
          client: m.client || 'Não informado',
          stage: 'carregamento',
          isResolved: carrVerified
        });
      }

      // Additions (Purchases) during unloading (Unloading decreases empty yard stock due to sale/filling)
      if (isUnloadingSentToProduction) {
        descList.filter(a => isPurchaseType(a.type)).forEach((item, idx) => {
          const { clampedApprovedQty, remainingQty, matchedResolvedEntries } = getAlertsForItem(m, item, 'descarregamento');

          // Add a log entry for each matched resolved entry
          matchedResolvedEntries.forEach((entry, rIdx) => {
            logs.push({
              id: `auto-desc-purch-res-${m.id}-${idx}-${rIdx}`,
              product: cleanOccurrenceTypeName(item.type),
              qty: entry.qty,
              type: 'saida',
              origin: 'automatico',
              reason: `Venda / Saída de vasilhame na produção (Solicitado no Descarregamento) - Veículo ${m.plate.toUpperCase()}`,
              timestamp: m.entryTimestamp || m.timestamp,
              operator: m.checklistEvaluator || m.createdBy || 'Sistema',
              plate: m.plate.toUpperCase(),
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado',
              stage: 'descarregamento',
              isResolved: true
            });
          });

          // Add a log entry for the remaining unresolved part if any
          if (remainingQty > 0) {
            logs.push({
              id: `auto-desc-purch-pend-${m.id}-${idx}`,
              product: cleanOccurrenceTypeName(item.type),
              qty: remainingQty,
              type: 'saida',
              origin: 'automatico',
              reason: `Venda / Saída de vasilhame na produção (Solicitado no Descarregamento) - Veículo ${m.plate.toUpperCase()}`,
              timestamp: m.entryTimestamp || m.timestamp,
              operator: m.checklistEvaluator || m.createdBy || 'Sistema',
              plate: m.plate.toUpperCase(),
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado',
              stage: 'descarregamento',
              isResolved: false
            });
          }
        });
      }

      // Additions (Purchases) during loading (Loading decreases empty yard stock due to sale/filling)
      if (isLoadingSentToProduction) {
        carregList.filter(c => isPurchaseType(c.type)).forEach((item, idx) => {
          const { clampedApprovedQty, remainingQty, matchedResolvedEntries } = getAlertsForItem(m, item, 'carregamento');

          // Add a log entry for each matched resolved entry
          matchedResolvedEntries.forEach((entry, rIdx) => {
            logs.push({
              id: `auto-carreg-purch-res-${m.id}-${idx}-${rIdx}`,
              product: cleanOccurrenceTypeName(item.type),
              qty: entry.qty,
              type: 'saida',
              origin: 'automatico',
              reason: `Venda / Saída de vasilhame na produção (Solicitado no Carregamento) - Veículo ${m.plate.toUpperCase()}`,
              timestamp: m.entryTimestamp || m.timestamp,
              operator: m.checklistEvaluator || m.createdBy || 'Sistema',
              plate: m.plate.toUpperCase(),
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado',
              stage: 'carregamento',
              isResolved: true
            });
          });

          // Add a log entry for the remaining unresolved part if any
          if (remainingQty > 0) {
            logs.push({
              id: `auto-carreg-purch-pend-${m.id}-${idx}`,
              product: cleanOccurrenceTypeName(item.type),
              qty: remainingQty,
              type: 'saida',
              origin: 'automatico',
              reason: `Venda / Saída de vasilhame na produção (Solicitado no Carregamento) - Veículo ${m.plate.toUpperCase()}`,
              timestamp: m.entryTimestamp || m.timestamp,
              operator: m.checklistEvaluator || m.createdBy || 'Sistema',
              plate: m.plate.toUpperCase(),
              driver: m.driver || 'Não informado',
              client: m.client || 'Não informado',
              stage: 'carregamento',
              isResolved: false
            });
          }
        });
      }
    });

    // 2. Gather logs from manual adjustments
    manualStockAdjustments.filter(a => !a.unit || a.unit === currentUserUnit).forEach(adj => {
      logs.push({
        id: adj.id,
        product: adj.product,
        qty: adj.qty,
        type: adj.type,
        origin: 'manual',
        reason: adj.reason,
        timestamp: adj.timestamp,
        operator: adj.operator
      });
    });

    // Apply filtering
    return logs
      .filter(l => {
        if (logFilterProduct !== 'todos') {
          return l.product.toLowerCase().trim() === logFilterProduct.toLowerCase().trim();
        }
        return true;
      })
      .filter(l => {
        if (logFilterType !== 'todos') {
          return l.type === logFilterType;
        }
        return true;
      })
      .filter(l => {
        if (logFilterClient.trim()) {
          const search = logFilterClient.toLowerCase().trim();
          return !!(l.client && l.client.toLowerCase().includes(search));
        }
        return true;
      })
      .filter(l => {
        if (logFilterDriver.trim()) {
          const search = logFilterDriver.toLowerCase().trim();
          return !!(l.driver && l.driver.toLowerCase().includes(search));
        }
        return true;
      })
      .filter(l => {
        if (logFilterPlate.trim()) {
          const search = logFilterPlate.toLowerCase().trim();
          return !!(l.plate && l.plate.toLowerCase().includes(search));
        }
        return true;
      })
      .filter(l => {
        if (logFilterStartDate) {
          const itemDateStr = l.timestamp.substring(0, 10);
          if (itemDateStr < logFilterStartDate) return false;
        }
        if (logFilterEndDate) {
          const itemDateStr = l.timestamp.substring(0, 10);
          if (itemDateStr > logFilterEndDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const historyLogs = getUnifiedHistoryLogs();

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    addCustomStockProduct(newProductName);
    setNewProductName('');
    setShowAddProductModal(false);
  };

  const handleOpenAdjustInitial = () => {
    const list: Record<string, number> = {
      'sucata': initialStockLevels[`${currentUserUnit}_sucata`] || 0,
      'vasilhame são pedro': initialStockLevels[`${currentUserUnit}_vasilhame são pedro`] || 0,
      'vasilhame prime': initialStockLevels[`${currentUserUnit}_vasilhame prime`] || 0,
      'vasilhame de rota': initialStockLevels[`${currentUserUnit}_vasilhame de rota`] || 0,
    };
    customStockProducts.forEach(p => {
      const norm = p.toLowerCase().trim();
      list[norm] = initialStockLevels[`${currentUserUnit}_${norm}`] || 0;
    });
    setTempInitialLevels(list);
    setShowAdjustInitialModal(true);
  };

  const handleSaveInitialLevels = () => {
    Object.entries(tempInitialLevels).forEach(([product, level]) => {
      updateInitialStockLevel(product, level);
    });
    setShowAdjustInitialModal(false);
  };

  const handleSaveManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || adjustQty <= 0 || !adjustReason.trim()) return;

    addManualStockAdjustment({
      product: adjustProduct,
      qty: adjustQty,
      type: adjustType,
      reason: adjustReason
    });

    setAdjustProduct('');
    setAdjustQty(0);
    setAdjustType('entrada');
    setAdjustReason('');
    setShowManualAdjustmentModal(false);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductColorTag = (product: string) => {
    const norm = product.toLowerCase().trim();
    if (norm === 'sucata') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (norm === 'vasilhame são pedro') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (norm === 'vasilhame prime') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="flex-1 w-full flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">MÓDULO DE LOGÍSTICA</span>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
            <Boxes className="text-indigo-650" size={24} />
            Controle de Estoque de Produtos e Vasilhames
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Controle saldos físicos de sucata, vasilhames Prime e São Pedro com alertas integrados para a produção.</p>
        </div>

        {/* Top buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleOpenAdjustInitial}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-950 font-bold bg-white hover:bg-slate-50 border border-slate-250 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Sliders size={14} />
            Definir Estoque Inicial
          </button>
          
          <button
            onClick={() => setShowManualAdjustmentModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-slate-900 hover:bg-black font-extrabold rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            Lançar Ajuste Manual
          </button>
        </div>
      </div>

      {/* Alert Header Banner if pending alerts are present */}
      {pendingAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start font-sans gap-3 sm:gap-4 shadow-sm relative overflow-hidden animate-fade-in shrink-0">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-100/40 rounded-full translate-x-4 -translate-y-4 flex items-center justify-center">
            <AlertTriangle className="text-amber-500/30" size={40} />
          </div>
          <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0">
            <AlertTriangle size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-amber-850 uppercase tracking-wider">Atenção Setor de Estoque ({pendingAlerts.length})</h4>
            <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
              Existem {pendingAlerts.length} aviso(s) de vasilhame Prime ou São Pedro no pátio. Transporte estes recipientes para a linha de produção imediatamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <button 
                onClick={() => { setActiveTabTab('alerts'); }} 
                className="text-[10px] text-amber-900 hover:text-black font-extrabold bg-amber-200/60 hover:bg-amber-200 px-3 py-1 rounded-lg transition"
              >
                Ver Alertas de Produção &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Navigation Tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTabTab('balance')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
            activeTab === 'balance'
              ? 'border-indigo-650 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Saldos de Estoque
        </button>

        <button
          onClick={() => setActiveTabTab('alerts')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-indigo-650 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Alertas de Produção
          {pendingAlerts.length > 0 && (
            <span className="bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {pendingAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTabTab('scrap-verification')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
            activeTab === 'scrap-verification'
              ? 'border-indigo-650 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Conferência de Sucata
          {totalPendingScrapQty > 0 && (
            <span className="bg-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 min-w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {totalPendingScrapQty}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTabTab('log')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
            activeTab === 'log'
              ? 'border-indigo-650 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Histórico de Movimentações
        </button>
      </div>

      {/* VIEWS ROUTER */}
      
      {/* 1. BALANCE CONTAINER */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* Standard SUCATA Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="bg-amber-105 text-amber-800 p-2 text-xs rounded-2xl font-bold uppercase tracking-wider border border-amber-200">
                    Sucata (Estoque de Venda)
                  </div>
                  <Package className="text-amber-500" size={18} />
                </div>
                <h3 className="text-3xl font-black font-mono mt-4 text-slate-900">{currentStocks['sucata'] || 0} <span className="text-xs uppercase font-sans font-bold text-slate-400">un</span></h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Estoque total acumulado de sucata pronta para venda</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-450">
                <span>Inicial: {initialStockLevels[`${currentUserUnit}_sucata`] || 0} un</span>
                <span className="font-semibold text-slate-600">Calculado Dinamicamente</span>
              </div>
            </div>

            {/* Standard SÃO PEDRO Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="bg-blue-100/80 text-blue-700 p-2 text-xs rounded-2xl font-bold uppercase tracking-wider">
                    Vasilhame São Pedro
                  </div>
                  <Package className="text-blue-500" size={18} />
                </div>
                <h3 className="text-3xl font-black font-mono mt-4 text-slate-900">{currentStocks['vasilhame são pedro'] || 0} <span className="text-xs uppercase font-sans font-bold text-slate-400">un</span></h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Vasilhames vazios do modelo São Pedro</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-450">
                <span>Inicial: {initialStockLevels[`${currentUserUnit}_vasilhame são pedro`] || 0} un</span>
                <span className="font-semibold text-slate-600">Disponível p/ Carregamento</span>
              </div>
            </div>

            {/* Standard PRIME Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="bg-emerald-100/80 text-emerald-700 p-2 text-xs rounded-2xl font-bold uppercase tracking-wider">
                    Vasilhame Prime
                  </div>
                  <Package className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-3xl font-black font-mono mt-4 text-slate-900">{currentStocks['vasilhame prime'] || 0} <span className="text-xs uppercase font-sans font-bold text-slate-400">un</span></h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Vasilhames vazios de padrão Prime</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-450">
                <span>Inicial: {initialStockLevels[`${currentUserUnit}_vasilhame prime`] || 0} un</span>
                <span className="font-semibold text-emerald-600 font-bold">Aviso ativo p/ pátio</span>
              </div>
            </div>

            {/* Standard VASILHAME DE ROTA Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="bg-indigo-100/80 text-indigo-700 p-2 text-xs rounded-2xl font-bold uppercase tracking-wider">
                    Vasilhame de Rota
                  </div>
                  <Truck className="text-indigo-500" size={18} />
                </div>
                <h3 className="text-3xl font-black font-mono mt-4 text-slate-900">{currentStocks['vasilhame de rota'] || 0} <span className="text-xs uppercase font-sans font-bold text-slate-400">un</span></h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Estoque de vasilhames recolhidos da rota</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-450">
                <span>Inicial: {initialStockLevels[`${currentUserUnit}_vasilhame de rota`] || 0} un</span>
                <span className="font-semibold text-indigo-650 font-bold">Retirados da Carga</span>
              </div>
            </div>

            {/* CUSTOM dynamic Products */}
            {(customStockProducts || []).map(p => {
              const norm = p.toLowerCase().trim();
              const qty = currentStocks[norm] || 0;
              const isEditing = editingProductOldName === p;

              return (
                <div key={norm} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative group min-h-[160px]">
                  {/* Edit/Delete icons at the top right of the card visible on hover (if not editing/deleting) */}
                  {!isEditing && deletingProductName !== p && currentUser?.role !== 'visualizador' && (
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingProductOldName(p);
                          setEditingProductNewName(p);
                          setDeletingProductName(null);
                        }}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
                        title="Editar Produto"
                      >
                        <Sliders size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingProductName(p);
                          setEditingProductOldName(null);
                        }}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition cursor-pointer"
                        title="Excluir Produto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {deletingProductName === p ? (
                    <div className="space-y-3 font-sans">
                      <span className="text-[10px] uppercase font-black text-red-600 block">Excluir Produto?</span>
                      <p className="text-[11px] text-slate-500 font-medium leading-normal">
                        Isso removerá o produto do controle de estoque e de ocorrências. Deseja continuar?
                      </p>
                      <div className="flex gap-1.5 justify-end mt-2">
                        <button
                          onClick={() => {
                            removeCustomStockProduct(p);
                            setDeletingProductName(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded hover:bg-red-700 transition cursor-pointer font-sans"
                        >
                          Sim, Excluir
                        </button>
                        <button
                          onClick={() => setDeletingProductName(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded hover:bg-slate-200 transition cursor-pointer border border-slate-200 font-sans"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-3">
                      <span className="text-[9px] uppercase font-black text-indigo-700 block">Renomear Produto</span>
                      <input
                        type="text"
                        value={editingProductNewName}
                        onChange={e => setEditingProductNewName(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-bold"
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            const trimmed = editingProductNewName.trim();
                            if (trimmed && trimmed !== editingProductOldName) {
                              updateCustomStockProduct(editingProductOldName, trimmed);
                            }
                            setEditingProductOldName(null);
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded hover:bg-emerald-700 transition cursor-pointer font-sans"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingProductOldName(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded hover:bg-slate-200 transition cursor-pointer border border-slate-200 font-sans"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="bg-purple-100/95 text-purple-800 p-2 text-xs rounded-2xl font-bold uppercase tracking-wider truncate max-w-[130px]" title={p}>
                            {p}
                          </div>
                          <Package className="text-purple-500 mr-8" size={18} />
                        </div>
                        <h3 className="text-3xl font-black font-mono mt-4 text-slate-900">{qty} <span className="text-xs uppercase font-sans font-bold text-slate-400">un</span></h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Produto de controle customizado registrado</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-450">
                        <span>Inicial: {initialStockLevels[`${currentUserUnit}_${norm}`] || 0} un</span>
                        <span className="font-semibold text-slate-600">Customizado</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Card to Add new Tracked Products */}
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-slate-50 border border-dashed border-slate-350 rounded-3xl p-5 hover:bg-slate-100/50 transition-colors flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer shadow-xs"
            >
              <div className="bg-indigo-100 text-indigo-700 p-3 rounded-full">
                <Plus size={20} />
              </div>
              <div className="text-xs font-bold text-slate-700">Registrar Novo Produto</div>
              <div className="text-[10px] text-slate-400 leading-snug max-w-[160px]">Preencha o nome de outro vasilhame ou produto acabado para monitorar estoque.</div>
            </button>

          </div>
        </div>
      )}

      {/* 2. ALERTS TAB DASHBOARD */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          
          {/* Active section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5 text-red-750">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              Alertas Pendentes de Transporte para Produção ({pendingAlerts.length})
            </h3>

            {pendingAlerts.length === 0 ? (
              <div className="text-center py-10 font-sans">
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full inline-block mb-3 border border-emerald-100">
                  <CheckCircle size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Tudo em ordem!</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">Nenhum aviso de estoque pendente. Todos os vasilhames Prime e São Pedro descarregados/carregados já foram mandados para a produção.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingAlerts.map(alert => (
                  <div key={alert.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between font-sans shadow-2xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                          Fase: {alert.stage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                          {formatDateTime(alert.timestamp)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="text-sm font-black text-slate-800 leading-none">
                          {alert.product}
                        </h4>
                        <p className="text-xs text-indigo-750 font-bold mt-1 uppercase">
                          Quantidade: {alert.qty} un
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Detectado no fluxo de transporte do veículo placa <strong>{alert.plate}</strong>.
                        </p>
                        
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-0.5 text-[10px] text-slate-500">
                          <div><strong>Motorista:</strong> <span className="font-semibold text-slate-750">{alert.driver}</span></div>
                          <div><strong>Cliente:</strong> <span className="font-semibold text-slate-750">{alert.client}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => resolveStockAlert(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-white hover:text-white font-extrabold bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
                      >
                        <Check size={12} />
                        Mandar p/ Produção (Atender)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Alerts counter history */}
          {resolvedAlerts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <History size={14} />
                Histórico recente de Movimentações Atendidas ({resolvedAlerts.length})
              </h3>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {resolvedAlerts.map(alert => (
                  <div key={alert.id} className="flex justify-between items-center bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 text-emerald-600 rounded-full p-1 border border-emerald-100">
                        <Check size={12} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{alert.product} ({alert.qty} un) — <span className="text-slate-450 uppercase text-[9px]">Veículo {alert.plate}</span></p>
                        <p className="text-[10px] text-slate-500 font-medium">Motorista: {alert.driver} | Cliente: {alert.client}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Alertado no {alert.stage} e encaminhado para as linhas envasadoras</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-mono font-bold">Atendido em</span>
                      <button
                        onClick={() => unresolveStockAlert(alert.id)}
                        className="text-[9px] text-red-500 hover:underline font-bold"
                      >
                        Reverter Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2.5 SCRAP VERIFICATION TAB */}
      {activeTab === 'scrap-verification' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Boxes size={20} className="text-amber-500" />
              Conferência Consolidada de Sucatas (Vasilhames Avariados)
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed font-medium">
              Conforme a regra operacional, os vasilhames avariados registrados nos veículos não entram automaticamente no estoque. 
              O setor de estoque realiza a contagem física periódica das avarias recebidas e confirma a quantidade real para entrada oficial no estoque.
            </p>

            {/* SUB-TABS SELECTOR */}
            <div className="flex border-b border-slate-200 mb-6 gap-2">
              <button
                onClick={() => {
                  setScrapSubTab('descarregamento');
                  setShowConfirmBulkScrap(false);
                }}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5 cursor-pointer ${
                  scrapSubTab === 'descarregamento'
                    ? 'border-indigo-650 text-indigo-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Avarias de Descarregamento (Retorno)
                {pendingDescCount > 0 && (
                  <span className="bg-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full">
                    {pendingDescCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setScrapSubTab('carregamento');
                  setShowConfirmBulkScrap(false);
                }}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-1.5 cursor-pointer ${
                  scrapSubTab === 'carregamento'
                    ? 'border-indigo-650 text-indigo-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Avarias de Carregamento (Saída/Envase)
                {pendingCarregCount > 0 && (
                  <span className="bg-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full">
                    {pendingCarregCount}
                  </span>
                )}
              </button>
            </div>

            {/* DYNAMIC BULK CONFERENCE DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              
              {/* Yard Qty Panel */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                    Lançado Produção ({scrapSubTab === 'descarregamento' ? 'Descarrego' : 'Carregamento'})
                  </span>
                  <span className="text-3xl font-black text-slate-800">
                    {currentPendingQty} <span className="text-xs font-bold text-slate-500">un</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 font-medium">
                  Soma de todas as avarias registradas de {scrapSubTab === 'descarregamento' ? 'descarregamento' : 'carregamento'} nos {currentPendingCount} veículos pendentes.
                </p>
              </div>

              {/* Real Input Panel */}
              <div className="border-2 border-amber-300 rounded-2xl p-5 bg-amber-50/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider block mb-1">
                    Quantidade Física Real (Contada)
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="number"
                      min={0}
                      value={realScrapInput}
                      onChange={(e) => setRealScrapInput(e.target.value)}
                      placeholder="Ex: 30"
                      className="w-24 text-center text-xl font-black text-amber-900 bg-white border border-amber-350 rounded-xl py-1 px-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-amber-700">unidades</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  Insira a quantidade real de avarias contada fisicamente.
                </p>
              </div>

              {/* Discrepancy Panel */}
              {(() => {
                const real = Number(realScrapInput) || 0;
                const difference = real - currentPendingQty;
                return (
                  <div className={`border rounded-2xl p-5 flex flex-col justify-between ${
                    difference === 0 
                      ? 'border-slate-200 bg-slate-50' 
                      : difference > 0 
                        ? 'border-emerald-250 bg-emerald-50/30' 
                        : 'border-rose-200 bg-rose-50/20'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                        Divergência de Contagem
                      </span>
                      <span className={`text-2xl font-black ${
                        difference === 0 
                          ? 'text-slate-600' 
                          : difference > 0 
                            ? 'text-emerald-700' 
                            : 'text-rose-700'
                      }`}>
                        {difference === 0 ? 'Bateu!' : `${difference > 0 ? '+' : ''}${difference}`}
                        <span className="text-xs font-bold ml-1">un</span>
                      </span>
                    </div>
                    <p className={`text-[11px] mt-3 font-semibold ${
                      difference === 0 
                        ? 'text-slate-500' 
                        : difference > 0 
                          ? 'text-emerald-600' 
                          : 'text-rose-600'
                    }`}>
                      {difference === 0 
                        ? 'As quantidades física e registrada coincidem.' 
                        : difference > 0 
                          ? 'Avarias excedentes em relação ao lançado produção.' 
                          : 'Avarias a menos em relação ao lançado produção.'}
                    </p>
                  </div>
                );
              })()}

            </div>

            {/* ACTION BUTTON */}
            <div className="flex justify-end border-b border-slate-150 pb-6 mb-6">
              {!showConfirmBulkScrap ? (
                <button
                  disabled={currentPendingCount === 0}
                  onClick={() => {
                    setShowConfirmBulkScrap(true);
                  }}
                  className={`px-6 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition duration-150 cursor-pointer ${
                    currentPendingCount === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-0'
                  }`}
                >
                  <CheckCircle size={16} />
                  Confirmar Lote e Lançar Entrada de Sucata ({realScrapInput || 0} un)
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 animate-fadeIn">
                  <div className="text-xs text-amber-800 font-semibold text-center md:text-left">
                    <span className="font-extrabold block text-sm text-amber-900 mb-0.5">⚠️ Confirmar Lançamento de Conferência?</span>
                    Deseja lançar a contagem física real de <span className="font-extrabold text-amber-950 text-sm">{realScrapInput || 0}</span> avarias para {scrapSubTab === 'descarregamento' ? 'descarregamento' : 'carregamento'}? Os <span className="font-extrabold">{currentPendingCount}</span> veículos pendentes serão marcados como conferidos no sistema.
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setShowConfirmBulkScrap(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        addScrapConference({
                          yardQty: currentPendingQty,
                          realQty: Number(realScrapInput) || 0,
                          movementIds: currentPendingMovements.map(m => `${m.id}-${scrapSubTab === 'descarregamento' ? 'desc' : 'carr'}`),
                          type: scrapSubTab
                        });
                        setRealScrapInput('');
                        setShowConfirmBulkScrap(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white border-0 cursor-pointer shadow-sm"
                    >
                      Sim, Confirmar!
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LIST OF PENDING VEHICLES / LOADS */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Cargas que Somam as Avarias do Período ({currentPendingCount})
                  </span>
                  <span className="text-[10px] text-slate-400 lowercase font-medium">Soma: {currentPendingQty} un</span>
                </h3>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {currentPendingMovements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white border border-slate-150 rounded-xl p-4 text-xs font-medium">
                      Nenhuma carga com avarias de {scrapSubTab === 'descarregamento' ? 'descarregamento' : 'carregamento'} pendente de conferência no momento.
                    </div>
                  ) : (
                    currentPendingMovements.map(m => {
                      const descList = m.productionControl?.avariasDescarregamento || [];
                      const descLosses = descList.filter(a => !isPurchaseType(a.type));
                      const carregList = m.productionControl?.avariasCarregamento || [];
                      const carregLosses = carregList.filter(c => !isPurchaseType(c.type));
                      
                      const lossesToShow = scrapSubTab === 'descarregamento' ? descLosses : carregLosses;
                      const totalLossesQty = lossesToShow.reduce((sum, item) => sum + item.qty, 0);

                      return (
                        <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-slate-100 text-slate-800 font-black px-2 py-0.5 rounded-full uppercase">
                                  Placa: {m.plate.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">
                                  #{m.id.substring(m.id.length - 4)}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-rose-700 mt-2 uppercase flex items-center gap-1">
                                {totalLossesQty} {totalLossesQty === 1 ? 'Vasilhame Avariado' : 'Vasilhames Avariados'}
                              </h4>
                              
                              <div className="mt-2 pl-2 border-l-2 border-slate-150 space-y-1">
                                {lossesToShow.map((loss, idx) => (
                                  <div key={idx} className="text-[11px] text-slate-500 font-medium">
                                    {loss.qty} un de {cleanOccurrenceTypeName(loss.type)}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 text-[10px] text-slate-400 space-y-0.5 font-medium">
                                <p>Motorista: {m.driver || 'Não informado'}</p>
                                <p>Cliente/Origem: {m.client || 'Não informado'}</p>
                                <p>Data pátio: {new Date(m.entryTimestamp || m.timestamp).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COMPLETED BULK CONFERENCES */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-600" />
                  Histórico de Conferências Consolidadas ({scrapConferences.filter(c => c.unit === currentUserUnit).length})
                </h3>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {scrapConferences.filter(c => c.unit === currentUserUnit).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white border border-slate-150 rounded-xl p-4 text-xs font-medium">
                      Nenhuma conferência consolidada registrada ainda neste período.
                    </div>
                  ) : (
                    scrapConferences
                      .filter(c => c.unit === currentUserUnit)
                      .map(c => {
                        const diff = c.realQty - c.yardQty;
                        return (
                          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1.5 flex-1 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-250 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                    Concluído
                                  </span>
                                  {c.type && (
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                                      c.type === 'descarregamento'
                                        ? 'bg-blue-50 text-blue-700 border-blue-250'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-250'
                                    }`}>
                                      {c.type === 'descarregamento' ? 'Descarregamento' : 'Carregamento'}
                                    </span>
                                  )}
                                  <span className="text-[10.5px] text-slate-400 font-semibold">
                                    ID: #{c.id.substring(c.id.length - 5)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-1">
                                  <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                                    <div className="text-[9px] text-slate-400 font-extrabold uppercase">Lançado</div>
                                    <div className="text-xs font-black text-slate-700">{c.yardQty} un</div>
                                  </div>
                                  <div className="bg-amber-500/10 rounded-lg p-1.5 text-center">
                                    <div className="text-[9px] text-amber-700 font-extrabold uppercase text-center">Físico</div>
                                    <div className="text-xs font-black text-amber-850">{c.realQty} un</div>
                                  </div>
                                  <div className={`rounded-lg p-1.5 text-center ${
                                    diff === 0 ? 'bg-slate-100' : diff > 0 ? 'bg-emerald-100/40' : 'bg-red-100/40'
                                  }`}>
                                    <div className="text-[9px] text-slate-400 font-extrabold uppercase">Diverg.</div>
                                    <div className={`text-xs font-black ${
                                      diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-emerald-700' : 'text-red-700'
                                    }`}>
                                      {diff > 0 ? '+' : ''}{diff} un
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-400 space-y-1 font-medium">
                                  <p className="font-semibold text-slate-500">Operador: {c.operator}</p>
                                  <p>Realizado em: {new Date(c.timestamp).toLocaleString('pt-BR')}</p>
                                  
                                  <button
                                    onClick={() => setExpandedConferenceId(expandedConferenceId === c.id ? null : c.id)}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer mt-1 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition"
                                  >
                                    <span>Referente a {c.movementIds?.length || 0} veículos conferidos juntos.</span>
                                    {expandedConferenceId === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>

                                  {expandedConferenceId === c.id && (
                                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn max-h-[250px] overflow-y-auto">
                                      <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Cargas Vinculadas:</p>
                                      {c.movementIds?.map((itemWithSuffix) => {
                                        const cleanId = itemWithSuffix.replace('-desc', '').replace('-carr', '');
                                        const m = movements.find(mov => mov.id === cleanId);
                                        if (!m) return null;

                                        const isDesc = itemWithSuffix.endsWith('-desc') || c.type === 'descarregamento';
                                        const list = isDesc 
                                          ? (m.productionControl?.avariasDescarregamento || [])
                                          : (m.productionControl?.avariasCarregamento || []);
                                        const losses = list.filter(item => !isPurchaseType(item.type));
                                        const totalLossesQty = losses.reduce((sum, loss) => sum + loss.qty, 0);

                                        return (
                                          <div key={itemWithSuffix} className="bg-white border border-slate-150 rounded-lg p-2 text-[10px] space-y-1">
                                            <div className="flex justify-between items-center font-bold text-slate-700">
                                              <span>Placa: {m.plate.toUpperCase()}</span>
                                              <span className="text-rose-700">{totalLossesQty} un avarias</span>
                                            </div>
                                            <div className="text-[9.5px] text-slate-500 font-medium">
                                              <p>Motorista: {m.driver || 'Não informado'}</p>
                                              <p>Cliente/Origem: {m.client || 'Não informado'}</p>
                                              <p>Data: {new Date(m.entryTimestamp || m.timestamp).toLocaleString('pt-BR')}</p>
                                            </div>
                                            {losses.length > 0 && (
                                              <div className="mt-1 pl-1.5 border-l border-slate-250 text-[9px] text-slate-500 space-y-0.5 font-medium">
                                                {losses.map((loss, lossIdx) => (
                                                  <div key={lossIdx}>
                                                    • {loss.qty} un de {cleanOccurrenceTypeName(loss.type)}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {confirmDeleteId === c.id ? (
                                <div className="flex flex-col items-end gap-1.5 animate-fadeIn bg-rose-50 border border-rose-250 rounded-xl p-2.5 max-w-[200px]">
                                  <span className="text-[9px] text-rose-800 font-bold leading-tight text-right">Reverter conferência e estornar estoque?</span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 text-[9px] bg-white border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                                    >
                                      Não
                                    </button>
                                    <button
                                      onClick={() => {
                                        deleteScrapConference(c.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2 py-1 text-[9px] bg-red-600 hover:bg-red-700 text-white font-black rounded-lg border-0 cursor-pointer shadow-xs"
                                    >
                                      Sim
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(c.id)}
                                  className="px-2.5 py-1.5 text-[10px] text-red-650 hover:text-red-700 hover:bg-red-50 bg-white border border-red-200 font-bold rounded-xl transition cursor-pointer self-start"
                                >
                                  Desfazer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 3. DETAILED LOGS TAB */}
      {activeTab === 'log' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col">
          
          {/* Controls toolbar */}
          <div className="pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Filtros do Extrato de Estoque</h3>
              <button
                onClick={() => {
                  setLogFilterProduct('todos');
                  setLogFilterType('todos');
                  setLogFilterClient('');
                  setLogFilterDriver('');
                  setLogFilterPlate('');
                  setLogFilterStartDate('');
                  setLogFilterEndDate('');
                }}
                className="text-[10px] text-indigo-700 hover:text-indigo-950 font-extrabold bg-indigo-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-indigo-150 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Produto */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Produto</label>
                <select
                  value={logFilterProduct}
                  onChange={(e) => setLogFilterProduct(e.target.value)}
                  className="bg-white text-xs text-slate-700 font-bold border border-slate-250 rounded-lg px-2 py-1.5 cursor-pointer w-full focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todos os Produtos</option>
                  <option value="sucata">Sucata</option>
                  <option value="vasilhame são pedro">Vasilhame São Pedro</option>
                  <option value="vasilhame prime">Vasilhame Prime</option>
                  {customStockProducts.map(p => (
                    <option key={p} value={p.toLowerCase().trim()}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Movimentação */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Movimentação</label>
                <select
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="bg-white text-xs text-slate-700 font-bold border border-slate-250 rounded-lg px-2 py-1.5 cursor-pointer w-full focus:outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todas</option>
                  <option value="entrada">Entradas (+)</option>
                  <option value="saida">Saídas (-)</option>
                </select>
              </div>

              {/* Cliente */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Cliente</label>
                <input
                  type="text"
                  value={logFilterClient}
                  onChange={(e) => setLogFilterClient(e.target.value)}
                  placeholder="Nome do cliente..."
                  className="bg-white text-xs text-slate-700 font-medium border border-slate-250 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Motorista */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Motorista</label>
                <input
                  type="text"
                  value={logFilterDriver}
                  onChange={(e) => setLogFilterDriver(e.target.value)}
                  placeholder="Nome do motorista..."
                  className="bg-white text-xs text-slate-700 font-medium border border-slate-250 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Veículo (Placa) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Veículo / Placa</label>
                <input
                  type="text"
                  value={logFilterPlate}
                  onChange={(e) => setLogFilterPlate(e.target.value)}
                  placeholder="Ex: ABC1D23..."
                  className="bg-white text-xs text-slate-700 font-medium border border-slate-250 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Período (Datas) */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-tight">Período</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={logFilterStartDate}
                    onChange={(e) => setLogFilterStartDate(e.target.value)}
                    className="bg-white text-xs text-slate-700 font-semibold border border-slate-250 rounded-lg px-1.5 py-1 w-full focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-400 text-[10px]">a</span>
                  <input
                    type="date"
                    value={logFilterEndDate}
                    onChange={(e) => setLogFilterEndDate(e.target.value)}
                    className="bg-white text-xs text-slate-700 font-semibold border border-slate-250 rounded-lg px-1.5 py-1 w-full focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            {historyLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhum registro encontrado correspondendo aos filtros escolhidos.
              </div>
            ) : (
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Data/Hora</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Justificativa / Comentário</th>
                    <th className="py-2.5 px-3">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500 font-bold whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <span className={`px-2 py-0.5 border rounded-md text-[10px] font-black uppercase ${getProductColorTag(log.product)}`}>
                          {log.product}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        {log.type === 'entrada' ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-fit">
                            <ArrowUpRight size={12} />
                            Entrada
                          </span>
                        ) : (
                          <span className="text-red-650 bg-red-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-fit">
                            <ArrowDownRight size={12} />
                            Saída
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-3 font-extrabold font-mono text-right ${log.type === 'entrada' ? 'text-emerald-700' : 'text-red-750'}`}>
                        {log.type === 'entrada' ? '+' : '-'}{log.qty} un
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-sm ${
                          log.origin === 'automatico' ? 'bg-indigo-50 text-indigo-650 border border-indigo-100' : 'bg-slate-100 text-slate-650 border border-slate-200'
                        }`}>
                          {log.origin === 'automatico' ? 'Lançamento Automático' : 'Ajuste Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium font-sans">
                        <div>{log.reason}</div>
                        {log.origin === 'automatico' && (
                          <div className="text-[10px] text-slate-400 mt-1.5 font-semibold flex flex-wrap items-center gap-2">
                            <span>Motorista: <span className="text-slate-600 font-bold">{log.driver}</span></span>
                            {log.client && <span> | Cliente: <span className="text-slate-600 font-bold">{log.client}</span></span>}
                            {log.stage && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold uppercase text-[9px] border border-indigo-150">
                                {log.stage === 'descarregamento' ? 'No Descarregamento' : 'No Carregamento'}
                              </span>
                            )}
                            {log.isResolved !== undefined && (
                              <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border ${
                                log.isResolved 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                  : 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                              }`}>
                                {log.isResolved ? 'Baixado no Estoque' : 'Aguardando Atendimento'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium truncate max-w-[140px]" title={log.operator}>
                        {log.operator}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 1. Modal: Register New Custom Stock Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Registrar Novo Produto para Monitorar</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Insira o nome de um novo produto (como galão de 10L, tampa premium, copinho etc.) para monitorar estoque integrado.</p>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vasilhame 10 Litros"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full text-xs bg-slate-50 text-slate-800 border border-slate-250 p-2.5 rounded-xl outline-hidden focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setNewProductName(''); setShowAddProductModal(false); }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-150 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Adjust Initial Stock Levels */}
      {showAdjustInitialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ajustar Estoque Inicial</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Insira o estoque inicial base para cada um dos produtos monitorados. O sistema usará esses pontos de partida para somar as entradas e subtrair saídas automaticamente.</p>
            </div>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {Object.entries(tempInitialLevels).map(([product, count]) => (
                <div key={product} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2">
                  <span className="text-xs font-bold text-slate-700 capitalize truncate max-w-[200px]" title={product}>
                    {product}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(e) => setTempInitialLevels(prev => ({
                        ...prev,
                        [product]: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      className="w-24 text-center font-mono font-bold text-xs bg-slate-50 text-slate-800 border border-slate-250 p-1.5 rounded-xl outline-hidden focus:border-indigo-500"
                    />
                    <span className="text-[10px] uppercase font-black text-slate-400">un</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAdjustInitialModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-150 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveInitialLevels}
                className="px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
              >
                Salvar Estoques Base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Manual Stock Adjustment Entry */}
      {showManualAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Inserir Ajuste de Estoque Manual</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Use esta guia para registrar entradas (devoluções, acertos fiscais, compras) ou saídas (descartes, remessas físicas) de vasilhames ou sucata avulsa.</p>
            </div>

            <form onSubmit={handleSaveManualAdjustment} className="space-y-3.5">
              
              {/* Product selector */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Selecionar Produto</label>
                <select
                  required
                  value={adjustProduct}
                  onChange={(e) => setAdjustProduct(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-slate-250 p-2.5 rounded-xl outline-hidden focus:border-indigo-500 bg-white cursor-pointer"
                >
                  <option value="">-- Escolha um Produto --</option>
                  <option value="Sucata">Sucata</option>
                  <option value="Vasilhame São Pedro">Vasilhame São Pedro</option>
                  <option value="Vasilhame Prime">Vasilhame Prime</option>
                  {customStockProducts.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type selector */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5">Tipo de Operação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('entrada')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex justify-center items-center gap-1.5 transition-all ${
                      adjustType === 'entrada'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-350'
                        : 'bg-white border-slate-250 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('saida')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex justify-center items-center gap-1.5 transition-all ${
                      adjustType === 'saida'
                        ? 'bg-red-50 border-red-205 text-red-800 ring-2 ring-red-250'
                        : 'bg-white border-slate-250 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowDownRight size={14} />
                    Saída (-)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Quantidade</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 50"
                    value={adjustQty || ''}
                    onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold bg-slate-50 text-slate-800 border border-slate-250 p-2.5 rounded-xl outline-hidden focus:border-indigo-500 bg-white"
                  />
                  <div className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs">un</div>
                </div>
              </div>

              {/* Justification reason */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Justificativa / Motivo</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Ajuste por contagem mensal de pátio..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-slate-250 p-2.5 rounded-xl outline-hidden focus:border-indigo-500 bg-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowManualAdjustmentModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-150 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
                >
                  Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
