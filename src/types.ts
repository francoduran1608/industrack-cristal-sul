export type Role = 'admin' | 'operador' | 'visualizador' | 'motorista';

export type User = {
  id: string;
  name: string;
  role: Role;
  unit?: 'matriz' | 'filial';
  modules?: {
    portaria: boolean;
    fila: boolean;
    abastecimento: boolean;
    relatorios: boolean;
    chat: boolean;
    cadastros?: boolean;
    config?: boolean;
    prestacao_contas?: boolean;
    estoque?: boolean;
  };
};

export type VehicleType = string;
export type OwnerType = 'proprio' | 'terceiro';

export type ProductionLine = 'pesada' | 'media';

export type MovementStatus = 'na_fila' | 'em_atendimento' | 'concluido' | 'saida';

export interface VehicleCategory {
  id: string;
  name: string;
  bypassProductionDefault: boolean;
  unit?: 'matriz' | 'filial';
}

export interface EntryPurpose {
  id: string;
  name: string;
  bypassProductionDefault: boolean;
  unit?: 'matriz' | 'filial';
}

export interface RegisteredVehicle {
  id: string;
  plate: string;
  vehicleType: VehicleType;
  ownerType: OwnerType;
  model?: string;
  defaultDriverId?: string; // linked driver
  averageVasilhames?: number; // average container/bottle quantity
  unit?: 'matriz' | 'filial';
}

export interface RegisteredDriver {
  id: string;
  name: string;
  driverType: 'interno' | 'cliente';
  unit?: 'matriz' | 'filial';
  commissionPercent?: number; // commission percentage (e.g. 8)
  damageToleranceQty?: number; // max allowed damages before deduction (e.g. 5)
}

export interface RegisteredClient {
  id: string;
  name: string;
  defaultVehicleId?: string; // Linked pre-registered vehicle (RegisteredVehicle ID)
  defaultDriverId?: string;  // Linked pre-registered driver (RegisteredDriver ID)
  vehicleIds?: string[];     // Linked multiple vehicle IDs
  driverIds?: string[];      // Linked multiple driver IDs
  unit?: 'matriz' | 'filial';
  
  // Expanded client registration fields
  codigo?: string;
  apelidoFantasia?: string;
  personType?: 'fisica' | 'juridica';
  rgIe?: string;
  cpfCnpj?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  ddd?: string;
  telefone?: string;
  comprasNaEmpresa?: boolean; // Whether they buy directly at the company (appears at Portaria)
}

export interface Movement {
  id: string;
  productionCode?: string; // Production/Service code generated for own fleet
  plate: string;
  driver: string;
  ownerType: OwnerType;
  vehicleType: VehicleType;
  odometer?: number; // Only for 'proprio'
  type: 'entrada' | 'saida';
  timestamp: string;
  checklist: Checklist;
  status: MovementStatus;
  createdBy?: string;          // Audit: who authorized entry
  exitedBy?: string;           // Audit: who authorized exit
  checklistEvaluator?: string; // Audit: who performed inspection
  purpose?: string;            // Dynamic entry purpose
  bypassProduction?: boolean;  // If true, bypasses the production queue completely
  entryTimestamp?: string;     // Explicit entry timestamp
  exitTimestamp?: string;      // Explicit exit timestamp
  editedBy?: string;           // Audit: who lastly updated details
  editedAt?: string;           // Audit: timestamp of lastly updated details
  editReason?: string;         // Audit: reason for detail changes
  wasEdited?: boolean;         // Flag indicating manual alteration
  alteredFields?: string;      // Audit: details of what fields were changed
  client?: string;             // Client name/information (optional)
  orderPhoto?: string;         // Base64 encoded photograph of the order/request (optional)
  unit?: 'matriz' | 'filial';
  earlyExitReason?: string;
  productionReverted?: boolean;
  productionRevertBy?: string;
  productionRevertAt?: string;
  productionRevertReason?: string;
  productionReverts?: {
    revertedBy: string;
    revertedAt: string;
    revertReason: string;
    fromStep: string;
    toStep: string;
  }[];
  
  // Kanban Production features
  kanbanStep?: 'aguardando_descarregamento' | 'descarregamento' | 'aguardando_carregamento' | 'carregamento' | 'concluido';
  kanbanTimings?: Record<string, string>; // Maps step ID to start timestamp
  kanbanPausedAt?: string; // If currently paused, this holds the timestamp of when it was paused
  kanbanTotalPause?: Record<string, number>; // Maps step ID to total accumulated paused milliseconds
  kanbanPauseReason?: 'almoco' | 'oficina' | 'outros' | 'pausa_interna' | 'producao_fechada';
  kanbanPauseHistory?: ProductionPause[];
  
  // Production / Vasilhame control
  productionControl?: ProductionControl;

  // Gate temporary exits / entries
  gateStatus?: 'normal' | 'ausente_almoco' | 'ausente_oficina';
  gateTemporaryExits?: GateTemporaryExit[];
  cashAdvances?: CashAdvance[];
}

export interface CashAdvance {
  id: string;
  value: number;
  reason: string;
  timestamp: string;
  operator: string;
}

export interface GateTemporaryExit {
  id: string;
  type: 'almoco' | 'oficina';
  exitedAt: string;
  returnedAt?: string;
  durationMs?: number;
  exitedBy?: string;
  returnedBy?: string;
}

export interface ProductionPause {
  id: string;
  reason: 'almoco' | 'oficina' | 'outros' | 'pausa_interna' | 'producao_fechada';
  pausedAt: string;
  resumedAt?: string;
  durationMs?: number;
  step: string;
}

export interface AvariaEntry {
  type: string;
  qty: number;
}

export interface StockRequest {
  id: string;
  product: string;
  qty: number;
  stage: 'descarregamento' | 'carregamento';
  timestamp: string;
  resolved: boolean;
  unit?: 'matriz' | 'filial';
}

export interface DifferenceReasonBreakdown {
  reason: 'venda' | 'vasilhame_cliente' | 'falta' | 'outros' | 'comodato';
  qty: number;
}

export interface ProductionControl {
  descarregadoFormula?: string;
  descarregadoQty: number;
  avariasDescarregamento: AvariaEntry[];
  avariasDescarregamentoPhoto?: string; // base64 string
  avariasCarregamento: AvariaEntry[];
  avariasCarregamentoPhoto?: string; // base64 string
  observacoes?: string;
  totalCarregado: number;
  retornoVasilhameCheio?: number;
  // Proprietary vehicle check
  expectedDischargeQty?: number;
  differenceQty?: number; // expectedDischargeQty - descarregadoQty
  differenceReason?: string; // description or reason
  differenceReasonsBreakdown?: DifferenceReasonBreakdown[];
  differenceExplanation?: string;
  stockRequests?: StockRequest[]; // Separate independent requests for inventory approval
  retiradaVasilhameCarga?: number; // Qty of containers withdrawn from load to routing container stock
  
  // Mobile app data for motorista during the trip
  mobileSales?: SettlementSale[];
  mobileExpenses?: SettlementExpense[];
  mobileBonifications?: number; 
  mobileComodato?: number;
  mobileComodatoReturn?: number;
}

export interface Checklist {
  brakes: boolean;
  tires: boolean;
  lights: boolean;
  leaks: boolean;
  passed: boolean; // Computed or manual override
  notes?: string;
  customItems?: Record<string, boolean>; // State of dynamically added checks
}

export type SupplyType = 'diesel' | 'arla' | 'lubrificacao' | 'calibracao';

export interface SupplyRecord {
  id: string;
  movementId: string; // Refers to the current entry movement
  plate: string;
  type: SupplyType;
  amount: number; // Volume or quantity
  odometer: number; // Mandatory vehicle KM at time of supply
  timestamp: string;
  operator?: string;   // Audit: who performed the service
  stationType?: 'interno' | 'externo'; // Posto interno ou posto externo
  price?: number; // Preço pago (especialmente para abastecimento externo)
  unit?: 'matriz' | 'filial';
}

export interface SystemUser {
  id: string;
  name: string;
  username: string; // login identifier matching
  password?: string;
  role: Role;
  unit?: 'matriz' | 'filial';
  modules: {
    portaria: boolean;
    fila: boolean;
    abastecimento: boolean;
    relatorios: boolean;
    chat: boolean;
    cadastros?: boolean;
    config?: boolean;
    prestacao_contas?: boolean;
    estoque?: boolean;
  };
}

export interface CustomAvariaType {
  id: string;
  type: string;
  classification: 'descarregamento' | 'carregamento' | 'ambos';
  category?: 'avaria' | 'compra' | 'vasilhame_rota';
  unit?: 'matriz' | 'filial';
  origin?: 'frota_propria' | 'cliente';
  descontarMotorista?: boolean;
}

export interface StockAdjustment {
  id: string;
  product: string;
  qty: number;
  type: 'entrada' | 'saida';
  reason: string;
  timestamp: string;
  operator: string;
  unit?: 'matriz' | 'filial';
}

export interface SettlementSale {
  id: string;
  saleNumber?: string;
  item: string;
  qty: number;
  value: number;
  paymentMethod?: string;
  paymentMethodNote?: string;
  productType?: 'agua' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno';
  clientName?: string;
  signature?: string;
  timestamp?: string;
  paymentsBreakdown?: {
    dinheiro?: number;
    pix?: number;
    boleto?: number;
    cheque?: number;
    outros?: number;
  };
}

export interface SettlementExpense {
  id: string;
  item: string;
  value: number;
}

export interface SettlementSuprimento {
  id: string;
  item: string;
  value: number;
}

export interface SettlementAvaria {
  qty: number;
  value: number;
  total: number;
}

export interface SettlementPaymentForms {
  dinheiro: number;
  pix: number;
  boleto: number;
  cheque: number;
  outros: number;
}

export interface DriverSettlement {
  id: string;
  movementId: string; // Linked load / movement
  tripControlNumber?: string; // Linked trip/production control number
  driverId: string;
  driverName: string;
  plate: string;
  dateSettlement: string; // Data Acerto
  dateExit: string; // Data Saída
  dateArrival: string; // Data Chegada
  sales: SettlementSale[];
  expenses: SettlementExpense[];
  suprimentos?: SettlementSuprimento[];
  payments: SettlementPaymentForms;
  avarias: SettlementAvaria;
  observation?: string;
  commissionPercent: number; // e.g. 8
  
  // Totals
  totalSales: number;
  totalExpenses: number;
  totalSuprimentos?: number;
  totalToReceive: number; // totalSales - totalExpenses + totalSuprimentos + totalCashAdvances
  totalDelivered: number; // sum of payments
  difference: number; // totalDelivered - totalToReceive
  
  // Commission Calculations
  basicCommission: number; // totalSales * (commissionPercent / 100)
  avariaDeduction: number; // avarias.total
  shortageDeduction: number; // if difference < 0, then abs(difference), else 0
  finalCommission: number; // basicCommission - avariaDeduction - shortageDeduction
  
  // Reconciliation Info
  isReconciled: boolean;
  reconciledAt?: string;
  reconciledPixTransactionId?: string; // Linked bank PIX statement ID if reconciled
  reconciledPixTransactionIds?: string[]; // Multiple linked bank PIX statement IDs if reconciled
  status: 'pending' | 'completed'; // pending = draft, completed = finalized
  unit: 'matriz' | 'filial';
  vendaVasilhameQty?: number;
  comodatoVasilhameQty?: number;
  missingBottlesQty?: number;
  finalUnaccountedShortage?: number;
}

export interface BankTransaction {
  id: string; // unique identifier
  date: string; // date of transaction (YYYY-MM-DD)
  description: string; // description (e.g., "RECEBIMENTO PIX")
  amount: number; // positive amount for incoming transactions
  documentRef?: string; // transaction reference
  isReconciled: boolean;
  reconciledWithSettlementId?: string;
  manualReconciliationReason?: string;
  importedAt: string;
  unit: 'matriz' | 'filial';
}

export interface AppState {
  currentUser: User | null;
  movements: Movement[];
  supplies: SupplyRecord[];
  dieselPurchases?: DieselPurchase[];
  initialDieselStock?: number;
  dieselTankCapacity?: number;
  arlaPurchases?: ArlaPurchase[];
  initialArlaStock?: number;
  arlaTankCapacity?: number;
  initialDieselStocks?: Record<string, number>;
  dieselTankCapacities?: Record<string, number>;
  initialArlaStocks?: Record<string, number>;
  arlaTankCapacities?: Record<string, number>;
  customChecklistItems?: any[]; // Dynamic, user-created checklist items
  systemUsers?: SystemUser[]; // Registered system users list
  registeredVehicles?: RegisteredVehicle[]; // Master list of vehicles (proprietary and 3rd party)
  registeredDrivers?: RegisteredDriver[]; // Master list of company drivers
  registeredClients?: RegisteredClient[]; // Master list of pre-registered clients
  companyLogo?: string; // Company logo URL or Base64 string
  customVehicleCategories?: VehicleCategory[]; // Custom vehicle categories registered by user
  customEntryPurposes?: EntryPurpose[]; // Custom entry purposes registered by user
  customAvariaTypes?: CustomAvariaType[]; // Custom avaria types registered by user
  avgTimeDischarging?: number; // average containers per minute discharged
  avgTimeLoading?: number; // average containers per minute loaded
  customStockProducts?: any[]; // Custom product names for stock control
  initialStockLevels?: Record<string, number>; // Maps product name to initial stock level
  manualStockAdjustments?: StockAdjustment[]; // Manual adjustments log
  resolvedStockAlerts?: string[]; // List of unique alert IDs that are marked as resolved
  verifiedScrapAlerts?: string[]; // List of movement IDs whose avarias/scraps have been verified by stock sector
  scrapConferences?: ScrapConference[]; // List of bulk conferences of scrap
  driverSettlements?: DriverSettlement[]; // Driver account settlements
  bankTransactions?: BankTransaction[]; // Imported bank PIX entries for reconciliation
  productionOpen?: Record<string, boolean>; // Indicates if production is open for a given unit
}

export interface ScrapConference {
  id: string;
  timestamp: string;
  operator: string;
  yardQty: number;
  realQty: number;
  movementIds: string[];
  unit: 'matriz' | 'filial';
  type?: 'descarregamento' | 'carregamento';
}

export interface DieselPurchase {
  id: string;
  amount: number; // in liters
  pricePerLiter?: number;
  supplier?: string;
  timestamp: string;
  registeredBy?: string; // Audit
  unit?: 'matriz' | 'filial';
}

export interface ArlaPurchase {
  id: string;
  amount: number; // in liters
  pricePerLiter?: number;
  supplier?: string;
  timestamp: string;
  registeredBy?: string; // Audit
  unit?: 'matriz' | 'filial';
}

