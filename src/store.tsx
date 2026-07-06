import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Movement, SupplyRecord, User, Checklist, DieselPurchase, ArlaPurchase, SystemUser, RegisteredVehicle, RegisteredDriver, RegisteredClient, CustomAvariaType, StockAdjustment, StockRequest, ScrapConference, DriverSettlement, BankTransaction } from './types';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface StoreContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  addMovement: (movement: Movement) => void;
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
  addRegisteredClient: (client: RegisteredClient) => void;
  removeRegisteredClient: (id: string) => void;
  updateRegisteredClient: (id: string, updates: Partial<RegisteredClient>) => void;
  setCompanyLogo: (logo?: string) => void;
  clearDatabase: () => void;
  addCustomVehicleCategory: (cat: { id: string; name: string; bypassProductionDefault: boolean }) => void;
  removeCustomVehicleCategory: (id: string) => void;
  addCustomEntryPurpose: (purp: { id: string; name: string; bypassProductionDefault: boolean }) => void;
  removeCustomEntryPurpose: (id: string) => void;
  updateMovementDetails: (id: string, updates: Partial<Movement>) => void;
  revertMovementExit: (id: string, editedBy?: string, editReason?: string) => void;
  updateRegisteredVehicleDriver: (id: string, defaultDriverId: string | undefined) => void;
  updateKanbanStep: (id: string, step: Movement['kanbanStep']) => void;
  toggleKanbanPause: (id: string, reason?: Movement['kanbanPauseReason']) => void;
  toggleProductionOpen: (open: boolean, unit?: string) => void;
  addCustomAvariaType: (type: string, classification: 'descarregamento' | 'carregamento' | 'ambos', category?: 'avaria' | 'compra' | 'vasilhame_rota', origin?: 'frota_propria' | 'cliente', descontarMotorista?: boolean) => void;
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
  manuallyReconcileBankTransaction: (txId: string, reason: string) => void;
  undoManualReconciliation: (txId: string) => void;
  getMovementPhotos: (movementId: string) => { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string; loading?: boolean };
  savePhotosForMovement: (movementId: string, photos: { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string }) => Promise<void>;
}

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
      estoque: true
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
      estoque: false
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
      estoque: false
    }
  }
];

export const defaultCustomAvariaTypes: CustomAvariaType[] = [
  { id: 'av-microfuro', type: 'microfuro', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencidomes', type: 'vencido do mês (seco)', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencidocheio', type: 'vencido (cheio)', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-vencido', type: 'vencido', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-cheiro', type: 'cheiro', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-quebrado', type: 'quebrado', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-quebradolac', type: 'quebrado lacrado', classification: 'ambos', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-lodo', type: 'lodo', classification: 'descarregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-rota', type: 'vasilhame de rota', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-quebramaq', type: 'quebra na maquina', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-quebracarr', type: 'quebra carregamento', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-ressecado', type: 'ressecado', classification: 'carregamento', category: 'avaria', origin: 'frota_propria', descontarMotorista: true },
  { id: 'av-saopedro', type: 'Vasilhame São Pedro', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
  { id: 'av-prime', type: 'Vasilhame Prime', classification: 'ambos', category: 'compra', origin: 'frota_propria', descontarMotorista: false },
];

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
  defaultCustomAvariaTypes.forEach(d => {
    const dNorm = cleanOccurrenceTypeName(d.type).toLowerCase().trim();
    const exists = migrated.some(m => m && m.type && cleanOccurrenceTypeName(m.type).toLowerCase().trim() === dNorm);
    if (!exists) {
      migrated.push({
        ...d,
        category: dNorm === 'vasilhame de rota' ? 'compra' : d.category
      });
    } else if (dNorm === 'vasilhame de rota') {
      migrated = migrated.map(m => {
        if (cleanOccurrenceTypeName(m.type).toLowerCase().trim() === 'vasilhame de rota') {
          return { ...m, category: 'compra' };
        }
        return m;
      });
    }
  });

  return migrated.filter(item => {
    const norm = cleanOccurrenceTypeName(item.type).toLowerCase().trim();
    return norm !== 'compra vasilhame';
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
    modules: u.role === 'admin' ? {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: true,
      prestacao_contas: true,
      estoque: true
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
      ...(u.modules || {})
    }
  }));
};

export const migrateCurrentUser = (user: any): User | null => {
  if (!user) return null;
  return {
    ...user,
    modules: user.role === 'admin' ? {
      portaria: true,
      fila: true,
      abastecimento: true,
      relatorios: true,
      chat: true,
      cadastros: true,
      config: true,
      prestacao_contas: true,
      estoque: true
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
      ...(user.modules || {})
    }
  };
};

const defaultState: AppState = {
  currentUser: null,
  movements: [],
  supplies: [],
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
  registeredClients: [],
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
    { id: 'producao', name: 'Fluxo Normal de Produção (Fila)', bypassProductionDefault: false },
    { id: 'carga_descarga', name: 'Carga / Descarga de Mercadorias', bypassProductionDefault: true },
    { id: 'entrega_mercadoria', name: 'Entregas de Insumos / Encomendas', bypassProductionDefault: true },
    { id: 'visita_servico', name: 'Visita ou Prestação de Serviços', bypassProductionDefault: true },
  ],
  customAvariaTypes: defaultCustomAvariaTypes,
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirstFetchCompleted = React.useRef(false);
  const ignoreNextPush = React.useRef(false);
  const lastLocalMutationTime = React.useRef<number>(0);

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
          customVehicleCategories: parsed.customVehicleCategories || defaultState.customVehicleCategories,
          customEntryPurposes: parsed.customEntryPurposes || defaultState.customEntryPurposes,
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
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

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

  const savePhotosForMovement = async (movementId: string, photos: { orderPhoto?: string; avariasDescarregamentoPhoto?: string; avariasCarregamentoPhoto?: string }) => {
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
    } catch (err) {
      console.warn(`Failed to save photos to Firestore for ${movementId}:`, err);
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

            const mergedMovements = (data.movements || []).map((incomingM: any) => {
              const localM = s.movements.find((lm: any) => lm.id === incomingM.id);
              if (localM) {
                const mergedM = { ...incomingM };
                if (!mergedM.orderPhoto && localM.orderPhoto) {
                  mergedM.orderPhoto = localM.orderPhoto;
                }
                if (localM.productionControl) {
                  mergedM.productionControl = {
                    ...localM.productionControl,
                    ...(mergedM.productionControl || {}),
                  };
                  if (!mergedM.productionControl.avariasDescarregamentoPhoto && localM.productionControl.avariasDescarregamentoPhoto) {
                    mergedM.productionControl.avariasDescarregamentoPhoto = localM.productionControl.avariasDescarregamentoPhoto;
                  }
                  if (!mergedM.productionControl.avariasCarregamentoPhoto && localM.productionControl.avariasCarregamentoPhoto) {
                    mergedM.productionControl.avariasCarregamentoPhoto = localM.productionControl.avariasCarregamentoPhoto;
                  }
                }
                return mergedM;
              }
              return incomingM;
            });

            const merged = {
              ...defaultState,
              ...data,
              movements: mergedMovements,
              currentUser: s.currentUser, // Maintain the local tab session
              systemUsers: migrateSystemUsersList(data.systemUsers || s.systemUsers),
              registeredVehicles: data.registeredVehicles || [],
              registeredDrivers: data.registeredDrivers || [],
              registeredClients: data.registeredClients || [],
              customVehicleCategories: data.customVehicleCategories || defaultState.customVehicleCategories,
              customEntryPurposes: data.customEntryPurposes || defaultState.customEntryPurposes,
              customAvariaTypes: migrateAvariaTypes(data.customAvariaTypes, mergedMovements),
              companyLogo: data.companyLogo !== undefined ? data.companyLogo : s.companyLogo,
              initialDieselStock: data.initialDieselStock !== undefined ? data.initialDieselStock : s.initialDieselStock !== undefined ? s.initialDieselStock : 0,
              initialArlaStock: data.initialArlaStock !== undefined ? data.initialArlaStock : s.initialArlaStock !== undefined ? s.initialArlaStock : 0,
              dieselTankCapacity: data.dieselTankCapacity !== undefined ? data.dieselTankCapacity : s.dieselTankCapacity !== undefined ? s.dieselTankCapacity : 15000,
              arlaTankCapacity: data.arlaTankCapacity !== undefined ? data.arlaTankCapacity : s.arlaTankCapacity !== undefined ? s.arlaTankCapacity : 3000,
              initialDieselStocks: data.initialDieselStocks || s.initialDieselStocks || {},
              dieselTankCapacities: data.dieselTankCapacities || s.dieselTankCapacities || {},
              initialArlaStocks: data.initialArlaStocks || s.initialArlaStocks || {},
              arlaTankCapacities: data.arlaTankCapacities || s.arlaTankCapacities || {},
              customStockProducts: migrateStockProducts(data.customStockProducts || []),
              initialStockLevels: migrateInitialStockLevels(data.initialStockLevels || {}),
              manualStockAdjustments: data.manualStockAdjustments || [],
              resolvedStockAlerts: data.resolvedStockAlerts || [],
              verifiedScrapAlerts: data.verifiedScrapAlerts || [],
              scrapConferences: data.scrapConferences || [],
              driverSettlements: data.driverSettlements || [],
              bankTransactions: data.bankTransactions || [],
            };
            localStorage.setItem('industrack_state', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn("REST fetch fallback failed:", e);
    } finally {
      isFirstFetchCompleted.current = true;
    }
  };

  // Client-side Firestore Real-time Synchronization (Sync across multiple computers/devices)
  useEffect(() => {
    // 1. Initial fast-load from REST api route
    fetchState();

    // 2. Stream revisions in real-time straight from Cloud Firestore, if available
    const docRef = doc(db, 'appState', 'current');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (Date.now() - lastLocalMutationTime.current < 4000) {
        return;
      }
      if (snapshot.exists()) {
        const data = snapshot.data();
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

            const mergedMovements = (data.movements || []).map((incomingM: any) => {
              const localM = s.movements.find((lm: any) => lm.id === incomingM.id);
              if (localM) {
                const mergedM = { ...incomingM };
                if (!mergedM.orderPhoto && localM.orderPhoto) {
                  mergedM.orderPhoto = localM.orderPhoto;
                }
                if (localM.productionControl) {
                  mergedM.productionControl = {
                    ...localM.productionControl,
                    ...(mergedM.productionControl || {}),
                  };
                  if (!mergedM.productionControl.avariasDescarregamentoPhoto && localM.productionControl.avariasDescarregamentoPhoto) {
                    mergedM.productionControl.avariasDescarregamentoPhoto = localM.productionControl.avariasDescarregamentoPhoto;
                  }
                  if (!mergedM.productionControl.avariasCarregamentoPhoto && localM.productionControl.avariasCarregamentoPhoto) {
                    mergedM.productionControl.avariasCarregamentoPhoto = localM.productionControl.avariasCarregamentoPhoto;
                  }
                }
                return mergedM;
              }
              return incomingM;
            });

            const merged = {
              ...defaultState,
              ...data,
              movements: mergedMovements,
              currentUser: s.currentUser, // Maintain the local tab session
              systemUsers: migrateSystemUsersList(data.systemUsers || s.systemUsers),
              registeredVehicles: data.registeredVehicles || [],
              registeredDrivers: data.registeredDrivers || [],
              registeredClients: data.registeredClients || [],
              customVehicleCategories: data.customVehicleCategories || defaultState.customVehicleCategories,
              customEntryPurposes: data.customEntryPurposes || defaultState.customEntryPurposes,
              customAvariaTypes: migrateAvariaTypes(data.customAvariaTypes, mergedMovements),
              companyLogo: data.companyLogo !== undefined ? data.companyLogo : s.companyLogo,
              initialDieselStock: data.initialDieselStock !== undefined ? data.initialDieselStock : s.initialDieselStock !== undefined ? s.initialDieselStock : 0,
              initialArlaStock: data.initialArlaStock !== undefined ? data.initialArlaStock : s.initialArlaStock !== undefined ? s.initialArlaStock : 0,
              dieselTankCapacity: data.dieselTankCapacity !== undefined ? data.dieselTankCapacity : s.dieselTankCapacity !== undefined ? s.dieselTankCapacity : 15000,
              arlaTankCapacity: data.arlaTankCapacity !== undefined ? data.arlaTankCapacity : s.arlaTankCapacity !== undefined ? s.arlaTankCapacity : 3000,
              initialDieselStocks: data.initialDieselStocks || s.initialDieselStocks || {},
              dieselTankCapacities: data.dieselTankCapacities || s.dieselTankCapacities || {},
              initialArlaStocks: data.initialArlaStocks || s.initialArlaStocks || {},
              arlaTankCapacities: data.arlaTankCapacities || s.arlaTankCapacities || {},
              customStockProducts: migrateStockProducts(data.customStockProducts || []),
              initialStockLevels: migrateInitialStockLevels(data.initialStockLevels || {}),
              manualStockAdjustments: data.manualStockAdjustments || [],
              resolvedStockAlerts: data.resolvedStockAlerts || [],
              verifiedScrapAlerts: data.verifiedScrapAlerts || [],
              scrapConferences: data.scrapConferences || [],
              driverSettlements: data.driverSettlements || [],
              bankTransactions: data.bankTransactions || [],
            };
            localStorage.setItem('industrack_state', JSON.stringify(merged));
            return merged;
          });
        }
      } else {
        // Hydrate blank cloud state with local state if document doesn't exist
        setState(s => {
          const { currentUser, ...sharedData } = s;
          setDoc(docRef, sharedData).catch(err => {
            console.warn("Could not write starting structure to Firestore:", err);
          });
          return s;
        });
      }
      isFirstFetchCompleted.current = true;
    }, (error) => {
      console.warn("Firestore collection sync connection issues on client context, using api/state polling:", error);
      isFirstFetchCompleted.current = true;
    });

    // 3. Keep cellular or Safari devices perfectly synced via a lightweight 5-second polling interval
    const pollingInterval = setInterval(() => {
      fetchState();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('industrack_state', JSON.stringify(state));

    // Refuse to push empty local state until the first database fetch finishes
    if (!isFirstFetchCompleted.current) {
      return;
    }

    if (ignoreNextPush.current) {
      ignoreNextPush.current = false;
      return;
    }

    lastLocalMutationTime.current = Date.now();

    const pushCloudState = async () => {
      const { currentUser, ...sharedData } = state;

      // Strip large photos to keep the centralized document lightweight and avoid Firestore 1MB limits
      const strippedMovements = (sharedData.movements || []).map((m: any) => {
        if (m.orderPhoto || m.productionControl) {
          const newM = { ...m };
          if (m.orderPhoto) {
            newM.hasOrderPhoto = true;
            newM.orderPhoto = ''; // Clear Base64
          }
          if (m.productionControl) {
            newM.productionControl = { ...m.productionControl };
            if (m.productionControl.avariasDescarregamentoPhoto) {
              newM.productionControl.hasAvariasDescarregamentoPhoto = true;
              newM.productionControl.avariasDescarregamentoPhoto = ''; // Clear Base64
            }
            if (m.productionControl.avariasCarregamentoPhoto) {
              newM.productionControl.hasAvariasCarregamentoPhoto = true;
              newM.productionControl.avariasCarregamentoPhoto = ''; // Clear Base64
            }
          }
          return newM;
        }
        return m;
      });

      const cleanSharedData = {
        ...sharedData,
        movements: strippedMovements
      };

      // STEP A: Fire the REST POST API update first or in parallel. This is 100% reliable, works across all browsers (Safari, cellular, desktops)
      // and updates both the server memory + triggers the server's Firestore set doc. It completely bypasses client-side gRPC/WebSocket failures in sandboxed iframes.
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanSharedData),
      }).catch((err) => {
        console.warn("REST server backup push failed:", err);
      });

      // STEP B: Attempt to push directly to Firestore in real-time, catching failures cleanly so they don't break the REST sync pathway
      try {
        const docRef = doc(db, 'appState', 'current');
        await setDoc(docRef, cleanSharedData);
      } catch (err) {
        console.warn("Failed to push state directly to client Firestore:", err);
      }
    };
    pushCloudState();
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

  const addMovement = (movement: Movement) => {
    setState((s) => ({
      ...s,
      movements: [{ ...movement, unit: movement.unit || s.currentUser?.unit || 'matriz' }, ...s.movements]
    }));
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
          const newExit = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            exitedAt: timestamp,
            exitedBy,
          };
          const gateTemporaryExits = m.gateTemporaryExits ? [...m.gateTemporaryExits, newExit] : [newExit];
          return {
            ...m,
            gateStatus: type === 'almoco' ? 'ausente_almoco' as const : 'ausente_oficina' as const,
            gateTemporaryExits,
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

  const updateMovementDetails = (id: string, updates: Partial<Movement>) => {
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
            return {
              ...m,
              ...finalUpdates,
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

  const toggleProductionOpen = (open: boolean, unit?: string) => {
    const targetUnit = unit || 'matriz';
    const timestamp = new Date().toISOString();

    setState((s) => {
      const updatedMovements = s.movements.map((m) => {
        const mUnit = m.unit || 'matriz';
        if (mUnit !== targetUnit) return m;
        if (!m.kanbanStep || m.kanbanStep === 'concluido' || m.status === 'saida') return m;

        let kanbanPausedAt = m.kanbanPausedAt;
        const kanbanTotalPause = { ...(m.kanbanTotalPause || {}) };
        let kanbanPauseReason = m.kanbanPauseReason;
        let kanbanPauseHistory = m.kanbanPauseHistory ? [...m.kanbanPauseHistory] : [];

        if (!open) {
          // FECHAR PRODUÇÃO -> Pause if not already paused
          if (!kanbanPausedAt) {
            kanbanPausedAt = timestamp;
            kanbanPauseReason = 'producao_fechada';

            const newPause = {
              id: Math.random().toString(36).substring(2, 9),
              reason: 'producao_fechada' as const,
              pausedAt: timestamp,
              step: m.kanbanStep,
            };
            kanbanPauseHistory.push(newPause);

            return {
              ...m,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanPauseHistory,
            };
          }
        } else {
          // ABRIR PRODUÇÃO -> Unpause if paused due to 'producao_fechada'
          if (kanbanPausedAt && kanbanPauseReason === 'producao_fechada') {
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

            return {
              ...m,
              kanbanPausedAt,
              kanbanTotalPause,
              kanbanPauseReason,
              kanbanPauseHistory,
            };
          }
        }

        return m;
      });

      return {
        ...s,
        movements: updatedMovements,
        productionOpen: {
          ...(s.productionOpen || {}),
          [targetUnit]: open,
        },
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
      const newAdj: StockAdjustment = {
        ...adj,
        id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toISOString(),
        operator: s.currentUser?.name || 'Sistema',
        unit: s.currentUser?.unit || 'matriz'
      };
      return {
        ...s,
        manualStockAdjustments: [newAdj, ...currentAdjustments]
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

  const importBankTransactions = (txs: BankTransaction[]) => {
    setState((s) => {
      const existing = s.bankTransactions || [];
      const userUnit = s.currentUser?.unit || 'matriz';
      const typedTxs = txs.map(tx => ({ ...tx, unit: tx.unit || userUnit }));
      // Filter out transactions that have the same date, description, and amount as any existing transaction (to avoid duplicates)
      const filteredNew = typedTxs.filter((newTx) => 
        !existing.some((exTx) => 
          exTx.id === newTx.id || 
          (exTx.date === newTx.date && exTx.amount === newTx.amount && exTx.description === newTx.description)
        )
      );
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
    setState((s) => ({
      ...s,
      movements: [],
      supplies: [],
      dieselPurchases: [],
      arlaPurchases: [],
      initialDieselStock: 0,
      dieselTankCapacity: 15000,
      initialArlaStock: 0,
      arlaTankCapacity: 3000,
      registeredVehicles: [],
      registeredDrivers: [],
      registeredClients: [],
      bankTransactions: [],
      driverSettlements: [],
      manualStockAdjustments: [],
      resolvedStockAlerts: [],
      verifiedScrapAlerts: [],
      scrapConferences: [],
      initialStockLevels: {},
      productionOpen: {},
    }));
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

  const currentUserUnit = state.currentUser?.unit || 'matriz';
  const isAdmin = state.currentUser?.role === 'admin';

  const filteredMovements = state.movements.filter((m) => (m.unit || 'matriz') === currentUserUnit);
  const filteredSupplies = state.supplies.filter((s) => (s.unit || 'matriz') === currentUserUnit);
  const filteredDieselPurchases = (state.dieselPurchases || []).filter(
    (p) => (p.unit || 'matriz') === currentUserUnit
  );
  const filteredArlaPurchases = (state.arlaPurchases || []).filter(
    (p) => (p.unit || 'matriz') === currentUserUnit
  );

  const filteredVehicles = (state.registeredVehicles || []).filter(
    (v) => (v.unit || 'matriz') === currentUserUnit
  );

  const filteredDrivers = (state.registeredDrivers || []).filter(
    (d) => (d.unit || 'matriz') === currentUserUnit
  );

  const filteredClients = (state.registeredClients || []).filter(
    (c) => (c.unit || 'matriz') === currentUserUnit
  );

  const filteredCategories = (state.customVehicleCategories || []).filter(
    (c) => !c.unit || c.unit === currentUserUnit
  );

  const filteredPurposes = (state.customEntryPurposes || []).filter(
    (p) => !p.unit || p.unit === currentUserUnit
  );

  const filteredAvariaTypes = (state.customAvariaTypes || []).filter(
    (t) => !t.unit || t.unit === currentUserUnit
  );

  const filteredStockProducts = (state.customStockProducts || [])
    .map(p => typeof p === 'string' ? { name: p, unit: 'matriz' as const } : p)
    .filter(p => p.unit === currentUserUnit)
    .map(p => p.name);

  const filteredChecklistItems = (state.customChecklistItems || [])
    .map(i => typeof i === 'string' ? { text: i, unit: 'matriz' as const } : i)
    .filter(i => i.unit === currentUserUnit)
    .map(i => i.text);

  const activeDieselStock = state.initialDieselStocks?.[currentUserUnit] ?? state.initialDieselStock ?? 0;
  const activeDieselCapacity = state.dieselTankCapacities?.[currentUserUnit] ?? state.dieselTankCapacity ?? 15000;
  const activeArlaStock = state.initialArlaStocks?.[currentUserUnit] ?? state.initialArlaStock ?? 0;
  const activeArlaCapacity = state.arlaTankCapacities?.[currentUserUnit] ?? state.arlaTankCapacity ?? 3000;

  const filteredDriverSettlements = (state.driverSettlements || []).filter(
    (ds) => (ds.unit || 'matriz') === currentUserUnit
  );

  const filteredBankTransactions = (state.bankTransactions || []).filter(
    (tx) => (tx.unit || 'matriz') === currentUserUnit
  );

  return (
    <StoreContext.Provider
      value={{
        ...state,
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
        addRegisteredClient,
        removeRegisteredClient,
        updateRegisteredClient,
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
        manuallyReconcileBankTransaction,
        undoManualReconciliation,
        getMovementPhotos,
        savePhotosForMovement,
      }}
    >
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
