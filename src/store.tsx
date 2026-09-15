import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AppState, Movement, SupplyRecord, User, Checklist, DieselPurchase, ArlaPurchase, SystemUser, RegisteredVehicle, RegisteredDriver, RegisteredClient, RegisteredCity, CustomAvariaType, StockAdjustment, StockRequest, ScrapConference, DriverSettlement, BankTransaction, PreSale, PreSaleProduct, MachineInfo, MachineStatus, ProductionStatusDetail, ProductionStopLog, ProductionPause } from './types';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface StoreContextType extends AppState {
  hasPendingSync: boolean;
  triggerManualSync: () => Promise<boolean>;
  login: (user: User) => void;
  logout: () => void;
  addMovement: (movement: Movement) => void;
  deleteMovement: (id: string, reason?: string) => void;
  updateMovementStatus: (id: string, status: Movement['status']) => void;
  registerExit: (id: string, timestamp: string, exitedBy?: string, orderPhoto?: string, earlyExitReason?: string) => void;
  registerGateTemporaryExit: (id: string, type: 'almoco' | 'oficina', exitedBy?: string) => void;
  registerGateTemporaryReturn: (id: string, returnedBy?: string) => void;
  addSupply: (supply: SupplyRecord, checklist?: Checklist, evaluator?: string) => void;
  addDieselPurchase: (purchase: DieselPurchase) => void;
  updateInitialDieselStock: (stock: number) => void;
  addArlaPurchase: (purchase: ArlaPurchase) => void;
  updateInitialArlaStock: (stock: number) => void;
  updateDieselTankCapacity: (capacity: number) => void;
  updateArlaTankCapacity: (capacity: number) => void;
  addCustomChecklistItem: (item: string) => void;
  removeCustomChecklistItem: (item: string) => void;
  addSystemUser: (user: SystemUser) => void;
  removeSystemUser: (id: string) => void;
  updateSystemUser: (id: string, updates: Partial<SystemUser>) => void;
  updateSystemUserPermissions: (id: string, modules: SystemUser['modules']) => void;
  addRegisteredVehicle: (vehicle: RegisteredVehicle) => void;
  removeRegisteredVehicle: (id: string) => void;
  updateRegisteredVehicle: (id: string, updates: Partial<RegisteredVehicle>) => void;
  addRegisteredDriver: (driver: RegisteredDriver) => void;
  removeRegisteredDriver: (id: string) => void;
  updateRegisteredDriver: (id: string, updates: Partial<RegisteredDriver>) => void;
  addRegisteredSupervisor: (supervisor: import('./types').RegisteredSupervisor) => void;
  removeRegisteredSupervisor: (id: string) => void;
  updateRegisteredSupervisor: (id: string, updates: Partial<import('./types').RegisteredSupervisor>) => void;
  addRegisteredClient: (client: RegisteredClient) => void;
  removeRegisteredClient: (id: string) => void;
  updateRegisteredClient: (id: string, updates: Partial<RegisteredClient>) => void;
  addRegisteredCity: (city: RegisteredCity) => void;
  removeRegisteredCity: (id: string) => void;
  updateRegisteredCity: (id: string, updates: Partial<RegisteredCity>) => void;
  setCompanyLogo: (logo?: string) => void;
  clearDatabase: () => void;
  addCustomVehicleCategory: (cat: { id: string; name: string; bypassProductionDefault: boolean }) => void;
  removeCustomVehicleCategory: (id: string) => void;
  addCustomEntryPurpose: (purp: { id: string; name: string; bypassProductionDefault: boolean }) => void;
  removeCustomEntryPurpose: (id: string) => void;
  updateMovementDetails: (id: string, updates: Partial<Movement>, nextKanbanStep?: Movement['kanbanStep']) => void;
  revertMovementExit: (id: string, editedBy?: string, editReason?: string) => void;
  updateRegisteredVehicleDriver: (id: string, defaultDriverId: string | undefined) => void;
  updateKanbanStep: (id: string, step: Movement['kanbanStep']) => void;
  toggleKanbanPause: (id: string, reason?: Movement['kanbanPauseReason']) => void;
  toggleProductionOpen: (open: boolean, unit?: string, reasonInfo?: { reason: string; customReason?: string; isScheduledPause?: boolean; notes?: string; machineId?: string }) => void;
  setMachineStatus: (machineId: string, status: MachineStatus, reason?: string, notes?: string, unit?: string) => void;
  pauseMachineForLunch: (machineId: string, unit?: string, notes?: string) => void;
  endMachineDay: (machineId: string, unit?: string, notes?: string) => void;
  resumeMachineOperation: (machineId: string, unit?: string) => void;
  setMachineCapacity: (machineId: string, capacity: number, unit?: string) => void;
  resetAllMachines: (unit?: string) => void;
  addCustomAvariaType: (type: string, classification: 'descarregamento' | 'carregamento' | 'ambos', category?: 'avaria' | 'compra' | 'vasilhame_rota' | 'retorno_lavagem', origin?: 'frota_propria' | 'cliente', descontarMotorista?: boolean) => void;
  removeCustomAvariaType: (id: string) => void;
  updateCustomAvariaType: (id: string, updates: Partial<CustomAvariaType>) => void;
  updateAvgTimeDischarging: (rate: number) => void;
  updateAvgTimeLoading: (rate: number) => void;
  addCustomStockProduct: (name: string) => void;
  removeCustomStockProduct: (name: string) => void;
  updateCustomStockProduct: (oldName: string, newName: string) => void;
  updateInitialStockLevel: (product: string, level: number) => void;
  addManualStockAdjustment: (adj: Omit<StockAdjustment, 'id' | 'timestamp' | 'operator' | 'unit'>) => void;
  resolveStockAlert: (alertId: string) => void;
  unresolveStockAlert: (alertId: string) => void;
  verifyScrapAlert: (movementId: string) => void;
  unverifyScrapAlert: (movementId: string) => void;
  addScrapConference: (conf: { yardQty: number; realQty: number; movementIds: string[]; type?: 'descarregamento' | 'carregamento' }) => void;
  deleteScrapConference: (id: string) => void;
  addDriverSettlement: (settlement: DriverSettlement) => void;
  updateDriverSettlement: (id: string, updates: Partial<DriverSettlement>) => void;
  deleteDriverSettlement: (id: string) => void;
  importBankTransactions: (txs: BankTransaction[]) => void;
  reconcileDriverSettlementWithPix: (settlementId: string, transactionId: string | string[]) => void;
  unreconcileDriverSettlement: (settlementId: string) => void;
  removeBankTransaction: (txId: string) => void;
  deleteImportedFile: (fileId: string) => void;
  manuallyReconcileBankTransaction: (txId: string, reason: string) => void;
  undoManualReconciliation: (txId: string) => void;
  voidBankTransaction: (entryTxId: string, refundTxId: string) => void;
  undoVoidBankTransaction: (refundTxId: string) => void;
  getMovementPhotos: (movementId: string) => { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string; attachmentUrl?: string; loading?: boolean };
  savePhotosForMovement: (movementId: string, photos: { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string; attachmentUrl?: string }) => Promise<void>;
  addPreSale: (preSale: Omit<PreSale, 'id' | 'timestamp' | 'isUsed'>) => void;
  updatePreSale: (id: string, updates: Partial<PreSale>) => void;
  deletePreSale: (id: string, reason?: string, operator?: string) => void;
  addDisposableProduct: (prod: Omit<import('./types').DisposableProduct, 'id'>) => void;
  updateDisposableProduct: (id: string, updates: Partial<import('./types').DisposableProduct>) => void;
  removeDisposableProduct: (id: string) => void;
  addDisposableProductionLog: (log: Omit<import('./types').DisposableProductionLog, 'id' | 'timestamp'>) => void;
  deleteDisposableProductionLog: (id: string) => void;
  addDisposableInsumoEntry: (entry: Omit<import('./types').DisposableInsumoEntry, 'id' | 'timestamp'>) => void;
  deleteDisposableInsumoEntry: (id: string) => void;
  addDisposableExpedition: (exp: Omit<import('./types').DisposableExpedition, 'id' | 'timestamp'>) => void;
  deleteDisposableExpedition: (id: string, reason?: string, operator?: string) => void;
  updateDisposableStockLevel: (productId: string, newStock: number) => void;
  addDriverTripLoad: (tripLoad: import('./types').DriverTripLoad) => void;
  updateDriverTripLoad: (id: string, updates: Partial<import('./types').DriverTripLoad>) => void;
  deleteDriverTripLoad: (id: string, reason?: string, operator?: string) => void;
  addDriverTripDelivery: (delivery: import('./types').DriverTripDelivery) => void;
  addAuditLog: (log: Omit<import('./types').SystemAuditLog, 'id' | 'timestamp'>) => void;
}

export const defaultDisposableProducts: import('./types').DisposableProduct[] = [
  // Produtos Acabados (Linha Descartável)
  { id: 'disp-prod-200ml-copo', name: 'Água Copo 200ml (Cx c/ 48un)', category: 'produto_acabado', unit: 'matriz', currentStock: 0, minStock: 50, unitMeasure: 'caixas', status: 'ativo' },
  { id: 'disp-prod-510ml-garrafa', name: 'Água Garrafa 510ml (Fardo c/ 12un)', category: 'produto_acabado', unit: 'matriz', currentStock: 0, minStock: 30, unitMeasure: 'fardos', status: 'ativo' },
  { id: 'disp-prod-15l-garrafa', name: 'Água Garrafa 1,5L (Fardo c/ 6un)', category: 'produto_acabado', unit: 'matriz', currentStock: 0, minStock: 20, unitMeasure: 'fardos', status: 'ativo' },

  // Insumos de Produção e Intermediários (Sopadora)
  { id: 'disp-insumo-copo200', name: 'Copo Plástico 200ml Vazio (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 2000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-200ml-copo', linkedProductName: 'Água Copo 200ml (Cx c/ 48un)', consumptionRate: 48 },
  { id: 'disp-insumo-cx200', name: 'Caixa de Papelão Copo 200ml (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 100, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-200ml-copo', linkedProductName: 'Água Copo 200ml (Cx c/ 48un)', consumptionRate: 1 },
  { id: 'disp-insumo-selo200', name: 'Selo / Tampa de Alumínio 200ml (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 2000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-200ml-copo', linkedProductName: 'Água Copo 200ml (Cx c/ 48un)', consumptionRate: 48 },
  { id: 'disp-insumo-preforma510', name: 'Preforma PET 510ml (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 2000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-insumo-garrafa510-soprada', linkedProductName: 'Garrafa PET 510ml Soprada (Un)', consumptionRate: 1 },
  { id: 'disp-insumo-garrafa510-soprada', name: 'Garrafa PET 510ml Soprada (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 1000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-510ml-garrafa', linkedProductName: 'Água Garrafa 510ml (Fardo c/ 12un)', consumptionRate: 12 },
  { id: 'disp-insumo-preforma15l', name: 'Preforma PET 1,5L (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 1000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-insumo-garrafa15l-soprada', linkedProductName: 'Garrafa PET 1,5L Soprada (Un)', consumptionRate: 1 },
  { id: 'disp-insumo-garrafa15l-soprada', name: 'Garrafa PET 1,5L Soprada (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 500, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-15l-garrafa', linkedProductName: 'Água Garrafa 1,5L (Fardo c/ 6un)', consumptionRate: 6 },
  { id: 'disp-insumo-tampa28', name: 'Tampa Plástica PET 28mm (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 1000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-510ml-garrafa', linkedProductName: 'Água Garrafa 510ml (Fardo c/ 12un)', consumptionRate: 12 },
  { id: 'disp-insumo-rotulo510', name: 'Rótulo 510ml (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 1000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-510ml-garrafa', linkedProductName: 'Água Garrafa 510ml (Fardo c/ 12un)', consumptionRate: 12 },
  { id: 'disp-insumo-rotulo15l', name: 'Rótulo 1,5L (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 1000, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-15l-garrafa', linkedProductName: 'Água Garrafa 1,5L (Fardo c/ 6un)', consumptionRate: 6 },
  { id: 'disp-insumo-filme', name: 'Filme Plástico Termoencolhível (Kg)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 20, unitMeasure: 'kg', status: 'ativo', linkedProductId: 'disp-prod-510ml-garrafa', linkedProductName: 'Água Garrafa 510ml (Fardo c/ 12un)', consumptionRate: 0.05 },
  { id: 'disp-insumo-fita-rolo', name: 'Fita Adesiva p/ Caixas (Rolos)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 5, unitMeasure: 'rolos', status: 'ativo', linkedProductId: 'disp-insumo-fita', linkedProductName: 'Fita Adesiva p/ Caixas (Metros)', consumptionRate: 1200 },
  { id: 'disp-insumo-fita', name: 'Fita Adesiva p/ Caixas (Metros)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 500, unitMeasure: 'metros', status: 'ativo', linkedProductId: 'disp-prod-200ml-copo', linkedProductName: 'Água Copo 200ml (Cx c/ 48un)', consumptionRate: 1 },
  { id: 'disp-insumo-cartucho-datadora', name: 'Cartucho / Tinta da Datadora (Un)', category: 'insumo', unit: 'matriz', currentStock: 0, minStock: 2, unitMeasure: 'unidades', status: 'ativo', linkedProductId: 'disp-prod-200ml-copo', linkedProductName: 'Água Copo 200ml (Datadora)', consumptionRate: 0 },
];

export const ensureAllDisposableProducts = (existingList?: import('./types').DisposableProduct[]): import('./types').DisposableProduct[] => {
  const list = existingList && Array.isArray(existingList) ? [...existingList] : [];
  const existingIds = new Set(list.map(p => p.id));
  for (const dp of defaultDisposableProducts) {
    if (!existingIds.has(dp.id)) {
      list.push({ ...dp });
      existingIds.add(dp.id);
    }
  }
  return list;
};

export const recalculateDisposableProductsStock = (
  products: import('./types').DisposableProduct[],
  productionLogs: import('./types').DisposableProductionLog[],
  insumoEntries: import('./types').DisposableInsumoEntry[],
  expeditions: import('./types').DisposableExpedition[]
): import('./types').DisposableProduct[] => {
  const baseList = ensureAllDisposableProducts(products);
  const stockMap: Record<string, number> = {};

  baseList.forEach(p => {
    stockMap[p.id] = 0;
  });

  // 1. Process Production Logs (adds finished products, deducts BOM insumos & avarias)
  (productionLogs || []).forEach(log => {
    const qty = Number(log.qtyProduced) || 0;
    const prodId = log.productId;
    const prodNameLower = (log.productName || '').toLowerCase();

    // Finished Product (+qty)
    if (prodId) {
      stockMap[prodId] = (stockMap[prodId] || 0) + qty;
    }

    const deductedInsumoIds = new Set<string>();

    // BOM Insumo Deductions (-qty * BOM)
    if (prodId === 'disp-prod-200ml-copo' || prodId === 'disp-prod-copo200' || prodNameLower.includes('copo') || prodNameLower.includes('200ml')) {
      const copoItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-copo200' || (i.name.toLowerCase().includes('copo') && !i.name.toLowerCase().includes('caixa'))));
      if (copoItem) {
        stockMap[copoItem.id] = (stockMap[copoItem.id] || 0) - (qty * 48);
        deductedInsumoIds.add(copoItem.id);
      }

      const seloItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-selo200' || i.name.toLowerCase().includes('selo')));
      if (seloItem) {
        stockMap[seloItem.id] = (stockMap[seloItem.id] || 0) - (qty * 48);
        deductedInsumoIds.add(seloItem.id);
      }

      const caixaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-cx200' || (i.name.toLowerCase().includes('caixa') && i.name.toLowerCase().includes('copo'))));
      if (caixaItem) {
        stockMap[caixaItem.id] = (stockMap[caixaItem.id] || 0) - (qty * 1);
        deductedInsumoIds.add(caixaItem.id);
      }

      const fitaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-fita' || (i.name.toLowerCase().includes('fita') && !i.name.toLowerCase().includes('rolo') && (i.unitMeasure === 'metros' || i.name.toLowerCase().includes('metro')))));
      if (fitaItem) {
        stockMap[fitaItem.id] = (stockMap[fitaItem.id] || 0) - (qty * 1);
        deductedInsumoIds.add(fitaItem.id);
      }
    } else if (prodId === 'disp-prod-510ml-garrafa' || prodId === 'disp-prod-agua510' || prodNameLower.includes('510')) {
      const garrafaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-garrafa510-soprada' || (i.name.toLowerCase().includes('garrafa') && i.name.toLowerCase().includes('510'))));
      if (garrafaItem) {
        stockMap[garrafaItem.id] = (stockMap[garrafaItem.id] || 0) - (qty * 12);
        deductedInsumoIds.add(garrafaItem.id);
      }

      const tampaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-tampa28' || i.name.toLowerCase().includes('tampa')));
      if (tampaItem) {
        stockMap[tampaItem.id] = (stockMap[tampaItem.id] || 0) - (qty * 12);
        deductedInsumoIds.add(tampaItem.id);
      }

      const rotuloItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-rotulo510' || (i.name.toLowerCase().includes('rótulo') && i.name.toLowerCase().includes('510'))));
      if (rotuloItem) {
        stockMap[rotuloItem.id] = (stockMap[rotuloItem.id] || 0) - (qty * 12);
        deductedInsumoIds.add(rotuloItem.id);
      }

      const filmeItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-filme' || i.name.toLowerCase().includes('filme')));
      if (filmeItem) {
        stockMap[filmeItem.id] = (stockMap[filmeItem.id] || 0) - (qty * 0.05);
        deductedInsumoIds.add(filmeItem.id);
      }
    } else if (prodId === 'disp-prod-15l-garrafa' || prodId === 'disp-prod-agua15l' || prodNameLower.includes('1,5') || prodNameLower.includes('1.5')) {
      const garrafaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-garrafa15l-soprada' || (i.name.toLowerCase().includes('garrafa') && (i.name.toLowerCase().includes('1,5') || i.name.toLowerCase().includes('1.5')))));
      if (garrafaItem) {
        stockMap[garrafaItem.id] = (stockMap[garrafaItem.id] || 0) - (qty * 6);
        deductedInsumoIds.add(garrafaItem.id);
      }

      const tampaItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-tampa28' || i.name.toLowerCase().includes('tampa')));
      if (tampaItem) {
        stockMap[tampaItem.id] = (stockMap[tampaItem.id] || 0) - (qty * 6);
        deductedInsumoIds.add(tampaItem.id);
      }

      const rotuloItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-rotulo15l' || (i.name.toLowerCase().includes('rótulo') && (i.name.toLowerCase().includes('1,5') || i.name.toLowerCase().includes('1.5')))));
      if (rotuloItem) {
        stockMap[rotuloItem.id] = (stockMap[rotuloItem.id] || 0) - (qty * 6);
        deductedInsumoIds.add(rotuloItem.id);
      }

      const filmeItem = baseList.find(i => i.category === 'insumo' && (i.id === 'disp-insumo-filme' || i.name.toLowerCase().includes('filme')));
      if (filmeItem) {
        stockMap[filmeItem.id] = (stockMap[filmeItem.id] || 0) - (qty * 0.08);
        deductedInsumoIds.add(filmeItem.id);
      }
    }

    // Dynamic BOM for custom linked insumos (skipping those already deducted above)
    baseList.forEach(insumo => {
      if (insumo.category === 'insumo' && insumo.consumptionRate && insumo.consumptionRate > 0) {
        if (deductedInsumoIds.has(insumo.id)) return;

        const isLinked = insumo.linkedProductId === prodId ||
                         insumo.linkedProductId === 'todos' ||
                         (insumo.linkedProductName && prodNameLower.includes(insumo.linkedProductName.toLowerCase()));
        if (isLinked) {
          stockMap[insumo.id] = (stockMap[insumo.id] || 0) - (qty * insumo.consumptionRate);
        }
      }
    });

    // Insumo Avarias
    if (log.avariasInsumos && log.avariasInsumos.length > 0) {
      log.avariasInsumos.forEach(av => {
        if (av.insumoId && av.qty > 0) {
          stockMap[av.insumoId] = (stockMap[av.insumoId] || 0) - Number(av.qty);
        }
      });
    }
  });

  // 2. Process Insumo Entries
  (insumoEntries || []).forEach(entry => {
    const qtyRec = Number(entry.qtyReceived) || 0;
    const insNameLower = (entry.insumoName || '').toLowerCase();
    const isTapeRollWithdrawal = qtyRec < 0 && (
      entry.insumoId === 'disp-insumo-fita-rolo' ||
      (insNameLower.includes('fita') && insNameLower.includes('rolo')) ||
      (entry.documentRef || '').includes('[BAIXA FITA]') ||
      (entry.notes || '').toLowerCase().includes('rolo')
    );

    if (entry.insumoId) {
      stockMap[entry.insumoId] = (stockMap[entry.insumoId] || 0) + qtyRec;
    }

    if (isTapeRollWithdrawal) {
      const tapeMetersItem = baseList.find(p => p.category === 'insumo' && (p.id === 'disp-insumo-fita' || (p.name.toLowerCase().includes('fita') && (p.unitMeasure === 'metros' || p.name.toLowerCase().includes('metro')))));
      if (tapeMetersItem) {
        stockMap[tapeMetersItem.id] = (stockMap[tapeMetersItem.id] || 0) + (Math.abs(qtyRec) * 1200);
      }
    }
  });

  // 3. Process Expeditions
  (expeditions || []).forEach(exp => {
    const qtyExp = Number(exp.qtyExpedited) || 0;
    if (exp.productId) {
      stockMap[exp.productId] = (stockMap[exp.productId] || 0) - qtyExp;
    }
  });

  return baseList.map(p => ({
    ...p,
    currentStock: Number((stockMap[p.id] !== undefined ? stockMap[p.id] : (p.currentStock || 0)).toFixed(3))
  }));
};

const defaultSystemUsers: SystemUser[] = [
  {
    id: 'user-admin',
    name: 'Administrador Geral',
    username: 'admin',
    password: '123456',
    role: 'admin',
    unit: 'matriz',
    modules: {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: true,
      prestacao_contas: true,
      estoque: true,
      linha_descartavel: true
    }
  },
  {
    id: 'user-descartavel',
    name: 'Operador Linha Descartável',
    username: 'descartavel',
    password: '123456',
    role: 'operador',
    unit: 'matriz',
    modules: {
      portaria: false,
      fila: false,
      abastecimento: false,
      relatorios: false,
      chat: true,
      cadastros: false,
      config: false,
      prestacao_contas: false,
      estoque: true,
      linha_descartavel: true
    }
  },
  {
    id: 'user-portaria',
    name: 'Operador de Portaria',
    username: 'portaria',
    password: '123456',
    role: 'operador',
    unit: 'matriz',
    modules: {
      portaria: true,
      fila: false,
      abastecimento: false,
      relatorios: false,
      chat: true,
      cadastros: true,
      config: false,
      prestacao_contas: false,
      estoque: false,
      linha_descartavel: false
    }
  },
  {
    id: 'user-posto',
    name: 'Operador do Posto',
    username: 'posto',
    password: '123456',
    role: 'operador',
    unit: 'matriz',
    modules: {
      portaria: false,
      fila: false,
      abastecimento: true,
      relatorios: false,
      chat: true,
      cadastros: false,
      config: false,
      prestacao_contas: false,
      estoque: false,
      linha_descartavel: false
    }
  },
  {
    id: 'user-supervisor',
    name: 'Supervisor de Vendas',
    username: 'supervisor',
    password: '123456',
    role: 'supervisor',
    unit: 'matriz',
    modules: {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: false,
      prestacao_contas: true,
      estoque: true,
      linha_descartavel: true
    }
  }
];

export const defaultCustomAvariaTypes: CustomAvariaType[] = [
  { id: 'av-microfuro', type: 'microfuro', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencidomes', type: 'vencido do mês (seco)', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencidocheio', type: 'vencido (cheio)', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencido', type: 'vencido', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-cheiro', type: 'cheiro', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-quebrado', type: 'quebrado', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-quebradolac', type: 'quebrado lacrado', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-lodo', type: 'lodo', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-rota', type: 'vasilhame de rota', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-quebramaq', type: 'quebra na maquina', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-quebracarr', type: 'quebra carregamento', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-ressecado', type: 'ressecado', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-corpoestranho', type: 'corpo estranho', classification: 'carregamento', category: 'retorno_lavagem', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-mallavado', type: 'mal lavado', classification: 'carregamento', category: 'retorno_lavagem', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-saopedro', type: 'Vasilhame São Pedro', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-prime', type: 'Vasilhame Prime', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-troca', type: 'troca avaria/água', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: false },
];

export const isRewashType = (type: any, customAvariaTypesList: CustomAvariaType[] = []): boolean => {
  if (!type || typeof type !== 'string') return false;
  const cleaned = cleanOccurrenceTypeName(type).toLowerCase().trim();
  const found = (customAvariaTypesList || []).find(t => cleanOccurrenceTypeName(t?.type || '').toLowerCase().trim() === cleaned);
  if (found && found.category === 'retorno_lavagem') return true;
  return cleaned === 'corpo estranho' || cleaned === 'mal lavado' || cleaned.includes('corpo estranho') || cleaned.includes('mal lavado');
};

export const cleanOccurrenceTypeName = (name: any): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  let cleaned = name.trim();
  
  // 1. Remove system-added prefixes like "+Compra: ", "+compra: ", "Compra: ", "compra: "
  cleaned = cleaned.replace(/^\+?\s*compra\s*:\s*/i, '');
  
  // 2. Remove leading "+" or "+ "
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1).trim();
  }
  
  // 3. Remove "compra " prefix if it was added automatically by the system
  // We can do this if it starts with "compra " (case insensitive) followed by more characters but is not exactly "compra vasilhame"
  const lower = cleaned.toLowerCase();
  if (lower.startsWith('compra ') && lower !== 'compra vasilhame' && cleaned.length > 7) {
    cleaned = cleaned.substring(7).trim();
  }
  
  return cleaned.trim();
};

export const getProductionCode = (m: Movement | undefined | null): string => {
  if (!m) return '';
  if (m.productionCode) return m.productionCode;
  const date = m.timestamp ? new Date(m.timestamp) : new Date();
  const yearMonth = date.getFullYear() + (date.getMonth() + 1).toString().padStart(2, '0');
  const cleanId = m.id.replace(/^mov-/, '');
  const suffix = (cleanId.length >= 4 ? cleanId.substring(cleanId.length - 4) : cleanId).toUpperCase();
  return `PRD-${yearMonth}-${suffix}`;
};

export const normalizeStockProductKey = (name: any): string => {
  const cleaned = cleanOccurrenceTypeName(name).toLowerCase().trim();
  if (cleaned.includes('rota')) {
    return 'vasilhame de rota';
  }
  if (cleaned.includes('são pedro') || cleaned.includes('sao pedro')) {
    return 'vasilhame são pedro';
  }
  if (cleaned.includes('prime')) {
    return 'vasilhame prime';
  }
  if (cleaned.includes('sucata')) {
    return 'sucata';
  }
  return cleaned;
};

export function syncStockRequests(
  existingRequests: StockRequest[] = [],
  newItemList: { type: string; qty: number }[],
  stage: 'descarregamento' | 'carregamento',
  targetAlertProducts: string[],
  unit?: 'matriz' | 'filial',
  movementId?: string,
  resolvedStockAlerts: string[] = []
): StockRequest[] {
  let requests = [...existingRequests];

  newItemList.forEach(item => {
    const rawName = cleanOccurrenceTypeName(item.type);
    const normName = normalizeStockProductKey(item.type);
    if (!targetAlertProducts.includes(normName)) return;

    // Sum of all existing requests for this product and stage
    const productRequests = requests.filter(r => 
      r.stage === stage && 
      normalizeStockProductKey(r.product) === normName
    );

    const existingSum = productRequests.reduce((sum, r) => sum + r.qty, 0);
    const targetQty = item.qty;

    if (targetQty > existingSum) {
      const diff = targetQty - existingSum;

      // Check if this product/stage alert for this movement is already approved in resolvedStockAlerts
      let preResolved = false;
      const safeAlerts = resolvedStockAlerts || [];
      if (movementId && safeAlerts.length > 0) {
        const prefix = `${movementId}-${normName}-${stage}`;
        preResolved = safeAlerts.some(alertId => 
          alertId === prefix || 
          alertId.startsWith(`${prefix}-active-`) ||
          alertId.startsWith(`${prefix}-`)
        );
      }

      requests.push({
        id: `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        product: normName === 'vasilhame são pedro' ? 'Vasilhame São Pedro' : normName === 'vasilhame prime' ? 'Vasilhame Prime' : normName === 'vasilhame de rota' ? 'Vasilhame de Rota' : rawName,
        qty: diff,
        stage,
        timestamp: new Date().toISOString(),
        resolved: preResolved,
        unit
      });
    } else if (targetQty < existingSum) {
      let toReduce = existingSum - targetQty;
      const unresolved = productRequests
        .filter(r => !r.resolved)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      for (const req of unresolved) {
        if (toReduce <= 0) break;
        if (req.qty <= toReduce) {
          toReduce -= req.qty;
          requests = requests.filter(r => r.id !== req.id);
        } else {
          req.qty -= toReduce;
          toReduce = 0;
        }
      }
    }
  });

  return requests;
}

export const normalizeOccurrenceTypeName = (name: string): string => {
  return cleanOccurrenceTypeName(name);
};

export const migrateAvariaTypes = (list: any[] | undefined, movements?: any[]): CustomAvariaType[] => {
  let migrated: CustomAvariaType[] = [];

  const isMigrationNeeded = list === undefined || (Array.isArray(list) && list.some(item => typeof item === 'string'));

  if (!list || list.length === 0) {
    migrated = [...defaultCustomAvariaTypes];
  } else if (typeof list[0] === 'string') {
    const rawMigrated: CustomAvariaType[] = [...defaultCustomAvariaTypes];
    list.forEach((item: any, idx: number) => {
      if (typeof item !== 'string') return;
      const cleanedName = cleanOccurrenceTypeName(item);
      const norm = cleanedName.toLowerCase().trim();
      if (!norm || norm === 'compra vasilhame' || defaultCustomAvariaTypes.some(d => d.type.toLowerCase().trim() === norm)) {
        return;
      }
      let classification: 'descarregamento' | 'carregamento' | 'ambos' = 'ambos';
      if (norm.includes('máquina') || norm.includes('maquina') || norm.includes('carregamento') || norm.includes('envase')) {
        classification = 'carregamento';
      } else if (norm.includes('cheiro') || norm.includes('lodo') || norm.includes('descarregamento')) {
        classification = 'descarregamento';
      }
      const isPurchase = norm.startsWith('+') || norm.includes('compra');
      rawMigrated.push({
        id: `migrated-${idx}-${Date.now()}`,
        type: cleanedName,
        classification,
        category: isPurchase ? 'compra' : 'avaria'
      });
    });
    migrated = rawMigrated;
  } else {
    migrated = (list as CustomAvariaType[])
      .filter(item => item && typeof item === 'object' && typeof item.type === 'string')
      .map(item => {
        const cleanedName = cleanOccurrenceTypeName(item.type);
        const norm = cleanedName.toLowerCase().trim();
        const isPurchase = norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || item.category === 'compra' || item.category === 'vasilhame_rota';
        return {
          ...item,
          type: cleanedName,
          category: isPurchase ? 'compra' : (item.category || 'avaria')
        };
      });
  }

  // Harvest any unique occurrences present in the movements list ONLY during old migration
  if (isMigrationNeeded && movements && Array.isArray(movements)) {
    movements.forEach(m => {
      if (!m || !m.productionControl) return;
      
      const desc = m.productionControl.avariasDescarregamento || [];
      const carreg = m.productionControl.avariasCarregamento || [];
      
      [...desc, ...carreg].forEach(entry => {
        if (!entry || !entry.type) return;
        const cleaned = cleanOccurrenceTypeName(entry.type);
        if (!cleaned) return;
        const norm = cleaned.toLowerCase().trim();
        
        if (norm === 'compra vasilhame') return;

        // Ensure not already in migrated
        const exists = migrated.some(t => t && t.type && cleanOccurrenceTypeName(t.type).toLowerCase().trim() === norm);
        if (!exists) {
          const isPurchase = norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || norm.includes('são pedro');
          
          const isInDesc = desc.some((d: any) => d && d.type && cleanOccurrenceTypeName(d.type).toLowerCase().trim() === norm);
          const isInCarreg = carreg.some((c: any) => c && c.type && cleanOccurrenceTypeName(c.type).toLowerCase().trim() === norm);
          
          let classification: 'descarregamento' | 'carregamento' | 'ambos' = 'ambos';
          if (isInDesc && !isInCarreg) {
            classification = 'descarregamento';
          } else if (isInCarreg && !isInDesc) {
            classification = 'carregamento';
          }
          
          migrated.push({
            id: `harvested-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type: cleaned,
            classification,
            category: isPurchase ? 'compra' : 'avaria'
          });
        }
      });
    });
  }

  // Ensure all default custom avaria types exist in migrated, and that "vasilhame de rota" is mapped to category "compra"
  const descOnlyTypes = [
    'microfuro', 'vencido do mês (seco)', 'vencido do mes (seco)', 'vencido (cheio)', 'quebrado lacrado',
    'troca avaria/água'
  ];

  defaultCustomAvariaTypes.forEach(d => {
    const dNorm = cleanOccurrenceTypeName(d.type).toLowerCase().trim();
    const exists = migrated.some(m => m && m.type && cleanOccurrenceTypeName(m.type).toLowerCase().trim() === dNorm);
    if (!exists) {
      migrated.push({
        ...d,
        classification: descOnlyTypes.includes(dNorm) ? 'descarregamento' : d.classification,
        category: dNorm === 'vasilhame de rota' ? 'compra' : (dNorm === 'corpo estranho' || dNorm === 'mal lavado') ? 'retorno_lavagem' : d.category
      });
    } else {
      migrated = migrated.map(m => {
        const mNorm = cleanOccurrenceTypeName(m.type).toLowerCase().trim();
        if (mNorm === dNorm || (dNorm.startsWith('vencido do m') && mNorm.startsWith('vencido do m'))) {
          let updated = { ...m };
          if (descOnlyTypes.includes(dNorm) || (dNorm.startsWith('vencido do m') && mNorm.startsWith('vencido do m'))) {
            updated.classification = 'descarregamento';
          }
          if (dNorm === 'vasilhame de rota') {
            updated.category = 'compra';
          }
          if (dNorm === 'corpo estranho' || dNorm === 'mal lavado') {
            updated.category = 'retorno_lavagem';
          }
          return updated;
        }
        return m;
      });
    }
  });

  return migrated.filter(item => {
    const norm = cleanOccurrenceTypeName(item.type).toLowerCase().trim();
    return norm !== 'compra vasilhame' && norm !== 'vencido (carregamento)';
  });
};

export const migrateStockProducts = (products: any[], defaultUnit: 'matriz' | 'filial' = 'matriz'): { name: string; unit: 'matriz' | 'filial' }[] => {
  if (!products) return [];
  return products.map(p => {
    if (typeof p === 'string') {
      return { name: p, unit: defaultUnit };
    }
    return {
      name: p.name || '',
      unit: p.unit || defaultUnit
    };
  }).filter(p => p.name);
};

export const migrateInitialStockLevels = (levels: Record<string, number>): Record<string, number> => {
  if (!levels) return {};
  const migrated: Record<string, number> = {};
  Object.entries(levels).forEach(([key, val]) => {
    if (key.startsWith('matriz_') || key.startsWith('filial_')) {
      migrated[key] = val;
    } else {
      // legacy un-prefixed keys go to 'matriz'
      migrated[`matriz_${key}`] = val;
    }
  });
  return migrated;
};

export const migrateSystemUsersList = (users: any[] | undefined): SystemUser[] => {
  if (!users) return defaultSystemUsers;
  return users.map((u: any) => ({
    ...u,
    modules: (u.role === 'admin' || u.role === 'supervisor') ? {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: true,
      prestacao_contas: true,
      estoque: true,
      linha_descartavel: true
    } : {
      portaria: true,
      fila: false,
      abastecimento: false,
      relatorios: false,
      chat: true,
      cadastros: true,
      config: false,
      prestacao_contas: false,
      estoque: false,
      linha_descartavel: true,
      ...(u.modules || {})
    }
  }));
};

export const migrateCurrentUser = (user: any): User | null => {
  if (!user) return null;
  return {
    ...user,
    modules: (user.role === 'admin' || user.role === 'supervisor') ? {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: true,
      prestacao_contas: true,
      estoque: true,
      linha_descartavel: true
    } : {
      portaria: true,
      fila: false,
      abastecimento: false,
      relatorios: false,
      chat: true,
      cadastros: true,
      config: false,
      prestacao_contas: false,
      estoque: false,
      linha_descartavel: true,
      ...(user.modules || {})
    }
  };
};

export const ensureLinhaDescartavelInPurposes = (purposes: any[] | undefined): any[] => {
  const list = purposes || [
    { id: 'producao', name: 'Fluxo Normal de Produção (Fila Retornável)', bypassProductionDefault: false },
    { id: 'linha_descartavel', name: 'Cliente / Expedição Linha Descartável', bypassProductionDefault: true },
    { id: 'carga_descarga', name: 'Carga / Descarga de Mercadorias', bypassProductionDefault: true },
    { id: 'entrega_mercadoria', name: 'Entregas de Insumos / Encomendas', bypassProductionDefault: true },
    { id: 'visita_servico', name: 'Visita ou Prestação de Serviços', bypassProductionDefault: true },
  ];
  if (!list.some((p: any) => p.id === 'linha_descartavel')) {
    return [
      ...list,
      { id: 'linha_descartavel', name: 'Cliente / Expedição Linha Descartável', bypassProductionDefault: true }
    ];
  }
  return list;
};

export const defaultProductionMachines: Record<string, Record<string, MachineInfo>> = {
  matriz: {
    machine_1: {
      id: 'machine_1',
      name: 'Máquina 1 (Linha Pesada)',
      lineType: 'pesada',
      status: 'operacional',
    },
    machine_2: {
      id: 'machine_2',
      name: 'Máquina 2 (Linha Média)',
      lineType: 'media',
      status: 'operacional',
    },
  },
  filial: {
    machine_1: {
      id: 'machine_1',
      name: 'Máquina 1 (Linha Principal)',
      lineType: 'pesada',
      status: 'operacional',
    },
  },
};

const defaultState: AppState = {
  currentUser: null,
  movements: [],
  supplies: [],
  preSales: [],
  productionOpen: { matriz: true, filial: true },
  productionStatusDetails: {},
  productionStopLogs: [],
  productionMachines: defaultProductionMachines,
  dieselPurchases: [],
  initialDieselStock: 0,
  dieselTankCapacity: 15000,
  arlaPurchases: [],
  initialArlaStock: 0,
  arlaTankCapacity: 3000,
  customChecklistItems: ['Cinto de Segurança', 'Nível do Óleo', 'Extintor de Incêndio', 'Vidros e Retrovisores'],
  systemUsers: defaultSystemUsers,
  registeredVehicles: [],
  registeredDrivers: [],
  registeredSupervisors: [],
  registeredClients: [],
  registeredCities: [
    { id: 'city-1', name: 'São Paulo', uf: 'SP' },
    { id: 'city-2', name: 'Rio de Janeiro', uf: 'RJ' },
    { id: 'city-3', name: 'Belo Horizonte', uf: 'MG' },
    { id: 'city-4', name: 'Campinas', uf: 'SP' },
    { id: 'city-5', name: 'Curitiba', uf: 'PR' },
    { id: 'city-6', name: 'Porto Alegre', uf: 'RS' },
    { id: 'city-7', name: 'Salvador', uf: 'BA' },
    { id: 'city-8', name: 'Goiânia', uf: 'GO' },
    { id: 'city-9', name: 'Ribeirão Preto', uf: 'SP' },
    { id: 'city-10', name: 'Santos', uf: 'SP' },
  ],
  companyLogo: '',
  avgTimeDischarging: 30,
  avgTimeLoading: 45,
  customStockProducts: [],
  initialStockLevels: {},
  manualStockAdjustments: [],
  resolvedStockAlerts: [],
  verifiedScrapAlerts: [],
  scrapConferences: [],
  driverSettlements: [],
  bankTransactions: [],
  customVehicleCategories: [
    { id: 'carreta', name: 'Carreta (Pesada)', bypassProductionDefault: false },
    { id: 'truck', name: 'Truck (Pesada)', bypassProductionDefault: false },
    { id: 'toco', name: 'Toco (Média)', bypassProductionDefault: false },
    { id: '3/4', name: '3/4 (Média)', bypassProductionDefault: false },
    { id: 'passeio', name: 'Passeio (Leve)', bypassProductionDefault: true },
    { id: 'moto', name: 'Moto', bypassProductionDefault: true },
    { id: 'utilitario', name: 'Utilitário / Van', bypassProductionDefault: true },
  ],
  customEntryPurposes: [
    { id: 'producao', name: 'Fluxo Normal de Produção (Fila Retornável)', bypassProductionDefault: false },
    { id: 'linha_descartavel', name: 'Cliente / Expedição Linha Descartável', bypassProductionDefault: true },
    { id: 'carga_descarga', name: 'Carga / Descarga de Mercadorias', bypassProductionDefault: true },
    { id: 'entrega_mercadoria', name: 'Entregas de Insumos / Encomendas', bypassProductionDefault: true },
    { id: 'visita_servico', name: 'Visita ou Prestação de Serviços', bypassProductionDefault: true },
  ],
  customAvariaTypes: defaultCustomAvariaTypes,
  disposableProducts: defaultDisposableProducts,
  disposableProductionLogs: [],
  disposableInsumoEntries: [],
  disposableExpeditions: [],
  clearedAt: 0,
  deletedIds: [],
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const computeStringHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${str.length}_${hash}`;
};

export const stripHeavyData = (sharedData: any, savePhotoFn?: (id: string, photos: any) => void): any => {
  if (!sharedData || typeof sharedData !== 'object') return sharedData;

  const strippedMovements = (sharedData.movements || []).map((m: any) => {
    if (!m) return m;
    let newM = m;
    let changed = false;

    if (m.orderPhoto && (m.orderPhoto.startsWith('data:') || m.orderPhoto.length > 200)) {
      if (savePhotoFn) savePhotoFn(m.id, { orderPhoto: m.orderPhoto });
      if (!changed) { newM = { ...m }; changed = true; }
      newM.hasOrderPhoto = true;
      newM.orderPhoto = '';
    }

    if (m.productionControl) {
      let pcChanged = false;
      let newPC = m.productionControl;

      if (m.productionControl.avariasDescarregamentoPhoto && (m.productionControl.avariasDescarregamentoPhoto.startsWith('data:') || m.productionControl.avariasDescarregamentoPhoto.length > 200)) {
        if (savePhotoFn) savePhotoFn(m.id, { avariasDescarregamentoPhoto: m.productionControl.avariasDescarregamentoPhoto });
        if (!pcChanged) { newPC = { ...m.productionControl }; pcChanged = true; }
        newPC.hasAvariasDescarregamentoPhoto = true;
        newPC.avariasDescarregamentoPhoto = '';
      }

      if (m.productionControl.avariasCarregamentoPhoto && (m.productionControl.avariasCarregamentoPhoto.startsWith('data:') || m.productionControl.avariasCarregamentoPhoto.length > 200)) {
        if (savePhotoFn) savePhotoFn(m.id, { avariasCarregamentoPhoto: m.productionControl.avariasCarregamentoPhoto });
        if (!pcChanged) { newPC = { ...m.productionControl }; pcChanged = true; }
        newPC.hasAvariasCarregamentoPhoto = true;
        newPC.avariasCarregamentoPhoto = '';
      }

      if (pcChanged) {
        if (!changed) { newM = { ...m }; changed = true; }
        newM.productionControl = newPC;
      }
    }

    return newM;
  });

  const strippedExpeditions = (sharedData.disposableExpeditions || []).map((exp: any) => {
    if (!exp) return exp;
    if (exp.attachmentUrl && (exp.attachmentUrl.startsWith('data:') || exp.attachmentUrl.length > 200)) {
      if (savePhotoFn) savePhotoFn(exp.id, { attachmentUrl: exp.attachmentUrl });
      return { ...exp, hasAttachment: true, attachmentUrl: '' };
    }
    return exp;
  });

  const strippedInsumos = (sharedData.disposableInsumoEntries || []).map((ins: any) => {
    if (!ins) return ins;
    if (ins.attachmentUrl && (ins.attachmentUrl.startsWith('data:') || ins.attachmentUrl.length > 200)) {
      if (savePhotoFn) savePhotoFn(ins.id, { attachmentUrl: ins.attachmentUrl });
      return { ...ins, hasAttachment: true, attachmentUrl: '' };
    }
    return ins;
  });

  const strippedTripLoads = (sharedData.driverTripLoads || []).map((load: any) => {
    if (!load) return load;
    if (load.attachmentUrl && (load.attachmentUrl.startsWith('data:') || load.attachmentUrl.length > 200)) {
      if (savePhotoFn) savePhotoFn(load.id, { attachmentUrl: load.attachmentUrl });
      return { ...load, hasAttachment: true, attachmentUrl: '' };
    }
    return load;
  });

  const strippedTripDeliveries = (sharedData.driverTripDeliveries || []).map((del: any) => {
    if (!del) return del;
    if (del.attachmentUrl && (del.attachmentUrl.startsWith('data:') || del.attachmentUrl.length > 200)) {
      if (savePhotoFn) savePhotoFn(del.id, { attachmentUrl: del.attachmentUrl });
      return { ...del, hasAttachment: true, attachmentUrl: '' };
    }
    return del;
  });

  const strippedSettlements = (sharedData.driverSettlements || []).map((ds: any) => {
    if (!ds) return ds;
    let changed = false;
    let newDs = ds;
    if (ds.attachmentUrl && (ds.attachmentUrl.startsWith('data:') || ds.attachmentUrl.length > 200)) {
      if (savePhotoFn) savePhotoFn(ds.id, { attachmentUrl: ds.attachmentUrl });
      newDs = { ...newDs, hasAttachment: true, attachmentUrl: '' };
      changed = true;
    }
    return newDs;
  });

  const strippedPreSales = (sharedData.preSales || []).map((ps: any) => {
    if (!ps) return ps;
    const att = ps.attachmentUrl || ps.photoUrl || ps.expeditionPhoto;
    if (att && (att.startsWith('data:') || att.length > 200)) {
      if (savePhotoFn) savePhotoFn(ps.id, { attachmentUrl: att });
      return { ...ps, hasAttachment: true, attachmentUrl: '', photoUrl: '', expeditionPhoto: '' };
    }
    return ps;
  });

  const sanitizeDeep = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeDeep).filter(item => item !== undefined);
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === undefined) continue;
      if (key === 'companyLogo' || key === 'signature' || key === 'clientSignature') {
        result[key] = val;
      } else if (typeof val === 'string' && (val.startsWith('data:') || (val.length > 200 && key.toLowerCase().includes('photo')))) {
        result[key] = '';
      } else if (typeof val === 'object' && val !== null) {
        result[key] = sanitizeDeep(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  const systemAuditLogs = (sharedData.systemAuditLogs || []).slice(0, 300);
  const deletedMovementsLogs = (sharedData.deletedMovementsLogs || []).slice(0, 300);

  return sanitizeDeep({
    ...sharedData,
    movements: strippedMovements,
    disposableExpeditions: strippedExpeditions,
    disposableInsumoEntries: strippedInsumos,
    driverTripLoads: strippedTripLoads,
    driverTripDeliveries: strippedTripDeliveries,
    driverSettlements: strippedSettlements,
    preSales: strippedPreSales,
    systemAuditLogs,
    deletedMovementsLogs
  });
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirstFetchCompleted = React.useRef(false);
  const ignoreNextPush = React.useRef(false);
  const lastLocalMutationTime = React.useRef<number>(0);
  const pushDebounceTimeout = React.useRef<any>(null);

  const [hasPendingSync, setHasPendingSync] = useState(() => {
    const saved = localStorage.getItem('industrack_state');
    const lastSyncedHash = localStorage.getItem('industrack_last_synced_hash');
    if (!saved) return false;
    if (!lastSyncedHash) return true;
    try {
      const parsedSaved = JSON.parse(saved);
      const { currentUser: _, ...savedShared } = parsedSaved;
      const cleanShared = stripHeavyData(savedShared);
      const currentHash = computeStringHash(JSON.stringify(cleanShared));
      return currentHash !== lastSyncedHash;
    } catch {
      return false;
    }
  });

  const checkPendingSync = (currentState: AppState) => {
    const { currentUser, ...sharedData } = currentState;
    const cleanSharedData = stripHeavyData(sharedData);
    const currentStr = JSON.stringify(cleanSharedData);
    const currentHash = computeStringHash(currentStr);
    const lastSyncedHash = localStorage.getItem('industrack_last_synced_hash') || '';
    return currentHash !== lastSyncedHash;
  };

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('industrack_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migratedSystemUsers = migrateSystemUsersList(parsed.systemUsers);
        const migratedCurrentUser = migrateCurrentUser(parsed.currentUser);

        return {
          ...defaultState,
          ...parsed,
          systemUsers: migratedSystemUsers,
          currentUser: migratedCurrentUser,
          dieselPurchases: parsed.dieselPurchases || [],
          initialDieselStock: parsed.initialDieselStock !== undefined ? parsed.initialDieselStock : 0,
          dieselTankCapacity: parsed.dieselTankCapacity !== undefined ? parsed.dieselTankCapacity : 15000,
          arlaPurchases: parsed.arlaPurchases || [],
          initialArlaStock: parsed.initialArlaStock !== undefined ? parsed.initialArlaStock : 0,
          arlaTankCapacity: parsed.arlaTankCapacity !== undefined ? parsed.arlaTankCapacity : 3000,
          customChecklistItems: parsed.customChecklistItems || [
            'Cinto de Segurança', 
            'Nível do Óleo', 
            'Extintor de Incêndio', 
            'Vidros e Retrovisores'
          ],
          registeredVehicles: parsed.registeredVehicles || [],
          registeredDrivers: parsed.registeredDrivers || [],
          registeredClients: parsed.registeredClients || [],
          registeredCities: parsed.registeredCities || defaultState.registeredCities,
          customVehicleCategories: parsed.customVehicleCategories || defaultState.customVehicleCategories,
          customEntryPurposes: ensureLinhaDescartavelInPurposes(parsed.customEntryPurposes),
          customAvariaTypes: migrateAvariaTypes(parsed.customAvariaTypes, parsed.movements),
          companyLogo: parsed.companyLogo !== undefined ? parsed.companyLogo : '',
          customStockProducts: migrateStockProducts(parsed.customStockProducts || []),
          initialStockLevels: migrateInitialStockLevels(parsed.initialStockLevels || {}),
          manualStockAdjustments: parsed.manualStockAdjustments || [],
          resolvedStockAlerts: parsed.resolvedStockAlerts || [],
          verifiedScrapAlerts: parsed.verifiedScrapAlerts || [],
          scrapConferences: parsed.scrapConferences || [],
          driverSettlements: parsed.driverSettlements || [],
          bankTransactions: parsed.bankTransactions || [],
          preSales: parsed.preSales || [],
          disposableProducts: recalculateDisposableProductsStock(
            parsed.disposableProducts || [],
            parsed.disposableProductionLogs || [],
            parsed.disposableInsumoEntries || [],
            parsed.disposableExpeditions || []
          ),
          disposableProductionLogs: parsed.disposableProductionLogs || [],
          disposableInsumoEntries: parsed.disposableInsumoEntries || [],
          disposableExpeditions: parsed.disposableExpeditions || [],
          productionOpen: parsed.productionOpen || defaultState.productionOpen,
          productionStatusDetails: parsed.productionStatusDetails || {},
          productionStopLogs: parsed.productionStopLogs || [],
          productionMachines: parsed.productionMachines || defaultProductionMachines,
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  const stateRef = React.useRef(state);
  const isPushingRef = React.useRef(false);
  const lastPushedHashRef = React.useRef('');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string; loading?: boolean }>>({});

  const getMovementPhotos = (movementId: string) => {
    const cached = loadedPhotos[movementId];
    if (cached) {
      return cached;
    }

    // Set sentinel to loading to prevent duplicate requests
    setLoadedPhotos(prev => ({
      ...prev,
      [movementId]: { loading: true }
    }));

    // Async load
    const load = async () => {
      // 1. Try Firestore
      try {
        const docRef = doc(db, 'movementPhotos', movementId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setLoadedPhotos(prev => ({
            ...prev,
            [movementId]: {
              orderPhoto: data.orderPhoto || '',
              avariasDescarregamentoPhoto: data.avariasDescarregamentoPhoto || '',
              avariasCarregamentoPhoto: data.avariasCarregamentoPhoto || '',
              attachmentUrl: data.attachmentUrl || '',
              loading: false
            }
          }));
          return;
        }
      } catch (err) {
        console.warn(`Firestore getMovementPhotos fail for ${movementId}:`, err);
      }

      // 2. Try Server fallback
      try {
        const res = await fetch(`/api/photos/${movementId}`);
        if (res.ok) {
          const data = await res.json();
          setLoadedPhotos(prev => ({
            ...prev,
            [movementId]: {
              orderPhoto: data.orderPhoto || '',
              avariasDescarregamentoPhoto: data.avariasDescarregamentoPhoto || '',
              avariasCarregamentoPhoto: data.avariasCarregamentoPhoto || '',
              attachmentUrl: data.attachmentUrl || '',
              loading: false
            }
          }));
          return;
        }
      } catch (err) {
        console.warn(`REST fallback getMovementPhotos fail for ${movementId}:`, err);
      }

      setLoadedPhotos(prev => ({
        ...prev,
        [movementId]: { loading: false }
      }));
    };

    load();
    return { loading: true };
  };

  const savePhotosForMovement = async (movementId: string, photos: { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string; attachmentUrl?: string }) => {
    if (!movementId) return;
    // Merge into local cache
    setLoadedPhotos(prev => ({
      ...prev,
      [movementId]: {
        ...prev[movementId],
        ...photos,
        loading: false
      }
    }));

    // Save to Firestore
    try {
      const docRef = doc(db, 'movementPhotos', movementId);
      await setDoc(docRef, photos, { merge: true });
    } catch (err: any) {
      if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
        console.warn(`Firestore write quota exceeded for movementPhotos ${movementId}. Saved via REST API server.`);
      } else {
        console.warn(`Failed to save photos to Firestore for ${movementId}:`, err);
      }
    }

    // Save to server REST
    try {
      await fetch(`/api/photos/${movementId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photos)
      });
    } catch (err) {
      console.warn(`Failed to save photos to REST server for ${movementId}:`, err);
    }
  };

  // Fetch latest state from back-end server REST API as a robust sync fallback
  const fetchState = async () => {
    if (Date.now() - lastLocalMutationTime.current < 4000) {
      return;
    }
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setState((s) => {
            const stringifiedIncoming = JSON.stringify(data);
            const { currentUser: _, ...localShared } = s;
            const stringifiedLocal = JSON.stringify(localShared);

            if (stringifiedIncoming === stringifiedLocal) {
              return s;
            }

            // Flag to ensure the subsequent local write useEffect is skipped for this incoming cycle
            ignoreNextPush.current = true;

            const incomingClearedAt = data.clearedAt || 0;
            const localClearedAt = s.clearedAt || 0;

            if (incomingClearedAt > localClearedAt) {
              const merged = {
                ...defaultState,
                ...data,
                currentUser: s.currentUser
              };
              localStorage.setItem('industrack_state', JSON.stringify(merged));
              return merged;
            } else if (localClearedAt > incomingClearedAt) {
              // Local state is newer (e.g. database has been cleared on this client).
              // Stale server data must be discarded to prevent resurrection.
              return s;
            }

            const mergedDeletedIds = Array.from(new Set([
              ...(data.deletedIds || []),
              ...(s.deletedIds || [])
            ]));

            const mergedMovements = [...(data.movements || [])];
            (s.movements || []).forEach((localM: any) => {
              const incomingMIndex = mergedMovements.findIndex((im: any) => im.id === localM.id);
              if (incomingMIndex !== -1) {
                const incomingM = mergedMovements[incomingMIndex];
                
                const getLatestTime = (m: any) => {
                  const times = [
                    new Date(m.timestamp || 0).getTime(),
                    new Date(m.entryTimestamp || 0).getTime(),
                  ];
                  if (m.kanbanTimings) {
                    Object.values(m.kanbanTimings).forEach((t: any) => {
                      if (t) times.push(new Date(t).getTime());
                    });
                  }
                  if (m.editedAt) {
                    times.push(new Date(m.editedAt).getTime());
                  }
                  if (m.productionControl?.unloadingEditLogs) {
                    m.productionControl.unloadingEditLogs.forEach((log: any) => {
                      if (log.timestamp) times.push(new Date(log.timestamp).getTime());
                    });
                  }
                  return Math.max(...times.filter(t => !isNaN(t)));
                };

                const isLocalNewer = getLatestTime(localM) > getLatestTime(incomingM);
                const mergedM = isLocalNewer ? { ...localM } : { ...incomingM };

                if (!mergedM.orderPhoto && (localM.orderPhoto || incomingM.orderPhoto)) {
                  mergedM.orderPhoto = localM.orderPhoto || incomingM.orderPhoto;
                }

                if (localM.productionControl || incomingM.productionControl) {
                  const baseControl = isLocalNewer ? (localM.productionControl || {}) : (incomingM.productionControl || {});
                  const secondaryControl = isLocalNewer ? (incomingM.productionControl || {}) : (localM.productionControl || {});

                  const mergedSales = ((base: any[] = [], sec: any[] = []) => {
                    if (!base.length && !sec.length) return [];
                    const res = [...base];
                    sec.forEach(s => {
                      const idx = res.findIndex(r => r.id === s.id || (r.saleNumber && s.saleNumber && r.saleNumber === s.saleNumber && r.item === s.item));
                      if (idx !== -1) {
                        const preservedSig = res[idx].signature || s.signature;
                        res[idx] = { ...s, ...res[idx], signature: preservedSig || undefined };
                      } else {
                        res.push(s);
                      }
                    });
                    const saleSignatures: Record<string, string> = {};
                    res.forEach(item => {
                      if (item.saleNumber && item.signature) {
                        saleSignatures[item.saleNumber] = item.signature;
                      }
                    });
                    return res.map(item => {
                      if (item.saleNumber && !item.signature && saleSignatures[item.saleNumber]) {
                        return { ...item, signature: saleSignatures[item.saleNumber] };
                      }
                      return item;
                    });
                  })(baseControl.mobileSales || [], secondaryControl.mobileSales || []);

                  mergedM.productionControl = {
                    ...secondaryControl,
                    ...baseControl,
                    mobileSales: mergedSales,
                    mobileExpenses: baseControl.mobileExpenses !== undefined ? baseControl.mobileExpenses : (secondaryControl.mobileExpenses || []),
                    mobileBonifications: baseControl.mobileBonifications !== undefined ? baseControl.mobileBonifications : secondaryControl.mobileBonifications,
                    mobileComodato: baseControl.mobileComodato !== undefined ? baseControl.mobileComodato : secondaryControl.mobileComodato,
                    mobileComodatoReturn: baseControl.mobileComodatoReturn !== undefined ? baseControl.mobileComodatoReturn : secondaryControl.mobileComodatoReturn,
                    mobileExchanges: baseControl.mobileExchanges !== undefined ? baseControl.mobileExchanges : secondaryControl.mobileExchanges,
                  };

                  if (!mergedM.productionControl.avariasDescarregamentoPhoto && (localM.productionControl?.avariasDescarregamentoPhoto || incomingM.productionControl?.avariasDescarregamentoPhoto)) {
                    mergedM.productionControl.avariasDescarregamentoPhoto = localM.productionControl?.avariasDescarregamentoPhoto || incomingM.productionControl?.avariasDescarregamentoPhoto;
                  }
                  if (!mergedM.productionControl.avariasCarregamentoPhoto && (localM.productionControl?.avariasCarregamentoPhoto || incomingM.productionControl?.avariasCarregamentoPhoto)) {
                    mergedM.productionControl.avariasCarregamentoPhoto = localM.productionControl?.avariasCarregamentoPhoto || incomingM.productionControl?.avariasCarregamentoPhoto;
                  }
                }

                mergedMovements[incomingMIndex] = mergedM;
              } else {
                mergedMovements.push(localM);
              }
            });

            const finalMergedMovements = mergedMovements.filter(m => !mergedDeletedIds.includes(m.id));

            const mergeArrayById = <T extends { id: string }>(incoming: T[] | undefined, local: T[] | undefined): T[] => {
              const merged = [...(incoming || [])];
              (local || []).forEach((localItem) => {
                const incomingIndex = merged.findIndex((item) => item.id === localItem.id);
                if (incomingIndex !== -1) {
                  merged[incomingIndex] = { ...merged[incomingIndex], ...localItem };
                } else {
                  merged.push(localItem);
                }
              });
              return merged.filter(item => !mergedDeletedIds.includes(item.id));
            };

            const localProducts = migrateStockProducts(s.customStockProducts || []);
            const incomingProducts = migrateStockProducts(data.customStockProducts || []);
            const mergedProducts = [...incomingProducts];
            localProducts.forEach(lp => {
              const exists = mergedProducts.some(ip => ip.name.toLowerCase().trim() === lp.name.toLowerCase().trim() && ip.unit === lp.unit);
              if (!exists) {
                mergedProducts.push(lp);
              }
            });

            const mergedDisposableExpeditions = mergeArrayById(data.disposableExpeditions || [], s.disposableExpeditions || []);
            const mergedDisposableLogs = mergeArrayById(data.disposableProductionLogs || [], s.disposableProductionLogs || []);
            const mergedDisposableEntries = mergeArrayById(data.disposableInsumoEntries || [], s.disposableInsumoEntries || []);
            const mergedDisposableProducts = ensureAllDisposableProducts(
              mergeArrayById(data.disposableProducts || [], s.disposableProducts || [])
            );
            const recalculatedDisposableProducts = recalculateDisposableProductsStock(
              mergedDisposableProducts,
              mergedDisposableLogs,
              mergedDisposableEntries,
              mergedDisposableExpeditions
            );

            const merged = {
              ...defaultState,
              ...data,
              movements: finalMergedMovements,
              currentUser: s.currentUser, // Maintain the local tab session
              deletedIds: mergedDeletedIds,
              systemUsers: migrateSystemUsersList(mergeArrayById(data.systemUsers, s.systemUsers)),
              registeredVehicles: mergeArrayById(data.registeredVehicles, s.registeredVehicles),
              registeredDrivers: mergeArrayById(data.registeredDrivers, s.registeredDrivers),
              registeredClients: mergeArrayById(data.registeredClients, s.registeredClients),
              customVehicleCategories: data.customVehicleCategories || s.customVehicleCategories || defaultState.customVehicleCategories,
              customEntryPurposes: ensureLinhaDescartavelInPurposes(data.customEntryPurposes || s.customEntryPurposes),
              customAvariaTypes: migrateAvariaTypes(data.customAvariaTypes || s.customAvariaTypes, finalMergedMovements),
              companyLogo: data.companyLogo !== undefined ? data.companyLogo : s.companyLogo,
              initialDieselStock: data.initialDieselStock !== undefined ? data.initialDieselStock : s.initialDieselStock !== undefined ? s.initialDieselStock : 0,
              initialArlaStock: data.initialArlaStock !== undefined ? data.initialArlaStock : s.initialArlaStock !== undefined ? s.initialArlaStock : 0,
              dieselTankCapacity: data.dieselTankCapacity !== undefined ? data.dieselTankCapacity : s.dieselTankCapacity !== undefined ? s.dieselTankCapacity : 15000,
              arlaTankCapacity: data.arlaTankCapacity !== undefined ? data.arlaTankCapacity : s.arlaTankCapacity !== undefined ? s.arlaTankCapacity : 3000,
              initialDieselStocks: { ...(s.initialDieselStocks || {}), ...(data.initialDieselStocks || {}) },
              dieselTankCapacities: { ...(s.dieselTankCapacities || {}), ...(data.dieselTankCapacities || {}) },
              initialArlaStocks: { ...(s.initialArlaStocks || {}), ...(data.initialArlaStocks || {}) },
              arlaTankCapacities: { ...(s.arlaTankCapacities || {}), ...(data.arlaTankCapacities || {}) },
              customStockProducts: mergedProducts,
              initialStockLevels: {
                ...migrateInitialStockLevels(s.initialStockLevels || {}),
                ...migrateInitialStockLevels(data.initialStockLevels || {}),
              },
              manualStockAdjustments: mergeArrayById(data.manualStockAdjustments, s.manualStockAdjustments),
              supplies: mergeArrayById(data.supplies, s.supplies),
              dieselPurchases: mergeArrayById(data.dieselPurchases, s.dieselPurchases),
              arlaPurchases: mergeArrayById(data.arlaPurchases, s.arlaPurchases),
              resolvedStockAlerts: Array.from(new Set([
                ...(s.resolvedStockAlerts || []),
                ...(data.resolvedStockAlerts || []),
              ])),
              verifiedScrapAlerts: Array.from(new Set([
                ...(s.verifiedScrapAlerts || []),
                ...(data.verifiedScrapAlerts || []),
              ])),
              scrapConferences: mergeArrayById(data.scrapConferences, s.scrapConferences),
              driverSettlements: mergeArrayById(data.driverSettlements, s.driverSettlements),
              bankTransactions: mergeArrayById(data.bankTransactions, s.bankTransactions),
              preSales: mergeArrayById(data.preSales || [], s.preSales || []),
              disposableProducts: recalculatedDisposableProducts,
              disposableExpeditions: mergedDisposableExpeditions,
              disposableProductionLogs: mergedDisposableLogs,
              disposableInsumoEntries: mergedDisposableEntries,
              driverTripLoads: mergeArrayById(data.driverTripLoads || [], s.driverTripLoads || []),
              driverTripDeliveries: mergeArrayById(data.driverTripDeliveries || [], s.driverTripDeliveries || []),
              productionOpen: { ...(s.productionOpen || {}), ...(data.productionOpen || {}) },
              productionStatusDetails: { ...(s.productionStatusDetails || {}), ...(data.productionStatusDetails || {}) },
              productionStopLogs: mergeArrayById(data.productionStopLogs || [], s.productionStopLogs || []),
              productionMachines: { ...(s.productionMachines || {}), ...(data.productionMachines || {}) },
            };
            localStorage.setItem('industrack_state', JSON.stringify(merged));
            return merged;
          });
          isFirstFetchCompleted.current = true;
        }
      }
    } catch (e) {
      console.warn("REST fetch fallback failed:", e);
    }
  };

  // Client-side Firestore Real-time Synchronization (Sync across multiple computers/devices)
  useEffect(() => {
    // 1. Initial fast-load from REST api route
    fetchState();

    // 2. Stream revisions in real-time straight from Cloud Firestore, if available
    const docRef = doc(db, 'appState', 'main');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (Date.now() - lastLocalMutationTime.current < 4000) {
        return;
      }
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data._clientChunkCount !== undefined) {
          fetchState();
          return;
        }
        if (data && typeof data === 'object') {
          setState(s => {
            // High efficiency object comparison: prevent re-setting state if data is identical
            const stringifiedIncoming = JSON.stringify(data);
            const { currentUser: _, ...localShared } = s;
            const stringifiedLocal = JSON.stringify(localShared);
            
            if (stringifiedIncoming === stringifiedLocal) {
              return s;
            }

            // Flag to ensure the subsequent local write useEffect is skipped for this incoming cycle
            ignoreNextPush.current = true;

            const incomingClearedAt = data.clearedAt || 0;
            const localClearedAt = s.clearedAt || 0;

            if (incomingClearedAt > localClearedAt) {
              const merged = {
                ...defaultState,
                ...data,
                currentUser: s.currentUser
              };
              localStorage.setItem('industrack_state', JSON.stringify(merged));
              return merged;
            } else if (localClearedAt > incomingClearedAt) {
              // Local state is newer (e.g. database has been cleared on this client).
              // Stale server data must be discarded to prevent resurrection.
              return s;
            }

            const mergedDeletedIds = Array.from(new Set([
              ...(data.deletedIds || []),
              ...(s.deletedIds || [])
            ]));

            const mergedMovements = [...(data.movements || [])];
            (s.movements || []).forEach((localM: any) => {
              const incomingMIndex = mergedMovements.findIndex((im: any) => im.id === localM.id);
              if (incomingMIndex !== -1) {
                const incomingM = mergedMovements[incomingMIndex];
                
                const getLatestTime = (m: any) => {
                  const times = [
                    new Date(m.timestamp || 0).getTime(),
                    new Date(m.entryTimestamp || 0).getTime(),
                  ];
                  if (m.kanbanTimings) {
                    Object.values(m.kanbanTimings).forEach((t: any) => {
                      if (t) times.push(new Date(t).getTime());
                    });
                  }
                  if (m.editedAt) {
                    times.push(new Date(m.editedAt).getTime());
                  }
                  if (m.productionControl?.unloadingEditLogs) {
                    m.productionControl.unloadingEditLogs.forEach((log: any) => {
                      if (log.timestamp) times.push(new Date(log.timestamp).getTime());
                    });
                  }
                  return Math.max(...times.filter(t => !isNaN(t)));
                };

                const isLocalNewer = getLatestTime(localM) > getLatestTime(incomingM);
                const mergedM = isLocalNewer ? { ...localM } : { ...incomingM };

                if (!mergedM.orderPhoto && (localM.orderPhoto || incomingM.orderPhoto)) {
                  mergedM.orderPhoto = localM.orderPhoto || incomingM.orderPhoto;
                }

                if (localM.productionControl || incomingM.productionControl) {
                  const baseControl = isLocalNewer ? (localM.productionControl || {}) : (incomingM.productionControl || {});
                  const secondaryControl = isLocalNewer ? (incomingM.productionControl || {}) : (localM.productionControl || {});

                  const mergedSales = ((base: any[] = [], sec: any[] = []) => {
                    if (!base.length && !sec.length) return [];
                    const res = [...base];
                    sec.forEach(s => {
                      const idx = res.findIndex(r => r.id === s.id || (r.saleNumber && s.saleNumber && r.saleNumber === s.saleNumber && r.item === s.item));
                      if (idx !== -1) {
                        const preservedSig = res[idx].signature || s.signature;
                        res[idx] = { ...s, ...res[idx], signature: preservedSig || undefined };
                      } else {
                        res.push(s);
                      }
                    });
                    const saleSignatures: Record<string, string> = {};
                    res.forEach(item => {
                      if (item.saleNumber && item.signature) {
                        saleSignatures[item.saleNumber] = item.signature;
                      }
                    });
                    return res.map(item => {
                      if (item.saleNumber && !item.signature && saleSignatures[item.saleNumber]) {
                        return { ...item, signature: saleSignatures[item.saleNumber] };
                      }
                      return item;
                    });
                  })(baseControl.mobileSales || [], secondaryControl.mobileSales || []);

                  mergedM.productionControl = {
                    ...secondaryControl,
                    ...baseControl,
                    mobileSales: mergedSales,
                    mobileExpenses: baseControl.mobileExpenses !== undefined ? baseControl.mobileExpenses : (secondaryControl.mobileExpenses || []),
                    mobileBonifications: baseControl.mobileBonifications !== undefined ? baseControl.mobileBonifications : secondaryControl.mobileBonifications,
                    mobileComodato: baseControl.mobileComodato !== undefined ? baseControl.mobileComodato : secondaryControl.mobileComodato,
                    mobileComodatoReturn: baseControl.mobileComodatoReturn !== undefined ? baseControl.mobileComodatoReturn : secondaryControl.mobileComodatoReturn,
                    mobileExchanges: baseControl.mobileExchanges !== undefined ? baseControl.mobileExchanges : secondaryControl.mobileExchanges,
                  };

                  if (!mergedM.productionControl.avariasDescarregamentoPhoto && (localM.productionControl?.avariasDescarregamentoPhoto || incomingM.productionControl?.avariasDescarregamentoPhoto)) {
                    mergedM.productionControl.avariasDescarregamentoPhoto = localM.productionControl?.avariasDescarregamentoPhoto || incomingM.productionControl?.avariasDescarregamentoPhoto;
                  }
                  if (!mergedM.productionControl.avariasCarregamentoPhoto && (localM.productionControl?.avariasCarregamentoPhoto || incomingM.productionControl?.avariasCarregamentoPhoto)) {
                    mergedM.productionControl.avariasCarregamentoPhoto = localM.productionControl?.avariasCarregamentoPhoto || incomingM.productionControl?.avariasCarregamentoPhoto;
                  }
                }

                mergedMovements[incomingMIndex] = mergedM;
              } else {
                mergedMovements.push(localM);
              }
            });

            const finalMergedMovements = mergedMovements.filter(m => !mergedDeletedIds.includes(m.id));

            const mergeArrayById = <T extends { id: string }>(incoming: T[] | undefined, local: T[] | undefined): T[] => {
              const merged = [...(incoming || [])];
              (local || []).forEach((localItem) => {
                const incomingIndex = merged.findIndex((item) => item.id === localItem.id);
                if (incomingIndex !== -1) {
                  merged[incomingIndex] = { ...merged[incomingIndex], ...localItem };
                } else {
                  merged.push(localItem);
                }
              });
              return merged.filter(item => !mergedDeletedIds.includes(item.id));
            };

            const localProducts = migrateStockProducts(s.customStockProducts || []);
            const incomingProducts = migrateStockProducts(data.customStockProducts || []);
            const mergedProducts = [...incomingProducts];
            localProducts.forEach(lp => {
              const exists = mergedProducts.some(ip => ip.name.toLowerCase().trim() === lp.name.toLowerCase().trim() && ip.unit === lp.unit);
              if (!exists) {
                mergedProducts.push(lp);
              }
            });

            const mergedDisposableExpeditions = mergeArrayById(data.disposableExpeditions || [], s.disposableExpeditions || []);
            const mergedDisposableLogs = mergeArrayById(data.disposableProductionLogs || [], s.disposableProductionLogs || []);
            const mergedDisposableEntries = mergeArrayById(data.disposableInsumoEntries || [], s.disposableInsumoEntries || []);
            const mergedDisposableProducts = ensureAllDisposableProducts(
              mergeArrayById(data.disposableProducts || [], s.disposableProducts || [])
            );
            const recalculatedDisposableProducts = recalculateDisposableProductsStock(
              mergedDisposableProducts,
              mergedDisposableLogs,
              mergedDisposableEntries,
              mergedDisposableExpeditions
            );

            const merged = {
              ...defaultState,
              ...data,
              movements: finalMergedMovements,
              currentUser: s.currentUser, // Maintain the local tab session
              deletedIds: mergedDeletedIds,
              systemUsers: migrateSystemUsersList(mergeArrayById(data.systemUsers, s.systemUsers)),
              registeredVehicles: mergeArrayById(data.registeredVehicles, s.registeredVehicles),
              registeredDrivers: mergeArrayById(data.registeredDrivers, s.registeredDrivers),
              registeredClients: mergeArrayById(data.registeredClients, s.registeredClients),
              customVehicleCategories: data.customVehicleCategories || s.customVehicleCategories || defaultState.customVehicleCategories,
              customEntryPurposes: ensureLinhaDescartavelInPurposes(data.customEntryPurposes || s.customEntryPurposes),
              customAvariaTypes: migrateAvariaTypes(data.customAvariaTypes || s.customAvariaTypes, finalMergedMovements),
              companyLogo: data.companyLogo !== undefined ? data.companyLogo : s.companyLogo,
              initialDieselStock: data.initialDieselStock !== undefined ? data.initialDieselStock : s.initialDieselStock !== undefined ? s.initialDieselStock : 0,
              initialArlaStock: data.initialArlaStock !== undefined ? data.initialArlaStock : s.initialArlaStock !== undefined ? s.initialArlaStock : 0,
              dieselTankCapacity: data.dieselTankCapacity !== undefined ? data.dieselTankCapacity : s.dieselTankCapacity !== undefined ? s.dieselTankCapacity : 15000,
              arlaTankCapacity: data.arlaTankCapacity !== undefined ? data.arlaTankCapacity : s.arlaTankCapacity !== undefined ? s.arlaTankCapacity : 3000,
              initialDieselStocks: { ...(s.initialDieselStocks || {}), ...(data.initialDieselStocks || {}) },
              dieselTankCapacities: { ...(s.dieselTankCapacities || {}), ...(data.dieselTankCapacities || {}) },
              initialArlaStocks: { ...(s.initialArlaStocks || {}), ...(data.initialArlaStocks || {}) },
              arlaTankCapacities: { ...(s.arlaTankCapacities || {}), ...(data.arlaTankCapacities || {}) },
              customStockProducts: mergedProducts,
              initialStockLevels: {
                ...migrateInitialStockLevels(s.initialStockLevels || {}),
                ...migrateInitialStockLevels(data.initialStockLevels || {}),
              },
              manualStockAdjustments: mergeArrayById(data.manualStockAdjustments, s.manualStockAdjustments),
              supplies: mergeArrayById(data.supplies, s.supplies),
              dieselPurchases: mergeArrayById(data.dieselPurchases, s.dieselPurchases),
              arlaPurchases: mergeArrayById(data.arlaPurchases, s.arlaPurchases),
              resolvedStockAlerts: Array.from(new Set([
                ...(s.resolvedStockAlerts || []),
                ...(data.resolvedStockAlerts || []),
              ])),
              verifiedScrapAlerts: Array.from(new Set([
                ...(s.verifiedScrapAlerts || []),
                ...(data.verifiedScrapAlerts || []),
              ])),
              scrapConferences: mergeArrayById(data.scrapConferences, s.scrapConferences),
              driverSettlements: mergeArrayById(data.driverSettlements, s.driverSettlements),
              bankTransactions: mergeArrayById(data.bankTransactions, s.bankTransactions),
              preSales: mergeArrayById(data.preSales || [], s.preSales || []),
              disposableProducts: recalculatedDisposableProducts,
              disposableExpeditions: mergedDisposableExpeditions,
              disposableProductionLogs: mergedDisposableLogs,
              disposableInsumoEntries: mergedDisposableEntries,
              driverTripLoads: mergeArrayById(data.driverTripLoads || [], s.driverTripLoads || []),
              driverTripDeliveries: mergeArrayById(data.driverTripDeliveries || [], s.driverTripDeliveries || []),
              productionOpen: { ...(s.productionOpen || {}), ...(data.productionOpen || {}) },
              productionStatusDetails: { ...(s.productionStatusDetails || {}), ...(data.productionStatusDetails || {}) },
              productionStopLogs: mergeArrayById(data.productionStopLogs || [], s.productionStopLogs || []),
              productionMachines: { ...(s.productionMachines || {}), ...(data.productionMachines || {}) },
            };
            localStorage.setItem('industrack_state', JSON.stringify(merged));
            return merged;
          });
          isFirstFetchCompleted.current = true;
        }
      } else {
        // Hydrate blank cloud state with local state if document doesn't exist
        setState(s => {
          const { currentUser, ...sharedData } = s;
          const cleanData = JSON.parse(JSON.stringify(sharedData));
          setDoc(docRef, cleanData).then(() => {
            isFirstFetchCompleted.current = true;
          }).catch((err: any) => {
            if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
              console.warn("Firestore daily write quota reached during initial seed. Using local REST backend.");
            } else {
              console.warn("Could not write starting structure to Firestore:", err);
            }
          });
          return s;
        });
      }
    }, (error: any) => {
      if (error?.code === 'cancelled' || error?.message?.includes('CANCELLED') || error?.code === 1) {
        return;
      }
      if (error?.message?.includes('Quota exceeded') || error?.code === 'resource-exhausted') {
        console.warn("Firestore daily quota limit reached. Using local REST API polling fallback.");
      } else {
        console.warn("Firestore collection sync connection issues on client context, using api/state polling:", error);
      }
    });

    // 3. Keep cellular or Safari devices perfectly synced via a lightweight 10-second polling interval
    const pollingInterval = setInterval(() => {
      fetchState();
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  const pushCloudState = async (forceState?: AppState) => {
    if (isPushingRef.current) {
      return false;
    }

    const currentState = forceState || stateRef.current;
    const { currentUser, ...sharedData } = currentState;

    const cleanSharedData = stripHeavyData(sharedData, savePhotosForMovement);
    const cleanStr = JSON.stringify(cleanSharedData);
    const currentHash = computeStringHash(cleanStr);

    if (currentHash === lastPushedHashRef.current) {
      setHasPendingSync(false);
      return true;
    }

    isPushingRef.current = true;
    let restSuccess = false;
    let firestoreSuccess = false;

    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cleanStr,
      });
      if (res.ok) {
        restSuccess = true;
      }
    } catch (err) {
      console.warn("REST server backup push failed:", err);
    }

    // Optimize: if REST server successfully synced to Firestore on server-side,
    // we do NOT need to double-write to Firestore directly from client, cutting write operations by 50%!
    if (!restSuccess) {
      try {
        const sanitizedSharedData = JSON.parse(cleanStr);
        const { registeredClients = [], systemAuditLogs = [], deletedMovementsLogs = [], ...mainData } = sanitizedSharedData;
        const clientChunkCount = Math.ceil(registeredClients.length / 400);

        await setDoc(doc(db, 'appState', 'main'), {
          ...mainData,
          _clientChunkCount: clientChunkCount,
          _updatedAt: new Date().toISOString()
        });

        await setDoc(doc(db, 'appState', 'logs'), {
          systemAuditLogs: systemAuditLogs.slice(0, 300),
          deletedMovementsLogs: deletedMovementsLogs.slice(0, 300)
        });

        for (let i = 0; i < clientChunkCount; i++) {
          const chunk = registeredClients.slice(i * 400, (i + 1) * 400);
          await setDoc(doc(db, 'appState', `clients_${i}`), { clients: chunk });
        }
        firestoreSuccess = true;
      } catch (err: any) {
        if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
          console.warn("Firestore daily write quota reached on client fallback write. Operating via local REST server.");
        } else {
          console.warn("Failed to push state directly to client Firestore:", err?.message || err);
        }
      }
    } else {
      firestoreSuccess = true; // Count as successful since backend has received and processed it
    }

    isPushingRef.current = false;
    const success = restSuccess || firestoreSuccess;

    if (success) {
      lastPushedHashRef.current = currentHash;
      try {
        localStorage.setItem('industrack_last_synced_hash', currentHash);
        localStorage.removeItem('industrack_last_synced_state');
      } catch (e) {
        console.warn("localStorage setItem last_synced_hash failed:", e);
      }
      setHasPendingSync(false);
    } else {
      setHasPendingSync(true);
    }

    return success;
  };

  const triggerManualSync = async () => {
    try {
      await fetchState();
      const success = await pushCloudState(stateRef.current);
      return success;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      console.log("Network online event detected. Attempting database sync...");
      const currentLocalState = stateRef.current;
      if (checkPendingSync(currentLocalState)) {
        await pushCloudState(currentLocalState);
      }
      await fetchState();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    try {
      const { currentUser: _, ...sharedData } = state;
      const cleanShared = stripHeavyData(sharedData);
      const toSave = {
        ...state,
        ...cleanShared
      };
      localStorage.setItem('industrack_state', JSON.stringify(toSave));
    } catch (err) {
      console.warn("localStorage setItem industrack_state failed:", err);
    }

    const hasPending = checkPendingSync(state);
    if (hasPending !== hasPendingSync) {
      setHasPendingSync(hasPending);
    }

    // Refuse to push empty local state until the first database fetch finishes
    if (!isFirstFetchCompleted.current) {
      return;
    }

    if (ignoreNextPush.current) {
      ignoreNextPush.current = false;
      return;
    }

    lastLocalMutationTime.current = Date.now();

    // Debounce the Cloud/Server push to prevent massive write quotas during active editing, drag-and-drop, or keystrokes
    if (pushDebounceTimeout.current) {
      clearTimeout(pushDebounceTimeout.current);
    }

    pushDebounceTimeout.current = setTimeout(() => {
      pushCloudState(state);
    }, 2000); // 2 seconds debounce is ideal for keeping the state synced while batching fast consecutive actions

    return () => {
      if (pushDebounceTimeout.current) {
        clearTimeout(pushDebounceTimeout.current);
      }
    };
  }, [state]);

  function parsedSavedState() {
    const saved = localStorage.getItem('industrack_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  }

  const login = (currentUser: User) => setState((s) => ({ ...s, currentUser }));
  const logout = () => setState((s) => ({ ...s, currentUser: null }));

  const addSystemUser = (user: SystemUser) => {
    setState((s) => ({
      ...s,
      systemUsers: [...(s.systemUsers || []), user],
    }));
  };

  const removeSystemUser = (id: string) => {
    setState((s) => ({
      ...s,
      systemUsers: (s.systemUsers || []).filter((u) => u.id !== id),
    }));
  };

  const updateSystemUser = (id: string, updates: Partial<SystemUser>) => {
    setState((s) => {
      const updatedUsers = (s.systemUsers || []).map((u) => 
        u.id === id ? { ...u, ...updates } : u
      );
      let updatedCurrentUser = s.currentUser;
      if (s.currentUser && s.currentUser.id === id) {
        updatedCurrentUser = {
          ...s.currentUser,
          name: updates.name !== undefined ? updates.name : s.currentUser.name,
          role: updates.role !== undefined ? updates.role : s.currentUser.role,
          unit: updates.unit !== undefined ? updates.unit : s.currentUser.unit,
          modules: {
            ...s.currentUser.modules,
            ...(updates.modules || {}),
          } as any,
        };
      }
      return {
        ...s,
        systemUsers: updatedUsers,
        currentUser: updatedCurrentUser
      };
    });
  };

  const updateSystemUserPermissions = (id: string, modules: SystemUser['modules']) => {
    setState((s) => ({
      ...s,
      systemUsers: (s.systemUsers || []).map((u) => u.id === id ? { ...u, modules } : u),
    }));
  };

  const addAuditLog = (log: Omit<import('./types').SystemAuditLog, 'id' | 'timestamp'>) => {
    setState((s) => {
      const userUnit = log.unit || s.currentUser?.unit || 'matriz';
      const operatorName = log.operator || s.currentUser?.name || 'Sistema';
      const newEntry: import('./types').SystemAuditLog = {
        ...log,
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        operator: operatorName,
        unit: userUnit,
      };
      return {
        ...s,
        systemAuditLogs: [newEntry, ...(s.systemAuditLogs || [])],
      };
    });
  };

  const addMovement = (movement: Movement) => {
    setState((s) => ({
      ...s,
      movements: [{ ...movement, unit: movement.unit || s.currentUser?.unit || 'matriz' }, ...s.movements]
    }));
  };

  const deleteMovement = (id: string, reason?: string) => {
    setState((s) => {
      const movementToDelete = s.movements.find((m) => m.id === id);
      const timestamp = new Date().toISOString();
      const operator = s.currentUser?.name || 'Sistema';
      const finalReason = reason || 'Não informado';

      const deletedLog = movementToDelete ? {
        id: crypto.randomUUID ? crypto.randomUUID() : 'del-' + Date.now().toString(36),
        movementId: id,
        plate: movementToDelete.plate,
        driver: movementToDelete.driver,
        timestamp,
        deletedBy: operator,
        reason: finalReason,
        originalMovement: movementToDelete
      } : null;

      const auditLog: import('./types').SystemAuditLog | null = movementToDelete ? {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        actionType: 'exclusao',
        entityType: 'Movimentação de Portaria',
        description: `Exclusão do registro do veículo ${movementToDelete.plate} (Condutor: ${movementToDelete.driver})`,
        operator,
        reason: finalReason,
        plate: movementToDelete.plate,
        driver: movementToDelete.driver,
        unit: movementToDelete.unit || s.currentUser?.unit || 'matriz'
      } : null;

      return {
        ...s,
        movements: s.movements.filter((m) => m.id !== id),
        deletedMovementsLogs: deletedLog 
          ? [...(s.deletedMovementsLogs || []), deletedLog]
          : (s.deletedMovementsLogs || []),
        systemAuditLogs: auditLog
          ? [auditLog, ...(s.systemAuditLogs || [])]
          : (s.systemAuditLogs || []),
        deletedIds: [...(s.deletedIds || []), id]
      };
    });
  };

  const updateMovementStatus = (id: string, status: Movement['status']) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((m) => {
        if (m.id === id) {
          const kanbanTimings = { ...(m.kanbanTimings || {}) };
          const timestamp = new Date().toISOString();
          if (status === 'concluido' && !kanbanTimings['concluido']) {
            kanbanTimings['concluido'] = timestamp;
          }
          return {
            ...m,
            status,
            kanbanTimings,
            kanbanStep: status === 'concluido' ? 'concluido' as const : m.kanbanStep
          };
        }
        return m;
      }),
    }));
  };

  const registerExit = (id: string, timestamp: string, exitedBy?: string, orderPhoto?: string, earlyExitReason?: string) => {
    const exitDate = new Date(timestamp);
    const year = exitDate.getFullYear();
    const month = (exitDate.getMonth() + 1).toString().padStart(2, '0');
    const day = exitDate.getDate().toString().padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedTripCode = `VIA-${year}${month}${day}-${randomHex}`;

    if (orderPhoto) {
      savePhotosForMovement(id, { orderPhoto });
    }

    setState((s) => ({
      ...s,
      movements: s.movements.map((m) =>
        m.id === id ? { 
          ...m, 
          type: 'saida', 
          status: 'saida', 
          exitTimestamp: timestamp, 
          exitedBy, 
          orderPhoto: orderPhoto || m.orderPhoto,
          earlyExitReason,
          productionCode: m.productionCode && m.productionCode.startsWith('VIA-') ? m.productionCode : generatedTripCode
        } : m
      ),
    }));
  };

  const registerGateTemporaryExit = (id: string, type: 'almoco' | 'oficina', exitedBy?: string) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((m) => {
        if (m.id === id) {
          const timestamp = new Date().toISOString();
          const targetStep = type === 'oficina' ? 'aguardando_descarregamento' as const : (m.kanbanStep || 'aguardando_descarregamento' as const);
          const newExit = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            exitedAt: timestamp,
            exitedBy,
            step: targetStep
          };
          const gateTemporaryExits = m.gateTemporaryExits ? [...m.gateTemporaryExits, newExit] : [newExit];
          return {
            ...m,
            gateStatus: type === 'almoco' ? 'ausente_almoco' as const : 'ausente_oficina' as const,
            gateTemporaryExits,
            kanbanStep: targetStep,
          };
        }
        return m;
      }),
    }));
  };

  const registerGateTemporaryReturn = (id: string, returnedBy?: string) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((m) => {
        if (m.id === id) {
          const timestamp = new Date().toISOString();
          let gateTemporaryExits = m.gateTemporaryExits ? [...m.gateTemporaryExits] : [];
          gateTemporaryExits = gateTemporaryExits.map((e) => {
            if (!e.returnedAt) {
              const durationMs = new Date(timestamp).getTime() - new Date(e.exitedAt).getTime();
              return {
                ...e,
                returnedAt: timestamp,
                returnedBy,
                durationMs,
              };
            }
            return e;
          });
          return {
            ...m,
            gateStatus: 'normal' as const,
            gateTemporaryExits,
          };
        }
        return m;
      }),
    }));
  };

  const updateMovementDetails = (id: string, updates: Partial<Movement>, nextKanbanStep?: Movement['kanbanStep']) => {
    if (updates.orderPhoto) {
      savePhotosForMovement(id, { orderPhoto: updates.orderPhoto });
    }
    if (updates.productionControl) {
      const { avariasDescarregamentoPhoto, avariasCarregamentoPhoto } = updates.productionControl;
      if (avariasDescarregamentoPhoto || avariasCarregamentoPhoto) {
        savePhotosForMovement(id, {
          avariasDescarregamentoPhoto,
          avariasCarregamentoPhoto
        });
      }
    }

    setState((s) => {
      const currentMovement = s.movements.find(m => m.id === id);
      let updatedVehicles = s.registeredVehicles || [];

      if (currentMovement && updates.productionControl && updates.productionControl.totalCarregado !== undefined) {
        const loadedQty = updates.productionControl.totalCarregado;
        if (loadedQty > 0) {
          const vehPlate = currentMovement.plate.toUpperCase().trim();
          updatedVehicles = updatedVehicles.map(v => {
            if (v.plate.toUpperCase().trim() === vehPlate) {
              return {
                ...v,
                averageVasilhames: loadedQty,
              };
            }
            return v;
          });
        }
      }

      // Sync stockRequests if productionControl is updated
      let finalUpdates = { ...updates };
      let updatedResolvedAlerts = s.resolvedStockAlerts || [];

      if (currentMovement && updates.productionReverted) {
        const reqIds = currentMovement.productionControl?.stockRequests?.map(r => r.id) || [];
        updatedResolvedAlerts = updatedResolvedAlerts.filter(alertId => {
          if (reqIds.includes(alertId)) return false;
          if (alertId.startsWith(`${currentMovement.id}-`)) return false;
          return true;
        });

        const oldControl = currentMovement.productionControl;
        if (oldControl) {
          finalUpdates = {
            ...finalUpdates,
            productionControl: {
              ...oldControl,
              stockRequests: (oldControl.stockRequests || []).map(r => ({ ...r, resolved: false }))
            }
          };
        }
      }

      if (currentMovement && updates.productionControl) {
        const oldControl = currentMovement.productionControl;
        const newControl = updates.productionControl;
        let existingReqs = oldControl?.stockRequests || [];

        const targetAlertProducts = ['vasilhame são pedro', 'vasilhame prime', 'vasilhame de rota', ...(s.customStockProducts || []).map(p => typeof p === 'string' ? p.toLowerCase().trim() : p.name.toLowerCase().trim())];
        const movementUnit = currentMovement.unit || 'matriz';

        if (newControl.avariasDescarregamento) {
          existingReqs = syncStockRequests(
            existingReqs,
            newControl.avariasDescarregamento,
            'descarregamento',
            targetAlertProducts,
            movementUnit,
            id,
            s.resolvedStockAlerts
          );
        }

        if (newControl.avariasCarregamento) {
          existingReqs = syncStockRequests(
            existingReqs,
            newControl.avariasCarregamento,
            'carregamento',
            targetAlertProducts,
            movementUnit,
            id,
            s.resolvedStockAlerts
          );
        }

        finalUpdates = {
          ...updates,
          productionControl: {
            ...newControl,
            stockRequests: existingReqs
          }
        };
      }

      return {
        ...s,
        registeredVehicles: updatedVehicles,
        resolvedStockAlerts: updatedResolvedAlerts,
        movements: s.movements.map((m) => {
          if (m.id === id) {
            const isWorkflowOnly = !updates.wasEdited && !updates.editReason && !updates.alteredFields;
            
            let kanbanStepUpdates = {};
            if (nextKanbanStep) {
              if (m.gateStatus === 'ausente_oficina' || m.gateStatus === 'ausente_almoco') {
                console.warn("Cannot change kanban step: Vehicle is absent.");
              } else {
                const timestamp = new Date().toISOString();
                const timings = { ...(m.kanbanTimings || {}) };
                const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
                let kanbanPausedAt = m.kanbanPausedAt;
                let kanbanPauseReason = m.kanbanPauseReason;
                let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

                // If we're changing steps and it's currently paused, we should compute the pause time for the OLD step
                if (m.kanbanStep && nextKanbanStep !== m.kanbanStep && kanbanPausedAt) {
                   const pauseDuration = new Date(timestamp).getTime() - new Date(kanbanPausedAt).getTime();
                   kanbanTotalPause[m.kanbanStep] = (kanbanTotalPause[m.kanbanStep] || 0) + pauseDuration;
                   kanbanPausedAt = undefined; // unpause
                   kanbanPauseReason = undefined;

                   kanbanPauseHistory = kanbanPauseHistory.map(p => {
                     if (!p.resumedAt && p.step === m.kanbanStep) {
                       return {
                         ...p,
                         resumedAt: timestamp,
                         durationMs: pauseDuration,
                       };
                     }
                     return p;
                   });
                }

                if (nextKanbanStep && !timings[nextKanbanStep]) {
                   timings[nextKanbanStep] = timestamp;
                }

                kanbanStepUpdates = {
                  kanbanStep: nextKanbanStep,
                  kanbanTimings: timings,
                  kanbanPausedAt,
                  kanbanTotalPause,
                  kanbanPauseReason,
                  kanbanPauseHistory,
                  productionReverted: false,
                  ...(nextKanbanStep === 'concluido' ? { status: 'concluido' as const } : {}),
                };
              }
            }

            return {
              ...m,
              ...finalUpdates,
              ...kanbanStepUpdates,
              ...(isWorkflowOnly ? {} : { wasEdited: true, editedAt: new Date().toISOString() })
            };
          }
          return m;
        }),
      };
    });
  };

  const revertMovementExit = (id: string, editedBy?: string, editReason?: string) => {
    setState((s) => {
      const updatedMovements = s.movements.map((m) => {
        if (m.id === id) {
          const updated = {
            ...m,
            type: 'entrada' as const,
            status: 'concluido' as const,
            editedBy,
            editReason,
            editedAt: new Date().toISOString(),
            wasEdited: true,
            alteredFields: 'Estorno de Saída (Veículo retornou ao pátio)',
          };
          delete updated.exitTimestamp;
          delete updated.exitedBy;
          return updated;
        }
        return m;
      });
      return {
        ...s,
        movements: updatedMovements,
      };
    });
  };

  const updateRegisteredVehicleDriver = (id: string, defaultDriverId: string | undefined) => {
    setState((s) => {
      const updatedVehicles = (s.registeredVehicles || []).map((v) => {
        if (v.id === id) {
          const updated = { ...v };
          if (defaultDriverId === undefined) {
            delete updated.defaultDriverId;
          } else {
            updated.defaultDriverId = defaultDriverId;
          }
          return updated;
        }
        return v;
      });
      return {
        ...s,
        registeredVehicles: updatedVehicles,
      };
    });
  };

  const updateRegisteredVehicle = (id: string, updates: Partial<RegisteredVehicle>) => {
    setState((s) => {
      const updatedVehicles = (s.registeredVehicles || []).map((v) => {
        if (v.id === id) {
          const merged = { ...v, ...updates };
          if (merged.averageVasilhames === undefined || merged.averageVasilhames === null) {
            const plateUpper = merged.plate.toUpperCase().trim();
            const loadingMovements = (s.movements || []).filter(m => 
              m.plate.toUpperCase().trim() === plateUpper && 
              m.productionControl && 
              m.productionControl.totalCarregado !== undefined && 
              m.productionControl.totalCarregado > 0
            );
            if (loadingMovements.length > 0) {
              loadingMovements.sort((a, b) => {
                const timeA = new Date(a.entryTimestamp || a.timestamp || 0).getTime();
                const timeB = new Date(b.entryTimestamp || b.timestamp || 0).getTime();
                return timeB - timeA;
              });
              merged.averageVasilhames = loadingMovements[0].productionControl?.totalCarregado;
            }
          }
          return merged;
        }
        return v;
      });
      return {
        ...s,
        registeredVehicles: updatedVehicles,
      };
    });
  };

  const updateKanbanStep = (id: string, step: Movement['kanbanStep']) => {
    setState((s) => {
      return {
        ...s,
        movements: s.movements.map((m) => {
          if (m.id === id) {
            if (m.gateStatus === 'ausente_oficina' || m.gateStatus === 'ausente_almoco') {
              console.warn("Cannot change kanban step: Vehicle is absent.");
              return m;
            }
            const timestamp = new Date().toISOString();
            const kanbanTimings = { ...(m.kanbanTimings || {}) };
            const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
            let kanbanPausedAt = m.kanbanPausedAt;
            let kanbanPauseReason = m.kanbanPauseReason;
            let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

            // If we're changing steps and it's currently paused, we should compute the pause time for the OLD step
            if (m.kanbanStep && step !== m.kanbanStep && kanbanPausedAt) {
               const pauseDuration = new Date(timestamp).getTime() - new Date(kanbanPausedAt).getTime();
               kanbanTotalPause[m.kanbanStep] = (kanbanTotalPause[m.kanbanStep] || 0) + pauseDuration;
               kanbanPausedAt = undefined; // unpause
               kanbanPauseReason = undefined;

               kanbanPauseHistory = kanbanPauseHistory.map(p => {
                 if (!p.resumedAt && p.step === m.kanbanStep) {
                   return {
                     ...p,
                     resumedAt: timestamp,
                     durationMs: pauseDuration,
                   };
                 }
                 return p;
               });
            }

            if (step && !kanbanTimings[step]) {
               kanbanTimings[step] = timestamp;
            }
            
            return {
              ...m,
              kanbanStep: step,
              kanbanTimings,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanPauseHistory,
              productionReverted: false,
              ...(step === 'concluido' ? { status: 'concluido' as const } : {}),
            };
          }
          return m;
        }),
      };
    });
  };

  const toggleKanbanPause = (id: string, reason?: Movement['kanbanPauseReason']) => {
    setState((s) => {
      return {
        ...s,
        movements: s.movements.map((m) => {
          if (m.id === id) {
            const timestamp = new Date().toISOString();
            if (!m.kanbanStep) return m; // Cant pause if not in kanban

            let kanbanPausedAt = m.kanbanPausedAt;
            const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
            let kanbanPauseReason = m.kanbanPauseReason;
            let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

            if (kanbanPausedAt) {
              // Unpause
              const pauseDuration = new Date(timestamp).getTime() - new Date(kanbanPausedAt).getTime();
              kanbanTotalPause[m.kanbanStep] = (kanbanTotalPause[m.kanbanStep] || 0) + pauseDuration;
              kanbanPausedAt = undefined;
              kanbanPauseReason = undefined;

              kanbanPauseHistory = kanbanPauseHistory.map(p => {
                if (!p.resumedAt && p.step === m.kanbanStep) {
                  return {
                    ...p,
                    resumedAt: timestamp,
                    durationMs: pauseDuration,
                  };
                }
                return p;
              });
            } else {
              // Pause
              kanbanPausedAt = timestamp;
              kanbanPauseReason = reason || 'pausa_interna';

              const newPause = {
                id: Math.random().toString(36).substring(2, 9),
                reason: reason || 'pausa_interna',
                pausedAt: timestamp,
                step: m.kanbanStep,
              };
              kanbanPauseHistory.push(newPause);
            }

            return {
              ...m,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanPauseHistory,
            };
          }
          return m;
        }),
      };
    });
  };

  const toggleProductionOpen = (
    open: boolean, 
    unit?: string, 
    reasonInfo?: { 
      reason: string; 
      customReason?: string; 
      isScheduledPause?: boolean; 
      notes?: string; 
      machineId?: string 
    }
  ) => {
    const targetUnit = unit || state.currentUser?.unit || 'matriz';
    const timestamp = new Date().toISOString();
    const operatorName = state.currentUser?.name || 'Operador';

    setState((s) => {
      const currentMachines = s.productionMachines || defaultProductionMachines;
      const unitMachines = currentMachines[targetUnit] || defaultProductionMachines[targetUnit] || {};
      
      let updatedUnitMachines = { ...unitMachines };
      const resumedMachineIds: string[] = [];

      if (!open) {
        // FECHAR / PAUSAR PRODUÇÃO GERAL
        const isLunch = reasonInfo?.reason === 'almoco_programado';
        const isDayEnd = reasonInfo?.reason === 'fim_expediente';

        Object.keys(unitMachines).forEach((mId) => {
          const mach = unitMachines[mId];
          // Machines in manutenção or quebrada stay in their status
          if (mach.status === 'manutencao' || mach.status === 'quebrada') {
            return;
          }

          let newStatus: MachineStatus = 'pausada_outros';
          let newReason = reasonInfo?.customReason || 'Produção Pausada / Fechada';

          if (isLunch) {
            newStatus = 'pausada_almoco';
            newReason = 'Pausa para Almoço da Linha';
          } else if (isDayEnd) {
            newStatus = 'encerrada_dia';
            newReason = 'Expediente Encerrado no Dia';
          }

          updatedUnitMachines[mId] = {
            ...mach,
            status: newStatus,
            reason: newReason,
            notes: reasonInfo?.notes || mach.notes,
            stoppedAt: timestamp,
            stoppedBy: operatorName,
            resumedAt: undefined,
          };
        });
      } else {
        // ABRIR / RETOMAR PRODUÇÃO GERAL
        // Retoma as duas linhas/máquinas, EXCETO se alguma estiver em manutenção ou quebrada
        Object.keys(unitMachines).forEach((mId) => {
          const mach = unitMachines[mId];
          if (mach.status === 'manutencao' || mach.status === 'quebrada') {
            // Permanece em manutenção / quebrada
            return;
          }

          if (mach.status !== 'operacional') {
            resumedMachineIds.push(mId);
            updatedUnitMachines[mId] = {
              ...mach,
              status: 'operacional',
              reason: undefined,
              notes: undefined,
              stoppedAt: undefined,
              stoppedBy: undefined,
              resumedAt: timestamp,
            };
          }
        });
      }

      const newProductionMachines = {
        ...currentMachines,
        [targetUnit]: updatedUnitMachines,
      };

      // Determine operational machines
      const unitMachinesList = Object.values(updatedUnitMachines);
      const atLeastOneOperational = unitMachinesList.some(m => m.status === 'operacional');

      // Update movements
      const updatedMovements = s.movements.map((m) => {
        const mUnit = m.unit || 'matriz';
        if (mUnit !== targetUnit) return m;
        if (!m.kanbanStep || m.kanbanStep === 'concluido' || m.status === 'saida') return m;

        let kanbanPausedAt = m.kanbanPausedAt;
        const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
        let kanbanPauseReason = m.kanbanPauseReason;
        let kanbanDetailedPauseReason = m.kanbanDetailedPauseReason;
        let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

        if (!open) {
          // FECHAR PRODUÇÃO -> Pause if not already paused
          if (!kanbanPausedAt) {
            kanbanPausedAt = timestamp;
            const pauseReasonCode = (
              reasonInfo?.reason === 'almoco_programado' ? 'almoco' :
              reasonInfo?.reason === 'quebra_maquina' ? 'quebra_maquina' : 'producao_fechada'
            ) as any;
            kanbanPauseReason = pauseReasonCode;
            kanbanDetailedPauseReason = reasonInfo?.customReason || reasonInfo?.reason || 'Produção Fechada';

            const newPause: ProductionPause = {
              id: Math.random().toString(36).substring(2, 9),
              reason: pauseReasonCode,
              detailedReason: kanbanDetailedPauseReason,
              isScheduledPause: !!reasonInfo?.isScheduledPause,
              notes: reasonInfo?.notes,
              machineId: reasonInfo?.machineId,
              pausedAt: timestamp,
              step: m.kanbanStep,
            };
            kanbanPauseHistory.push(newPause);

            return {
              ...m,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanDetailedPauseReason,
              kanbanPauseHistory,
            };
          }
        } else {
          // ABRIR PRODUÇÃO -> Unpause if paused due to general pause, lunch, or day end
          if (kanbanPausedAt) {
            const mLine = ['carreta', 'truck'].includes(m.vehicleType) ? 'pesada' : 'media';
            const machForLine = Object.values(updatedUnitMachines).find(mk => mk.lineType === mLine);
            const isLineOperational = machForLine?.status === 'operacional' || atLeastOneOperational;

            if (isLineOperational && (
              kanbanPauseReason === 'producao_fechada' || 
              kanbanPauseReason === 'almoco' || 
              kanbanPauseReason === 'pausa_interna' ||
              kanbanPauseReason === 'quebra_maquina' ||
              !kanbanPauseReason
            )) {
              const pauseDuration = new Date(timestamp).getTime() - new Date(kanbanPausedAt).getTime();
              kanbanTotalPause[m.kanbanStep] = (kanbanTotalPause[m.kanbanStep] || 0) + pauseDuration;
              kanbanPausedAt = undefined;
              kanbanPauseReason = undefined;
              kanbanDetailedPauseReason = undefined;

              kanbanPauseHistory = kanbanPauseHistory.map(p => {
                if (!p.resumedAt && p.step === m.kanbanStep) {
                  return {
                    ...p,
                    resumedAt: timestamp,
                    durationMs: pauseDuration,
                  };
                }
                return p;
              });

              return {
                ...m,
                kanbanPausedAt,
                kanbanTotalPause,
                kanbanPauseReason,
                kanbanDetailedPauseReason,
                kanbanPauseHistory,
              };
            }
          }
        }

        return m;
      });

      // Update productionStatusDetails & stop logs
      const currentDetails = s.productionStatusDetails || {};
      const currentLogs = s.productionStopLogs || [];
      let newLogs = [...currentLogs];

      let newStatusDetails: Record<string, ProductionStatusDetail> = {
        ...currentDetails,
        [targetUnit]: open 
          ? { isOpen: true }
          : {
              isOpen: false,
              closedAt: timestamp,
              closedBy: operatorName,
              reason: reasonInfo?.reason || 'producao_fechada',
              customReason: reasonInfo?.customReason,
              isScheduledPause: !!reasonInfo?.isScheduledPause,
              notes: reasonInfo?.notes,
              machineId: reasonInfo?.machineId,
            }
      };

      if (!open) {
        // Add new general stop log
        const stopLog: ProductionStopLog = {
          id: Math.random().toString(36).substring(2, 9),
          unit: targetUnit,
          stoppedAt: timestamp,
          stoppedBy: operatorName,
          reason: reasonInfo?.reason || 'producao_fechada',
          customReason: reasonInfo?.customReason,
          isScheduledPause: !!reasonInfo?.isScheduledPause,
          notes: reasonInfo?.notes,
          machineId: reasonInfo?.machineId,
        };
        newLogs = [stopLog, ...newLogs];
      } else {
        // Close ongoing stop logs for this unit and for resumed machines
        newLogs = newLogs.map(log => {
          const isGeneralLog = log.unit === targetUnit && !log.resumedAt && !log.machineId;
          const isResumedMachineLog = log.machineId && resumedMachineIds.includes(log.machineId) && !log.resumedAt && (log.unit === targetUnit || !log.unit);
          
          if (isGeneralLog || isResumedMachineLog) {
            const duration = new Date(timestamp).getTime() - new Date(log.stoppedAt).getTime();
            return {
              ...log,
              resumedAt: timestamp,
              resumedBy: operatorName,
              durationMs: duration,
            };
          }
          return log;
        });
      }

      return {
        ...s,
        movements: updatedMovements,
        productionMachines: newProductionMachines,
        productionOpen: {
          ...(s.productionOpen || {}),
          [targetUnit]: open,
        },
        productionStatusDetails: newStatusDetails,
        productionStopLogs: newLogs,
      };
    });
  };

  const setMachineStatus = (
    machineId: string, 
    status: MachineStatus, 
    reason?: string, 
    notes?: string, 
    unit?: string
  ) => {
    const targetUnit = unit || state.currentUser?.unit || 'matriz';
    const timestamp = new Date().toISOString();
    const operatorName = state.currentUser?.name || 'Operador';

    setState((s) => {
      const currentMachines = s.productionMachines || defaultProductionMachines;
      const unitMachines = currentMachines[targetUnit] || defaultProductionMachines[targetUnit] || {};
      const existing = unitMachines[machineId] || {
        id: machineId,
        name: machineId === 'machine_1' ? 'Máquina 1 (Linha Pesada)' : 'Máquina 2 (Linha Média)',
        lineType: (machineId === 'machine_1' ? 'pesada' : 'media') as any,
        status: 'operacional'
      };

      const reasonText = reason || (
        status === 'pausada_almoco' ? 'Pausa para Almoço' :
        status === 'encerrada_dia' ? 'Expediente Encerrado (Fim do Dia)' :
        status === 'quebrada' ? 'Quebra de Máquina' :
        status === 'manutencao' ? 'Manutenção de Máquina' :
        status === 'pausada_outros' ? 'Pausa Operacional' : undefined
      );

      const updatedMachine: MachineInfo = {
        ...existing,
        status,
        reason: status !== 'operacional' ? reasonText : undefined,
        notes: status !== 'operacional' ? notes : undefined,
        stoppedAt: status !== 'operacional' ? timestamp : undefined,
        stoppedBy: status !== 'operacional' ? operatorName : undefined,
        resumedAt: status === 'operacional' ? timestamp : undefined,
      };

      const updatedUnitMachines = {
        ...unitMachines,
        [machineId]: updatedMachine,
      };

      const newProductionMachines = {
        ...currentMachines,
        [targetUnit]: updatedUnitMachines,
      };

      // Check if ALL machines in targetUnit are non-operational (lunch, day end, broken, maintenance, etc.)
      const unitMachinesList = Object.values(updatedUnitMachines);
      const allStopped = unitMachinesList.length > 0 && unitMachinesList.every(m => m.status !== 'operacional');
      const allLunch = unitMachinesList.length > 0 && unitMachinesList.every(m => m.status === 'pausada_almoco');
      const allClosedDay = unitMachinesList.length > 0 && unitMachinesList.every(m => m.status === 'encerrada_dia');
      const atLeastOneOperational = unitMachinesList.some(m => m.status === 'operacional');

      let newProductionOpen = { ...(s.productionOpen || {}) };
      let newStatusDetails = { ...(s.productionStatusDetails || {}) };

      if (allStopped) {
        // When all machines are non-operational, overall factory production is considered closed/paused
        newProductionOpen[targetUnit] = false;
        
        let consolidatedReason = 'parada_maquinas';
        let consolidatedCustomReason = 'Produção Fechada (Todas as Máquinas Inoperantes / Pausadas)';
        let isScheduledPause = false;

        if (allLunch) {
          consolidatedReason = 'pausada_almoco';
          consolidatedCustomReason = 'Pausa para Almoço (Todas as Máquinas em Almoço)';
          isScheduledPause = true;
        } else if (allClosedDay) {
          consolidatedReason = 'encerrada_dia';
          consolidatedCustomReason = 'Expediente Encerrado (Todas as Máquinas Encerradas)';
          isScheduledPause = false;
        }

        newStatusDetails[targetUnit] = {
          isOpen: false,
          reason: consolidatedReason,
          customReason: consolidatedCustomReason,
          isScheduledPause,
          closedAt: timestamp,
          closedBy: operatorName,
          notes: notes || undefined,
        };
      } else if (atLeastOneOperational) {
        // If at least one machine is operational, re-open production
        newProductionOpen[targetUnit] = true;
        delete newStatusDetails[targetUnit];
      }

      // Manage stop logs for this machine
      let newLogs = s.productionStopLogs || [];
      if (status !== 'operacional') {
        const newStopLog: ProductionStopLog = {
          id: Math.random().toString(36).substring(2, 9),
          unit: targetUnit,
          stoppedAt: timestamp,
          stoppedBy: operatorName,
          reason: status,
          customReason: `${existing.name}: ${reasonText}`,
          isScheduledPause: status === 'pausada_almoco',
          notes,
          machineId
        };
        newLogs = [newStopLog, ...newLogs];
      } else {
        // Close active stop logs for this machine
        newLogs = newLogs.map(log => {
          if (log.machineId === machineId && !log.resumedAt && (log.unit === targetUnit || !log.unit)) {
            const durationMs = new Date(timestamp).getTime() - new Date(log.stoppedAt).getTime();
            return {
              ...log,
              resumedAt: timestamp,
              resumedBy: operatorName,
              durationMs,
            };
          }
          return log;
        });
      }

      // Update movements associated with this machine's line
      const updatedMovements = s.movements.map((m) => {
        const mUnit = m.unit || 'matriz';
        if (mUnit !== targetUnit) return m;
        // Only pause/resume vehicles in the line belonging to this machine
        const mLine = ['carreta', 'truck'].includes(m.vehicleType) ? 'pesada' : 'media';
        if (mLine !== existing.lineType) return m;
        if (!m.kanbanStep || m.kanbanStep === 'concluido' || m.status === 'saida') return m;

        let kanbanPausedAt = m.kanbanPausedAt;
        const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
        let kanbanPauseReason = m.kanbanPauseReason;
        let kanbanDetailedPauseReason = m.kanbanDetailedPauseReason;
        let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

        if (status !== 'operacional') {
          // Pause this vehicle if not already paused
          if (!kanbanPausedAt) {
            kanbanPausedAt = timestamp;
            const pauseReasonCode = (
              status === 'pausada_almoco' ? 'almoco' :
              status === 'quebrada' ? 'quebra_maquina' :
              status === 'encerrada_dia' ? 'producao_fechada' : 'pausa_interna'
            ) as any;
            kanbanPauseReason = pauseReasonCode;
            kanbanDetailedPauseReason = `${existing.name}: ${reasonText}`;

            const newPause: ProductionPause = {
              id: Math.random().toString(36).substring(2, 9),
              reason: pauseReasonCode,
              detailedReason: kanbanDetailedPauseReason,
              isScheduledPause: status === 'pausada_almoco',
              notes,
              machineId,
              pausedAt: timestamp,
              step: m.kanbanStep,
            };
            kanbanPauseHistory.push(newPause);

            return {
              ...m,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanDetailedPauseReason,
              kanbanPauseHistory,
            };
          }
        } else {
          // Machine resumed to operational -> unpause vehicles on this line if paused due to this machine
          if (kanbanPausedAt) {
            const lastPause = kanbanPauseHistory.length > 0 ? kanbanPauseHistory[kanbanPauseHistory.length - 1] : null;
            if (!lastPause || lastPause.machineId === machineId || !lastPause.machineId) {
              const pausedDuration = new Date(timestamp).getTime() - new Date(kanbanPausedAt).getTime();
              const currentStep = m.kanbanStep;
              kanbanTotalPause[currentStep] = (kanbanTotalPause[currentStep] || 0) + pausedDuration;

              if (kanbanPauseHistory.length > 0) {
                const lastIdx = kanbanPauseHistory.length - 1;
                kanbanPauseHistory[lastIdx] = {
                  ...kanbanPauseHistory[lastIdx],
                  resumedAt: timestamp,
                  durationMs: pausedDuration,
                };
              }

              return {
                ...m,
                kanbanPausedAt: undefined,
                kanbanPauseReason: undefined,
                kanbanDetailedPauseReason: undefined,
                kanbanTotalPause,
                kanbanPauseHistory,
              };
            }
          }
        }

        return m;
      });

      return {
        ...s,
        movements: updatedMovements,
        productionMachines: newProductionMachines,
        productionOpen: newProductionOpen,
        productionStatusDetails: newStatusDetails,
        productionStopLogs: newLogs,
      };
    });
  };

  const pauseMachineForLunch = (machineId: string, unit?: string, notes?: string) => {
    setMachineStatus(machineId, 'pausada_almoco', 'Pausa para Almoço da Linha', notes, unit);
  };

  const endMachineDay = (machineId: string, unit?: string, notes?: string) => {
    setMachineStatus(machineId, 'encerrada_dia', 'Expediente Encerrado no Dia', notes, unit);
  };

  const resumeMachineOperation = (machineId: string, unit?: string) => {
    setMachineStatus(machineId, 'operacional', undefined, undefined, unit);
  };

  const setMachineCapacity = (machineId: string, capacity: number, unit?: string) => {
    const targetUnit = unit || state.currentUser?.unit || 'matriz';
    setState((s) => {
      const currentMachines = s.productionMachines || defaultProductionMachines;
      const unitMachines = currentMachines[targetUnit] || defaultProductionMachines[targetUnit] || {};
      const machine = unitMachines[machineId];
      if (!machine) return s;

      return {
        ...s,
        productionMachines: {
          ...currentMachines,
          [targetUnit]: {
            ...unitMachines,
            [machineId]: { ...machine, capacityPerHour: capacity }
          }
        }
      };
    });
  };

  const resetAllMachines = (unit?: string) => {
    const targetUnit = unit || state.currentUser?.unit || 'matriz';
    const timestamp = new Date().toISOString();
    const operatorName = state.currentUser?.name || 'Operador';

    setState((s) => {
      const currentMachines = s.productionMachines || defaultProductionMachines;
      const unitMachines = currentMachines[targetUnit] || defaultProductionMachines[targetUnit] || {};

      const resetUnitMachines: Record<string, MachineInfo> = {};
      Object.keys(unitMachines).forEach(k => {
        resetUnitMachines[k] = {
          ...unitMachines[k],
          status: 'operacional',
          reason: undefined,
          notes: undefined,
          stoppedAt: undefined,
          stoppedBy: undefined,
          resumedAt: timestamp,
        };
      });

      // Close all active machine stop logs
      const newLogs = (s.productionStopLogs || []).map(log => {
        if (!log.resumedAt && (log.unit === targetUnit || !log.unit) && log.machineId) {
          const durationMs = new Date(timestamp).getTime() - new Date(log.stoppedAt).getTime();
          return {
            ...log,
            resumedAt: timestamp,
            resumedBy: operatorName,
            durationMs,
          };
        }
        return log;
      });

      const newProductionOpen = {
        ...(s.productionOpen || {}),
        [targetUnit]: true,
      };

      const newStatusDetails = {
        ...(s.productionStatusDetails || {}),
      };
      delete newStatusDetails[targetUnit];

      return {
        ...s,
        productionMachines: {
          ...currentMachines,
          [targetUnit]: resetUnitMachines,
        },
        productionOpen: newProductionOpen,
        productionStatusDetails: newStatusDetails,
        productionStopLogs: newLogs,
      };
    });
  };

  const addSupply = (supply: SupplyRecord, checklist?: Checklist, evaluator?: string) => {
    setState((s) => ({
      ...s,
      supplies: [{ ...supply, unit: supply.unit || s.currentUser?.unit || 'matriz' }, ...s.supplies],
      movements: s.movements.map((m) =>
        m.id === supply.movementId 
          ? { 
              ...m, 
              odometer: supply.odometer, 
              ...(checklist ? { checklist } : {}),
              ...(evaluator ? { checklistEvaluator: evaluator } : {})
            } 
          : m
      ),
    }));
  };

  const addDieselPurchase = (purchase: DieselPurchase) => {
    setState((s) => ({
      ...s,
      dieselPurchases: [{ ...purchase, unit: purchase.unit || s.currentUser?.unit || 'matriz' }, ...(s.dieselPurchases || [])],
    }));
  };

  const updateInitialDieselStock = (stock: number) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      return {
        ...s,
        initialDieselStocks: {
          ...(s.initialDieselStocks || {}),
          [userUnit]: stock
        }
      };
    });
  };

  const addArlaPurchase = (purchase: ArlaPurchase) => {
    setState((s) => ({
      ...s,
      arlaPurchases: [{ ...purchase, unit: purchase.unit || s.currentUser?.unit || 'matriz' }, ...(s.arlaPurchases || [])],
    }));
  };

  const updateInitialArlaStock = (stock: number) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      return {
        ...s,
        initialArlaStocks: {
          ...(s.initialArlaStocks || {}),
          [userUnit]: stock
        }
      };
    });
  };

  const updateDieselTankCapacity = (capacity: number) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      return {
        ...s,
        dieselTankCapacities: {
          ...(s.dieselTankCapacities || {}),
          [userUnit]: capacity
        }
      };
    });
  };

  const updateArlaTankCapacity = (capacity: number) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      return {
        ...s,
        arlaTankCapacities: {
          ...(s.arlaTankCapacities || {}),
          [userUnit]: capacity
        }
      };
    });
  };

  const addCustomChecklistItem = (item: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const currentListRaw = s.customChecklistItems || [];
      const currentList = currentListRaw.map(i => typeof i === 'string' ? { text: i, unit: 'matriz' as const } : i);
      const cleaned = item.trim();
      if (!cleaned || currentList.some(i => i.unit === userUnit && i.text.toLowerCase() === cleaned.toLowerCase())) {
        return s;
      }
      return {
        ...s,
        customChecklistItems: [...currentList, { text: cleaned, unit: userUnit }]
      };
    });
  };

  const removeCustomChecklistItem = (item: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const cleanName = item.trim().toLowerCase();
      const updatedList = (s.customChecklistItems || [])
        .map(i => typeof i === 'string' ? { text: i, unit: 'matriz' as const } : i)
        .filter(i => i.unit !== userUnit || i.text.trim().toLowerCase() !== cleanName);
      return {
        ...s,
        customChecklistItems: updatedList
      };
    });
  };

  const addCustomAvariaType = (
    type: string,
    classification: 'descarregamento' | 'carregamento' | 'ambos',
    category?: 'avaria' | 'compra' | 'vasilhame_rota',
    origin?: 'frota_propria' | 'cliente',
    descontarMotorista?: boolean
  ) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const formatted = cleanOccurrenceTypeName(type);
      const current = s.customAvariaTypes || [];
      if (current.some(t => (!t.unit || t.unit === userUnit) && t.type.toLowerCase().trim() === formatted.toLowerCase().trim())) {
        return s;
      }
      const newItem: CustomAvariaType = {
        id: `avaria-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        type: formatted,
        classification,
        category: category || 'avaria',
        unit: userUnit,
        origin: origin || 'frota_propria',
        descontarMotorista: descontarMotorista !== undefined ? descontarMotorista : true
      };

      const currentStockListRaw = s.customStockProducts || [];
      const currentStockList = currentStockListRaw.map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p);
      
      const updatedStockList = (category === 'compra' && !currentStockList.some(p => p.unit === userUnit && p.name.toLowerCase().trim() === formatted.toLowerCase().trim()))
        ? [...currentStockList, { name: formatted, unit: userUnit }]
        : currentStockList;

      return {
        ...s,
        customAvariaTypes: [...current, newItem],
        customStockProducts: updatedStockList
      };
    });
  };

  const removeCustomAvariaType = (id: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const target = (s.customAvariaTypes || []).find((t) => t.id === id);
      const updatedAvariaTypes = (s.customAvariaTypes || []).filter((t) => t.id !== id);
      
      const currentStockListRaw = s.customStockProducts || [];
      let updatedStockList = currentStockListRaw.map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p);

      if (target && typeof target.type === 'string') {
        const targetNameNorm = target.type.toLowerCase().trim();
        updatedStockList = updatedStockList.filter(p => !p || typeof p.name !== 'string' || p.unit !== userUnit || p.name.toLowerCase().trim() !== targetNameNorm);
      }
      return {
        ...s,
        customAvariaTypes: updatedAvariaTypes,
        customStockProducts: updatedStockList
      };
    });
  };

  const updateCustomAvariaType = (id: string, updates: Partial<CustomAvariaType>) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const target = (s.customAvariaTypes || []).find((t) => t.id === id);
      const cleanUpdates = { ...updates };
      if (cleanUpdates.type !== undefined) {
        cleanUpdates.type = cleanOccurrenceTypeName(cleanUpdates.type);
      }

      const updatedAvariaTypes = (s.customAvariaTypes || []).map((t) => 
        t.id === id ? { ...t, ...cleanUpdates } : t
      );

      const currentStockListRaw = s.customStockProducts || [];
      let updatedStockList = currentStockListRaw.map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p);
      const updatedInitialLevels = { ...(s.initialStockLevels || {}) };

      if (target && typeof target.type === 'string' && cleanUpdates.type !== undefined) {
        const oldNameNorm = target.type.toLowerCase().trim();
        const newName = cleanUpdates.type;
        const newNameNorm = newName.toLowerCase().trim();

        updatedStockList = updatedStockList.map(p => 
          (p && typeof p.name === 'string' && p.unit === userUnit && p.name.toLowerCase().trim() === oldNameNorm)
            ? { ...p, name: newName }
            : p
        );

        const oldKey = `${userUnit}_${oldNameNorm}`;
        const newKey = `${userUnit}_${newNameNorm}`;
        if (updatedInitialLevels[oldKey] !== undefined) {
          updatedInitialLevels[newKey] = updatedInitialLevels[oldKey];
          delete updatedInitialLevels[oldKey];
        }
      }

      return {
        ...s,
        customAvariaTypes: updatedAvariaTypes,
        customStockProducts: updatedStockList,
        initialStockLevels: updatedInitialLevels
      };
    });
  };

  const updateAvgTimeDischarging = (rate: number) => {
    setState((s) => ({
      ...s,
      avgTimeDischarging: rate,
    }));
  };

  const updateAvgTimeLoading = (rate: number) => {
    setState((s) => ({
      ...s,
      avgTimeLoading: rate,
    }));
  };

  const addCustomStockProduct = (name: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const currentListRaw = s.customStockProducts || [];
      const currentList = currentListRaw.map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p);
      const cleaned = name.trim();
      if (!cleaned || currentList.some(p => p.unit === userUnit && p.name.toLowerCase().trim() === cleaned.toLowerCase().trim())) {
        return s;
      }
      
      const currentAvarias = s.customAvariaTypes || [];
      const hasAvaria = currentAvarias.some(t => t.type.toLowerCase().trim() === cleaned.toLowerCase().trim() && (!t.unit || t.unit === userUnit));
      const updatedAvarias = hasAvaria ? currentAvarias : [
        ...currentAvarias,
        {
          id: `avaria-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          type: cleanOccurrenceTypeName(cleaned),
          classification: 'ambos' as const,
          category: 'compra' as const,
          unit: userUnit
        }
      ];

      return {
        ...s,
        customStockProducts: [...currentList, { name: cleaned, unit: userUnit }],
        customAvariaTypes: updatedAvarias
      };
    });
  };

  const removeCustomStockProduct = (name: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const targetNorm = name.toLowerCase().trim();
      const updatedStockList = (s.customStockProducts || [])
        .map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p)
        .filter(p => p.unit !== userUnit || p.name.toLowerCase().trim() !== targetNorm);
        
      const updatedAvariaTypes = (s.customAvariaTypes || [])
        .filter(t => t.unit !== userUnit || t.type.toLowerCase().trim() !== targetNorm);
        
      return {
        ...s,
        customStockProducts: updatedStockList,
        customAvariaTypes: updatedAvariaTypes
      };
    });
  };

  const updateCustomStockProduct = (oldName: string, newName: string) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const oldNorm = oldName.toLowerCase().trim();
      const cleanedNew = cleanOccurrenceTypeName(newName);
      const newNorm = cleanedNew.toLowerCase().trim();

      const updatedStockList = (s.customStockProducts || [])
        .map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p)
        .map(p => 
          (p.unit === userUnit && p.name.toLowerCase().trim() === oldNorm)
            ? { ...p, name: cleanedNew }
            : p
        );

      const updatedAvariaTypes = (s.customAvariaTypes || []).map(t => 
        (t.unit === userUnit && t.type.toLowerCase().trim() === oldNorm)
          ? { ...t, type: cleanedNew }
          : t
      );

      const oldKey = `${userUnit}_${oldNorm}`;
      const newKey = `${userUnit}_${newNorm}`;
      const updatedInitialLevels = { ...(s.initialStockLevels || {}) };
      if (updatedInitialLevels[oldKey] !== undefined) {
        updatedInitialLevels[newKey] = updatedInitialLevels[oldKey];
        delete updatedInitialLevels[oldKey];
      }

      return {
        ...s,
        customStockProducts: updatedStockList,
        customAvariaTypes: updatedAvariaTypes,
        initialStockLevels: updatedInitialLevels
      };
    });
  };

  const updateInitialStockLevel = (product: string, level: number) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const key = `${userUnit}_${product.toLowerCase().trim()}`;
      return {
        ...s,
        initialStockLevels: {
          ...(s.initialStockLevels || {}),
          [key]: level
        }
      };
    });
  };

  const addManualStockAdjustment = (adj: Omit<StockAdjustment, 'id' | 'timestamp' | 'operator' | 'unit'>) => {
    setState((s) => {
      const currentAdjustments = s.manualStockAdjustments || [];
      const timestamp = new Date().toISOString();
      const operator = s.currentUser?.name || 'Sistema';
      const userUnit = s.currentUser?.unit || 'matriz';

      const newAdj: StockAdjustment = {
        ...adj,
        id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp,
        operator,
        unit: userUnit
      };

      const auditLog: import('./types').SystemAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        actionType: 'ajuste_estoque',
        entityType: 'Estoque Vasilhame 20L / Insumo',
        description: `Ajuste manual de estoque no item '${adj.product}': ${adj.type === 'entrada' ? '+' : '-'}${adj.qty} un`,
        operator,
        reason: adj.reason || 'Ajuste de inventário/estoque',
        unit: userUnit
      };

      return {
        ...s,
        manualStockAdjustments: [newAdj, ...currentAdjustments],
        systemAuditLogs: [auditLog, ...(s.systemAuditLogs || [])]
      };
    });
  };

  const resolveStockAlert = (alertId: string) => {
    setState((s) => {
      const currentAlerts = s.resolvedStockAlerts || [];
      const updatedAlerts = currentAlerts.includes(alertId) ? currentAlerts : [...currentAlerts, alertId];

      const updatedMovements = (s.movements || []).map(m => {
        if (!m.productionControl?.stockRequests) return m;
        const reqs = m.productionControl.stockRequests;

        // Direct match with req ID
        if (reqs.some(r => r.id === alertId)) {
          return {
            ...m,
            productionControl: {
              ...m.productionControl,
              stockRequests: reqs.map(r => r.id === alertId ? { ...r, resolved: true } : r)
            }
          };
        }

        // Dynamic prefix match
        if (alertId.startsWith(`${m.id}-`)) {
          const stage = alertId.includes('-descarregamento-') ? 'descarregamento' : alertId.includes('-carregamento-') ? 'carregamento' : null;
          if (stage) {
            const prefixWithProd = alertId.split(`-${stage}-active-`)[0];
            const normName = prefixWithProd.substring(m.id.length + 1).toLowerCase().trim();

            return {
              ...m,
              productionControl: {
                ...m.productionControl,
                stockRequests: reqs.map(r => {
                  const rStage = r.stage;
                  const rNormName = normalizeStockProductKey(r.product);
                  const targetNormName = normalizeStockProductKey(normName);
                  if (rStage === stage && rNormName === targetNormName) {
                    return { ...r, resolved: true };
                  }
                  return r;
                })
              }
            };
          }
        }

        return m;
      });

      return {
        ...s,
        resolvedStockAlerts: updatedAlerts,
        movements: updatedMovements
      };
    });
  };

  const unresolveStockAlert = (alertId: string) => {
    setState((s) => {
      const currentAlerts = s.resolvedStockAlerts || [];
      const updatedAlerts = currentAlerts.filter(id => id !== alertId);

      const updatedMovements = (s.movements || []).map(m => {
        if (!m.productionControl?.stockRequests) return m;
        const reqs = m.productionControl.stockRequests;

        // Direct match with req ID
        if (reqs.some(r => r.id === alertId)) {
          return {
            ...m,
            productionControl: {
              ...m.productionControl,
              stockRequests: reqs.map(r => r.id === alertId ? { ...r, resolved: false } : r)
            }
          };
        }

        // Dynamic prefix match
        if (alertId.startsWith(`${m.id}-`)) {
          const stage = alertId.includes('-descarregamento-') ? 'descarregamento' : alertId.includes('-carregamento-') ? 'carregamento' : null;
          if (stage) {
            const prefixWithProd = alertId.split(`-${stage}-active-`)[0];
            const normName = prefixWithProd.substring(m.id.length + 1).toLowerCase().trim();

            return {
              ...m,
              productionControl: {
                ...m.productionControl,
                stockRequests: reqs.map(r => {
                  const rStage = r.stage;
                  const rNormName = normalizeStockProductKey(r.product);
                  const targetNormName = normalizeStockProductKey(normName);
                  if (rStage === stage && rNormName === targetNormName) {
                    return { ...r, resolved: false };
                  }
                  return r;
                })
              }
            };
          }
        }

        return m;
      });

      return {
        ...s,
        resolvedStockAlerts: updatedAlerts,
        movements: updatedMovements
      };
    });
  };

  const verifyScrapAlert = (movementId: string) => {
    setState((s) => {
      const current = s.verifiedScrapAlerts || [];
      const updated = current.includes(movementId) ? current : [...current, movementId];
      return {
        ...s,
        verifiedScrapAlerts: updated
      };
    });
  };

  const unverifyScrapAlert = (movementId: string) => {
    setState((s) => {
      const current = s.verifiedScrapAlerts || [];
      const updated = current.filter(id => id !== movementId);
      return {
        ...s,
        verifiedScrapAlerts: updated
      };
    });
  };

  const addScrapConference = (conf: { yardQty: number; realQty: number; movementIds: string[]; type?: 'descarregamento' | 'carregamento' }) => {
    setState((s) => {
      const userUnit = s.currentUser?.unit || 'matriz';
      const userOperator = s.currentUser?.name || 'Sistema';
      const confId = `conf-scrap-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newConference: ScrapConference = {
        id: confId,
        timestamp: new Date().toISOString(),
        operator: userOperator,
        yardQty: conf.yardQty,
        realQty: conf.realQty,
        movementIds: conf.movementIds,
        unit: userUnit,
        type: conf.type
      };

      const typeLabel = conf.type === 'descarregamento' ? 'Descarregamento' : conf.type === 'carregamento' ? 'Carregamento' : 'Sucata';

      // Also create a StockAdjustment of type 'entrada' so that we increase 'sucata' stock!
      const newAdjustment: StockAdjustment = {
        id: `adj-conf-${confId}`,
        product: 'Sucata',
        qty: conf.realQty,
        type: 'entrada',
        reason: `Conferência de Avarias de ${typeLabel} - Contagem Real (Real: ${conf.realQty} un de ${conf.yardQty} un registradas na produção)`,
        timestamp: new Date().toISOString(),
        operator: userOperator,
        unit: userUnit
      };

      const currentConferences = s.scrapConferences || [];
      const currentAdjustments = s.manualStockAdjustments || [];
      const currentVerified = s.verifiedScrapAlerts || [];

      const updatedVerified = [...currentVerified];
      conf.movementIds.forEach(id => {
        if (!updatedVerified.includes(id)) {
          updatedVerified.push(id);
        }
      });

      return {
        ...s,
        scrapConferences: [newConference, ...currentConferences],
        manualStockAdjustments: [newAdjustment, ...currentAdjustments],
        verifiedScrapAlerts: updatedVerified
      };
    });
  };

  const deleteScrapConference = (id: string) => {
    setState((s) => {
      const target = (s.scrapConferences || []).find(c => c.id === id);
      if (!target) return s;

      const currentConferences = s.scrapConferences || [];
      const currentAdjustments = s.manualStockAdjustments || [];
      const currentVerified = s.verifiedScrapAlerts || [];

      const updatedConferences = currentConferences.filter(c => c.id !== id);
      const updatedAdjustments = currentAdjustments.filter(a => a.id !== `adj-conf-${id}`);
      const updatedVerified = currentVerified.filter(vId => !target.movementIds.includes(vId));

      return {
        ...s,
        scrapConferences: updatedConferences,
        manualStockAdjustments: updatedAdjustments,
        verifiedScrapAlerts: updatedVerified
      };
    });
  };

  const addRegisteredVehicle = (vehicle: RegisteredVehicle) => {
    setState((s) => {
      let finalAvg = vehicle.averageVasilhames;
      if (finalAvg === undefined || finalAvg === null) {
        const plateUpper = vehicle.plate.toUpperCase().trim();
        const loadingMovements = (s.movements || []).filter(m => 
          m.plate.toUpperCase().trim() === plateUpper && 
          m.productionControl && 
          m.productionControl.totalCarregado !== undefined && 
          m.productionControl.totalCarregado > 0
        );
        if (loadingMovements.length > 0) {
          loadingMovements.sort((a, b) => {
            const timeA = new Date(a.entryTimestamp || a.timestamp || 0).getTime();
            const timeB = new Date(b.entryTimestamp || b.timestamp || 0).getTime();
            return timeB - timeA;
          });
          finalAvg = loadingMovements[0].productionControl?.totalCarregado;
        }
      }

      return {
        ...s,
        registeredVehicles: [
          { 
            ...vehicle, 
            averageVasilhames: finalAvg,
            unit: vehicle.unit || s.currentUser?.unit || 'matriz' 
          },
          ...(s.registeredVehicles || [])
        ],
      };
    });
  };

  const removeRegisteredVehicle = (id: string) => {
    setState((s) => ({
      ...s,
      registeredVehicles: (s.registeredVehicles || []).filter((v) => v.id !== id),
      deletedIds: [...(s.deletedIds || []), id]
    }));
  };

  const addRegisteredDriver = (driver: RegisteredDriver) => {
    setState((s) => ({
      ...s,
      registeredDrivers: [
        { ...driver, unit: driver.unit || s.currentUser?.unit || 'matriz' },
        ...(s.registeredDrivers || [])
      ],
    }));
  };

  const removeRegisteredDriver = (id: string) => {
    setState((s) => {
      const filteredDrivers = (s.registeredDrivers || []).filter((d) => d.id !== id);
      const updatedVehicles = (s.registeredVehicles || []).map((v) => {
        if (v.defaultDriverId === id) {
          const updated = { ...v };
          delete updated.defaultDriverId;
          return updated;
        }
        return v;
      });
      return {
        ...s,
        registeredDrivers: filteredDrivers,
        registeredVehicles: updatedVehicles,
        deletedIds: [...(s.deletedIds || []), id]
      };
    });
  };

  const updateRegisteredDriver = (id: string, updates: Partial<RegisteredDriver>) => {
    setState((s) => {
      const updatedDrivers = (s.registeredDrivers || []).map((d) => {
        if (d.id === id) {
          return { ...d, ...updates };
        }
        return d;
      });
      return {
        ...s,
        registeredDrivers: updatedDrivers,
      };
    });
  };

  const addRegisteredSupervisor = (supervisor: import('./types').RegisteredSupervisor) => {
    setState((s) => ({
      ...s,
      registeredSupervisors: [
        { ...supervisor, unit: supervisor.unit || s.currentUser?.unit || 'matriz' },
        ...(s.registeredSupervisors || [])
      ],
    }));
  };

  const removeRegisteredSupervisor = (id: string) => {
    setState((s) => ({
      ...s,
      registeredSupervisors: (s.registeredSupervisors || []).filter((sup) => sup.id !== id),
      deletedIds: [...(s.deletedIds || []), id]
    }));
  };

  const updateRegisteredSupervisor = (id: string, updates: Partial<import('./types').RegisteredSupervisor>) => {
    setState((s) => ({
      ...s,
      registeredSupervisors: (s.registeredSupervisors || []).map((sup) => sup.id === id ? { ...sup, ...updates } : sup)
    }));
  };

  const addRegisteredClient = (client: RegisteredClient) => {
    setState((s) => ({
      ...s,
      registeredClients: [
        { ...client, unit: client.unit || s.currentUser?.unit || 'matriz' },
        ...(s.registeredClients || [])
      ],
    }));
  };

  const removeRegisteredClient = (id: string) => {
    setState((s) => ({
      ...s,
      registeredClients: (s.registeredClients || []).filter((c) => c.id !== id),
      deletedIds: [...(s.deletedIds || []), id]
    }));
  };

  const updateRegisteredClient = (id: string, updates: Partial<RegisteredClient>) => {
    setState((s) => {
      const updatedClients = (s.registeredClients || []).map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      });
      return {
        ...s,
        registeredClients: updatedClients,
      };
    });
  };

  const addRegisteredCity = (city: RegisteredCity) => {
    setState((s) => ({
      ...s,
      registeredCities: [
        city,
        ...(s.registeredCities || [])
      ],
    }));
  };

  const removeRegisteredCity = (id: string) => {
    setState((s) => ({
      ...s,
      registeredCities: (s.registeredCities || []).filter((c) => c.id !== id),
      deletedIds: [...(s.deletedIds || []), id]
    }));
  };

  const updateRegisteredCity = (id: string, updates: Partial<RegisteredCity>) => {
    setState((s) => {
      const updatedCities = (s.registeredCities || []).map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      });
      return {
        ...s,
        registeredCities: updatedCities,
      };
    });
  };

  const addDriverSettlement = (settlement: DriverSettlement) => {
    setState((s) => ({
      ...s,
      driverSettlements: [
        { ...settlement, unit: settlement.unit || s.currentUser?.unit || 'matriz' },
        ...(s.driverSettlements || [])
      ]
    }));
  };

  const updateDriverSettlement = (id: string, updates: Partial<DriverSettlement>) => {
    setState((s) => ({
      ...s,
      driverSettlements: (s.driverSettlements || []).map((ds) => ds.id === id ? { ...ds, ...updates } : ds)
    }));
  };

  const deleteDriverSettlement = (id: string) => {
    setState((s) => {
      const settlement = (s.driverSettlements || []).find(ds => ds.id === id);
      const updatedBankTransactions = (s.bankTransactions || []).map((tx) => {
        const isReconciledToThis = 
          tx.reconciledWithSettlementId === id || 
          settlement?.reconciledPixTransactionId === tx.id || 
          (settlement?.reconciledPixTransactionIds || []).includes(tx.id);
        if (isReconciledToThis) {
          return { ...tx, isReconciled: false, reconciledWithSettlementId: undefined };
        }
        return tx;
      });
      return {
        ...s,
        driverSettlements: (s.driverSettlements || []).filter((ds) => ds.id !== id),
        bankTransactions: updatedBankTransactions
      };
    });
  };

  const addPreSale = (preSale: Omit<PreSale, "id" | "timestamp" | "isUsed">) => {
    setState((s) => ({
      ...s,
      preSales: [
        {
          ...preSale,
          id: 'psale-' + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          isUsed: false,
          createdBy: preSale.createdBy || s.currentUser?.name,
          createdByRole: preSale.createdByRole || s.currentUser?.role,
          unit: preSale.unit || s.currentUser?.unit || 'matriz'
        },
        ...(s.preSales || [])
      ]
    }));
  };

  const updatePreSale = (id: string, updates: Partial<PreSale>) => {
    setState((s) => {
      const targetPS = (s.preSales || []).find(ps => ps.id === id);
      if (!targetPS) return s;

      const isExpedited = !!targetPS.expeditionApproved || !!targetPS.isUsed;

      // Regra Absoluta: Após expedição da carga/produto para o veículo e motorista,
      // NÃO é aceita exclusão ou alteração de motorista/veículo por NINGUÉM
      if (isExpedited) {
        if (updates.deleted === true) {
          return s; // Bloqueia exclusão totalmente
        }
        if (
          (updates.driverName !== undefined && updates.driverName !== targetPS.driverName) ||
          (updates.vehiclePlate !== undefined && updates.vehiclePlate !== targetPS.vehiclePlate)
        ) {
          const sanitizedUpdates = { ...updates };
          delete sanitizedUpdates.driverName;
          delete sanitizedUpdates.vehiclePlate;
          return {
            ...s,
            preSales: (s.preSales || []).map((ps) => ps.id === id ? { ...ps, ...sanitizedUpdates } : ps)
          };
        }
      }

      // Regra de bloqueio: Motorista não pode alterar o motorista nem excluir pré-venda realizada por supervisor
      const isSupervisorPreSale = !!targetPS.supervisorName || !!targetPS.supervisorId || targetPS.createdByRole === 'supervisor';
      if (s.currentUser?.role === 'motorista' && isSupervisorPreSale) {
        if (updates.driverName !== undefined && updates.driverName !== targetPS.driverName) {
          const sanitizedUpdates = { ...updates };
          delete sanitizedUpdates.driverName;
          delete sanitizedUpdates.vehiclePlate;
          return {
            ...s,
            preSales: (s.preSales || []).map((ps) => ps.id === id ? { ...ps, ...sanitizedUpdates } : ps)
          };
        }
        if (updates.deleted === true) {
          return s;
        }
      }

      return {
        ...s,
        preSales: (s.preSales || []).map((ps) => ps.id === id ? { ...ps, ...updates } : ps)
      };
    });
  };

  const deletePreSale = (id: string, reason?: string, operator?: string) => {
    setState((s) => {
      const targetPS = (s.preSales || []).find(ps => ps.id === id);
      if (!targetPS) return s;

      // Bloqueio absoluto após expedição: Ninguém pode excluir
      const isExpedited = !!targetPS.expeditionApproved || !!targetPS.isUsed;
      if (isExpedited) {
        return s;
      }

      // Bloqueio para motorista em pré-vendas de supervisor
      const isSupervisorPreSale = !!targetPS.supervisorName || !!targetPS.supervisorId || targetPS.createdByRole === 'supervisor';
      if (s.currentUser?.role === 'motorista' && isSupervisorPreSale) {
        return s;
      }

      const updatedPreSales = (s.preSales || []).map((ps) => {
        if (ps.id === id) {
          return {
            ...ps,
            deleted: true,
            deleteReason: reason || ps.deleteReason || 'Excluído pelo operador',
            deletedBy: operator || ps.deletedBy || s.currentUser?.name || 'Operador',
            deletedAt: new Date().toISOString()
          };
        }
        return ps;
      });

      const auditLog: Omit<import('./types').SystemAuditLog, 'id' | 'timestamp'> = {
        operator: operator || s.currentUser?.name || 'Operador',
        unit: targetPS.unit || 'matriz',
        actionType: 'exclusao',
        entityType: 'Pré-Venda',
        entityId: id,
        description: `Cancelamento de pré-venda do cliente ${targetPS.clientName} (Motorista: ${targetPS.driverName})`,
        reason: reason || targetPS.deleteReason || 'Motivo informado pelo operador'
      };

      const newAuditLogs = [
        { ...auditLog, id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4), timestamp: new Date().toISOString() },
        ...(s.systemAuditLogs || [])
      ].slice(0, 300);

      return {
        ...s,
        preSales: updatedPreSales,
        systemAuditLogs: newAuditLogs
      };
    });
  };

  const importBankTransactions = (txs: BankTransaction[]) => {
    setState((s) => {
      const existing = s.bankTransactions || [];
      const userUnit = s.currentUser?.unit || 'matriz';
      const typedTxs = txs.map(tx => ({ ...tx, unit: tx.unit || userUnit }));

      const cleanDescription = (desc: string): string => {
        if (!desc) return '';
        return desc
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // remove accents
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, ' ') // replace special chars with spaces
          .replace(/\b(PIX|PAGAMENTO|PAG|RECEBIMENTO|RECEBIDO|DEVOLUCAO|DEVOLVIDO|ESTORNO|REEMBOLSO|TRANSFERENCIA|TRANSF|TRF|TED|DOC|CEF|BB|BANCO|TEF|DEP|DEPOSITO|EMISSOR|FAVORECIDO|BENEFICIARIO|DEVOLUTION|REVERSAL|REFUND|CREDITO|CRED)\b/g, '')
          .replace(/\s+/g, ' ') // normalize multiple spaces
          .trim();
      };

      const isDuplicateOf = (exTx: BankTransaction, newTx: BankTransaction): boolean => {
        if (exTx.id === newTx.id) return true;
        
        // 1. Must be same date and extremely close amount
        const sameDateAndAmount = exTx.date === newTx.date && Math.abs(exTx.amount - newTx.amount) < 0.01;
        if (!sameDateAndAmount) return false;

        // 2. If both have institutions defined and they are different, they are not duplicates
        if (exTx.institution && newTx.institution && exTx.institution !== newTx.institution) {
          return false;
        }

        // 3. Unconditional check if they have the same non-random, non-empty documentRef
        const isExRefRandom = !exTx.documentRef || exTx.documentRef.startsWith('OFX-') || exTx.documentRef.startsWith('DOC-') || exTx.documentRef.startsWith('tx-');
        const isNewRefRandom = !newTx.documentRef || newTx.documentRef.startsWith('OFX-') || newTx.documentRef.startsWith('DOC-') || newTx.documentRef.startsWith('tx-');
        if (!isExRefRandom && !isNewRefRandom && exTx.documentRef === newTx.documentRef) {
          return true;
        }

        // 4. Exact raw description match (case-insensitive, trimmed)
        if (exTx.description.trim().toUpperCase() === newTx.description.trim().toUpperCase()) {
          return true;
        }

        // 5. Clean and normalize both descriptions
        const normEx = cleanDescription(exTx.description);
        const normNew = cleanDescription(newTx.description);

        // If descriptions normalized are identical or one is a substring of the other, it's a duplicate
        if (normEx === normNew || (normEx && normNew && (normEx.includes(normNew) || normNew.includes(normEx)))) {
          return true;
        }

        // 6. If both normalized descriptions are empty or very short, treat as duplicate if same date and amount
        if (!normEx && !normNew) {
          return true;
        }

        return false;
      };

      const alreadyKept: BankTransaction[] = [];
      const filteredNew = typedTxs.filter((newTx) => {
        // First check against existing
        const isDuplicateOfExisting = existing.some((exTx) => isDuplicateOf(exTx, newTx));
        if (isDuplicateOfExisting) return false;

        // Then check against already kept in this batch
        const isDuplicateOfKept = alreadyKept.some((keptTx) => isDuplicateOf(keptTx, newTx));
        if (isDuplicateOfKept) return false;

        alreadyKept.push(newTx);
        return true;
      });

      return {
        ...s,
        bankTransactions: [...filteredNew, ...existing]
      };
    });
  };

  const reconcileDriverSettlementWithPix = (settlementId: string, transactionId: string | string[]) => {
    const ids = Array.isArray(transactionId) ? transactionId : [transactionId];
    setState((s) => {
      const selectedTxs = (s.bankTransactions || []).filter(tx => ids.includes(tx.id));
      const totalSelectedAmount = selectedTxs.reduce((sum, tx) => sum + tx.amount, 0);

      const updatedSettlements = (s.driverSettlements || []).map((ds) => {
        if (ds.id === settlementId) {
          return {
            ...ds,
            isReconciled: true,
            reconciledAt: new Date().toISOString(),
            reconciledPixTransactionId: ids[0] || undefined,
            reconciledPixTransactionIds: ids
          };
        }
        return ds;
      });
      const updatedBankTransactions = (s.bankTransactions || []).map((tx) => {
        if (ids.includes(tx.id)) {
          return {
            ...tx,
            isReconciled: true,
            reconciledWithSettlementId: settlementId
          };
        } else if (tx.reconciledWithSettlementId === settlementId) {
          return {
            ...tx,
            isReconciled: false,
            reconciledWithSettlementId: undefined
          };
        }
        return tx;
      });
      return {
        ...s,
        driverSettlements: updatedSettlements,
        bankTransactions: updatedBankTransactions
      };
    });
  };

  const removeBankTransaction = (txId: string) => {
    setState((s) => ({
      ...s,
      bankTransactions: (s.bankTransactions || []).filter((tx) => tx.id !== txId),
    }));
  };

  const deleteImportedFile = (fileId: string) => {
    setState((s) => {
      const txsToRemove = (s.bankTransactions || []).filter(tx => tx.importedFileId === fileId);
      const txIdsToRemove = txsToRemove.map(tx => tx.id);
      const remainingBankTxs = (s.bankTransactions || []).filter(tx => tx.importedFileId !== fileId);

      const updatedSettlements = (s.driverSettlements || []).map((ds) => {
        const hasLinkedToRemove = txIdsToRemove.some(id => 
          ds.reconciledPixTransactionId === id || 
          (ds.reconciledPixTransactionIds || []).includes(id)
        );
        if (hasLinkedToRemove) {
          const filteredIds = (ds.reconciledPixTransactionIds || []).filter(id => !txIdsToRemove.includes(id));
          return {
            ...ds,
            isReconciled: filteredIds.length > 0,
            reconciledPixTransactionId: filteredIds[0] || undefined,
            reconciledPixTransactionIds: filteredIds
          };
        }
        return ds;
      });

      return {
        ...s,
        bankTransactions: remainingBankTxs,
        driverSettlements: updatedSettlements
      };
    });
  };

  const manuallyReconcileBankTransaction = (txId: string, reason: string) => {
    setState((s) => ({
      ...s,
      bankTransactions: (s.bankTransactions || []).map((tx) => 
        tx.id === txId 
          ? { ...tx, isReconciled: true, manualReconciliationReason: reason } 
          : tx
      ),
    }));
  };

  const undoManualReconciliation = (txId: string) => {
    setState((s) => ({
      ...s,
      bankTransactions: (s.bankTransactions || []).map((tx) => 
        tx.id === txId 
          ? { ...tx, isReconciled: false, manualReconciliationReason: undefined } 
          : tx
      ),
    }));
  };

  const voidBankTransaction = (entryTxId: string, refundTxId: string) => {
    setState((s) => ({
      ...s,
      bankTransactions: (s.bankTransactions || []).map((tx) => {
        if (tx.id === entryTxId) {
          return {
            ...tx,
            isVoided: true,
            voidedWithTransactionId: refundTxId,
            isReconciled: true
          };
        }
        if (tx.id === refundTxId) {
          return {
            ...tx,
            isReconciled: true,
            refundsTransactionId: entryTxId,
            manualReconciliationReason: `Estorno/Devolução da transação ${entryTxId}`
          };
        }
        return tx;
      })
    }));
  };

  const undoVoidBankTransaction = (refundTxId: string) => {
    setState((s) => {
      const refundTx = (s.bankTransactions || []).find((t) => t.id === refundTxId);
      const entryTxId = refundTx?.refundsTransactionId;
      return {
        ...s,
        bankTransactions: (s.bankTransactions || []).map((tx) => {
          if (tx.id === refundTxId) {
            return {
              ...tx,
              isReconciled: false,
              refundsTransactionId: undefined,
              manualReconciliationReason: undefined
            };
          }
          if (entryTxId && tx.id === entryTxId) {
            const wasReconciledWithSettlement = !!tx.reconciledWithSettlementId;
            return {
              ...tx,
              isVoided: false,
              voidedWithTransactionId: undefined,
              isReconciled: wasReconciledWithSettlement
            };
          }
          return tx;
        })
      };
    });
  };

  const unreconcileDriverSettlement = (settlementId: string) => {
    setState((s) => {
      const updatedSettlements = (s.driverSettlements || []).map((ds) => {
        if (ds.id === settlementId) {
          return {
            ...ds,
            isReconciled: false,
            reconciledAt: undefined,
            reconciledPixTransactionId: undefined,
            reconciledPixTransactionIds: []
          };
        }
        return ds;
      });
      const updatedBankTransactions = (s.bankTransactions || []).map((tx) => {
        if (tx.reconciledWithSettlementId === settlementId) {
          return {
            ...tx,
            isReconciled: false,
            reconciledWithSettlementId: undefined
          };
        }
        return tx;
      });
      return {
        ...s,
        driverSettlements: updatedSettlements,
        bankTransactions: updatedBankTransactions
      };
    });
  };

  const setCompanyLogo = (logo?: string) => {
    setState((s) => ({
      ...s,
      companyLogo: logo || '',
    }));
  };

  const clearDatabase = () => {
    const clearedObj = {
      ...defaultState,
      currentUser: stateRef.current?.currentUser, // Keep current user session
      clearedAt: Date.now(),
      deletedIds: [],
    };

    setState(clearedObj);
    localStorage.setItem('industrack_state', JSON.stringify(clearedObj));
    localStorage.removeItem('industrack_last_synced_state');
    
    ignoreNextPush.current = true;
    lastLocalMutationTime.current = Date.now();
    
    // Force immediate push of cleared state to cloud databases to overwrite stale records
    pushCloudState(clearedObj);
  };

  const addCustomVehicleCategory = (cat: { id: string; name: string; bypassProductionDefault: boolean; unit?: 'matriz' | 'filial' }) => {
    setState((s) => ({
      ...s,
      customVehicleCategories: [
        ...(s.customVehicleCategories || []),
        { ...cat, unit: cat.unit || s.currentUser?.unit || 'matriz' }
      ],
    }));
  };

  const removeCustomVehicleCategory = (id: string) => {
    setState((s) => ({
      ...s,
      customVehicleCategories: (s.customVehicleCategories || []).filter((c) => c.id !== id),
    }));
  };

  const addCustomEntryPurpose = (purp: { id: string; name: string; bypassProductionDefault: boolean; unit?: 'matriz' | 'filial' }) => {
    setState((s) => ({
      ...s,
      customEntryPurposes: [
        ...(s.customEntryPurposes || []),
        { ...purp, unit: purp.unit || s.currentUser?.unit || 'matriz' }
      ],
    }));
  };

  const removeCustomEntryPurpose = (id: string) => {
    setState((s) => ({
      ...s,
      customEntryPurposes: (s.customEntryPurposes || []).filter((p) => p.id !== id),
    }));
  };

  const addDisposableProduct = (prod: Omit<import('./types').DisposableProduct, 'id'>) => {
    const newProd: import('./types').DisposableProduct = {
      ...prod,
      id: 'disp-prod-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4)
    };
    setState(prev => ({
      ...prev,
      disposableProducts: [...(prev.disposableProducts || []), newProd]
    }));
  };

  const updateDisposableProduct = (id: string, updates: Partial<import('./types').DisposableProduct>) => {
    setState(prev => ({
      ...prev,
      disposableProducts: (prev.disposableProducts || []).map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const removeDisposableProduct = (id: string) => {
    setState(prev => ({
      ...prev,
      disposableProducts: (prev.disposableProducts || []).filter(p => p.id !== id)
    }));
  };

  const addDisposableProductionLog = (log: Omit<import('./types').DisposableProductionLog, 'id' | 'timestamp'>) => {
    const newLog: import('./types').DisposableProductionLog = {
      ...log,
      id: 'disp-log-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString()
    };

    setState(prev => {
      const newLogs = [newLog, ...(prev.disposableProductionLogs || [])];
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        newLogs,
        prev.disposableInsumoEntries || [],
        prev.disposableExpeditions || []
      );

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableProductionLogs: newLogs
      };
    });
  };

  const deleteDisposableProductionLog = (id: string) => {
    setState(prev => {
      const targetLog = (prev.disposableProductionLogs || []).find(l => l.id === id);
      if (!targetLog) return prev;

      const newLogs = (prev.disposableProductionLogs || []).filter(l => l.id !== id);
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        newLogs,
        prev.disposableInsumoEntries || [],
        prev.disposableExpeditions || []
      );

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableProductionLogs: newLogs
      };
    });
  };

  const addDisposableInsumoEntry = (entry: Omit<import('./types').DisposableInsumoEntry, 'id' | 'timestamp'>) => {
    const newEntry: import('./types').DisposableInsumoEntry = {
      ...entry,
      id: 'disp-insumo-entry-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString()
    };

    setState(prev => {
      const newEntries = [newEntry, ...(prev.disposableInsumoEntries || [])];
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        prev.disposableProductionLogs || [],
        newEntries,
        prev.disposableExpeditions || []
      );

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableInsumoEntries: newEntries
      };
    });
  };

  const deleteDisposableInsumoEntry = (id: string) => {
    setState(prev => {
      const targetEntry = (prev.disposableInsumoEntries || []).find(e => e.id === id);
      if (!targetEntry) return prev;

      const newEntries = (prev.disposableInsumoEntries || []).filter(e => e.id !== id);
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        prev.disposableProductionLogs || [],
        newEntries,
        prev.disposableExpeditions || []
      );

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableInsumoEntries: newEntries
      };
    });
  };

  const addDisposableExpedition = (exp: Omit<import('./types').DisposableExpedition, 'id' | 'timestamp'>) => {
    const newExp: import('./types').DisposableExpedition = {
      ...exp,
      id: 'disp-exp-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString()
    };

    setState(prev => {
      const newExpeditions = [newExp, ...(prev.disposableExpeditions || [])];
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        prev.disposableProductionLogs || [],
        prev.disposableInsumoEntries || [],
        newExpeditions
      );

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableExpeditions: newExpeditions
      };
    });
  };

  const deleteDisposableExpedition = (id: string, reason?: string, operator?: string) => {
    setState(prev => {
      const targetExp = (prev.disposableExpeditions || []).find(ex => ex.id === id);
      if (!targetExp) return prev;

      // Bloqueio Absoluto: Se o veículo já realizou a saída pela Portaria,
      // a exclusão da expedição é terminantemente proibida para qualquer usuário
      const isVehicleExited = (() => {
        const movements = prev.movements || [];

        // 1. Verificação direta pelo ID do movimento de portaria
        if (targetExp.gateMovementId) {
          const mov = movements.find(m => m.id === targetExp.gateMovementId);
          if (mov && (mov.status === 'saida' || !!mov.exitTimestamp || mov.type === 'saida')) {
            return true;
          }
        }

        // 2. Verificação por placa e/ou motorista
        const cleanExpPlate = targetExp.vehiclePlate ? targetExp.vehiclePlate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        const cleanExpDriver = targetExp.driverName ? targetExp.driverName.trim().toLowerCase() : '';

        if (cleanExpPlate || cleanExpDriver) {
          const expTime = new Date(targetExp.timestamp || targetExp.date).getTime();
          const exitedMov = movements.find(m => {
            const cleanPlate = m.plate ? m.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
            const cleanDriver = m.driver ? m.driver.trim().toLowerCase() : '';
            const plateMatch = cleanExpPlate && cleanPlate === cleanExpPlate;
            const driverMatch = cleanExpDriver && cleanDriver === cleanExpDriver;
            if (!plateMatch && !driverMatch) return false;

            const isExited = m.status === 'saida' || !!m.exitTimestamp || m.type === 'saida';
            if (!isExited) return false;

            const mTime = new Date(m.timestamp || m.entryTimestamp || '').getTime();
            const mExitTime = m.exitTimestamp ? new Date(m.exitTimestamp).getTime() : mTime;

            const isSameDate = (m.timestamp && m.timestamp.slice(0, 10) === targetExp.date) ||
                               (targetExp.timestamp && m.timestamp && m.timestamp.slice(0, 10) === targetExp.timestamp.slice(0, 10));
            const exitedAfterExp = mExitTime >= expTime - 60000;

            return isSameDate || exitedAfterExp;
          });

          if (exitedMov) return true;
        }

        return false;
      })();

      if (isVehicleExited) {
        return prev; // Bloqueio garantido: veículo já saiu pela portaria
      }

      const updatedExpeditions = (prev.disposableExpeditions || []).map(ex => {
        if (ex.id === id) {
          return {
            ...ex,
            deleted: true,
            deleteReason: reason || 'Excluído pelo operador',
            deletedBy: operator || prev.currentUser?.name || 'Operador',
            deletedAt: new Date().toISOString()
          };
        }
        return ex;
      });

      const activeExpeditions = updatedExpeditions.filter(ex => !ex.deleted);
      const recalculatedProducts = recalculateDisposableProductsStock(
        prev.disposableProducts || [],
        prev.disposableProductionLogs || [],
        prev.disposableInsumoEntries || [],
        activeExpeditions
      );

      const auditLog: Omit<import('./types').SystemAuditLog, 'id' | 'timestamp'> = {
        operator: operator || prev.currentUser?.name || 'Operador',
        unit: targetExp.unit || 'matriz',
        actionType: 'exclusao',
        entityType: 'Expedição',
        entityId: id,
        description: `Exclusão da expedição do produto ${targetExp.productName} (Qtd: ${targetExp.qtyExpedited})`,
        reason: reason || 'Motivo informado pelo operador'
      };

      const newAuditLogs = [
        { ...auditLog, id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4), timestamp: new Date().toISOString() },
        ...(prev.systemAuditLogs || [])
      ].slice(0, 300);

      return {
        ...prev,
        disposableProducts: recalculatedProducts,
        disposableExpeditions: updatedExpeditions,
        systemAuditLogs: newAuditLogs
      };
    });
  };

  const updateDisposableStockLevel = (productId: string, newStock: number) => {
    setState(prev => {
      const currentList = ensureAllDisposableProducts(prev.disposableProducts);
      const targetProd = currentList.find(p => p.id === productId);
      if (!targetProd) return prev;

      const currentStock = targetProd.currentStock || 0;
      const diff = newStock - currentStock;
      if (Math.abs(diff) < 0.0001) return prev;

      if (targetProd.category === 'insumo') {
        const newEntry: import('./types').DisposableInsumoEntry = {
          id: 'disp-insumo-entry-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          date: new Date().toISOString().split('T')[0],
          insumoId: targetProd.id,
          insumoName: targetProd.name,
          qtyReceived: diff,
          supplier: 'Ajuste de Estoque',
          documentRef: '[AJUSTE DE ESTOQUE]',
          operator: prev.currentUser?.name || 'Operador',
          unit: targetProd.unit || 'matriz',
          notes: `Ajuste manual de estoque de ${currentStock} para ${newStock} (${diff > 0 ? '+' : ''}${diff})`,
          timestamp: new Date().toISOString()
        };
        const newEntries = [newEntry, ...(prev.disposableInsumoEntries || [])];
        const recalculatedProducts = recalculateDisposableProductsStock(
          currentList,
          prev.disposableProductionLogs || [],
          newEntries,
          prev.disposableExpeditions || []
        );
        return {
          ...prev,
          disposableProducts: recalculatedProducts,
          disposableInsumoEntries: newEntries
        };
      } else {
        const newLog: import('./types').DisposableProductionLog = {
          id: 'disp-log-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          date: new Date().toISOString().split('T')[0],
          productId: targetProd.id,
          productName: targetProd.name,
          qtyProduced: diff,
          operator: prev.currentUser?.name || 'Operador',
          unit: targetProd.unit || 'matriz',
          notes: `Ajuste manual de estoque de ${currentStock} para ${newStock} (${diff > 0 ? '+' : ''}${diff})`,
          timestamp: new Date().toISOString()
        };
        const newLogs = [newLog, ...(prev.disposableProductionLogs || [])];
        const recalculatedProducts = recalculateDisposableProductsStock(
          currentList,
          newLogs,
          prev.disposableInsumoEntries || [],
          prev.disposableExpeditions || []
        );
        return {
          ...prev,
          disposableProducts: recalculatedProducts,
          disposableProductionLogs: newLogs
        };
      }
    });
  };

  const addDriverTripLoad = (tripLoad: import('./types').DriverTripLoad) => {
    setState(prev => {
      const existing = prev.driverTripLoads || [];
      // Every expedition creates an independent trip load record - no overwriting/merging
      return {
        ...prev,
        driverTripLoads: [tripLoad, ...existing]
      };
    });
  };

  const updateDriverTripLoad = (id: string, updates: Partial<import('./types').DriverTripLoad>) => {
    setState(prev => ({
      ...prev,
      driverTripLoads: (prev.driverTripLoads || []).map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const deleteDriverTripLoad = (id: string, reason?: string, operator?: string) => {
    setState(prev => {
      const targetLoad = (prev.driverTripLoads || []).find(t => t.id === id);
      if (!targetLoad) return prev;

      // Bloqueio se o veículo já tiver saído pela portaria
      const isVehicleExited = (() => {
        const movements = prev.movements || [];
        if (targetLoad.gateMovementId) {
          const mov = movements.find(m => m.id === targetLoad.gateMovementId);
          if (mov && (mov.status === 'saida' || !!mov.exitTimestamp || mov.type === 'saida')) {
            return true;
          }
        }
        const cleanPlate = targetLoad.vehiclePlate ? targetLoad.vehiclePlate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        const cleanDriver = targetLoad.driverName ? targetLoad.driverName.trim().toLowerCase() : '';
        if (cleanPlate || cleanDriver) {
          const loadTime = new Date(targetLoad.timestamp).getTime();
          const exitedMov = movements.find(m => {
            const mCleanPlate = m.plate ? m.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
            const mCleanDriver = m.driver ? m.driver.trim().toLowerCase() : '';
            if ((cleanPlate && mCleanPlate === cleanPlate) || (cleanDriver && mCleanDriver === cleanDriver)) {
              const isExited = m.status === 'saida' || !!m.exitTimestamp || m.type === 'saida';
              if (!isExited) return false;
              const mExitTime = m.exitTimestamp ? new Date(m.exitTimestamp).getTime() : new Date(m.timestamp || '').getTime();
              return mExitTime >= loadTime - 60000;
            }
            return false;
          });
          if (exitedMov) return true;
        }
        return false;
      })();

      if (isVehicleExited) {
        return prev;
      }

      const updatedLoads = (prev.driverTripLoads || []).map(t => {
        if (t.id === id) {
          return {
            ...t,
            deleted: true,
            status: 'cancelada' as const,
            deleteReason: reason || 'Cancelada pelo operador',
            deletedBy: operator || prev.currentUser?.name || 'Operador',
            deletedAt: new Date().toISOString()
          };
        }
        return t;
      });

      const auditLog: Omit<import('./types').SystemAuditLog, 'id' | 'timestamp'> = {
        operator: operator || prev.currentUser?.name || 'Operador',
        unit: targetLoad.unit || 'matriz',
        actionType: 'exclusao',
        entityType: 'Carga Motorista',
        entityId: id,
        description: `Cancelamento de carga do motorista ${targetLoad.driverName} - ${targetLoad.productName} (Qtd: ${targetLoad.initialQty})`,
        reason: reason || 'Motivo informado pelo operador'
      };

      const newAuditLogs = [
        { ...auditLog, id: 'log-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4), timestamp: new Date().toISOString() },
        ...(prev.systemAuditLogs || [])
      ].slice(0, 300);

      return {
        ...prev,
        driverTripLoads: updatedLoads,
        systemAuditLogs: newAuditLogs
      };
    });
  };

  const addDriverTripDelivery = (delivery: import('./types').DriverTripDelivery) => {
    setState(prev => ({
      ...prev,
      driverTripDeliveries: [delivery, ...(prev.driverTripDeliveries || [])]
    }));
  };

  const currentUserUnit = state.currentUser?.unit || 'matriz';
  const isAdmin = state.currentUser?.role === 'admin';

  const filteredMovements = useMemo(() => state.movements.filter((m) => (m.unit || 'matriz') === currentUserUnit), [state.movements, currentUserUnit]);
  const filteredSupplies = useMemo(() => state.supplies.filter((s) => (s.unit || 'matriz') === currentUserUnit), [state.supplies, currentUserUnit]);
  const filteredDieselPurchases = useMemo(() => (state.dieselPurchases || []).filter((p) => (p.unit || 'matriz') === currentUserUnit), [state.dieselPurchases, currentUserUnit]);
  const filteredArlaPurchases = useMemo(() => (state.arlaPurchases || []).filter((p) => (p.unit || 'matriz') === currentUserUnit), [state.arlaPurchases, currentUserUnit]);

  const filteredVehicles = useMemo(() => (state.registeredVehicles || []).filter((v) => (v.unit || 'matriz') === currentUserUnit), [state.registeredVehicles, currentUserUnit]);
  const filteredDrivers = useMemo(() => (state.registeredDrivers || []).filter((d) => (d.unit || 'matriz') === currentUserUnit), [state.registeredDrivers, currentUserUnit]);
  const filteredClients = useMemo(() => (state.registeredClients || []).filter((c) => (c.unit || 'matriz') === currentUserUnit), [state.registeredClients, currentUserUnit]);

  const filteredCategories = useMemo(() => (state.customVehicleCategories || []).filter((c) => !c.unit || c.unit === currentUserUnit), [state.customVehicleCategories, currentUserUnit]);
  const filteredPurposes = useMemo(() => (state.customEntryPurposes || []).filter((p) => !p.unit || p.unit === currentUserUnit), [state.customEntryPurposes, currentUserUnit]);
  const filteredAvariaTypes = useMemo(() => (state.customAvariaTypes || []).filter((t) => !t.unit || t.unit === currentUserUnit), [state.customAvariaTypes, currentUserUnit]);

  const filteredStockProducts = useMemo(() => (state.customStockProducts || [])
    .map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p)
    .filter(p => p.unit === currentUserUnit)
    .map(p => p.name), [state.customStockProducts, currentUserUnit]);

  const filteredChecklistItems = useMemo(() => (state.customChecklistItems || [])
    .map(i => typeof i === 'string' ? { text: i, unit: 'matriz' as const } : i)
    .filter(i => i.unit === currentUserUnit)
    .map(i => i.text), [state.customChecklistItems, currentUserUnit]);

  const activeDieselStock = state.initialDieselStocks?.[currentUserUnit] ?? state.initialDieselStock ?? 0;
  const activeDieselCapacity = state.dieselTankCapacities?.[currentUserUnit] ?? state.dieselTankCapacity ?? 15000;
  const activeArlaStock = state.initialArlaStocks?.[currentUserUnit] ?? state.initialArlaStock ?? 0;
  const activeArlaCapacity = state.arlaTankCapacities?.[currentUserUnit] ?? state.arlaTankCapacity ?? 3000;

  const filteredDriverSettlements = useMemo(() => (state.driverSettlements || []).filter((ds) => (ds.unit || 'matriz') === currentUserUnit), [state.driverSettlements, currentUserUnit]);
  const filteredBankTransactions = useMemo(() => (state.bankTransactions || []).filter((tx) => (tx.unit || 'matriz') === currentUserUnit), [state.bankTransactions, currentUserUnit]);

  const contextValue = useMemo(() => ({
    ...state,
    hasPendingSync,
    triggerManualSync,
    movements: filteredMovements,
    supplies: filteredSupplies,
    dieselPurchases: filteredDieselPurchases,
    arlaPurchases: filteredArlaPurchases,
    registeredVehicles: filteredVehicles,
    registeredDrivers: filteredDrivers,
    registeredClients: filteredClients,
    customVehicleCategories: filteredCategories,
    customEntryPurposes: filteredPurposes,
    customAvariaTypes: filteredAvariaTypes,
    customStockProducts: filteredStockProducts,
    customChecklistItems: filteredChecklistItems,
    initialDieselStock: activeDieselStock,
    dieselTankCapacity: activeDieselCapacity,
    initialArlaStock: activeArlaStock,
    arlaTankCapacity: activeArlaCapacity,
    driverSettlements: filteredDriverSettlements,
    bankTransactions: filteredBankTransactions,
    login,
    logout,
    addMovement,
    deleteMovement,
    updateMovementStatus,
    registerExit,
    registerGateTemporaryExit,
    registerGateTemporaryReturn,
    addSupply,
    addDieselPurchase,
    updateInitialDieselStock,
    updateDieselTankCapacity,
    addArlaPurchase,
    updateInitialArlaStock,
    updateArlaTankCapacity,
    addCustomChecklistItem,
    removeCustomChecklistItem,
    addSystemUser,
    removeSystemUser,
    updateSystemUser,
    updateSystemUserPermissions,
    addRegisteredVehicle,
    removeRegisteredVehicle,
    updateRegisteredVehicle,
    addRegisteredDriver,
    removeRegisteredDriver,
    updateRegisteredDriver,
    addRegisteredSupervisor,
    removeRegisteredSupervisor,
    updateRegisteredSupervisor,
    addRegisteredClient,
    removeRegisteredClient,
    updateRegisteredClient,
    addRegisteredCity,
    removeRegisteredCity,
    updateRegisteredCity,
    setCompanyLogo,
    clearDatabase,
    addCustomVehicleCategory,
    removeCustomVehicleCategory,
    addCustomEntryPurpose,
    removeCustomEntryPurpose,
    updateMovementDetails,
    revertMovementExit,
    updateRegisteredVehicleDriver,
    updateKanbanStep,
    toggleKanbanPause,
    toggleProductionOpen,
    setMachineStatus,
    pauseMachineForLunch,
    endMachineDay,
    resumeMachineOperation,
    setMachineCapacity,
    resetAllMachines,
    addCustomAvariaType,
    removeCustomAvariaType,
    updateCustomAvariaType,
    updateAvgTimeDischarging,
    updateAvgTimeLoading,
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
    addDriverSettlement,
    updateDriverSettlement,
    deleteDriverSettlement,
    importBankTransactions,
    reconcileDriverSettlementWithPix,
    unreconcileDriverSettlement,
    removeBankTransaction,
    deleteImportedFile,
    manuallyReconcileBankTransaction,
    undoManualReconciliation,
    voidBankTransaction,
    undoVoidBankTransaction,
    getMovementPhotos,
    savePhotosForMovement,
    addPreSale,
    updatePreSale,
    deletePreSale,
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
    addDriverTripLoad,
    updateDriverTripLoad,
    deleteDriverTripLoad,
    addDriverTripDelivery,
    addAuditLog,
  }), [
    state,
    hasPendingSync,
    filteredMovements,
    filteredSupplies,
    filteredDieselPurchases,
    filteredArlaPurchases,
    filteredVehicles,
    filteredDrivers,
    filteredClients,
    filteredCategories,
    filteredPurposes,
    filteredAvariaTypes,
    filteredStockProducts,
    filteredChecklistItems,
    activeDieselStock,
    activeDieselCapacity,
    activeArlaStock,
    activeArlaCapacity,
    filteredDriverSettlements,
    filteredBankTransactions
  ]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
