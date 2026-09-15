import React, { useState } from 'react';
import { useStore, defaultDisposableProducts } from '../store';
import { DisposableProduct, DisposableProductionLog, DisposableInsumoEntry, DisposableExpedition, PreSale } from '../types';
import { 
  Boxes, Box, Package, PackageCheck, Plus, Calendar, Search, Trash2, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, Truck, History, CheckCircle, RefreshCw, FileText, Layers, Shield, User, Info, Sliders, ChevronRight, X, Printer,
  Paperclip, Camera, UploadCloud, Eye, Link2, ArrowLeftRight, ReceiptText,
  BarChart3, PieChart, TrendingUp, Users, Target, Percent, Award, Download, Filter, Wallet, Lock
} from 'lucide-react';

export const checkExpeditionGateExit = (
  exp: DisposableExpedition | null | undefined,
  movements: any[]
): { exited: boolean; exitDate?: string; details?: string; plate?: string; driver?: string } => {
  if (!exp) return { exited: false };

  // 1. Check explicit gateMovementId
  if (exp.gateMovementId) {
    const mov = (movements || []).find(m => m.id === exp.gateMovementId);
    if (mov && (mov.status === 'saida' || !!mov.exitTimestamp || mov.type === 'saida')) {
      const exitTimeStr = mov.exitTimestamp
        ? new Date(mov.exitTimestamp).toLocaleString('pt-BR')
        : mov.timestamp
        ? new Date(mov.timestamp).toLocaleString('pt-BR')
        : '';
      return {
        exited: true,
        exitDate: exitTimeStr,
        plate: mov.plate,
        driver: mov.driver,
        details: `Veículo ${mov.plate || 'FROTA'} (${mov.driver || 'Motorista'}) já realizou a saída pela Portaria${exitTimeStr ? ` em ${exitTimeStr}` : ''}`
      };
    }
  }

  // 2. Check by vehicle plate and/or driver name
  const cleanExpPlate = exp.vehiclePlate ? exp.vehiclePlate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
  const cleanExpDriver = exp.driverName ? exp.driverName.trim().toLowerCase() : '';

  if (cleanExpPlate || cleanExpDriver) {
    const matchingMovements = (movements || []).filter(m => {
      const cleanPlate = m.plate ? m.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
      const cleanDriver = m.driver ? m.driver.trim().toLowerCase() : '';
      const plateMatch = cleanExpPlate && cleanPlate === cleanExpPlate;
      const driverMatch = cleanExpDriver && cleanDriver === cleanExpDriver;
      return plateMatch || driverMatch;
    });

    if (matchingMovements.length > 0) {
      const expTime = new Date(exp.timestamp || exp.date).getTime();

      const exitedMov = matchingMovements.find(m => {
        const isExited = m.status === 'saida' || !!m.exitTimestamp || m.type === 'saida';
        if (!isExited) return false;

        const mTime = new Date(m.timestamp || m.entryTimestamp || '').getTime();
        const mExitTime = m.exitTimestamp ? new Date(m.exitTimestamp).getTime() : mTime;

        const isSameDate = (m.timestamp && m.timestamp.slice(0, 10) === exp.date) ||
                           (exp.timestamp && m.timestamp && m.timestamp.slice(0, 10) === exp.timestamp.slice(0, 10));
        const exitedAfterExp = mExitTime >= expTime - 60000;

        return isSameDate || exitedAfterExp;
      });

      if (exitedMov) {
        const exitTimeStr = exitedMov.exitTimestamp
          ? new Date(exitedMov.exitTimestamp).toLocaleString('pt-BR')
          : exitedMov.timestamp
          ? new Date(exitedMov.timestamp).toLocaleString('pt-BR')
          : '';
        return {
          exited: true,
          exitDate: exitTimeStr,
          plate: exitedMov.plate,
          driver: exitedMov.driver,
          details: `Veículo ${exitedMov.plate || exp.vehiclePlate || 'FROTA'} (${exitedMov.driver || exp.driverName || 'Motorista'}) já registrou saída pela Portaria${exitTimeStr ? ` em ${exitTimeStr}` : ''}`
        };
      }
    }
  }

  return { exited: false };
};

export const LinhaDescartavel: React.FC<{ isReportView?: boolean }> = ({ isReportView = false }) => {
  const { 
    currentUser,
    disposableProducts = [],
    disposableProductionLogs = [],
    disposableInsumoEntries = [],
    disposableExpeditions = [],
    registeredClients = [],
    addRegisteredClient,
    movements = [],
    registeredVehicles = [],
    registeredDrivers = [],
    addDisposableProduct,
    updateDisposableProduct,
    removeDisposableProduct,
    addDisposableProductionLog,
    deleteDisposableProductionLog,
    addDisposableInsumoEntry,
    deleteDisposableInsumoEntry,
    addDisposableExpedition,
    deleteDisposableExpedition,
    updateDisposableStockLevel,
    preSales = [],
    updatePreSale,
    getMovementPhotos,
    driverTripLoads = [],
    addDriverTripLoad,
    updateDriverTripLoad,
    deleteDriverTripLoad,
    manualStockAdjustments = []
  } = useStore();

  const currentUserUnit = currentUser?.unit || 'matriz';
  const operatorName = currentUser?.name || 'Operador';
  const isReadOnly = isReportView || currentUser?.role === 'visualizador' || currentUser?.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<'producao' | 'sopro' | 'cartuchos' | 'insumos' | 'expedicao' | 'estoque' | 'relatorios' | 'movimentacoes'>(
    isReportView ? 'relatorios' : 'producao'
  );

  // --- MOVIMENTAÇÕES DE ESTOQUE (EXTRATO COMPLETO) STATES ---
  const [movTypeFilter, setMovTypeFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [movCategoryFilter, setMovCategoryFilter] = useState<'todos' | 'produto_acabado' | 'insumo'>('todos');
  const [movItemFilter, setMovItemFilter] = useState<string>('todos');
  const [movSearchQuery, setMovSearchQuery] = useState<string>('');
  const [movStartDate, setMovStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [movEndDate, setMovEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // --- REPORT STATES ---
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportSelectedProduct, setReportSelectedProduct] = useState<string>('todos');
  const [reportClientSearch, setReportClientSearch] = useState<string>('');
  const [reportActiveSubtab, setReportActiveSubtab] = useState<'producao' | 'perdas' | 'vendas' | 'clientes'>('producao');

  // --- FORM STATES ---
  // 1. Produção Form
  const [prodDate, setProdDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prodProductId, setProdProductId] = useState<string>('');
  const [prodQty, setProdQty] = useState<number | ''>('');
  const [prodAvariasQty, setProdAvariasQty] = useState<number | ''>('');
  const [prodAvariasReason, setProdAvariasReason] = useState<string>('');
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodSuccessMsg, setProdSuccessMsg] = useState<string>('');
  const [prodErrorMsg, setProdErrorMsg] = useState<string>('');

  // Insumo Avarias breakdown state for Production
  const [prodInsumoAvarias, setProdInsumoAvarias] = useState<{ insumoId: string; insumoName: string; qty: number }[]>([]);
  const [selectedInsumoAvariaId, setSelectedInsumoAvariaId] = useState<string>('');
  const [selectedInsumoAvariaQty, setSelectedInsumoAvariaQty] = useState<number | ''>('');

  // 1B. Sopro de Preformas (Sopradora) Form
  const [soproDate, setSoproDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [soproPreformaId, setSoproPreformaId] = useState<string>('');
  const [soproGarrafaSopradaId, setSoproGarrafaSopradaId] = useState<string>('');
  const [soproQtyUsed, setSoproQtyUsed] = useState<number | ''>('');
  const [soproQtyProduced, setSoproQtyProduced] = useState<number | ''>('');
  const [soproQtyAvarias, setSoproQtyAvarias] = useState<number | ''>('');
  const [soproNotes, setSoproNotes] = useState<string>('');
  const [soproSuccessMsg, setSoproSuccessMsg] = useState<string>('');
  const [soproErrorMsg, setSoproErrorMsg] = useState<string>('');

  // 1C. Cartucho Datadora Form
  const [cartuchoDate, setCartuchoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cartuchoTarget, setCartuchoTarget] = useState<'copos' | 'caixas' | 'fita'>('copos');
  const [cartuchoInsumoId, setCartuchoInsumoId] = useState<string>('');
  const [cartuchoQty, setCartuchoQty] = useState<number | ''>(1);
  const [cartuchoNotes, setCartuchoNotes] = useState<string>('');
  const [cartuchoSuccessMsg, setCartuchoSuccessMsg] = useState<string>('');
  const [cartuchoErrorMsg, setCartuchoErrorMsg] = useState<string>('');

  // 2. Insumo Form
  const [insumoDate, setInsumoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [insumoId, setInsumoId] = useState<string>('');
  const [insumoQty, setInsumoQty] = useState<number | ''>('');
  const [insumoSupplier, setInsumoSupplier] = useState<string>('');
  const [insumoDocRef, setInsumoDocRef] = useState<string>('');
  const [insumoNotes, setInsumoNotes] = useState<string>('');
  const [insumoAttachmentUrl, setInsumoAttachmentUrl] = useState<string>('');
  const [insumoAttachmentName, setInsumoAttachmentName] = useState<string>('');
  const [insumoAttachmentLoading, setInsumoAttachmentLoading] = useState<boolean>(false);
  const [insumoSuccessMsg, setInsumoSuccessMsg] = useState<string>('');
  const [insumoErrorMsg, setInsumoErrorMsg] = useState<string>('');

  // 3. Expedição Form
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expProductId, setExpProductId] = useState<string>('');
  const [expQty, setExpQty] = useState<number | ''>('');
  const [expSelectedClientId, setExpSelectedClientId] = useState<string>('');
  const [expNewClientName, setExpNewClientName] = useState<string>('');
  const [expGateMovementId, setExpGateMovementId] = useState<string>('');
  const [expDriverName, setExpDriverName] = useState<string>('');
  const [expVehiclePlate, setExpVehiclePlate] = useState<string>('');
  const [expDocRef, setExpDocRef] = useState<string>('');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expAttachmentUrl, setExpAttachmentUrl] = useState<string>('');
  const [expAttachmentName, setExpAttachmentName] = useState<string>('');
  const [expAttachmentLoading, setExpAttachmentLoading] = useState<boolean>(false);
  const [expSuccessMsg, setExpSuccessMsg] = useState<string>('');
  const [expErrorMsg, setExpErrorMsg] = useState<string>('');

  // 3.1 Driver Trip Loads & Deliveries (Pré-Venda, Baixa do Caminhão, Caixa e Comissão) - Provided by store

  // 4. Modals & Search Filters
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductCategory, setNewProductCategory] = useState<'produto_acabado' | 'insumo'>('produto_acabado');
  const [newProductUnitMeasure, setNewProductUnitMeasure] = useState<string>('caixas');
  const [newProductMinStock, setNewProductMinStock] = useState<number>(10);
  const [newProductInitialStock, setNewProductInitialStock] = useState<number>(0);
  const [newProductLinkedProductId, setNewProductLinkedProductId] = useState<string>('');
  const [newProductConsumptionRate, setNewProductConsumptionRate] = useState<number | ''>('');

  const [showStockAdjustModal, setShowStockAdjustModal] = useState<boolean>(false);
  const [stockAdjustProductId, setStockAdjustProductId] = useState<string>('');
  const [stockAdjustNewQty, setStockAdjustNewQty] = useState<number | ''>('');

  // Attachment Viewer Modal
  const [viewAttachmentModalOpen, setViewAttachmentModalOpen] = useState<boolean>(false);
  const [viewAttachmentUrl, setViewAttachmentUrl] = useState<string>('');
  const [viewAttachmentName, setViewAttachmentName] = useState<string>('');

  // Pre-Sale Expedition Approval Modal State
  const [approvingPreSale, setApprovingPreSale] = useState<PreSale | null>(null);
  const [approvingFileUrl, setApprovingFileUrl] = useState<string>('');
  const [approvingFileName, setApprovingFileName] = useState<string>('');
  const [approvingNotes, setApprovingNotes] = useState<string>('');
  const [approvingError, setApprovingError] = useState<string>('');
  const [approvingSuccess, setApprovingSuccess] = useState<string>('');

  const pendingPreSalesDescartavel = React.useMemo(() => {
    return (preSales || []).filter(ps => {
      if (ps.deleted || ps.isUsed || ps.expeditionApproved) return false;
      if (ps.unit && ps.unit !== currentUserUnit) return false;
      return ps.products.some(p => {
        const pt = (p.productType || '').toLowerCase();
        const pn = (p.productName || '').toLowerCase();
        return (
          pt === 'agua_copo' ||
          pt === 'garrafa510' ||
          pt === 'garrafa15l' ||
          pn.includes('copo') ||
          pn.includes('510') ||
          pn.includes('1,5') ||
          pn.includes('descart') ||
          pn.includes('fardo') ||
          pn.includes('cx c/')
        );
      });
    });
  }, [preSales, currentUserUnit]);

  const approvedPreSalesDescartavel = React.useMemo(() => {
    return (preSales || []).filter(ps => {
      if (ps.deleted) return false;
      if (!ps.expeditionApproved && !ps.isUsed) return false;
      if (ps.unit && ps.unit !== currentUserUnit) return false;
      return ps.products.some(p => {
        const pt = (p.productType || '').toLowerCase();
        const pn = (p.productName || '').toLowerCase();
        return (
          pt === 'agua_copo' ||
          pt === 'garrafa510' ||
          pt === 'garrafa15l' ||
          pn.includes('copo') ||
          pn.includes('510') ||
          pn.includes('1,5') ||
          pn.includes('descart') ||
          pn.includes('fardo') ||
          pn.includes('cx c/')
        );
      });
    });
  }, [preSales, currentUserUnit]);

  const [preSalesTab, setPreSalesTab] = useState<'pendentes' | 'expedidas'>('pendentes');

  const handleApprovingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setApprovingError('O arquivo selecionado deve ser menor que 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setApprovingFileUrl(reader.result as string);
      setApprovingFileName(file.name);
      setApprovingError('');
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPreSaleExpedition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingPreSale) return;
    if (!approvingFileUrl) {
      setApprovingError('É OBRIGATÓRIO anexar a foto ou arquivo do pedido/nota fiscal para aprovar a expedição.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const finishedProds = (disposableProducts || []).filter(p => p.category === 'produto_acabado');

    const matchedGateMovement = (movements || []).find(m => 
      (approvingPreSale.vehiclePlate && m.plate?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === approvingPreSale.vehiclePlate?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) ||
      (approvingPreSale.driverName && m.driver?.toLowerCase() === approvingPreSale.driverName?.toLowerCase())
    );

    approvingPreSale.products.forEach(p => {
      const pt = (p.productType || '').toLowerCase();
      const pn = (p.productName || '').toLowerCase();

      let matched = finishedProds.find(fp => {
        const fpn = (fp.name || '').toLowerCase();
        if (pt === 'agua_copo' || pn.includes('copo')) return fpn.includes('copo') || fpn.includes('200');
        if (pt === 'garrafa510' || pn.includes('510')) return fpn.includes('510');
        if (pt === 'garrafa15l' || pn.includes('1,5')) return fpn.includes('1,5') || fpn.includes('1.5');
        return false;
      });

      if (!matched && finishedProds.length > 0) {
        matched = finishedProds[0];
      }

      if (matched) {
        addDisposableExpedition({
          date: today,
          productId: matched.id,
          productName: matched.name,
          qtyExpedited: p.qty,
          destination: `Cliente: ${approvingPreSale.clientName || ''} | Mot: ${approvingPreSale.driverName || ''}`,
          clientName: approvingPreSale.clientName,
          driverName: approvingPreSale.driverName,
          vehiclePlate: approvingPreSale.vehiclePlate,
          gateMovementId: matchedGateMovement?.id || undefined,
          documentRef: `Pré-Venda #${(approvingPreSale.id || '').slice(-6).toUpperCase()}`,
          attachmentUrl: approvingFileUrl,
          attachmentName: approvingFileName,
          operator: operatorName,
          unit: currentUserUnit,
          notes: `Expedição de pré-venda aprovada por ${operatorName}. ${approvingNotes || ''}`.trim()
        });

        // Alimentar estoque do veículo do motorista próprio
        if (approvingPreSale.driverName) {
          addDriverTripLoad({
            id: `trip-load-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            expeditionId: `exp-ps-${approvingPreSale.id.slice(-6)}`,
            gateMovementId: matchedGateMovement?.id || undefined,
            driverName: approvingPreSale.driverName,
            vehiclePlate: approvingPreSale.vehiclePlate || 'FROTA',
            productId: matched.id,
            productName: matched.name,
            initialQty: p.qty,
            currentTruckStock: p.qty,
            unitMeasure: matched.unitMeasure || 'cx',
            attachmentUrl: approvingFileUrl || undefined,
            unit: currentUserUnit,
            status: 'em_viagem',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    updatePreSale(approvingPreSale.id, {
      expeditionApproved: true,
      expeditionApprovedBy: operatorName,
      expeditionApprovedAt: new Date().toISOString(),
      expeditionPhoto: approvingFileUrl,
      expeditionPhotoName: approvingFileName
      // NOT setting isUsed: true so pre-sale remains active in Minha Viagem for delivery
    });

    setApprovingSuccess(`Expedição da Pré-Venda de ${approvingPreSale.clientName} aprovada com sucesso e estoque deduzido!`);
    setApprovingPreSale(null);
    setApprovingFileUrl('');
    setApprovingFileName('');
    setApprovingNotes('');
    setApprovingError('');

    setTimeout(() => setApprovingSuccess(''), 6000);
  };

  // 5. Delete Modal State (Motivo Obrigatório)
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'production' | 'insumo' | 'expedition';
    id: string;
    title: string;
    details: string;
    qtyInfo: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteModalError, setDeleteModalError] = useState<string>('');
  const [deleteGlobalSuccessMsg, setDeleteGlobalSuccessMsg] = useState<string>('');

  const handleOpenDeleteModal = (
    type: 'production' | 'insumo' | 'expedition',
    id: string,
    title: string,
    details: string,
    qtyInfo: string
  ) => {
    setDeleteTarget({ type, id, title, details, qtyInfo });
    setDeleteReason('');
    setDeleteModalError('');
    setDeleteModalOpen(true);
  };

  const handleExecuteDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    if (!deleteReason.trim()) {
      setDeleteModalError('O motivo da exclusão é obrigatório.');
      return;
    }

    if (deleteTarget.type === 'production') {
      deleteDisposableProductionLog(deleteTarget.id);
    } else if (deleteTarget.type === 'insumo') {
      deleteDisposableInsumoEntry(deleteTarget.id);
    } else if (deleteTarget.type === 'expedition') {
      const targetExp = (disposableExpeditions || []).find(e => e.id === deleteTarget.id);
      const exitInfo = checkExpeditionGateExit(targetExp, movements);
      if (exitInfo.exited) {
        setDeleteModalError('Não é mais aceito fazer a exclusão da expedição após o veículo ter saído pela portaria.');
        return;
      }
      deleteDisposableExpedition(deleteTarget.id, deleteReason.trim(), currentUser?.name);
    }

    setDeleteGlobalSuccessMsg(`Lançamento "${deleteTarget.title}" (${deleteTarget.qtyInfo}) foi excluído com sucesso! Motivo registrado: "${deleteReason.trim()}"`);
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteReason('');
    setDeleteModalError('');
    setTimeout(() => setDeleteGlobalSuccessMsg(''), 7000);
  };

  // Filters
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterProductQuery, setFilterProductQuery] = useState<string>('');

  // Combine stored disposableProducts with default products, sanitize units & deduplicate items
  const allProductsCombined = React.useMemo(() => {
    const list = [...(disposableProducts || [])];
    const existingIds = new Set(list.map(p => p.id));
    for (const dp of defaultDisposableProducts) {
      if (!existingIds.has(dp.id)) {
        list.push(dp);
      }
    }

    // 1. Sanitize & normalize unitMeasure and names for consistency
    const sanitized = list.map(p => {
      const pNameLower = p.name.toLowerCase();
      let updated = { ...p };

      // Selo de Alumínio: ALWAYS 'unidades'
      if (p.id === 'disp-insumo-selo200' || pNameLower.includes('selo')) {
        updated.unitMeasure = 'unidades';
        updated.name = updated.name.replace(/\(kg\)/gi, '(Un)').replace(/\(Kg\)/gi, '(Un)');
        if (!updated.name.toLowerCase().includes('(un)')) {
          updated.name = 'Selo / Tampa de Alumínio 200ml (Un)';
        }
      }

      // Fita Adesiva: 'rolos' for sealed rolls, 'metros' for active tape balance
      if (p.id === 'disp-insumo-fita-rolo' || (pNameLower.includes('fita') && (pNameLower.includes('rolo') || p.unitMeasure === 'rolos'))) {
        updated.unitMeasure = 'rolos';
      } else if (p.id === 'disp-insumo-fita' || (pNameLower.includes('fita') && (pNameLower.includes('metro') || p.unitMeasure === 'metros'))) {
        updated.unitMeasure = 'metros';
      }

      // Copos e Caixas: ALWAYS 'unidades'
      if (p.id === 'disp-insumo-copo200' || (pNameLower.includes('copo') && p.category === 'insumo')) {
        updated.unitMeasure = 'unidades';
      }
      if (p.id === 'disp-insumo-cx200' || (pNameLower.includes('caixa') && pNameLower.includes('papelão'))) {
        updated.unitMeasure = 'unidades';
      }

      return updated;
    });

    // 2. Remove duplicate insumos: "Garrafa PET 510ml Vazia" vs "Garrafa PET 510ml Soprada"
    const hasSoprada510 = sanitized.some(p => p.name.toLowerCase().includes('510') && p.name.toLowerCase().includes('soprada'));
    const hasSoprada15l = sanitized.some(p => (p.name.toLowerCase().includes('1,5') || p.name.toLowerCase().includes('1.5')) && p.name.toLowerCase().includes('soprada'));

    const filtered = sanitized.filter(p => {
      const nLower = p.name.toLowerCase();
      // Omit duplicate "vazia" bottles if "soprada" item exists
      if (hasSoprada510 && nLower.includes('510') && nLower.includes('vazia') && !nLower.includes('soprada')) {
        return false;
      }
      if (hasSoprada15l && (nLower.includes('1,5') || nLower.includes('1.5')) && nLower.includes('vazia') && !nLower.includes('soprada')) {
        return false;
      }
      return true;
    });

    return filtered;
  }, [disposableProducts]);

  // Unit filtered products & records
  const unitProducts = allProductsCombined.filter(p => (!p.unit || p.unit === 'matriz' || p.unit === currentUserUnit) && (p.status !== 'inativo'));
  const finishedProducts = unitProducts.filter(p => p.category === 'produto_acabado');
  const insumoProducts = unitProducts.filter(p => p.category === 'insumo');

  // Insumos elegíveis para Entrada de Estoque por fornecedor
  // Garrafas Sopradas (510ml e 1,5L) NÃO entram por fornecedor, pois seu estoque vem do Sopro de Preformas.
  const entryInsumoProducts = insumoProducts.filter(p => {
    const nLower = p.name.toLowerCase();
    const isBlownBottle = p.id === 'disp-insumo-garrafa510-soprada' || 
                          p.id === 'disp-insumo-garrafa15l-soprada' || 
                          (nLower.includes('garrafa') && nLower.includes('soprada')) ||
                          (nLower.includes('garrafa') && !nLower.includes('preforma') && p.category === 'insumo');
    return !isBlownBottle;
  });

  // Specific for Sopro: Preformas (510ml and 1,5L) and Blown Bottles (510ml and 1,5L)
  const soproPreformaProducts = insumoProducts.filter(p => 
    p.name.toLowerCase().includes('preforma')
  );
  const soproGarrafaSopradaProducts = insumoProducts.filter(p => 
    p.name.toLowerCase().includes('soprada') || (p.name.toLowerCase().includes('garrafa') && !p.name.toLowerCase().includes('preforma'))
  );

  const unitProdLogs = (disposableProductionLogs || []).filter(l => (l.unit || 'matriz') === currentUserUnit);
  const unitInsumoEntries = (disposableInsumoEntries || []).filter(e => (e.unit || 'matriz') === currentUserUnit);
  const unitExpeditions = (disposableExpeditions || []).filter(ex => (ex.unit || 'matriz') === currentUserUnit);

  const getRealBoxAvarias = (log: { avariasQty?: number; avariasInsumos?: { qty: number }[] }) => {
    const insSum = (log.avariasInsumos || []).reduce((a, b) => a + (b.qty || 0), 0);
    if (log.avariasQty && insSum > 0 && log.avariasQty === insSum) {
      return 0; // Legacy bug fix: avariasQty previously stored sum of insumo units
    }
    return log.avariasQty || 0;
  };

  // Today metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayProdLogs = unitProdLogs.filter(l => l.date === todayStr);
  const todayProdQtySum = todayProdLogs.reduce((acc, curr) => acc + (curr.qtyProduced || 0), 0);
  const todayAvariasSum = todayProdLogs.reduce((acc, curr) => acc + (curr.avariasInsumos ? curr.avariasInsumos.reduce((a, b) => a + b.qty, 0) : 0) + getRealBoxAvarias(curr), 0);
  const todayExpeditions = unitExpeditions.filter(e => e.date === todayStr);
  const todayExpQtySum = todayExpeditions.reduce((acc, curr) => acc + (curr.qtyExpedited || 0), 0);

  // --- REPORT COMPUTATIONS ---
  const filteredLogsForReports = React.useMemo(() => {
    return unitProdLogs.filter(log => {
      if (reportStartDate && log.date < reportStartDate) return false;
      if (reportEndDate && log.date > reportEndDate) return false;
      if (reportSelectedProduct !== 'todos' && log.productId !== reportSelectedProduct) return false;
      return true;
    });
  }, [unitProdLogs, reportStartDate, reportEndDate, reportSelectedProduct]);

  const filteredExpeditionsForReports = React.useMemo(() => {
    return unitExpeditions.filter(exp => {
      if (reportStartDate && exp.date < reportStartDate) return false;
      if (reportEndDate && exp.date > reportEndDate) return false;
      if (reportSelectedProduct !== 'todos' && exp.productId !== reportSelectedProduct) return false;
      if (reportClientSearch.trim()) {
        const term = reportClientSearch.toLowerCase().trim();
        const matchDest = (exp.destination || exp.clientName || '').toLowerCase().includes(term);
        const matchDoc = (exp.documentRef || '').toLowerCase().includes(term);
        const matchProd = (exp.productName || '').toLowerCase().includes(term);
        if (!matchDest && !matchDoc && !matchProd) return false;
      }
      return true;
    });
  }, [unitExpeditions, reportStartDate, reportEndDate, reportSelectedProduct, reportClientSearch]);

  const reportTotalProduced = React.useMemo(() => {
    return filteredLogsForReports.reduce((acc, log) => acc + (log.qtyProduced || 0), 0);
  }, [filteredLogsForReports]);

  const reportTotalProdAvarias = React.useMemo(() => {
    return filteredLogsForReports.reduce((acc, log) => acc + getRealBoxAvarias(log), 0);
  }, [filteredLogsForReports]);

  const reportTotalGrossProduced = reportTotalProduced + reportTotalProdAvarias;

  const reportGlobalLossRatio = reportTotalGrossProduced > 0 
    ? ((reportTotalProdAvarias / reportTotalGrossProduced) * 100) 
    : 0;

  const reportTotalSalesQty = React.useMemo(() => {
    return filteredExpeditionsForReports.reduce((acc, exp) => acc + (exp.qtyExpedited || 0), 0);
  }, [filteredExpeditionsForReports]);

  // Aggregated Production Summary by Item
  const reportProductionByProductSummary = React.useMemo(() => {
    const map: Record<string, {
      productId: string;
      productName: string;
      qtyProduced: number;
      qtyAvarias: number;
      totalGross: number;
      lossRatio: number;
      logCount: number;
    }> = {};

    for (const log of filteredLogsForReports) {
      if (!map[log.productId]) {
        map[log.productId] = {
          productId: log.productId,
          productName: log.productName,
          qtyProduced: 0,
          qtyAvarias: 0,
          totalGross: 0,
          lossRatio: 0,
          logCount: 0
        };
      }
      const prodQty = log.qtyProduced || 0;
      const avQty = getRealBoxAvarias(log);
      map[log.productId].qtyProduced += prodQty;
      map[log.productId].qtyAvarias += avQty;
      map[log.productId].totalGross += (prodQty + avQty);
      map[log.productId].logCount += 1;
    }

    return Object.values(map).map(item => {
      const ratio = item.totalGross > 0 ? ((item.qtyAvarias / item.totalGross) * 100) : 0;
      return { ...item, lossRatio: ratio };
    }).sort((a, b) => b.qtyProduced - a.qtyProduced);
  }, [filteredLogsForReports]);

  // Aggregate Client Sales Ranking
  const reportClientSalesSummary = React.useMemo(() => {
    const map: Record<string, {
      clientName: string;
      totalQty: number;
      expeditionCount: number;
      productsMap: Record<string, number>;
    }> = {};

    for (const exp of filteredExpeditionsForReports) {
      const rawClient = (exp.destination || exp.clientName || '').trim() || 'Não Especificado / Retirada';
      if (!map[rawClient]) {
        map[rawClient] = {
          clientName: rawClient,
          totalQty: 0,
          expeditionCount: 0,
          productsMap: {}
        };
      }
      map[rawClient].totalQty += exp.qtyExpedited;
      map[rawClient].expeditionCount += 1;
      map[rawClient].productsMap[exp.productName] = (map[rawClient].productsMap[exp.productName] || 0) + exp.qtyExpedited;
    }

    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredExpeditionsForReports]);

  const reportTopClient = reportClientSalesSummary[0];

  // Detailed Loss & Damage Items list
  const reportLossesDetailedList = React.useMemo(() => {
    const list: {
      id: string;
      date: string;
      item: string;
      type: 'produto' | 'insumo';
      qtyLoss: number;
      unitMeasure: string;
      reason: string;
      relatedProduct: string;
      operator: string;
      lossRatioPercentage: number;
    }[] = [];

    for (const log of filteredLogsForReports) {
      const realBoxAv = getRealBoxAvarias(log);
      const logGross = (log.qtyProduced || 0) + realBoxAv;

      // Product damage (finished boxes)
      if (realBoxAv > 0) {
        const pRatio = logGross > 0 ? ((realBoxAv / logGross) * 100) : 0;
        list.push({
          id: `prod-loss-${log.id}`,
          date: log.date,
          item: log.productName,
          type: 'produto',
          qtyLoss: realBoxAv,
          unitMeasure: 'cx/fd',
          reason: log.avariasReason || 'Avaria de Produto Acabado no Envase',
          relatedProduct: log.productName,
          operator: log.operator,
          lossRatioPercentage: pRatio
        });
      }

      // Insumo damages linked to this production run
      if (log.avariasInsumos && log.avariasInsumos.length > 0) {
        let unitsPerPack = 48;
        const pNameLower = (log.productName || '').toLowerCase();
        if (pNameLower.includes('510')) unitsPerPack = 12;
        else if (pNameLower.includes('1,5') || pNameLower.includes('1.5')) unitsPerPack = 6;

        for (const inv of log.avariasInsumos) {
          const totalInsumosRun = (log.qtyProduced || 0) * unitsPerPack;
          const lossRatio = totalInsumosRun > 0 ? Number(((inv.qty / (totalInsumosRun + inv.qty)) * 100).toFixed(2)) : 0;

          list.push({
            id: `insumo-loss-${log.id}-${inv.insumoId}`,
            date: log.date,
            item: inv.insumoName,
            type: 'insumo',
            qtyLoss: inv.qty,
            unitMeasure: 'unidades',
            reason: log.avariasReason || 'Perda / Danificação de Insumo na Linha',
            relatedProduct: log.productName,
            operator: log.operator,
            lossRatioPercentage: lossRatio
          });
        }
      }
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredLogsForReports]);

  // --- HANDLERS ---
  const handleAddInsumoAvaria = () => {
    if (!selectedInsumoAvariaId) return;
    const qty = Number(selectedInsumoAvariaQty);
    if (isNaN(qty) || qty <= 0) return;

    const insumo = insumoProducts.find(i => i.id === selectedInsumoAvariaId);
    if (!insumo) return;

    setProdInsumoAvarias(prev => {
      const existing = prev.find(item => item.insumoId === insumo.id);
      if (existing) {
        return prev.map(item => item.insumoId === insumo.id ? { ...item, qty: item.qty + qty } : item);
      }
      return [...prev, { insumoId: insumo.id, insumoName: insumo.name, qty }];
    });

    setSelectedInsumoAvariaId('');
    setSelectedInsumoAvariaQty('');
  };

  const handleRemoveInsumoAvaria = (insumoId: string) => {
    setProdInsumoAvarias(prev => prev.filter(i => i.insumoId !== insumoId));
  };

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    setProdSuccessMsg('');
    setProdErrorMsg('');

    if (!prodProductId) {
      setProdErrorMsg('Selecione o produto produzido.');
      return;
    }
    const qty = Number(prodQty);
    if (isNaN(qty) || qty <= 0) {
      setProdErrorMsg('Informe uma quantidade válida produzida.');
      return;
    }

    const prod = finishedProducts.find(p => p.id === prodProductId);
    if (!prod) {
      setProdErrorMsg('Produto não encontrado.');
      return;
    }

    const totalInsumoAvarias = prodInsumoAvarias.reduce((acc, curr) => acc + curr.qty, 0);

    addDisposableProductionLog({
      date: prodDate,
      productId: prod.id,
      productName: prod.name,
      qtyProduced: qty,
      avariasQty: Number(prodAvariasQty) || 0,
      avariasInsumos: prodInsumoAvarias,
      avariasReason: prodAvariasReason.trim(),
      operator: operatorName,
      unit: currentUserUnit,
      notes: prodNotes.trim()
    });

    const deductedInsumosSummary: string[] = [];
    const prodNameLower = prod.name.toLowerCase();

    if (prod.id === 'disp-prod-copo200' || prod.id === 'disp-prod-200ml-copo' || prodNameLower.includes('copo') || prodNameLower.includes('200ml')) {
      deductedInsumosSummary.push(`${qty * 48} Copos 200ml`);
      deductedInsumosSummary.push(`${qty * 48} Selos de Alumínio`);
      deductedInsumosSummary.push(`${qty * 1} Caixas de Papelão`);
      deductedInsumosSummary.push(`${qty * 1}m de Fita`);
    } else if (prod.id === 'disp-prod-agua510' || prod.id === 'disp-prod-510ml-garrafa' || prodNameLower.includes('510')) {
      deductedInsumosSummary.push(`${qty * 12} Garrafas 510ml`);
      deductedInsumosSummary.push(`${qty * 12} Tampas 28mm`);
      deductedInsumosSummary.push(`${qty * 12} Rótulos 510ml`);
      deductedInsumosSummary.push(`${(qty * 0.05).toFixed(2)}kg Filme Termoencolhível`);
    } else if (prod.id === 'disp-prod-agua15l' || prod.id === 'disp-prod-15l-garrafa' || prodNameLower.includes('1,5') || prodNameLower.includes('1.5')) {
      deductedInsumosSummary.push(`${qty * 6} Garrafas 1,5L`);
      deductedInsumosSummary.push(`${qty * 6} Tampas 28mm`);
      deductedInsumosSummary.push(`${qty * 6} Rótulos 1,5L`);
      deductedInsumosSummary.push(`${(qty * 0.08).toFixed(2)}kg Filme Termoencolhível`);
    }

    const bomNotice = deductedInsumosSummary.length > 0 
      ? ` Baixa automática em estoque: ${deductedInsumosSummary.join(', ')}.`
      : '';

    setProdSuccessMsg(`Produção de ${qty} ${prod.unitMeasure} de "${prod.name}" registrada com sucesso!${bomNotice} ${prodInsumoAvarias.length > 0 ? `(${totalInsumoAvarias} avarias adicionais deduzidas).` : ''}`);
    setProdQty('');
    setProdInsumoAvarias([]);
    setSelectedInsumoAvariaId('');
    setSelectedInsumoAvariaQty('');
    setProdAvariasReason('');
    setProdNotes('');
    setTimeout(() => setProdSuccessMsg(''), 5000);
  };

  const handleSaveSopro = (e: React.FormEvent) => {
    e.preventDefault();
    setSoproSuccessMsg('');
    setSoproErrorMsg('');

    if (!soproPreformaId || !soproGarrafaSopradaId) {
      setSoproErrorMsg('Selecione a preforma de origem e a garrafa soprada de destino.');
      return;
    }

    const qtyProduced = Number(soproQtyProduced);
    const avarias = Number(soproQtyAvarias) || 0;
    const qtyUsed = soproQtyUsed !== '' ? Number(soproQtyUsed) : (qtyProduced + avarias);

    if (isNaN(qtyUsed) || qtyUsed <= 0) {
      setSoproErrorMsg('Informe uma quantidade válida de preformas utilizadas.');
      return;
    }
    if (isNaN(qtyProduced) || qtyProduced < 0) {
      setSoproErrorMsg('Informe uma quantidade válida de garrafas sopradas produzidas.');
      return;
    }

    const preformaItem = insumoProducts.find(p => p.id === soproPreformaId);
    const garrafaItem = insumoProducts.find(p => p.id === soproGarrafaSopradaId);

    if (!preformaItem || !garrafaItem) {
      setSoproErrorMsg('Insumos de sopro não encontrados no cadastro.');
      return;
    }

    // Deduct preformas from stock (Total = Garrafas boas + preformas avariadas)
    const newPreformaStock = Math.max(0, (preformaItem.currentStock || 0) - qtyUsed);
    updateDisposableStockLevel(preformaItem.id, newPreformaStock);

    // Register log as entry (which adds qtyProduced to garrafaItem stock once)
    addDisposableInsumoEntry({
      date: soproDate,
      insumoId: garrafaItem.id,
      insumoName: garrafaItem.name,
      qtyReceived: qtyProduced,
      supplier: `Sopradora Interna (${preformaItem.name})`,
      documentRef: `Sopro: -${qtyUsed} preformas / +${qtyProduced} garrafas (${avarias} avarias)`,
      operator: operatorName,
      unit: currentUserUnit,
      notes: `Sopro ${garrafaItem.name}: Total ${qtyUsed} preformas utilizadas (${qtyProduced} garrafas boas geradas + ${avarias} preformas avariadas/refugo). ${soproNotes.trim()}`
    });

    setSoproSuccessMsg(`Processo de sopro registrado com sucesso! ${qtyUsed} preformas de "${preformaItem.name}" saíram do estoque (${qtyProduced} garrafas boas e ${avarias} preformas avariadas/refugo).`);
    setSoproQtyUsed('');
    setSoproQtyProduced('');
    setSoproQtyAvarias('');
    setSoproNotes('');
    setTimeout(() => setSoproSuccessMsg(''), 5000);
  };

  const handleInsumoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setInsumoErrorMsg('O arquivo do comprovante/NF deve ser menor que 8MB.');
      return;
    }

    setInsumoAttachmentName(file.name);
    setInsumoAttachmentLoading(true);

    const reader = new FileReader();
    reader.onload = () => {
      setInsumoAttachmentUrl(reader.result as string);
      setInsumoAttachmentLoading(false);
    };
    reader.onerror = () => {
      setInsumoErrorMsg('Falha ao processar arquivo anexado.');
      setInsumoAttachmentLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleViewAttachment = (url: string, name: string, id?: string) => {
    let finalUrl = url;
    if ((!finalUrl || finalUrl === '') && id) {
      const photos = getMovementPhotos(id);
      if (photos && photos.attachmentUrl) {
        finalUrl = photos.attachmentUrl;
      }
    }
    setViewAttachmentUrl(finalUrl || '');
    setViewAttachmentName(name);
    setViewAttachmentModalOpen(true);
  };

  const handleSaveInsumoEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setInsumoSuccessMsg('');
    setInsumoErrorMsg('');

    if (!insumoId) {
      setInsumoErrorMsg('Selecione o insumo recebido.');
      return;
    }
    const qty = Number(insumoQty);
    if (isNaN(qty) || qty <= 0) {
      setInsumoErrorMsg('Informe uma quantidade válida recebida.');
      return;
    }

    const insumo = insumoProducts.find(p => p.id === insumoId);
    if (!insumo) {
      setInsumoErrorMsg('Insumo não encontrado.');
      return;
    }

    const nLower = insumo.name.toLowerCase();
    if (insumo.id === 'disp-insumo-garrafa510-soprada' || insumo.id === 'disp-insumo-garrafa15l-soprada' || (nLower.includes('garrafa') && nLower.includes('soprada'))) {
      setInsumoErrorMsg('Garrafas sopradas não recebem entrada de fornecedor. O estoque é gerado exclusivamente pelo Sopro de Preformas.');
      return;
    }

    addDisposableInsumoEntry({
      date: insumoDate,
      insumoId: insumo.id,
      insumoName: insumo.name,
      qtyReceived: qty,
      supplier: insumoSupplier.trim(),
      documentRef: insumoDocRef.trim(),
      operator: operatorName,
      unit: currentUserUnit,
      notes: insumoNotes.trim(),
      attachmentUrl: insumoAttachmentUrl || undefined,
      attachmentName: insumoAttachmentName || undefined
    });

    setInsumoSuccessMsg(`Entrada de ${qty} ${insumo.unitMeasure} do insumo "${insumo.name}" adicionada ao estoque com sucesso!${insumoAttachmentName ? ' (Comprovante NF/Pedido anexado)' : ''}`);
    setInsumoQty('');
    setInsumoSupplier('');
    setInsumoDocRef('');
    setInsumoNotes('');
    setInsumoAttachmentUrl('');
    setInsumoAttachmentName('');
    setTimeout(() => setInsumoSuccessMsg(''), 5000);
  };

  const handleExpeditionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setExpErrorMsg('O arquivo/foto do pedido deve ser menor que 8MB.');
      return;
    }

    setExpAttachmentName(file.name);
    setExpAttachmentLoading(true);

    const reader = new FileReader();
    reader.onload = () => {
      setExpAttachmentUrl(reader.result as string);
      setExpAttachmentLoading(false);
      setExpErrorMsg('');
    };
    reader.onerror = () => {
      setExpErrorMsg('Falha ao processar arquivo anexado.');
      setExpAttachmentLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGateMovementSelect = (movId: string) => {
    setExpGateMovementId(movId);
    if (movId) {
      const mov = movements.find(m => m.id === movId);
      if (mov) {
        setExpDriverName(mov.driver || 'Não informado');
        setExpVehiclePlate((mov.plate || '').toUpperCase());

        // Se houver cliente pré-vinculado ao veículo na entrada da portaria
        if (mov.client && mov.client.trim()) {
          const clientNameTrimmed = mov.client.trim();
          const existing = (registeredClients || []).find(c => c.name.toLowerCase() === clientNameTrimmed.toLowerCase());
          if (existing) {
            setExpSelectedClientId(existing.id);
            setExpNewClientName('');
          } else {
            setExpSelectedClientId('new');
            setExpNewClientName(clientNameTrimmed);
          }
        } else {
          // Se não houver cliente vinculado ao veículo, o operador deverá informar o cliente
          setExpSelectedClientId('');
          setExpNewClientName('');
        }
      }
    } else {
      setExpDriverName('');
      setExpVehiclePlate('');
      setExpSelectedClientId('');
      setExpNewClientName('');
    }
  };

  const handleSaveExpedition = (e: React.FormEvent) => {
    e.preventDefault();
    setExpSuccessMsg('');
    setExpErrorMsg('');

    // 1. Mandatory Photo Check
    if (!expAttachmentUrl || !expAttachmentUrl.trim()) {
      setExpErrorMsg('A foto do pedido é OBRIGATÓRIA para realizar a expedição.');
      return;
    }

    // 2. Product Check
    if (!expProductId) {
      setExpErrorMsg('Selecione o produto expedido.');
      return;
    }
    const qty = Number(expQty);
    if (isNaN(qty) || qty <= 0) {
      setExpErrorMsg('Informe uma quantidade válida expedida.');
      return;
    }

    const prod = finishedProducts.find(p => p.id === expProductId);
    if (!prod) {
      setExpErrorMsg('Produto não encontrado.');
      return;
    }

    // 3. Client Check (Pre-registered or Simple Registration)
    let clientName = '';
    let clientId = '';

    if (expSelectedClientId === 'new') {
      if (!expNewClientName.trim()) {
        setExpErrorMsg('Informe o nome do novo cliente no cadastro simples.');
        return;
      }
      const newNameTrimmed = expNewClientName.trim();
      const existing = (registeredClients || []).find(c => c.name.toLowerCase() === newNameTrimmed.toLowerCase());
      if (existing) {
        clientId = existing.id;
        clientName = existing.name;
      } else {
        const newClient = {
          id: `client-${Date.now()}`,
          name: newNameTrimmed,
          unit: currentUserUnit
        };
        addRegisteredClient(newClient);
        clientId = newClient.id;
        clientName = newClient.name;
      }
    } else if (expSelectedClientId) {
      const selectedClient = (registeredClients || []).find(c => c.id === expSelectedClientId);
      if (selectedClient) {
        clientId = selectedClient.id;
        clientName = selectedClient.name;
      }
    } else {
      setExpErrorMsg('Selecione um cliente cadastrado ou realize o cadastro simples do novo cliente.');
      return;
    }

    // 4. Driver & Vehicle Check (MUST be strictly from vehicles currently in the company yard)
    if (!expGateMovementId) {
      setExpErrorMsg('Selecione obrigatoriamente a placa de um veículo presente no pátio da empresa.');
      return;
    }

    const gateMov = (movements || []).find(m => m.id === expGateMovementId && m.status !== 'saida');
    if (!gateMov) {
      setExpErrorMsg('O veículo selecionado não se encontra mais no pátio da empresa (saída já registrada na Portaria).');
      return;
    }

    const driverName = gateMov.driver || expDriverName || 'Motorista Não Informado';
    const vehiclePlate = (gateMov.plate || expVehiclePlate).toUpperCase();

    if (!vehiclePlate) {
      setExpErrorMsg('Placa de veículo inválida para o registro de expedição.');
      return;
    }

    if (prod.currentStock < qty) {
      if (!confirm(`Atenção: O estoque atual de "${prod.name}" é de ${prod.currentStock} ${prod.unitMeasure}. Deseja expedir ${qty} assim mesmo (ficará com saldo negativo)?`)) {
        return;
      }
    }

    const destinationSummary = `Cliente: ${clientName} | Mot: ${driverName} (${vehiclePlate})`;

    addDisposableExpedition({
      date: expDate,
      productId: prod.id,
      productName: prod.name,
      qtyExpedited: qty,
      destination: destinationSummary,
      clientId,
      clientName,
      driverName,
      vehiclePlate,
      gateMovementId: expGateMovementId || undefined,
      documentRef: expDocRef.trim(),
      attachmentUrl: expAttachmentUrl,
      attachmentName: expAttachmentName || 'foto_pedido.jpg',
      operator: operatorName,
      unit: currentUserUnit,
      notes: expNotes.trim()
    });

    // Se o veículo for próprio (ownerType === 'proprio' ou type === 'empresa'), gera Pré-Venda no Caminhão do Motorista Próprio
    const isProprietaryVehicle = gateMov.ownerType === 'proprio' || (gateMov as any).type === 'empresa';
    if (isProprietaryVehicle) {
      const newTripLoad: import('../types').DriverTripLoad = {
        id: `trip-load-${Date.now()}`,
        expeditionId: `exp-${Date.now()}`,
        gateMovementId: gateMov.id,
        driverName,
        vehiclePlate,
        productId: prod.id,
        productName: prod.name,
        initialQty: qty,
        currentTruckStock: qty,
        unitMeasure: prod.unitMeasure,
        attachmentUrl: expAttachmentUrl,
        unit: currentUserUnit,
        status: 'em_viagem',
        timestamp: new Date().toISOString()
      };
      addDriverTripLoad(newTripLoad);
    }

    setExpSuccessMsg(`Expedição de ${qty} ${prod.unitMeasure} de "${prod.name}" para "${clientName}" registrada com sucesso e deduzida do estoque!` + (isProprietaryVehicle ? ' (Carga alocada no estoque do caminhão para Pré-Venda)' : ''));
    
    // Reset form
    setExpQty('');
    setExpProductId('');
    setExpSelectedClientId('');
    setExpNewClientName('');
    setExpGateMovementId('');
    setExpDriverName('');
    setExpVehiclePlate('');
    setExpDocRef('');
    setExpNotes('');
    setExpAttachmentUrl('');
    setExpAttachmentName('');
    setTimeout(() => setExpSuccessMsg(''), 5000);
  };

  const fitaRoloStock = React.useMemo(() => {
    const item = insumoProducts.find(p => p.id === 'disp-insumo-fita-rolo' || (p.name.toLowerCase().includes('fita') && (p.unitMeasure === 'rolos' || p.name.toLowerCase().includes('rolo'))));
    return item ? item.currentStock : 0;
  }, [insumoProducts]);

  const fitaMetroStock = React.useMemo(() => {
    const item = insumoProducts.find(p => p.id === 'disp-insumo-fita' || (p.name.toLowerCase().includes('fita') && (p.unitMeasure === 'metros' || p.name.toLowerCase().includes('metro'))));
    return item ? item.currentStock : 0;
  }, [insumoProducts]);

  // Pre-select Cartucho / Fita Insumo based on selected target
  React.useEffect(() => {
    if (cartuchoTarget === 'fita') {
      const match = insumoProducts.find(p => p.id === 'disp-insumo-fita-rolo' || (p.name.toLowerCase().includes('fita') && (p.unitMeasure === 'rolos' || p.name.toLowerCase().includes('rolo'))));
      if (match) setCartuchoInsumoId(match.id);
    } else {
      const match = insumoProducts.find(p => p.id === 'disp-insumo-cartucho-datadora' || p.name.toLowerCase().includes('cartucho') || p.name.toLowerCase().includes('datadora'));
      if (match) setCartuchoInsumoId(match.id);
    }
  }, [insumoProducts, cartuchoTarget]);

  const handleSaveCartuchoWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setCartuchoSuccessMsg('');
    setCartuchoErrorMsg('');

    const qty = Number(cartuchoQty);
    if (isNaN(qty) || qty <= 0) {
      setCartuchoErrorMsg('Informe uma quantidade válida para a baixa.');
      return;
    }

    if (cartuchoTarget === 'fita') {
      const fitaInsumo = insumoProducts.find(p => p.id === cartuchoInsumoId || p.id === 'disp-insumo-fita-rolo' || (p.name.toLowerCase().includes('fita') && p.unitMeasure === 'rolos'));
      if (!fitaInsumo) {
        setCartuchoErrorMsg('Selecione a fita adesiva (rolos) cadastrada nos insumos.');
        return;
      }

      if ((fitaInsumo.currentStock || 0) < qty) {
        if (!confirm(`Atenção: O estoque atual de "${fitaInsumo.name}" é de ${fitaInsumo.currentStock} rolo(s). Deseja realizar a baixa de ${qty} rolo(s) assim mesmo?`)) {
          return;
        }
      }

      addDisposableInsumoEntry({
        date: cartuchoDate,
        insumoId: fitaInsumo.id,
        insumoName: fitaInsumo.name,
        qtyReceived: -qty, // negative quantity indicates manual withdrawal
        supplier: 'Baixa Manual Fita Adesiva (Caixas)',
        documentRef: '[BAIXA FITA]',
        operator: operatorName,
        unit: currentUserUnit,
        notes: `Baixa manual de ${qty} rolo(s) de fita. Convertido em +${qty * 1200} metros de fita em uso para fechamento de caixas. ${cartuchoNotes.trim()}`
      });

      setCartuchoSuccessMsg(`Baixa de ${qty} rolo(s) de fita adesiva realizada com sucesso! Foram convertidos e adicionados +${(qty * 1200).toLocaleString('pt-BR')} metros ao saldo de fita em uso para produção de caixas.`);
      setCartuchoQty(1);
      setCartuchoNotes('');
      setTimeout(() => setCartuchoSuccessMsg(''), 6000);
      return;
    }

    // Cartucho
    const targetLabel = cartuchoTarget === 'copos' ? 'Datadora de Copos (Água Copo 200ml)' : 'Datadora de Caixas (Embalagens / Fardos)';
    const cartInsumo = insumoProducts.find(p => p.id === cartuchoInsumoId || p.name.toLowerCase().includes('cartucho') || p.name.toLowerCase().includes('datadora'));
    if (!cartInsumo) {
      setCartuchoErrorMsg('Selecione o cartucho de tinta cadastrado nos insumos.');
      return;
    }

    if ((cartInsumo.currentStock || 0) < qty) {
      if (!confirm(`Atenção: O estoque atual de "${cartInsumo.name}" é de ${cartInsumo.currentStock} un. Deseja realizar a baixa de ${qty} un. assim mesmo?`)) {
        return;
      }
    }

    addDisposableInsumoEntry({
      date: cartuchoDate,
      insumoId: cartInsumo.id,
      insumoName: cartInsumo.name,
      qtyReceived: -qty,
      supplier: `Baixa Manual Cartucho (${cartuchoTarget === 'copos' ? 'Datadora de Copos' : 'Datadora de Caixas'})`,
      documentRef: cartuchoTarget === 'copos' ? '[CARTUCHO COPOS]' : '[CARTUCHO CAIXAS]',
      operator: operatorName,
      unit: currentUserUnit,
      notes: `Baixa manual de ${qty} cartucho(s) para uso na ${targetLabel}. ${cartuchoNotes.trim()}`
    });

    setCartuchoSuccessMsg(`Baixa de ${qty} cartucho(s) para ${targetLabel} realizada com sucesso! O contador de rendimento desta datadora foi iniciado a partir de ${cartuchoDate.split('-').reverse().join('/')}.`);
    setCartuchoQty(1);
    setCartuchoNotes('');
    setTimeout(() => setCartuchoSuccessMsg(''), 6000);
  };

  // --- YIELD CALCULATIONS FOR DATADORA CARTRIDGES ---
  // 1. Datadora de Copos
  const latestCartuchoCoposEntry = React.useMemo(() => {
    return unitInsumoEntries.find(e => {
      const docRef = (e.documentRef || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const supp = (e.supplier || '').toLowerCase();
      return docRef.includes('copos') || notes.includes('datadora de copos') || supp.includes('datadora de copos') || docRef.includes('[cartucho copos]');
    });
  }, [unitInsumoEntries]);

  const coposProductionOnCurrentCartridge = React.useMemo(() => {
    if (!latestCartuchoCoposEntry) {
      const sumCaixas = unitProdLogs
        .filter(l => l.productId === 'disp-prod-200ml-copo' || l.productName.toLowerCase().includes('copo'))
        .reduce((acc, l) => acc + l.qtyProduced, 0);
      return { caixas: sumCaixas, copos: sumCaixas * 48, installDate: null, operator: null };
    }

    const startDate = latestCartuchoCoposEntry.date;
    const sumCaixas = unitProdLogs
      .filter(l => (l.productId === 'disp-prod-200ml-copo' || l.productName.toLowerCase().includes('copo')) && l.date >= startDate)
      .reduce((acc, l) => acc + l.qtyProduced, 0);

    return {
      caixas: sumCaixas,
      copos: sumCaixas * 48,
      installDate: startDate,
      operator: latestCartuchoCoposEntry.operator
    };
  }, [latestCartuchoCoposEntry, unitProdLogs]);

  // 2. Datadora de Caixas (Exclusiva da Linha de Copos 200ml)
  const latestCartuchoCaixasEntry = React.useMemo(() => {
    return unitInsumoEntries.find(e => {
      const docRef = (e.documentRef || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const supp = (e.supplier || '').toLowerCase();
      return docRef.includes('caixas') || notes.includes('datadora de caixas') || supp.includes('datadora de caixas') || docRef.includes('[cartucho caixas]');
    });
  }, [unitInsumoEntries]);

  const caixasProductionOnCurrentCartridge = React.useMemo(() => {
    const isCopoLog = (l: any) => l.productId === 'disp-prod-200ml-copo' || l.productName.toLowerCase().includes('copo');
    if (!latestCartuchoCaixasEntry) {
      const sumCaixas = unitProdLogs
        .filter(isCopoLog)
        .reduce((acc, l) => acc + l.qtyProduced, 0);
      return { caixas: sumCaixas, installDate: null, operator: null };
    }

    const startDate = latestCartuchoCaixasEntry.date;
    const sumCaixas = unitProdLogs
      .filter(l => isCopoLog(l) && l.date >= startDate)
      .reduce((acc, l) => acc + l.qtyProduced, 0);

    return {
      caixas: sumCaixas,
      installDate: startDate,
      operator: latestCartuchoCaixasEntry.operator
    };
  }, [latestCartuchoCaixasEntry, unitProdLogs]);

  const cartuchoEntriesList = React.useMemo(() => {
    return unitInsumoEntries.filter(e => {
      const docRef = (e.documentRef || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const supp = (e.supplier || '').toLowerCase();
      const name = (e.insumoName || '').toLowerCase();
      return (
        docRef.includes('cartucho') || notes.includes('cartucho') || supp.includes('cartucho') || name.includes('cartucho') || name.includes('datadora') ||
        docRef.includes('fita') || docRef.includes('[baixa fita]') || supp.includes('fita') || name.includes('fita')
      );
    });
  }, [unitInsumoEntries]);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const linkedProd = finishedProducts.find(p => p.id === newProductLinkedProductId);

    addDisposableProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      unit: currentUserUnit,
      currentStock: Number(newProductInitialStock) || 0,
      minStock: Number(newProductMinStock) || 10,
      unitMeasure: newProductUnitMeasure.trim() || (newProductCategory === 'produto_acabado' ? 'caixas' : 'unidades'),
      status: 'ativo',
      linkedProductId: newProductCategory === 'insumo' ? (newProductLinkedProductId || undefined) : undefined,
      linkedProductName: newProductCategory === 'insumo' ? (linkedProd?.name || (newProductLinkedProductId === 'todos' ? 'Todos os Produtos Acabados' : undefined)) : undefined,
      consumptionRate: newProductCategory === 'insumo' ? (Number(newProductConsumptionRate) || 0) : undefined
    });

    setNewProductName('');
    setNewProductCategory('produto_acabado');
    setNewProductUnitMeasure('caixas');
    setNewProductMinStock(10);
    setNewProductInitialStock(0);
    setNewProductLinkedProductId('');
    setNewProductConsumptionRate('');
    setShowAddProductModal(false);
  };

  const handleSaveStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProductId || stockAdjustNewQty === '') return;

    updateDisposableStockLevel(stockAdjustProductId, Number(stockAdjustNewQty));
    setShowStockAdjustModal(false);
    setStockAdjustProductId('');
    setStockAdjustNewQty('');
  };

  // --- MOVIMENTAÇÕES DE ESTOQUE (EXTRATO COMPLETO) MEMOIZED DATA ---
  const allStockMovements = React.useMemo(() => {
    const list: {
      id: string;
      date: string;
      timestamp: string;
      itemType: 'produto_acabado' | 'insumo';
      itemId?: string;
      itemName: string;
      unitMeasure: string;
      type: 'entrada' | 'saida';
      qtyInput: number;
      qtyOutput: number;
      origin: string;
      supplier: string;
      destination: string;
      forWho: string;
      withWho: string;
      operator: string;
      documentRef: string;
      notes?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      currentStock: number;
    }[] = [];

    // A) Insumo Entries and Baixas
    unitInsumoEntries.forEach(e => {
      const isEntry = e.qtyReceived > 0;
      const ins = unitProducts.find(p => p.id === e.insumoId || p.name === e.insumoName);
      const currentStock = ins ? ins.currentStock : 0;
      const unitMeasure = ins ? ins.unitMeasure : 'unidades';

      list.push({
        id: `insumo-entry-${e.id}`,
        date: e.date,
        timestamp: e.timestamp || `${e.date}T10:00:00`,
        itemType: 'insumo',
        itemId: e.insumoId,
        itemName: e.insumoName,
        unitMeasure,
        type: isEntry ? 'entrada' : 'saida',
        qtyInput: isEntry ? e.qtyReceived : 0,
        qtyOutput: !isEntry ? Math.abs(e.qtyReceived) : 0,
        origin: isEntry 
          ? (e.supplier ? `Fornecedor: ${e.supplier}` : 'Entrada de Insumos')
          : 'Almoxarifado / Estoque de Insumos',
        supplier: e.supplier || '-',
        destination: isEntry 
          ? 'Almoxarifado / Estoque' 
          : (e.supplier || e.notes || 'Datadora / Uso em Produção'),
        forWho: isEntry ? 'Estoque Interno' : (e.supplier || 'Linha de Produção'),
        withWho: e.operator || '-',
        operator: e.operator || 'Operador',
        documentRef: e.documentRef || '-',
        notes: e.notes || '',
        attachmentUrl: e.attachmentUrl,
        attachmentName: e.attachmentName,
        currentStock
      });
    });

    // B) Production Logs
    unitProdLogs.forEach(l => {
      const prod = unitProducts.find(p => p.id === l.productId || p.name === l.productName);
      const currentStock = prod ? prod.currentStock : 0;
      const unitMeasure = prod ? prod.unitMeasure : 'caixas';
      const qtyProduced = Number(l.qtyProduced) || 0;
      const prodNameLower = (l.productName || '').toLowerCase();
      const pId = l.productId;

      // Finished Product Entry (+)
      if (qtyProduced > 0) {
        list.push({
          id: `prod-entry-${l.id}`,
          date: l.date,
          timestamp: l.timestamp || `${l.date}T12:00:00`,
          itemType: 'produto_acabado',
          itemId: l.productId,
          itemName: l.productName,
          unitMeasure,
          type: 'entrada',
          qtyInput: qtyProduced,
          qtyOutput: 0,
          origin: 'Linha de Produção / Envase',
          supplier: 'Produção Própria',
          destination: 'Estoque de Produtos Acabados',
          forWho: 'Estoque Central',
          withWho: l.operator || '-',
          operator: l.operator || 'Operador',
          documentRef: `[PRODUÇÃO ${l.date.split('-').reverse().join('/')}]`,
          notes: l.notes || '',
          currentStock
        });
      }

      // Insumos Usados / Consumidos para Gerar o Produto Acabado (-)
      if (qtyProduced > 0) {
        const deductedInsumoIds = new Set<string>();
        const consumedInsumosList: {
          insumo: typeof unitProducts[0];
          qtyConsumed: number;
          formulaInfo: string;
        }[] = [];

        if (pId === 'disp-prod-200ml-copo' || pId === 'disp-prod-copo200' || prodNameLower.includes('copo') || prodNameLower.includes('200ml')) {
          const copoItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-copo200' || (i.name.toLowerCase().includes('copo') && !i.name.toLowerCase().includes('caixa'))));
          if (copoItem) {
            consumedInsumosList.push({ insumo: copoItem, qtyConsumed: qtyProduced * 48, formulaInfo: '48 copos por caixa' });
            deductedInsumoIds.add(copoItem.id);
          }

          const seloItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-selo200' || i.name.toLowerCase().includes('selo')));
          if (seloItem) {
            consumedInsumosList.push({ insumo: seloItem, qtyConsumed: qtyProduced * 48, formulaInfo: '48 selos por caixa' });
            deductedInsumoIds.add(seloItem.id);
          }

          const caixaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-cx200' || (i.name.toLowerCase().includes('caixa') && (i.name.toLowerCase().includes('copo') || i.name.toLowerCase().includes('papelão')))));
          if (caixaItem) {
            consumedInsumosList.push({ insumo: caixaItem, qtyConsumed: qtyProduced * 1, formulaInfo: '1 caixa de papelão por caixa' });
            deductedInsumoIds.add(caixaItem.id);
          }

          const fitaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-fita' || (i.name.toLowerCase().includes('fita') && !i.name.toLowerCase().includes('rolo') && (i.unitMeasure === 'metros' || i.name.toLowerCase().includes('metro')))));
          if (fitaItem) {
            consumedInsumosList.push({ insumo: fitaItem, qtyConsumed: qtyProduced * 1, formulaInfo: '1 metro de fita por caixa' });
            deductedInsumoIds.add(fitaItem.id);
          }
        } else if (pId === 'disp-prod-510ml-garrafa' || pId === 'disp-prod-agua510' || prodNameLower.includes('510')) {
          const garrafaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-garrafa510-soprada' || (i.name.toLowerCase().includes('garrafa') && i.name.toLowerCase().includes('510'))));
          if (garrafaItem) {
            consumedInsumosList.push({ insumo: garrafaItem, qtyConsumed: qtyProduced * 12, formulaInfo: '12 garrafas 510ml por fardo' });
            deductedInsumoIds.add(garrafaItem.id);
          }

          const tampaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-tampa28' || i.name.toLowerCase().includes('tampa')));
          if (tampaItem) {
            consumedInsumosList.push({ insumo: tampaItem, qtyConsumed: qtyProduced * 12, formulaInfo: '12 tampas por fardo' });
            deductedInsumoIds.add(tampaItem.id);
          }

          const rotuloItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-rotulo510' || (i.name.toLowerCase().includes('rótulo') && i.name.toLowerCase().includes('510'))));
          if (rotuloItem) {
            consumedInsumosList.push({ insumo: rotuloItem, qtyConsumed: qtyProduced * 12, formulaInfo: '12 rótulos por fardo' });
            deductedInsumoIds.add(rotuloItem.id);
          }

          const filmeItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-filme' || i.name.toLowerCase().includes('filme')));
          if (filmeItem) {
            consumedInsumosList.push({ insumo: filmeItem, qtyConsumed: Number((qtyProduced * 0.05).toFixed(2)), formulaInfo: '0,05kg filme por fardo' });
            deductedInsumoIds.add(filmeItem.id);
          }
        } else if (pId === 'disp-prod-15l-garrafa' || pId === 'disp-prod-agua15l' || prodNameLower.includes('1,5') || prodNameLower.includes('1.5')) {
          const garrafaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-garrafa15l-soprada' || (i.name.toLowerCase().includes('garrafa') && (i.name.toLowerCase().includes('1,5') || i.name.toLowerCase().includes('1.5')))));
          if (garrafaItem) {
            consumedInsumosList.push({ insumo: garrafaItem, qtyConsumed: qtyProduced * 6, formulaInfo: '6 garrafas 1,5L por fardo' });
            deductedInsumoIds.add(garrafaItem.id);
          }

          const tampaItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-tampa28' || i.name.toLowerCase().includes('tampa')));
          if (tampaItem) {
            consumedInsumosList.push({ insumo: tampaItem, qtyConsumed: qtyProduced * 6, formulaInfo: '6 tampas por fardo' });
            deductedInsumoIds.add(tampaItem.id);
          }

          const rotuloItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-rotulo15l' || (i.name.toLowerCase().includes('rótulo') && (i.name.toLowerCase().includes('1,5') || i.name.toLowerCase().includes('1.5')))));
          if (rotuloItem) {
            consumedInsumosList.push({ insumo: rotuloItem, qtyConsumed: qtyProduced * 6, formulaInfo: '6 rótulos por fardo' });
            deductedInsumoIds.add(rotuloItem.id);
          }

          const filmeItem = unitProducts.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-filme' || i.name.toLowerCase().includes('filme')));
          if (filmeItem) {
            consumedInsumosList.push({ insumo: filmeItem, qtyConsumed: Number((qtyProduced * 0.08).toFixed(2)), formulaInfo: '0,08kg filme por fardo' });
            deductedInsumoIds.add(filmeItem.id);
          }
        }

        // Custom Linked Insumos com taxa de consumo personalizada
        unitProducts.forEach(insumo => {
          if (insumo.category === 'insumo' && insumo.consumptionRate && insumo.consumptionRate > 0) {
            if (deductedInsumoIds.has(insumo.id)) return;

            const isLinked = insumo.linkedProductId === pId ||
                             insumo.linkedProductId === 'todos' ||
                             (insumo.linkedProductName && prodNameLower.includes(insumo.linkedProductName.toLowerCase()));
            if (isLinked) {
              consumedInsumosList.push({
                insumo,
                qtyConsumed: qtyProduced * insumo.consumptionRate,
                formulaInfo: `${insumo.consumptionRate} ${insumo.unitMeasure} por ${prod ? prod.unitMeasure : 'un'}`
              });
            }
          }
        });

        // Registrar saída de cada insumo utilizado na produção
        consumedInsumosList.forEach((consumed, idx) => {
          if (consumed.qtyConsumed > 0) {
            list.push({
              id: `prod-insumo-bom-${l.id}-${consumed.insumo.id}-${idx}`,
              date: l.date,
              timestamp: l.timestamp || `${l.date}T12:00:01`,
              itemType: 'insumo',
              itemId: consumed.insumo.id,
              itemName: consumed.insumo.name,
              unitMeasure: consumed.insumo.unitMeasure || 'unidades',
              type: 'saida',
              qtyInput: 0,
              qtyOutput: consumed.qtyConsumed,
              origin: 'Almoxarifado / Estoque de Insumos',
              supplier: '-',
              destination: `Linha de Produção / Envase (${l.productName})`,
              forWho: `Transformado em Produto Acabado: ${qtyProduced} ${prod ? prod.unitMeasure : 'cx/fd'} de ${l.productName}`,
              withWho: l.operator || '-',
              operator: l.operator || 'Operador',
              documentRef: `[USO PRODUÇÃO: ${l.productName}]`,
              notes: `Consumo na fabricação de ${qtyProduced} ${prod ? prod.unitMeasure : 'cx/fd'} de ${l.productName} (${consumed.formulaInfo}).`,
              currentStock: consumed.insumo.currentStock
            });
          }
        });
      }

      // Finished Product Avarias (-)
      const realAvarias = getRealBoxAvarias(l);
      if (realAvarias > 0) {
        list.push({
          id: `prod-avaria-${l.id}`,
          date: l.date,
          timestamp: l.timestamp || `${l.date}T12:05:00`,
          itemType: 'produto_acabado',
          itemId: l.productId,
          itemName: l.productName,
          unitMeasure,
          type: 'saida',
          qtyInput: 0,
          qtyOutput: realAvarias,
          origin: 'Linha de Produção / Envase',
          supplier: '-',
          destination: `Descarte / Avaria (${l.avariasReason || 'Perda na linha'})`,
          forWho: 'Descarte / Refugo',
          withWho: l.operator || '-',
          operator: l.operator || 'Operador',
          documentRef: '[AVARIA PRODUÇÃO]',
          notes: l.avariasReason || '',
          currentStock
        });
      }

      // Insumo Avarias (-)
      (l.avariasInsumos || []).forEach((ins, idx) => {
        if (ins.qty > 0) {
          const insProd = unitProducts.find(p => p.id === ins.insumoId || p.name === ins.insumoName);
          list.push({
            id: `insumo-avaria-${l.id}-${idx}`,
            date: l.date,
            timestamp: l.timestamp || `${l.date}T12:10:00`,
            itemType: 'insumo',
            itemId: ins.insumoId,
            itemName: ins.insumoName,
            unitMeasure: insProd ? insProd.unitMeasure : 'unidades',
            type: 'saida',
            qtyInput: 0,
            qtyOutput: ins.qty,
            origin: 'Almoxarifado / Estoque de Insumos',
            supplier: '-',
            destination: `Linha de Produção (${l.productName})`,
            forWho: `Uso em Produção / Quebra (${l.productName})`,
            withWho: l.operator || '-',
            operator: l.operator || 'Operador',
            documentRef: '[AVARIA INSUMO]',
            notes: l.avariasReason ? `Avaria / Quebra: ${l.avariasReason}` : 'Avaria / Quebra de insumo no envase',
            currentStock: insProd ? insProd.currentStock : 0
          });
        }
      });
    });

    // C) Expeditions
    unitExpeditions.forEach(ex => {
      const prod = unitProducts.find(p => p.id === ex.productId || p.name === ex.productName);
      const currentStock = prod ? prod.currentStock : 0;
      const unitMeasure = prod ? prod.unitMeasure : 'caixas';

      const clientStr = ex.clientName || ex.destination || 'Cliente Venda';
      const driverStr = ex.driverName ? `${ex.driverName}${ex.vehiclePlate ? ` (${ex.vehiclePlate})` : ''}` : (ex.destination || '-');

      list.push({
        id: `expedition-${ex.id}`,
        date: ex.date,
        timestamp: ex.date + 'T14:00:00',
        itemType: 'produto_acabado',
        itemId: ex.productId,
        itemName: ex.productName,
        unitMeasure,
        type: 'saida',
        qtyInput: 0,
        qtyOutput: ex.qtyExpedited,
        origin: 'Estoque de Produtos Acabados',
        supplier: '-',
        destination: `Cliente: ${clientStr}`,
        forWho: clientStr,
        withWho: driverStr,
        operator: ex.operator || 'Operador',
        documentRef: ex.documentRef || '[PEDIDO/EXPEDIÇÃO]',
        attachmentUrl: ex.attachmentUrl,
        notes: ex.notes || '',
        currentStock
      });
    });

    // D) Manual Adjustments
    (manualStockAdjustments || [])
      .filter(a => !a.unit || a.unit === currentUserUnit)
      .forEach(adj => {
        const prod = unitProducts.find(p => p.name === adj.product || p.id === adj.product);
        const isEntry = adj.type === 'entrada';
        const currentStock = prod ? prod.currentStock : 0;

        list.push({
          id: `manual-adj-${adj.id}`,
          date: adj.timestamp.split('T')[0],
          timestamp: adj.timestamp,
          itemType: prod ? prod.category : 'produto_acabado',
          itemId: prod?.id,
          itemName: adj.product,
          unitMeasure: prod ? prod.unitMeasure : 'unidades',
          type: adj.type,
          qtyInput: isEntry ? adj.qty : 0,
          qtyOutput: !isEntry ? adj.qty : 0,
          origin: isEntry ? 'Ajuste Manual (+)' : 'Estoque Central',
          supplier: '-',
          destination: isEntry ? 'Estoque Central' : `Ajuste Manual (-)`,
          forWho: isEntry ? 'Estoque' : (adj.reason || 'Ajuste Manual'),
          withWho: adj.operator || '-',
          operator: adj.operator || 'Operador',
          documentRef: '[AJUSTE MANUAL ESTOQUE]',
          notes: adj.reason,
          currentStock
        });
      });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [unitInsumoEntries, unitProdLogs, unitExpeditions, manualStockAdjustments, unitProducts, currentUserUnit]);

  const filteredStockMovements = React.useMemo(() => {
    return allStockMovements.filter(m => {
      if (movTypeFilter !== 'todos' && m.type !== movTypeFilter) return false;
      if (movCategoryFilter !== 'todos' && m.itemType !== movCategoryFilter) return false;
      if (movItemFilter !== 'todos' && m.itemId !== movItemFilter && m.itemName !== movItemFilter) return false;
      if (movStartDate && m.date < movStartDate) return false;
      if (movEndDate && m.date > movEndDate) return false;
      if (movSearchQuery.trim()) {
        const q = movSearchQuery.toLowerCase().trim();
        const matchName = m.itemName.toLowerCase().includes(q);
        const matchSupp = m.supplier.toLowerCase().includes(q);
        const matchFor = m.forWho.toLowerCase().includes(q);
        const matchWith = m.withWho.toLowerCase().includes(q);
        const matchDest = m.destination.toLowerCase().includes(q);
        const matchOrig = m.origin.toLowerCase().includes(q);
        const matchDoc = m.documentRef.toLowerCase().includes(q);
        const matchOp = m.operator.toLowerCase().includes(q);
        const matchNotes = (m.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchSupp && !matchFor && !matchWith && !matchDest && !matchOrig && !matchDoc && !matchOp && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [allStockMovements, movTypeFilter, movCategoryFilter, movItemFilter, movStartDate, movEndDate, movSearchQuery]);

  const movTotalInputs = React.useMemo(() => {
    return filteredStockMovements.filter(m => m.type === 'entrada').reduce((acc, m) => acc + m.qtyInput, 0);
  }, [filteredStockMovements]);

  const movTotalOutputs = React.useMemo(() => {
    return filteredStockMovements.filter(m => m.type === 'saida').reduce((acc, m) => acc + m.qtyOutput, 0);
  }, [filteredStockMovements]);

  const selectedFilteredItem = React.useMemo(() => {
    if (movItemFilter === 'todos') return null;
    return unitProducts.find(p => p.id === movItemFilter || p.name === movItemFilter);
  }, [unitProducts, movItemFilter]);

  // Filtered lists
  const filteredProdLogs = unitProdLogs.filter(l => {
    if (filterStartDate && l.date < filterStartDate) return false;
    if (filterEndDate && l.date > filterEndDate) return false;
    if (filterProductQuery) {
      const q = filterProductQuery.toLowerCase();
      return l.productName.toLowerCase().includes(q) || (l.operator || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredInsumoEntries = unitInsumoEntries.filter(e => {
    if (e.qtyReceived <= 0 || (e.documentRef || '').toLowerCase().includes('baixa')) return false;
    if (filterStartDate && e.date < filterStartDate) return false;
    if (filterEndDate && e.date > filterEndDate) return false;
    if (filterProductQuery) {
      const q = filterProductQuery.toLowerCase();
      return e.insumoName.toLowerCase().includes(q) || (e.supplier || '').toLowerCase().includes(q) || (e.documentRef || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredExpeditions = unitExpeditions.filter(ex => {
    if (filterStartDate && ex.date < filterStartDate) return false;
    if (filterEndDate && ex.date > filterEndDate) return false;
    if (filterProductQuery) {
      const q = filterProductQuery.toLowerCase();
      return ex.productName.toLowerCase().includes(q) || (ex.destination || '').toLowerCase().includes(q) || (ex.documentRef || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      {!isReportView && (
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Unidade {currentUserUnit === 'filial' ? 'Filial' : 'Matriz'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Operação de Descartáveis
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
                <PackageCheck className="text-blue-400" size={28} /> Gestão da Linha Descartável
              </h1>
              <p className="text-slate-300 text-xs mt-1 max-w-3xl">
                Controle exclusivo da produção de água descartável (Copo 200ml, Garrafas 510ml e 1,5L). Registre entradas de insumos, reporte produção e avarias diárias, faça a expedição de produtos acabados e acompanhe os saldos do estoque.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('estoque')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <Boxes size={16} /> Ver Estoque
              </button>
            </div>
          </div>

          {/* Today Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Produção de Hoje</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{todayProdQtySum} <span className="text-xs font-normal text-slate-300">cx/fd</span></span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Avarias de Hoje</span>
              <span className="text-xl font-black text-rose-400 font-mono mt-0.5 block">{todayAvariasSum} <span className="text-xs font-normal text-slate-300">un/cx</span></span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Expedições Hoje</span>
              <span className="text-xl font-black text-blue-400 font-mono mt-0.5 block">{todayExpQtySum} <span className="text-xs font-normal text-slate-300">cx/fd</span></span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Produtos Acabados</span>
              <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">{finishedProducts.length} <span className="text-xs font-normal text-slate-300">cadastrados</span></span>
            </div>
          </div>
        </div>
      )}

      {deleteGlobalSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-4 rounded-2xl font-bold flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="shrink-0 text-emerald-600" />
            <span>{deleteGlobalSuccessMsg}</span>
          </div>
          <button onClick={() => setDeleteGlobalSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm overflow-x-auto">
        {!isReportView && (
          <>
            <button
              onClick={() => setActiveTab('producao')}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'producao'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers size={16} /> Envase & Avarias
            </button>

            <button
              onClick={() => setActiveTab('sopro')}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'sopro'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <RefreshCw size={16} /> Sopro de Preformas (Sopradora)
            </button>

            <button
              onClick={() => setActiveTab('insumos')}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'insumos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={16} /> Entrada de Insumos
            </button>

            <button
              onClick={() => setActiveTab('cartuchos')}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'cartuchos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Printer size={16} /> Cartuchos / Datadora
            </button>

            <button
              onClick={() => setActiveTab('expedicao')}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'expedicao'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Truck size={16} /> Expedição de Produtos Acabados
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('estoque')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'estoque'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Boxes size={16} /> {isReportView ? 'Estoque & Saldos (Visualização)' : 'Estoque & Saldos'}
        </button>

        <button
          onClick={() => setActiveTab('movimentacoes')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'movimentacoes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight size={16} /> Extrato de Movimentações
        </button>

        <button
          onClick={() => setActiveTab('relatorios')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'relatorios'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={16} /> Relatórios & Analytics
        </button>
      </div>

      {/* --- TAB 1: PRODUÇÃO & AVARIAS DIÁRIAS --- */}
      {activeTab === 'producao' && (
        <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          {/* Form */}
          {!isReadOnly && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Informar Produção Diária</h3>
                <p className="text-[11px] text-slate-500">Alimenta automaticamente o estoque do produto acabado</p>
              </div>
            </div>

            {prodSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                <span>{prodSuccessMsg}</span>
              </div>
            )}

            {prodErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{prodErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduction} className="space-y-3.5">
              {/* Tape rule notice */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <Info size={14} className="text-indigo-600 shrink-0" />
                  <span>Consumo Proporcional de Fita Adesiva:</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Entrada em <b>Rolos de 1.200m</b>. Cada caixa embalada consome <b>0,5m (50cm)</b> de fita. 
                  (2 rolos na máquina = 2.400m = 4.800 caixas embaláveis).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Produção</label>
                <input
                  type="date"
                  value={prodDate}
                  onChange={(e) => setProdDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Produto Descartável Produzido</label>
                <select
                  value={prodProductId}
                  onChange={(e) => setProdProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione o Produto --</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque Atual: {p.currentStock} {p.unitMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd Produzida (Acabado)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 500"
                  value={prodQty}
                  onChange={(e) => setProdQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-emerald-700"
                  required
                />
              </div>

              {/* Dynamic BOM preview card */}
              {prodProductId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Boxes size={14} className="text-blue-600" />
                      <span>Baixa Automática em Estoque de Insumos (BOM):</span>
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Qtd: {prodQty || 1} {finishedProducts.find(p => p.id === prodProductId)?.unitMeasure || 'un'}
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc font-medium">
                    {(() => {
                      const selectedProd = finishedProducts.find(p => p.id === prodProductId);
                      if (!selectedProd) return null;
                      const pName = selectedProd.name.toLowerCase();
                      const mult = Number(prodQty) || 1;

                      if (selectedProd.id === 'disp-prod-copo200' || pName.includes('copo') || pName.includes('200ml')) {
                        return (
                          <>
                            <li><b>{mult * 48} un</b> de Copos Plásticos 200ml (48 copos/caixa)</li>
                            <li><b>{mult * 48} un</b> de Selos de Alumínio 200ml (48 selos/caixa)</li>
                            <li><b>{mult * 1} un</b> de Caixa de Papelão 200ml (1 cx/caixa)</li>
                            <li><b>{(mult * 0.5).toFixed(1)}m</b> de Fita Adesiva (50cm/caixa = {((mult * 0.5) / 1200).toFixed(3)} rolo de 1.200m)</li>
                          </>
                        );
                      } else if (selectedProd.id === 'disp-prod-agua510' || pName.includes('510')) {
                        return (
                          <>
                            <li><b>{mult * 12} un</b> de Garrafas PET 510ml Sopradas (12 garrafas/fardo)</li>
                            <li><b>{mult * 12} un</b> de Tampas Plásticas 28mm (12 tampas/fardo)</li>
                            <li><b>{mult * 12} un</b> de Rótulos 510ml (12 rótulos/fardo)</li>
                            <li><b>{(mult * 0.05).toFixed(2)}kg</b> de Filme Plástico Termoencolhível</li>
                          </>
                        );
                      } else if (selectedProd.id === 'disp-prod-agua15l' || pName.includes('1,5') || pName.includes('1.5')) {
                        return (
                          <>
                            <li><b>{mult * 6} un</b> de Garrafas PET 1,5L Sopradas (6 garrafas/fardo)</li>
                            <li><b>{mult * 6} un</b> de Tampas Plásticas 28mm (6 tampas/fardo)</li>
                            <li><b>{mult * 6} un</b> de Rótulos 1,5L (6 rótulos/fardo)</li>
                            <li><b>{(mult * 0.08).toFixed(2)}kg</b> de Filme Plástico Termoencolhível</li>
                          </>
                        );
                      }
                      return <li>Consumo de insumos cadastrados para este produto.</li>;
                    })()}
                  </ul>
                </div>
              )}

              {/* Avarias por Insumo (Copos, Selos, Caixas, Fita, Rótulos, etc.) */}
              <div className="border border-rose-200 bg-rose-50/30 p-3 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
                    <AlertTriangle size={13} /> Avarias / Perdas por Insumo
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Lança perda por item</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedInsumoAvariaId}
                      onChange={(e) => setSelectedInsumoAvariaId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                    >
                      <option value="">-- Selecione Insumo --</option>
                      {insumoProducts.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={selectedInsumoAvariaQty}
                      onChange={(e) => setSelectedInsumoAvariaQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white text-rose-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddInsumoAvaria}
                      className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      + Incluir
                    </button>
                  </div>
                </div>

                {prodInsumoAvarias.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-rose-800 uppercase">Insumos Danificados no Lote:</span>
                    <div className="space-y-1">
                      {prodInsumoAvarias.map((item) => (
                        <div key={item.insumoId} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-900 shadow-2xs">
                          <span>{item.insumoName}: <span className="font-mono text-rose-700">{item.qty} un/kg</span></span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInsumoAvaria(item.insumoId)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo / Observações de Avarias</label>
                <input
                  type="text"
                  placeholder="Ex: Copo trincado na selagem, caixa amassada, rolo de fita com defeito..."
                  value={prodAvariasReason}
                  onChange={(e) => setProdAvariasReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações Gerais / Lote</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Produção do turno da manhã, lote 2026-07..."
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle size={16} /> Confirmar & Alimentar Estoque
                </button>
              </div>
            </form>
          </div>
          )}

          {/* History List */}
          <div className={isReportView ? "w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" : "lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <History size={18} className="text-blue-600" /> Histórico de Produção & Avarias
                </h3>
                <p className="text-[11px] text-slate-500">Registros diários da linha descartável</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Pesquisar produto ou operador..."
                  value={filterProductQuery}
                  onChange={(e) => setFilterProductQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredProdLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum registro de produção encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Produzido</th>
                      <th className="p-3 text-right">Avarias</th>
                      <th className="p-3">Operador / Motivo</th>
                      {!isReadOnly && <th className="p-3 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProdLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                          {log.date.split('-').reverse().join('/')}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {log.productName}
                          {log.notes && <p className="text-[10px] text-slate-400 font-normal">{log.notes}</p>}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                          +{log.qtyProduced}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {getRealBoxAvarias(log) > 0 ? `-${getRealBoxAvarias(log)} cx/fd` : (log.avariasInsumos && log.avariasInsumos.length > 0 ? '' : '-')}
                          {log.avariasInsumos && log.avariasInsumos.length > 0 && (
                            <div className="text-[10px] text-rose-700 font-sans font-medium text-right mt-0.5 space-y-0.5">
                              {log.avariasInsumos.map((av, idx) => (
                                <div key={idx}>{av.insumoName}: {av.qty} un/kg</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <span className="font-bold text-slate-800">{log.operator}</span>
                          {log.avariasReason && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Motivo Avaria: {log.avariasReason}</p>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenDeleteModal(
                                'production',
                                log.id,
                                log.productName,
                                `Data: ${log.date.split('-').reverse().join('/')} | Operador: ${log.operator}`,
                                `Produção: ${log.qtyProduced}`
                              )}
                              title="Excluir Lançamento (Exige Motivo)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 1B: SOPRO DE PREFORMAS (SOPRADORA) --- */}
      {activeTab === 'sopro' && (
        <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          {/* Form */}
          {!isReadOnly && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <RefreshCw size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Sopro de Preformas (Sopradora)</h3>
                <p className="text-[11px] text-slate-500">Transformação de Preforma PET em Garrafa Soprada Vazia</p>
              </div>
            </div>

            {/* Visual Process Flow Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] space-y-2">
              <span className="font-black text-slate-700 uppercase block text-[10px] tracking-wider">Fluxo do Sopro:</span>
              <div className="flex items-center justify-between text-slate-600 font-bold bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-rose-700 font-mono">- Preforma</span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="text-blue-700">Sopradora</span>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="text-emerald-700 font-mono">+ Garrafa Soprada</span>
              </div>
              <p className="text-slate-500 text-[10px]">
                A quantidade de preformas informada será deduzida do estoque e as garrafas sopradas serão adicionadas automaticamente.
              </p>
            </div>

            {soproSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                <span>{soproSuccessMsg}</span>
              </div>
            )}

            {soproErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{soproErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSopro} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Operação</label>
                <input
                  type="date"
                  value={soproDate}
                  onChange={(e) => setSoproDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preforma de Origem (Matéria-Prima: 510ml / 1,5L)</label>
                <select
                  value={soproPreformaId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setSoproPreformaId(selectedId);
                    const item = soproPreformaProducts.find(p => p.id === selectedId);
                    if (item) {
                      const nameLower = item.name.toLowerCase();
                      if (nameLower.includes('510')) {
                        const match = soproGarrafaSopradaProducts.find(p => p.name.toLowerCase().includes('510'));
                        if (match) setSoproGarrafaSopradaId(match.id);
                      } else if (nameLower.includes('1,5') || nameLower.includes('1.5')) {
                        const match = soproGarrafaSopradaProducts.find(p => p.name.toLowerCase().includes('1,5') || p.name.toLowerCase().includes('1.5'));
                        if (match) setSoproGarrafaSopradaId(match.id);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione a Preforma (510ml ou 1,5L) --</option>
                  {soproPreformaProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque Atual: {p.currentStock} {p.unitMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garrafa Soprada Produzida (Destino: 510ml / 1,5L)</label>
                <select
                  value={soproGarrafaSopradaId}
                  onChange={(e) => setSoproGarrafaSopradaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione a Garrafa Soprada --</option>
                  {soproGarrafaSopradaProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque Atual: {p.currentStock} {p.unitMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garrafas Sopradas Boas</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 980"
                    value={soproQtyProduced}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSoproQtyProduced(val);
                      if (val !== '' && soproQtyAvarias !== '') {
                        setSoproQtyUsed(Number(val) + Number(soproQtyAvarias));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Avarias / Refugo Preforma
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 20"
                    value={soproQtyAvarias}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSoproQtyAvarias(val);
                      if (soproQtyProduced !== '') {
                        setSoproQtyUsed(Number(soproQtyProduced) + (val === '' ? 0 : Number(val)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Preformas Saídas do Estoque</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 1000"
                  value={soproQtyUsed}
                  onChange={(e) => setSoproQtyUsed(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-rose-700 bg-slate-50"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Subtrai {soproQtyUsed || 0} preformas do estoque ({soproQtyProduced || 0} garrafas boas + {soproQtyAvarias || 0} refugo/avarias).
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações do Sopro</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Regulagem de temperatura da sopradora na troca de lote..."
                  value={soproNotes}
                  onChange={(e) => setSoproNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={16} /> Confirmar & Registrar Sopro
                </button>
              </div>
            </form>
          </div>
          )}

          {/* Cards & Stock Levels for Sopro Material */}
          <div className={isReportView ? "w-full space-y-6" : "lg:col-span-2 space-y-6"}>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Boxes size={18} className="text-indigo-600" /> Painel de Estoque: Preformas vs. Garrafas Sopradas
              </h3>
              <p className="text-[11px] text-slate-500">
                Saldos atuais dos insumos da sopradora para planejamento da produção.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {insumoProducts.filter(p => p.name.toLowerCase().includes('preforma') || p.name.toLowerCase().includes('soprada')).map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{p.name}</span>
                      <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                        {p.currentStock.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">{p.unitMeasure}</span>
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl ${p.currentStock < p.minStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.currentStock < p.minStock ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 1C: CARTUCHOS DA DATADORA & FITA ADESIVA (BAIXA MANUAL & RENDIMENTO) --- */}
      {activeTab === 'cartuchos' && (
        <div className="space-y-6">
          {/* Informational Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30 shrink-0">
                <Printer size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wide">Controle de Cartuchos, Datadoras & Fita Adesiva (Caixas 200ml)</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  A baixa dos cartuchos e da fita adesiva é realizada <strong>manualmente</strong>. Cada rolo de fita dado baixa se transforma em <strong>1.200 metros em uso</strong>, e cada caixa produzida reduz 1 metro automaticamente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-mono font-bold rounded-lg">
                2 Datadoras + Fita Adesiva
              </span>
            </div>
          </div>

          {/* Yield & Stock Monitor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Datadora de Copos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Datadora dos Copos (200ml)</h3>
                    <p className="text-[11px] text-slate-500">Impressão de data/lote na borda dos copos</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full border border-blue-200">
                  Cartucho #1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Data da Última Troca</span>
                  <span className="text-xs font-black text-slate-800 font-mono mt-0.5 block">
                    {coposProductionOnCurrentCartridge.installDate
                      ? coposProductionOnCurrentCartridge.installDate.split('-').reverse().join('/')
                      : 'Nenhuma troca'}
                  </span>
                  {coposProductionOnCurrentCartridge.operator && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">Op: {coposProductionOnCurrentCartridge.operator}</span>
                  )}
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Produção</span>
                  <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
                    {coposProductionOnCurrentCartridge.caixas.toLocaleString('pt-BR')} <span className="text-xs font-bold text-emerald-800">cx</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    ({coposProductionOnCurrentCartridge.copos.toLocaleString('pt-BR')} copos)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Datadora de Caixas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Datadora das Caixas (200ml)</h3>
                    <p className="text-[11px] text-slate-500">Impressão nas caixas de papelão 200ml</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full border border-indigo-200">
                  Cartucho #2
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Data da Última Troca</span>
                  <span className="text-xs font-black text-slate-800 font-mono mt-0.5 block">
                    {caixasProductionOnCurrentCartridge.installDate
                      ? caixasProductionOnCurrentCartridge.installDate.split('-').reverse().join('/')
                      : 'Nenhuma troca'}
                  </span>
                  {caixasProductionOnCurrentCartridge.operator && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">Op: {caixasProductionOnCurrentCartridge.operator}</span>
                  )}
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Produção</span>
                  <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
                    {caixasProductionOnCurrentCartridge.caixas.toLocaleString('pt-BR')} <span className="text-xs font-bold text-emerald-800">cx 200ml</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    (Exclusivo caixas)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Fita Adesiva (Caixas) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Box size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">Fita Adesiva para Caixas</h3>
                    <p className="text-[11px] text-slate-500">1 rolo = 1.200m | 1m = 1 caixa</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200">
                  Empacotamento
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Rolos no Estoque</span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                    {fitaRoloStock.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-slate-500">rolos</span>
                  </span>
                </div>

                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Saldo de Fita em Uso</span>
                  <span className="text-lg font-black text-amber-700 font-mono mt-0.5 block">
                    {fitaMetroStock.toLocaleString('pt-BR')} <span className="text-xs font-bold text-amber-800">m</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                    (Suporta até {fitaMetroStock.toLocaleString('pt-BR')} caixas)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
            {/* Form */}
            {!isReadOnly && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    {cartuchoTarget === 'fita' ? 'Baixa Manual de Fita Adesiva' : 'Baixa Manual de Cartucho'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {cartuchoTarget === 'fita'
                      ? 'Retirada de rolos do estoque e conversão para metros'
                      : 'Informe a retirada do estoque ao colocar na datadora'}
                  </p>
                </div>
              </div>

              {cartuchoSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                  <span>{cartuchoSuccessMsg}</span>
                </div>
              )}

              {cartuchoErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                  <span>{cartuchoErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveCartuchoWithdrawal} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destino da Baixa / Finalidade</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCartuchoTarget('copos')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        cartuchoTarget === 'copos'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="block font-black text-slate-900 text-[11px]">Datadora Copos</span>
                      <span className="text-[9px] text-slate-500 font-normal">Datadora #1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCartuchoTarget('caixas')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        cartuchoTarget === 'caixas'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="block font-black text-slate-900 text-[11px]">Datadora Caixas</span>
                      <span className="text-[9px] text-slate-500 font-normal">Datadora #2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCartuchoTarget('fita')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        cartuchoTarget === 'fita'
                          ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="block font-black text-slate-900 text-[11px]">Fita Adesiva</span>
                      <span className="text-[9px] text-amber-700 font-normal">Rolo (1.200m)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data da Retirada / Baixa</label>
                  <input
                    type="date"
                    value={cartuchoDate}
                    onChange={(e) => setCartuchoDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {cartuchoTarget === 'fita' ? 'Item Fita (Rolos) no Estoque' : 'Item Cartucho no Estoque'}
                  </label>
                  <select
                    value={cartuchoInsumoId}
                    onChange={(e) => setCartuchoInsumoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                    required
                  >
                    <option value="">-- Selecione o Insumo --</option>
                    {insumoProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Estoque Atual: {p.currentStock} {p.unitMeasure})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {cartuchoTarget === 'fita' ? 'Quantidade de Rolos Retirados' : 'Quantidade Retirada (Unidades)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 1"
                    value={cartuchoQty}
                    onChange={(e) => setCartuchoQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-900"
                    required
                  />
                  {cartuchoTarget === 'fita' && (
                    <p className="text-[10px] text-amber-700 font-medium mt-1">
                      💡 Ao dar baixa em {Number(cartuchoQty) || 0} rolo(s), serão adicionados automaticamente +{((Number(cartuchoQty) || 0) * 1200).toLocaleString('pt-BR')} metros de fita em uso.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações / Motivo da Troca</label>
                  <textarea
                    rows={2}
                    placeholder={
                      cartuchoTarget === 'fita'
                        ? 'Ex: Baixa de 1 rolo para nova esteira de empacotamento'
                        : 'Ex: Cartucho anterior esgotou. Instalado novo cartucho lote #842'
                    }
                    value={cartuchoNotes}
                    onChange={(e) => setCartuchoNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {cartuchoTarget === 'fita' ? (
                      <>
                        <Box size={16} /> Confirmar Baixa do Rolo (+1.200m)
                      </>
                    ) : (
                      <>
                        <Printer size={16} /> Confirmar Baixa Manual do Cartucho
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            )}

            {/* Log Table */}
            <div className={isReportView ? "w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" : "lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <History size={18} className="text-blue-600" /> Histórico de Baixas (Cartuchos & Fita)
                  </h3>
                  <p className="text-[11px] text-slate-500">Registros das saídas manuais de cartuchos para datadoras e rolos de fita para caixas</p>
                </div>
              </div>

              {cartuchoEntriesList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum registro de baixa de cartucho ou fita encontrado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Destino / Operação</th>
                        <th className="p-3">Item Insumo</th>
                        <th className="p-3 text-right">Qtd Saída</th>
                        <th className="p-3">Operador</th>
                        {!isReadOnly && <th className="p-3 text-center">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {cartuchoEntriesList.map((e) => {
                        const isFita = e.documentRef === '[BAIXA FITA]' || (e.supplier || '').toLowerCase().includes('fita') || (e.insumoName || '').toLowerCase().includes('fita');
                        const qtyAbs = Math.abs(e.qtyReceived);

                        return (
                          <tr key={e.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                              {e.date.split('-').reverse().join('/')}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{e.supplier || 'Datadora'}</span>
                              <span className={`text-[10px] font-mono font-bold ${isFita ? 'text-amber-600' : 'text-blue-600'}`}>
                                {e.documentRef}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-800">
                              {e.insumoName}
                              {e.notes && <p className="text-[10px] text-slate-400 font-normal">{e.notes}</p>}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600 text-sm whitespace-nowrap">
                              -{qtyAbs} {isFita ? 'rolo(s)' : 'un'}
                              {isFita && (
                                <span className="block text-[10px] text-amber-700 font-bold">
                                  (+{(qtyAbs * 1200).toLocaleString('pt-BR')}m)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                              {e.operator}
                            </td>
                            {!isReadOnly && (
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenDeleteModal(
                                    'insumo',
                                    e.id,
                                    e.insumoName,
                                    `Baixa ${isFita ? 'Fita' : 'Cartucho'} - Data: ${e.date.split('-').reverse().join('/')} | Destino: ${e.supplier || 'Datadora'}`,
                                    `Quantidade: ${qtyAbs} ${isFita ? 'rolo(s)' : 'un'}`
                                  )}
                                  title="Excluir Registro (Exige Motivo)"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ENTRADA DE INSUMOS --- */}
      {activeTab === 'insumos' && (
        <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          {/* Form */}
          {!isReadOnly && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ArrowDownRight size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Entrada de Insumos</h3>
                <p className="text-[11px] text-slate-500">Recebimento de embalagens, copos, caixas, selos e bobinas</p>
              </div>
            </div>

            {insumoSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                <span>{insumoSuccessMsg}</span>
              </div>
            )}

            {insumoErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{insumoErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveInsumoEntry} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Recebimento</label>
                <input
                  type="date"
                  value={insumoDate}
                  onChange={(e) => setInsumoDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Insumo de Produção</label>
                <select
                  value={insumoId}
                  onChange={(e) => setInsumoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione o Insumo --</option>
                  {entryInsumoProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque Atual: {p.currentStock} {p.unitMeasure})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  💡 <strong>Nota:</strong> Garrafas Sopradas (510ml e 1,5L) não recebem entrada manual por fornecedor, pois seu estoque é gerado exclusivamente a partir do <strong>Sopro de Preformas</strong>.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade Recebida</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 5000"
                  value={insumoQty}
                  onChange={(e) => setInsumoQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-blue-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fornecedor / Origem</label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagens SP"
                    value={insumoSupplier}
                    onChange={(e) => setInsumoSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Nota Fiscal / Doc</label>
                  <input
                    type="text"
                    placeholder="Ex: NF 1234"
                    value={insumoDocRef}
                    onChange={(e) => setInsumoDocRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Lote de caixas entregue pela transportadora..."
                  value={insumoNotes}
                  onChange={(e) => setInsumoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Comprovante / Foto NF ou Pedido</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/80 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 text-xs font-bold cursor-pointer transition">
                    <Paperclip size={16} />
                    <span>{insumoAttachmentName ? 'Substituir Anexo' : 'Anexar Foto da NF ou Pedido'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleInsumoFileChange}
                      className="hidden"
                    />
                  </label>

                  {insumoAttachmentLoading && (
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Lendo arquivo...
                    </span>
                  )}

                  {insumoAttachmentName && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold">
                      <span className="truncate max-w-[200px] flex items-center gap-1.5">
                        <FileText size={14} className="shrink-0 text-emerald-600" />
                        {insumoAttachmentName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInsumoAttachmentUrl('');
                          setInsumoAttachmentName('');
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remover anexo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowDownRight size={16} /> Confirmar & Dar Entrada no Estoque
                </button>
              </div>
            </form>
          </div>
          )}

          {/* History List */}
          <div className={isReportView ? "w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" : "lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <History size={18} className="text-blue-600" /> Histórico de Entradas de Insumos
                </h3>
                <p className="text-[11px] text-slate-500">Registros de insumos recebidos no estoque</p>
              </div>
            </div>

            {filteredInsumoEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum registro de entrada de insumos encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Insumo</th>
                      <th className="p-3 text-right">Qtd Entrou</th>
                      <th className="p-3">Fornecedor / Doc</th>
                      <th className="p-3 text-center">Comprovante</th>
                      <th className="p-3">Operador</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredInsumoEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                          {e.date.split('-').reverse().join('/')}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {e.insumoName}
                          {e.notes && <p className="text-[10px] text-slate-400 font-normal">{e.notes}</p>}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700 text-sm">
                          +{e.qtyReceived}
                        </td>
                        <td className="p-3 text-slate-600">
                          {e.supplier || '-'} {e.documentRef && <span className="text-[10px] text-slate-400 block font-mono">({e.documentRef})</span>}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {(e.attachmentUrl || (e as any).hasAttachment) ? (
                            <button
                              type="button"
                              onClick={() => handleViewAttachment(e.attachmentUrl || '', e.attachmentName || e.documentRef || 'Comprovante_NF', e.id)}
                              className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                              title="Visualizar Comprovante / Foto da NF"
                            >
                              <Paperclip size={12} />
                              <span className="max-w-[90px] truncate">{e.attachmentName || 'Ver NF'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 font-semibold">
                          {e.operator}
                        </td>
                        {!isReadOnly && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenDeleteModal(
                                'insumo',
                                e.id,
                                e.insumoName,
                                `Entrada Insumo - Data: ${e.date.split('-').reverse().join('/')} | Fornecedor: ${e.supplier || '-'}`,
                                `Quantidade: +${e.qtyReceived}`
                              )}
                              title="Excluir Entrada (Exige Motivo)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: EXPEDIÇÃO DE PRODUTOS ACABADOS --- */}
      {activeTab === 'expedicao' && (
        <div className={isReadOnly ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>

          {/* Banner / Success notification for Pre-Sale Expedition Approval */}
          {!isReadOnly && approvingSuccess && (
            <div className="lg:col-span-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                <span>{approvingSuccess}</span>
              </div>
              <button onClick={() => setApprovingSuccess('')} className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer">
                <X size={16} />
              </button>
            </div>
          )}

          {/* PENDING DRIVER PRE-SALES FOR DISPOSABLE PRODUCTS */}
          {!isReadOnly && (
            <div className="lg:col-span-3 bg-slate-900 p-5 rounded-2xl shadow-md text-white space-y-4 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Gestão de Pré-Vendas (Linha Descartável)
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Controle total das pré-vendas de descartáveis lançadas pelos motoristas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreSalesTab('pendentes')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      preSalesTab === 'pendentes'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span>Pendentes</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      preSalesTab === 'pendentes' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {pendingPreSalesDescartavel.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreSalesTab('expedidas')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      preSalesTab === 'expedidas'
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span>Aprovadas / Expedidas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      preSalesTab === 'expedidas' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {approvedPreSalesDescartavel.length}
                    </span>
                  </button>
                </div>
              </div>

              {preSalesTab === 'pendentes' ? (
                pendingPreSalesDescartavel.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-slate-300 text-xs font-medium">
                    Nenhuma pré-venda de descartáveis pendente para aprovação no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pendingPreSalesDescartavel.map(ps => {
                      const dispProducts = ps.products.filter(p => {
                        const pt = (p.productType || '').toLowerCase();
                        const pn = (p.productName || '').toLowerCase();
                        return (
                          pt === 'agua_copo' ||
                          pt === 'garrafa510' ||
                          pt === 'garrafa15l' ||
                          pn.includes('copo') ||
                          pn.includes('510') ||
                          pn.includes('1,5') ||
                          pn.includes('descart') ||
                          pn.includes('fardo') ||
                          pn.includes('cx c/')
                        );
                      });

                      return (
                        <div key={ps.id} className="bg-white text-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="text-xs font-black text-slate-900 truncate max-w-[170px]">{ps.clientName}</div>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                #{ps.id.slice(-6).toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
                              <User size={13} className="text-blue-600 shrink-0" />
                              <span>Motorista: <strong className="text-slate-800">{ps.driverName}</strong></span>
                            </div>

                            <div className="text-[10px] text-slate-400 font-medium">
                              Lançado em: {new Date(ps.timestamp).toLocaleString('pt-BR')}
                            </div>

                            <div className="pt-1 border-t border-slate-100 space-y-1">
                              <div className="text-[10px] font-black text-slate-500 uppercase">Produtos Descartáveis:</div>
                              {dispProducts.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded-md font-bold text-slate-800">
                                  <span>
                                    {p.productType === 'agua_copo' ? 'Água Copo 200ml' :
                                     p.productType === 'garrafa510' ? 'Água Garrafa 510ml' :
                                     p.productType === 'garrafa15l' ? 'Água Garrafa 1,5L' :
                                     p.productName || p.productType}
                                  </span>
                                  <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{p.qty} cx/fd</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setApprovingPreSale(ps);
                              setApprovingFileUrl('');
                              setApprovingFileName('');
                              setApprovingNotes('');
                              setApprovingError('');
                            }}
                            className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle size={15} /> Aprovar Expedição & Anexar Pedido
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                approvedPreSalesDescartavel.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-slate-300 text-xs font-medium">
                    Nenhuma pré-venda de descartáveis expedida até o momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {approvedPreSalesDescartavel.map(ps => {
                      const dispProducts = ps.products.filter(p => {
                        const pt = (p.productType || '').toLowerCase();
                        const pn = (p.productName || '').toLowerCase();
                        return (
                          pt === 'agua_copo' ||
                          pt === 'garrafa510' ||
                          pt === 'garrafa15l' ||
                          pn.includes('copo') ||
                          pn.includes('510') ||
                          pn.includes('1,5') ||
                          pn.includes('descart') ||
                          pn.includes('fardo') ||
                          pn.includes('cx c/')
                        );
                      });

                      return (
                        <div key={ps.id} className="bg-white text-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="text-xs font-black text-slate-900 truncate max-w-[170px]">{ps.clientName}</div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                ps.isUsed ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {ps.isUsed ? 'Entregue em Viagem' : 'Expedida em Trânsito'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
                              <User size={13} className="text-blue-600 shrink-0" />
                              <span>Motorista: <strong className="text-slate-800">{ps.driverName}</strong></span>
                            </div>

                            <div className="text-[10px] text-slate-500 font-medium space-y-0.5">
                              <div>Aprovado por: <strong>{ps.expeditionApprovedBy || 'Operador'}</strong></div>
                              <div>Aprovado em: {ps.expeditionApprovedAt ? new Date(ps.expeditionApprovedAt).toLocaleString('pt-BR') : 'N/A'}</div>
                            </div>

                            {(ps.expeditionAttachmentUrl || ps.expeditionPhoto) && (
                              <div className="pt-1">
                                <a
                                  href={ps.expeditionAttachmentUrl || ps.expeditionPhoto}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-200 w-full justify-center"
                                >
                                  📄 Ver Comprovante do Pedido
                                </a>
                              </div>
                            )}

                            <div className="pt-1 border-t border-slate-100 space-y-1">
                              <div className="text-[10px] font-black text-slate-500 uppercase">Produtos Expedidos:</div>
                              {dispProducts.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded-md font-bold text-slate-800">
                                  <span>
                                    {p.productType === 'agua_copo' ? 'Água Copo 200ml' :
                                     p.productType === 'garrafa510' ? 'Água Garrafa 510ml' :
                                     p.productType === 'garrafa15l' ? 'Água Garrafa 1,5L' :
                                     p.productName || p.productType}
                                  </span>
                                  <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{p.qty} cx/fd</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* Form */}
          {!isReadOnly && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Expedição de Produtos</h3>
                <p className="text-[11px] text-slate-500">Saída de caixas/fardos de descartável para transporte e vendas</p>
              </div>
            </div>

            {expSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                <span>{expSuccessMsg}</span>
              </div>
            )}

            {expErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{expErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpedition} className="space-y-3.5">
              {/* 1. Foto do Pedido / Nota (MANDATORY) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2">
                <label className="block text-[10px] font-black text-amber-900 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera size={13} className="text-amber-700" /> Foto do Pedido / Nota Fiscal <span className="text-rose-600 font-black">* (Obrigatório)</span>
                  </span>
                  {expAttachmentUrl && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={10} /> Foto Anexada
                    </span>
                  )}
                </label>

                {expAttachmentUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-amber-300 bg-white p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {expAttachmentUrl.startsWith('data:application/pdf') ? (
                        <FileText size={24} className="text-rose-600 shrink-0" />
                      ) : (
                        <img src={expAttachmentUrl || undefined} alt="Foto do Pedido" className="w-10 h-10 object-cover rounded-md border shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{expAttachmentName || 'Foto do Pedido'}</p>
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(expAttachmentUrl, expAttachmentName || 'Foto do Pedido')}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} /> Visualizar Foto
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpAttachmentUrl('');
                        setExpAttachmentName('');
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                      title="Remover foto do pedido"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-xl cursor-pointer transition text-center group">
                      <div className="flex items-center gap-2 text-amber-800 font-black text-xs group-hover:scale-105 transition">
                        <Camera size={18} className="text-amber-600" />
                        <span>{expAttachmentLoading ? 'Carregando Foto...' : 'Tirar Foto ou Anexar Pedido / NF *'}</span>
                      </div>
                      <span className="text-[9px] text-amber-700/90 mt-0.5 font-medium">Obrigatório tirar foto do pedido para autorizar a saída</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={handleExpeditionFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 2. Data de Expedição & Qtd */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Expedição</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd Expedida *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={expQty}
                    onChange={(e) => setExpQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-amber-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Produto Expedido *</label>
                <select
                  value={expProductId}
                  onChange={(e) => setExpProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione o Produto --</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo: {p.currentStock} {p.unitMeasure})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Cliente (Pré-cadastro ou Cadastro Simples) */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[10px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1"><Users size={12} className="text-blue-600" /> Cliente Destinatário *</span>
                  <span className="text-[9px] text-slate-400 font-normal">Pré-cadastrado ou Novo</span>
                </label>

                <select
                  value={expSelectedClientId}
                  onChange={(e) => {
                    setExpSelectedClientId(e.target.value);
                    if (e.target.value !== 'new') setExpNewClientName('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 bg-white"
                  required
                >
                  <option value="">-- Selecione o Cliente Cadastrado --</option>
                  <option value="new" className="font-black text-blue-700 bg-blue-50">+ CADASTRO SIMPLES (Novo Cliente)</option>
                  {(registeredClients || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.codigo ? `(Cód: ${c.codigo})` : ''}
                    </option>
                  ))}
                </select>

                {expSelectedClientId === 'new' && (
                  <div className="pt-1 animate-fadeIn">
                    <label className="block text-[9px] font-bold text-blue-700 uppercase mb-1">Nome do Novo Cliente (Cadastro Simples) *</label>
                    <input
                      type="text"
                      placeholder="Informe o nome / razão social do cliente..."
                      value={expNewClientName}
                      onChange={(e) => setExpNewClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 4. Motorista & Veículo (Exclusivamente de veículos no Pátio) */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                <label className="block text-[10px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1"><Truck size={12} className="text-amber-600" /> Veículo no Pátio (Portaria) *</span>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Exclusivo do Pátio</span>
                </label>

                {(() => {
                  const vehiclesInYard = (movements || []).filter(m => m.status !== 'saida' && (!m.unit || m.unit === currentUserUnit));
                  
                  if (vehiclesInYard.length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          Nenhum veículo no pátio no momento
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Mesmo para veículos próprios, é obrigatório registrar a entrada na <strong>Portaria / Controle de Acesso</strong> para que a placa fique disponível no pátio da empresa.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <select
                        value={expGateMovementId}
                        onChange={(e) => handleGateMovementSelect(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800"
                        required
                      >
                        <option value="">-- Selecione a Placa do Veículo no Pátio * --</option>
                        {vehiclesInYard.map(m => (
                          <option key={m.id} value={m.id}>
                            🚚 Placa: {m.plate} | Motorista: {m.driver || 'Não informado'} {m.ownerType === 'proprio' ? '(Veículo Próprio)' : ''} {m.client ? `(${m.client})` : ''}
                          </option>
                        ))}
                      </select>

                      {expGateMovementId && (
                        <div className="p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-blue-950">
                            <span className="font-medium text-[11px]">Motorista (Portaria):</span>
                            <span className="font-bold text-slate-900">{expDriverName || 'Não Informado'}</span>
                          </div>
                          <div className="flex items-center justify-between text-blue-950">
                            <span className="font-medium text-[11px]">Placa do Veículo:</span>
                            <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200">{expVehiclePlate || '-'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 5. Nº Nota Fiscal / Pedido & Observações */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Nota Fiscal / Pedido</label>
                <input
                  type="text"
                  placeholder="Ex: NF 9876 / Pedido 104"
                  value={expDocRef}
                  onChange={(e) => setExpDocRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Expedição direta para carregamento ou entrega..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck size={16} /> Confirmar Expedição & Deduzir
                </button>
              </div>
            </form>
          </div>
          )}

          {/* History List */}
          <div className={isReportView ? "w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" : "lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <History size={18} className="text-blue-600" /> Histórico de Expedições
                </h3>
                <p className="text-[11px] text-slate-500">Saídas de produtos acabados da linha descartável</p>
              </div>
            </div>

            {filteredExpeditions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum registro de expedição encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Qtd Saída</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Motorista / Veículo</th>
                      <th className="p-3 text-center">Foto Pedido</th>
                      <th className="p-3">Operador</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredExpeditions.map((ex) => {
                      const gateExit = checkExpeditionGateExit(ex, movements);

                      return (
                        <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                            {ex.date.split('-').reverse().join('/')}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {ex.productName}
                            {ex.notes && <p className="text-[10px] text-slate-400 font-normal">{ex.notes}</p>}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-red-650 text-sm">
                            -{ex.qtyExpedited}
                          </td>
                          <td className="p-3 text-slate-800 font-bold">
                            {ex.clientName || ex.destination?.split('|')[0] || '-'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {ex.driverName ? (
                              <div>
                                <span className="font-medium text-slate-800 block">{ex.driverName}</span>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{ex.vehiclePlate || '-'}</span>
                                  {gateExit.exited && (
                                    <span 
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"
                                      title={gateExit.details}
                                    >
                                      <Lock size={10} className="shrink-0 text-amber-700" />
                                      <span>Saída Portaria</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span>{ex.destination || '-'}</span>
                                {gateExit.exited && (
                                  <span 
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 ml-1.5"
                                    title={gateExit.details}
                                  >
                                    <Lock size={10} className="shrink-0 text-amber-700" />
                                    <span>Saída Portaria</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {ex.documentRef && <span className="text-[10px] text-slate-400 block font-mono">Doc: {ex.documentRef}</span>}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {(ex.attachmentUrl || (ex as any).hasAttachment) ? (
                              <button
                                type="button"
                                onClick={() => handleViewAttachment(ex.attachmentUrl || '', ex.attachmentName || 'Foto_Pedido', ex.id)}
                                className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                title="Visualizar Foto do Pedido"
                              >
                                <Camera size={12} className="text-amber-600" />
                                <span>Ver Foto</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 font-semibold">
                            {ex.operator}
                          </td>
                          {!isReadOnly && (
                            <td className="p-3 text-center">
                              {gateExit.exited ? (
                                <div
                                  className="text-amber-600 p-1.5 rounded bg-amber-50 border border-amber-200 cursor-not-allowed select-none inline-flex items-center justify-center"
                                  title={`O veículo já realizou a saída pela Portaria (${gateExit.details || 'Saída Concluída'}). A exclusão da expedição não é permitida após a saída do veículo.`}
                                >
                                  <Lock size={15} className="text-amber-700" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenDeleteModal(
                                    'expedition',
                                    ex.id,
                                    ex.productName,
                                    `Expedição - Data: ${ex.date.split('-').reverse().join('/')} | Cliente: ${ex.clientName || ex.destination}`,
                                    `Quantidade Expedida: -${ex.qtyExpedited}`
                                  )}
                                  title="Cancelar Expedição (Exige Motivo)"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: CARGAS EMBARCADAS NOS VEÍCULOS (FROTA PRÓPRIA EM TRÂNSITO) */}
          <div className="lg:col-span-3 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
              <div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5 mb-1.5">
                  <Truck size={12} /> Gestão de Frota Própria & Viagens
                </span>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Cargas Embarcadas nos Veículos & Acompanhamento de Viagens
                </h3>
                <p className="text-xs text-slate-300">
                  Acompanhamento de cargas expedidas para a frota própria em trânsito. O serviço da linha descartável é produzir e expedir o produto para o veículo; a partir da expedição, a responsabilidade da carga é exclusivamente do motorista.
                </p>
              </div>
            </div>

            {/* Metrics Bar - Quantitativo Operacional */}
            {(() => {
              const activeTripLoads = driverTripLoads.filter(t => t.currentTruckStock > 0 && t.status === 'em_viagem');
              const totalTruckStock = activeTripLoads.reduce((sum, t) => sum + t.currentTruckStock, 0);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Truck size={12} className="text-amber-400" /> Caminhões com Carga (Viagem)
                    </span>
                    <p className="text-2xl font-black text-amber-400 font-mono">
                      {activeTripLoads.length} <span className="text-xs text-slate-300 font-normal">veículos em trânsito</span>
                    </p>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Boxes size={12} className="text-blue-400" /> Estoque Físico Embarcado em Trânsito
                    </span>
                    <p className="text-2xl font-black text-blue-400 font-mono">
                      {totalTruckStock} <span className="text-xs text-slate-300 font-normal">cx/fardos totais</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Active Truck Loads Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Truck size={16} className="text-amber-400" /> Cargas Embarcadas nos Veículos Próprios
              </h4>

              {driverTripLoads.filter(t => t.currentTruckStock > 0 && t.status === 'em_viagem').length === 0 ? (
                <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/60 text-center text-slate-400 text-xs">
                  Nenhuma carga de frota ativa em trânsito no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {driverTripLoads.filter(t => t.currentTruckStock > 0 && t.status === 'em_viagem').map((load) => {
                    return (
                      <div key={load.id} className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3 shadow-sm hover:border-amber-500/50 transition">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-2.5">
                          <div>
                            <span className="font-mono text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase">
                              🚚 {load.vehiclePlate}
                            </span>
                            <h5 className="font-bold text-sm text-white mt-1.5">{load.driverName}</h5>
                          </div>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Em Trânsito
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300">
                          <p className="font-bold text-white flex items-center justify-between">
                            <span>Produto:</span>
                            <span className="text-amber-300 font-bold">{load.productName}</span>
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-400">Carga Expedida:</span>
                            <span className="font-mono font-bold text-slate-300">{load.initialQty} {load.unitMeasure}</span>
                          </div>
                          <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-700/80 mt-1">
                            <span className="font-bold text-amber-400 text-[11px]">Saldo no Veículo:</span>
                            <span className="font-mono font-black text-amber-300 text-sm">{load.currentTruckStock} {load.unitMeasure}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-700/80">
                          {(load.attachmentUrl || (load as any).hasAttachment) ? (
                            <button
                              type="button"
                              onClick={() => handleViewAttachment(load.attachmentUrl || '', `Pedido_Carga_${load.vehiclePlate}`, load.id)}
                              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <Eye size={13} /> Foto Pedido
                            </button>
                          ) : <span />}

                          <span className="text-[11px] font-semibold text-slate-400 ml-auto flex items-center gap-1">
                            <Truck size={12} className="text-amber-400" /> Resp: {load.driverName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ESTOQUE & CADASTRO --- */}
      {activeTab === 'estoque' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Boxes className="text-blue-600" size={18} /> Saldos Atuais de Estoque (Linha Descartável)
              </h3>
              <p className="text-[11px] text-slate-500">
                Acompanhamento em tempo real dos estoques de produtos acabados e insumos da unidade {currentUserUnit === 'filial' ? 'Filial' : 'Matriz'}
              </p>
            </div>

            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus size={16} /> Novo Item / Insumo
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos Acabados */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <PackageCheck size={16} className="text-emerald-600" /> Produtos Acabados (Água Descartável)
                </h4>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                  {finishedProducts.length} itens
                </span>
              </div>

              <div className="space-y-2.5">
                {finishedProducts.map((p) => {
                  const isLow = p.currentStock <= (p.minStock || 0);
                  return (
                    <div key={p.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:border-slate-200 transition">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{p.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-medium">Estoque Mínimo: {p.minStock || 0} {p.unitMeasure}</span>
                          {isLow && (
                            <span className="text-[9px] font-extrabold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <AlertTriangle size={10} /> Alerta de Baixo Estoque
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div className="font-mono">
                          <span className={`text-base font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {p.currentStock}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 ml-1">{p.unitMeasure}</span>
                        </div>

                        {(!isReportView && currentUser?.role === 'admin') && (
                          <button
                            onClick={() => {
                              setStockAdjustProductId(p.id);
                              setStockAdjustNewQty(p.currentStock);
                              setShowStockAdjustModal(true);
                            }}
                            title="Ajuste Manual de Estoque (Somente Administrador)"
                            className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            <Sliders size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insumos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Boxes size={16} className="text-blue-600" /> Insumos & Embalagens de Produção
                </h4>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {insumoProducts.length} itens
                </span>
              </div>

              <div className="space-y-2.5">
                {insumoProducts.map((p) => {
                  const isLow = p.currentStock <= (p.minStock || 0);
                  return (
                    <div key={p.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:border-slate-200 transition">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{p.name}</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-medium">Estoque Mínimo: {p.minStock || 0} {p.unitMeasure}</span>
                          {p.linkedProductName && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                              <Link2 size={10} /> Vinculado a: {p.linkedProductName} {p.consumptionRate !== undefined ? `(Baixa: ${p.consumptionRate} ${p.unitMeasure} / un. prod.)` : ''}
                            </span>
                          )}
                          {isLow && (
                            <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <AlertTriangle size={10} /> Insumo Crítico
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div className="font-mono">
                          <span className={`text-base font-black ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {p.currentStock}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 ml-1">{p.unitMeasure}</span>
                        </div>

                        {(!isReportView && currentUser?.role === 'admin') && (
                          <button
                            onClick={() => {
                              setStockAdjustProductId(p.id);
                              setStockAdjustNewQty(p.currentStock);
                              setShowStockAdjustModal(true);
                            }}
                            title="Ajuste Manual de Estoque (Somente Administrador)"
                            className="p-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            <Sliders size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: MOVIMENTAÇÃO GERAL & EXTRATO DE ESTOQUE --- */}
      {activeTab === 'movimentacoes' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ArrowLeftRight className="text-blue-600" size={20} /> Extrato & Movimentação Geral de Estoque
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extrato auditável de todas as entradas e saídas de produtos acabados e insumos, com origem, fornecedor, destino, cliente, motorista e saldo atual disponível.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} /> Imprimir Extrato / PDF
                </button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50/80 border border-blue-200/80 p-3.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">Entradas no Período</span>
                <span className="text-lg font-black text-blue-900 font-mono mt-0.5 block flex items-center gap-1">
                  <ArrowUpRight size={18} className="text-blue-600 shrink-0" />
                  +{movTotalInputs.toLocaleString('pt-BR')} <span className="text-xs font-medium text-blue-700">un/cx</span>
                </span>
              </div>

              <div className="bg-red-50/80 border border-red-200/80 p-3.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-wider block">Saídas no Período</span>
                <span className="text-lg font-black text-red-900 font-mono mt-0.5 block flex items-center gap-1">
                  <ArrowDownRight size={18} className="text-red-600 shrink-0" />
                  -{movTotalOutputs.toLocaleString('pt-BR')} <span className="text-xs font-medium text-red-700">un/cx</span>
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Movimentações Filtradas</span>
                <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
                  {filteredStockMovements.length} <span className="text-xs font-medium text-slate-500">registros</span>
                </span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                  {movItemFilter !== 'todos' ? 'Saldo Atual do Item' : 'Itens Cadastrados'}
                </span>
                {movItemFilter !== 'todos' ? (
                  <span className="text-lg font-black text-emerald-900 font-mono mt-0.5 block">
                    {selectedFilteredItem ? `${selectedFilteredItem.currentStock.toLocaleString('pt-BR')} ${selectedFilteredItem.unitMeasure}` : '-'}
                  </span>
                ) : (
                  <span className="text-lg font-black text-emerald-900 font-mono mt-0.5 block">
                    {unitProducts.length} <span className="text-xs font-medium text-emerald-700">itens</span>
                  </span>
                )}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Type Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Tipo de Movimentação</label>
                  <select
                    value={movTypeFilter}
                    onChange={(e) => setMovTypeFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="todos">Todas (Entradas & Saídas)</option>
                    <option value="entrada">🔵 Apenas Entradas (+)</option>
                    <option value="saida">🔴 Apenas Saídas (-)</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Categoria do Item</label>
                  <select
                    value={movCategoryFilter}
                    onChange={(e) => setMovCategoryFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="todos">Todas as Categorias</option>
                    <option value="produto_acabado">📦 Produtos Acabados</option>
                    <option value="insumo">🧱 Insumos & Embalagens</option>
                  </select>
                </div>

                {/* Specific Item Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Filtrar por Item</label>
                  <select
                    value={movItemFilter}
                    onChange={(e) => setMovItemFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="todos">Todos os Produtos & Insumos</option>
                    <optgroup label="Produtos Acabados">
                      {finishedProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Insumos & Embalagens">
                      {insumoProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={movStartDate}
                    onChange={(e) => setMovStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Data Final</label>
                  <input
                    type="date"
                    value={movEndDate}
                    onChange={(e) => setMovEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Text Search Query */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por fornecedor, cliente, motorista, placa, documento, operador, motivo..."
                  value={movSearchQuery}
                  onChange={(e) => setMovSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
                {movSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMovSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History size={16} className="text-blue-600" /> Histórico Unificado de Movimentações ({filteredStockMovements.length})
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">
                Entradas em <span className="text-blue-600 font-bold">Azul</span> | Saídas em <span className="text-red-600 font-bold">Vermelho</span>
              </span>
            </div>

            {filteredStockMovements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                Nenhuma movimentação de estoque encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Item / Categoria</th>
                      <th className="p-3 text-center">Tipo</th>
                      <th className="p-3 text-right">Qtd Entrou</th>
                      <th className="p-3 text-right">Qtd Saiu</th>
                      <th className="p-3">De Onde / De Quem Chegou (Origem / Fornecedor)</th>
                      <th className="p-3">Pra Onde / Com Quem Saiu / Pra Quem Foi (Destino / Cliente / Motorista)</th>
                      <th className="p-3">Operador / Doc</th>
                      <th className="p-3 text-right">Estoque Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStockMovements.map((m) => {
                      const isEntry = m.type === 'entrada';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-600 text-[11px] font-bold whitespace-nowrap">
                            <div>{m.date.split('-').reverse().join('/')}</div>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {m.timestamp.includes('T') ? m.timestamp.split('T')[1].substring(0, 5) : ''}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{m.itemName}</span>
                            <span className={`inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                              m.itemType === 'produto_acabado' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {m.itemType === 'produto_acabado' ? '📦 Produto Acabado' : '🧱 Insumo'}
                            </span>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            {isEntry ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                <ArrowUpRight size={12} /> Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                <ArrowDownRight size={12} /> Saída
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-blue-700 text-sm whitespace-nowrap">
                            {isEntry ? `+${m.qtyInput.toLocaleString('pt-BR')} ${m.unitMeasure}` : '-'}
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-red-600 text-sm whitespace-nowrap">
                            {!isEntry ? `-${m.qtyOutput.toLocaleString('pt-BR')} ${m.unitMeasure}` : '-'}
                          </td>

                          <td className="p-3 text-slate-700 max-w-[220px]">
                            <div className="font-semibold text-slate-900 text-[11px]">{m.origin}</div>
                            {m.supplier && m.supplier !== '-' && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Fornecedor: <span className="font-bold text-slate-700">{m.supplier}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-slate-700 max-w-[280px]">
                            <div className="font-semibold text-slate-900 text-[11px]">{m.destination}</div>
                            {m.forWho && m.forWho !== '-' && (
                              <div className="text-[10px] text-slate-600 mt-1">
                                {m.forWho.includes('Transformado em Produto Acabado') ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    <Package size={10} className="text-blue-600 shrink-0" /> {m.forWho}
                                  </span>
                                ) : m.forWho.includes('Uso em Produção / Quebra') || m.forWho.includes('Descarte') ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    <AlertTriangle size={10} className="text-amber-600 shrink-0" /> {m.forWho}
                                  </span>
                                ) : (
                                  <span>Destino/Cliente: <span className="font-bold text-slate-800">{m.forWho}</span></span>
                                )}
                              </div>
                            )}
                            {m.withWho && m.withWho !== '-' && (
                              <div className="text-[10px] text-indigo-700 font-semibold mt-0.5 flex items-center gap-1">
                                <Truck size={10} className="shrink-0 text-indigo-500" /> {m.withWho}
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-[11px]">{m.operator}</div>
                            {m.documentRef && m.documentRef !== '-' && (
                              <span className="text-[9px] font-mono text-slate-400 block">{m.documentRef}</span>
                            )}
                            {m.attachmentUrl && (
                              <button
                                type="button"
                                onClick={() => handleViewAttachment(m.attachmentUrl || '', m.attachmentName || m.documentRef || 'Anexo', m.id)}
                                className="mt-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                              >
                                <Paperclip size={10} /> Anexo/NF
                              </button>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            <div className="text-xs">{m.currentStock.toLocaleString('pt-BR')} {m.unitMeasure}</div>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                              m.currentStock <= 0 
                                ? 'bg-rose-100 text-rose-700' 
                                : m.currentStock <= 10 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {m.currentStock <= 0 ? 'Zerado' : m.currentStock <= 10 ? 'Estoque Baixo' : 'Disponível'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 7: RELATÓRIOS & ANALYTICS DE PRODUÇÃO, PERDAS E VENDAS --- */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} /> Relatórios de Produção, Perdas e Vendas por Cliente
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidado diário de itens fabricados, proporção de avarias sobre a produção e quantidade vendida por cliente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} /> Imprimir / PDF
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-blue-600" /> Data Inicial
                </label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-blue-600" /> Data Final
                </label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Filter size={12} className="text-blue-600" /> Produto
                </label>
                <select
                  value={reportSelectedProduct}
                  onChange={(e) => setReportSelectedProduct(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="todos">Todos os Produtos</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Users size={12} className="text-blue-600" /> Buscar Cliente / Destino
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome do cliente ou NF..."
                    value={reportClientSearch}
                    onChange={(e) => setReportClientSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Atalhos de Período:</span>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setReportStartDate(today);
                  setReportEndDate(today);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(today.getDate() - 7);
                  setReportStartDate(sevenDaysAgo.toISOString().split('T')[0]);
                  setReportEndDate(today.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Últimos 7 Dias
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setReportStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                  setReportEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportStartDate('');
                  setReportEndDate('');
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Todo o Período
              </button>
            </div>
          </div>

          {/* KPI Executive Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Produção Líquida</span>
                <Layers size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {reportTotalProduced} <span className="text-xs font-normal text-slate-500">cx/fd</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Itens fabricados e estocados</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Avarias Produção</span>
                <AlertTriangle size={16} className="text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {reportTotalProdAvarias} <span className="text-xs font-normal text-slate-500">cx/fd</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Caixas/fardos danificados</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Proporção de Perda</span>
                <Percent size={16} className="text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${
                  reportGlobalLossRatio > 3.5 ? 'text-rose-600' : reportGlobalLossRatio > 1.5 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {reportGlobalLossRatio.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                  reportGlobalLossRatio > 3.5 ? 'bg-rose-100 text-rose-800' : reportGlobalLossRatio > 1.5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {reportGlobalLossRatio > 3.5 ? 'Perda Elevada' : reportGlobalLossRatio > 1.5 ? 'Atenção' : 'Excelente'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Vendido</span>
                <Truck size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-900 font-mono">
                {reportTotalSalesQty} <span className="text-xs font-normal text-slate-500">cx/fd</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Expedido para clientes</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Top Cliente</span>
                <Award size={16} className="text-amber-500" />
              </div>
              <div className="text-sm font-black text-slate-900 truncate" title={reportTopClient?.clientName}>
                {reportTopClient ? reportTopClient.clientName : 'Sem vendas'}
              </div>
              <p className="text-[10px] text-slate-500 font-bold font-mono">
                {reportTopClient ? `${reportTopClient.totalQty} cx/fd (${reportTopClient.expeditionCount} cargas)` : 'Nenhum registro'}
              </p>
            </div>
          </div>

          {/* Subtabs for Reports Navigation */}
          <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs overflow-x-auto">
            <button
              onClick={() => setReportActiveSubtab('producao')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                reportActiveSubtab === 'producao'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> Produção Diária por Item
            </button>

            <button
              onClick={() => setReportActiveSubtab('perdas')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                reportActiveSubtab === 'perdas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <AlertTriangle size={14} /> Perdas & Avarias (% Proporção)
            </button>

            <button
              onClick={() => setReportActiveSubtab('vendas')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                reportActiveSubtab === 'vendas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Truck size={14} /> Vendas & Expedição Diária
            </button>

            <button
              onClick={() => setReportActiveSubtab('clientes')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                reportActiveSubtab === 'clientes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users size={14} /> Consolidado por Cliente
            </button>
          </div>

          {/* SUBTAB 1: PRODUÇÃO DIÁRIA POR ITEM */}
          {reportActiveSubtab === 'producao' && (
            <div className="space-y-6">
              {/* Summary Cards by Product */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart size={16} className="text-blue-600" /> Resumo da Produção por Produto no Período
                </h4>
                {reportProductionByProductSummary.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhuma produção registrada no período selecionado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {reportProductionByProductSummary.map(item => (
                      <div key={item.productId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-slate-900 block">{item.productName}</span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                            item.lossRatio > 3 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.lossRatio.toFixed(2)}% perda
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200/60 text-center font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase">Produzido</span>
                            <span className="font-bold text-emerald-700">{item.qtyProduced}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase">Avarias</span>
                            <span className="font-bold text-rose-600">{item.qtyAvarias}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase">Fabricado Total</span>
                            <span className="font-bold text-slate-800">{item.totalGross}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily Production Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={16} className="text-emerald-600" /> Lançamentos Diários de Produção
                  </h4>
                  <span className="text-xs text-slate-500 font-mono font-bold">
                    Total: {filteredLogsForReports.length} registros
                  </span>
                </div>

                {filteredLogsForReports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum registro de produção encontrado com os filtros atuais.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                        <tr>
                          <th className="p-3">Data</th>
                          <th className="p-3">Produto Fabricado</th>
                          <th className="p-3 text-right">Qtd Líquida (Estoque)</th>
                          <th className="p-3 text-right">Qtd Avarias / Perdas</th>
                          <th className="p-3 text-right">Total Fabricado Bruto</th>
                          <th className="p-3 text-center">% Proporção Perda</th>
                          <th className="p-3">Operador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredLogsForReports.map((log) => {
                          const realBoxAv = getRealBoxAvarias(log);
                          const gross = (log.qtyProduced || 0) + realBoxAv;
                          const ratio = gross > 0 ? (realBoxAv / gross) * 100 : 0;
                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                                {log.date.split('-').reverse().join('/')}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{log.productName}</span>
                                {log.notes && <span className="text-[10px] text-slate-400">{log.notes}</span>}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                                +{log.qtyProduced} cx/fd
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                {realBoxAv > 0 ? `-${realBoxAv} cx/fd` : (log.avariasInsumos && log.avariasInsumos.length > 0 ? '' : '0')}
                                {log.avariasInsumos && log.avariasInsumos.length > 0 && (
                                  <div className="text-[10px] text-rose-700 font-sans font-medium text-right mt-0.5 space-y-0.5">
                                    {log.avariasInsumos.map((av, idx) => (
                                      <div key={idx}>{av.insumoName}: {av.qty}</div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                {gross} cx/fd
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  ratio > 3 ? 'bg-rose-100 text-rose-800' : ratio > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {ratio.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                                {log.operator}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 2: PERDAS E AVARIAS DIÁRIAS COM PROPORÇÃO */}
          {reportActiveSubtab === 'perdas' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-rose-600" /> Relatório Detalhado de Perdas & Avarias Diárias
                  </h4>
                  <p className="text-[11px] text-slate-500">Perdas registradas de produtos acabados e insumos (copos, selos, preformas, caixas, etc.)</p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  Total de Avarias: {reportLossesDetailedList.length} itens
                </span>
              </div>

              {reportLossesDetailedList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma perda ou avaria registrada para os filtros selecionados. Excelente desempenho!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Item Danificado</th>
                        <th className="p-3 text-center">Tipo</th>
                        <th className="p-3 text-right">Qtd Perda</th>
                        <th className="p-3">Motivo da Avaria</th>
                        <th className="p-3">Envase / Produto Origem</th>
                        <th className="p-3 text-center">Proporção da Perda</th>
                        <th className="p-3">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportLossesDetailedList.map((loss) => (
                        <tr key={loss.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                            {loss.date.split('-').reverse().join('/')}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {loss.item}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              loss.type === 'produto' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {loss.type === 'produto' ? 'Produto Acabado' : 'Insumo'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600 text-sm whitespace-nowrap">
                            -{loss.qtyLoss} {loss.unitMeasure}
                          </td>
                          <td className="p-3 text-slate-700">
                            {loss.reason}
                          </td>
                          <td className="p-3 text-slate-600 font-bold">
                            {loss.relatedProduct}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                              {loss.lossRatioPercentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                            {loss.operator}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: VENDAS E EXPEDIÇÃO DIÁRIA POR CLIENTE */}
          {reportActiveSubtab === 'vendas' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={16} className="text-blue-600" /> Relatório Diário de Vendas & Expedição
                  </h4>
                  <p className="text-[11px] text-slate-500">Saídas detalhadas dia a dia de produtos acabados da linha descartável para clientes</p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  Total expedido: {reportTotalSalesQty} cx/fd
                </span>
              </div>

              {filteredExpeditionsForReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum registro de expedição / venda encontrado no período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="p-3">Data da Venda</th>
                        <th className="p-3">Cliente / Destino / Motorista</th>
                        <th className="p-3">Produto Adquirido</th>
                        <th className="p-3 text-right">Qtd Vendida</th>
                        <th className="p-3">Nº NF / Documento</th>
                        <th className="p-3">Observações</th>
                        <th className="p-3">Operador Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredExpeditionsForReports.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                            {exp.date.split('-').reverse().join('/')}
                          </td>
                          <td className="p-3 font-black text-slate-900">
                            {exp.destination || 'Cliente Não Especificado'}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {exp.productName}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-blue-700 text-sm whitespace-nowrap">
                            {exp.qtyExpedited} cx/fd
                          </td>
                          <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                            {exp.documentRef || '-'}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {exp.notes || '-'}
                          </td>
                          <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                            {exp.operator}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 4: RANKING & CONSOLIDADO POR CLIENTE */}
          {reportActiveSubtab === 'clientes' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={16} className="text-blue-600" /> Vendas Consolidadas por Cliente no Período
                  </h4>
                  <p className="text-[11px] text-slate-500">Ranking de compradores, volume total adquirido em caixas/fardos e participação nas vendas</p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {reportClientSalesSummary.length} clientes atendidos
                </span>
              </div>

              {reportClientSalesSummary.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum cliente registrado no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y border-slate-200">
                      <tr>
                        <th className="p-3 text-center">Posição</th>
                        <th className="p-3">Cliente / Destinatário</th>
                        <th className="p-3 text-right">Volume Total Vendido</th>
                        <th className="p-3 text-center">Nº de Cargas / Pedidos</th>
                        <th className="p-3">Detalhamento dos Produtos Comprados</th>
                        <th className="p-3 text-center">Participação (% Total)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportClientSalesSummary.map((client, idx) => {
                        const share = reportTotalSalesQty > 0 ? (client.totalQty / reportTotalSalesQty) * 100 : 0;
                        return (
                          <tr key={client.clientName} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center font-black font-mono text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="p-3">
                              <span className="font-extrabold text-slate-900 text-sm block">{client.clientName}</span>
                            </td>
                            <td className="p-3 text-right font-mono font-black text-blue-700 text-base whitespace-nowrap">
                              {client.totalQty} <span className="text-xs font-bold text-slate-500">cx/fd</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                              {client.expeditionCount} entregas
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(client.productsMap).map(([pName, pQty]) => (
                                  <span key={pName} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                    {pName}: <strong className="text-blue-700 font-mono">{pQty} cx/fd</strong>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="font-mono font-bold text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200/80">
                                {share.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: NOVO ITEM / INSUMO --- */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-blue-400" /> Cadastrar Novo Item (Linha Descartável)
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Item / Produto / Insumo</label>
                <input
                  type="text"
                  placeholder="Ex: Água Garrafa 510ml (Fardo c/ 12un)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="produto_acabado">Produto Acabado</option>
                    <option value="insumo">Insumo de Produção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade de Medida</label>
                  <input
                    type="text"
                    placeholder="Ex: caixas, fardos, kg, unidades"
                    value={newProductUnitMeasure}
                    onChange={(e) => setNewProductUnitMeasure(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductInitialStock}
                    onChange={(e) => setNewProductInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductMinStock}
                    onChange={(e) => setNewProductMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              {newProductCategory === 'insumo' && (
                <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs">
                    <Link2 size={15} className="text-blue-600" />
                    <span>Vínculo e Taxa de Consumo na Produção</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Produto Acabado Vinculado
                    </label>
                    <select
                      value={newProductLinkedProductId}
                      onChange={(e) => setNewProductLinkedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800"
                    >
                      <option value="">-- Selecione o Produto Vinculado --</option>
                      <option value="todos">Todos os Produtos Acabados (Uso Geral)</option>
                      {finishedProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Consumo por Unidade Produzida (BOM)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Ex: 48 (copos/selos por cx), 12 (garrafas por fardo), 1 (caixa / m de fita), 0.05 (kg filme)"
                      value={newProductConsumptionRate}
                      onChange={(e) => setNewProductConsumptionRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-blue-800 bg-white"
                    />
                    <p className="text-[10px] text-blue-700/80 mt-1 leading-tight font-medium">
                      Ao lançar a produção de 1 caixa/fardo do produto vinculado, este valor será baixado automaticamente do estoque deste insumo.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Cadastrar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: AJUSTE MANUAL DE ESTOQUE --- */}
      {showStockAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-blue-400" /> Ajuste Manual de Saldo
              </h3>
              <button
                onClick={() => setShowStockAdjustModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="p-5 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {unitProducts.find(p => p.id === stockAdjustProductId)?.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ajuste diretamente a quantidade em estoque em caso de inventário físico.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nova Quantidade em Saldo</label>
                <input
                  type="number"
                  min="0"
                  value={stockAdjustNewQty}
                  onChange={(e) => setStockAdjustNewQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStockAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Atualizar Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAR EXCLUSÃO COM MOTIVO OBRIGATÓRIO --- */}
      {deleteModalOpen && deleteTarget && (() => {
        const isExpedition = deleteTarget.type === 'expedition';
        const targetExp = isExpedition ? (disposableExpeditions || []).find(e => e.id === deleteTarget.id) : null;
        const gateExitInfo = isExpedition && targetExp ? checkExpeditionGateExit(targetExp, movements) : { exited: false };
        const isBlockedByGateExit = gateExitInfo.exited;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isBlockedByGateExit ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>
                    {isBlockedByGateExit ? <Lock size={22} /> : <Trash2 size={22} />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      {isBlockedByGateExit ? 'Exclusão Bloqueada' : 'Confirmar Exclusão'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isBlockedByGateExit ? 'Veículo já realizou a saída pela Portaria' : 'Exige justificativa obrigatória do operador'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                    setDeleteReason('');
                    setDeleteModalError('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {isBlockedByGateExit ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <Lock size={16} className="shrink-0 text-rose-600" />
                    <span>Bloqueio de Segurança: Saída da Portaria Concluída</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                    {gateExitInfo.details}. Após o veículo ter saído pela portaria, <strong>não é mais aceito fazer a exclusão da expedição</strong> por regras de auditoria fiscal e rastreabilidade de estoque.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                    <span>Atenção: Ação com Estorno de Estoque</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Ao excluir este lançamento, a movimentação de estoque será automaticamente estornada para manter os saldos e o histórico de produção precisos.
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lançamento Selecionado</span>
                <p className="text-sm font-black text-slate-900">{deleteTarget.title}</p>
                <p className="text-xs font-semibold text-slate-600">{deleteTarget.details}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-200 text-slate-800 font-mono text-xs font-bold rounded-md">
                  {deleteTarget.qtyInfo}
                </span>
              </div>

              {deleteModalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <form onSubmit={handleExecuteDelete} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                    Motivo da Exclusão <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isBlockedByGateExit
                        ? 'Exclusão bloqueada pois o veículo já saiu pela portaria.'
                        : 'Informe obrigatoriamente o motivo da exclusão (Ex: Erro no lançamento da quantidade, duplicação de dados, teste de sistema, etc.)'
                    }
                    value={deleteReason}
                    disabled={isBlockedByGateExit}
                    onChange={(e) => {
                      setDeleteReason(e.target.value);
                      if (e.target.value.trim()) setDeleteModalError('');
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs resize-none font-medium ${
                      isBlockedByGateExit
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-rose-500'
                    }`}
                    required={!isBlockedByGateExit}
                    autoFocus={!isBlockedByGateExit}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setDeleteTarget(null);
                      setDeleteReason('');
                      setDeleteModalError('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isBlockedByGateExit}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs flex items-center gap-1.5 ${
                      isBlockedByGateExit
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    }`}
                  >
                    {isBlockedByGateExit ? (
                      <>
                        <Lock size={15} /> Bloqueado (Saída Portaria)
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} /> Confirmar Exclusão
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL: VISUALIZADOR DE COMPROVANTE / NF --- */}
      {viewAttachmentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Comprovante / Documento: {viewAttachmentName}
                </h3>
              </div>
              <button
                onClick={() => setViewAttachmentModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {viewAttachmentUrl && viewAttachmentUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewAttachmentUrl || undefined}
                  title="Comprovante PDF"
                  className="w-full h-[60vh] rounded-xl border border-slate-300"
                />
              ) : viewAttachmentUrl ? (
                <img
                  src={viewAttachmentUrl || undefined}
                  alt="Comprovante NF"
                  className="max-h-[70vh] object-contain rounded-xl shadow-md border border-slate-200"
                />
              ) : (
                <div className="text-slate-400 text-xs font-semibold">Nenhum anexo disponível</div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <a
                href={viewAttachmentUrl}
                download={viewAttachmentName || 'comprovante_nf'}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowDownRight size={14} /> Baixar Arquivo
              </a>
              <button
                onClick={() => setViewAttachmentModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: APROVAÇÃO DE EXPEDIÇÃO DE PRÉ-VENDA (DETERMINADO PELO OPERADOR) --- */}
      {approvingPreSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">Aprovar Expedição de Pré-Venda</h3>
                  <p className="text-xs text-slate-500">Cliente: <strong className="text-slate-800">{approvingPreSale.clientName}</strong> | Motorista: <strong className="text-slate-800">{approvingPreSale.driverName}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingPreSale(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {approvingError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{approvingError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPreSaleExpedition} className="space-y-4">
              {/* Order File Upload (MANDATORY) */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-xs font-black text-amber-900 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-amber-700" /> Inserir Foto ou Arquivo do Pedido <span className="text-rose-600 font-black">* (Obrigatório)</span>
                  </span>
                </label>
                
                {approvingFileUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-amber-300 bg-white p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {approvingFileUrl.startsWith('data:application/pdf') ? (
                        <FileText size={24} className="text-rose-600 shrink-0" />
                      ) : (
                        <img src={approvingFileUrl || undefined} alt="Foto do Pedido" className="w-12 h-12 object-cover rounded-md border shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{approvingFileName || 'Foto/Arquivo do Pedido'}</p>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle size={10} /> Arquivo Anexado
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setApprovingFileUrl(''); setApprovingFileName(''); }}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded transition cursor-pointer"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    <UploadCloud size={28} className="text-amber-500 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-slate-700">Clique para enviar a foto/PDF do pedido</span>
                    <span className="text-[10px] text-slate-400 font-medium">Formato: Imagem ou PDF (Máx 15MB)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      onChange={handleApprovingFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações do Operador</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Conferido e liberado na expedição para o motorista"
                  value={approvingNotes}
                  onChange={(e) => setApprovingNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingPreSale(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle size={16} /> Confirmar & Baixar Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
