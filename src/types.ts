export type Role = 'admin' | 'operador' | 'visualizador' | 'motorista' | 'supervisor';

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
    linha_descartavel?: boolean;
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
  bypassProductionDefault?: boolean;
  defaultPurposeId?: string;
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
  hasOrderPhoto?: boolean;     // Flag indicating photo exists on server (optional)
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
  kanbanPauseReason?: 'almoco' | 'oficina' | 'outros' | 'pausa_interna' | 'producao_fechada' | 'quebra_maquina';
  kanbanDetailedPauseReason?: string; // Detailed reason for stopping production (e.g. outside scheduled hours)
  kanbanPauseHistory?: ProductionPause[];
  
  // Production / Vasilhame control
  productionControl?: ProductionControl;
  isInitialTrip?: boolean;

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
  step?: string;
}

export interface ProductionPause {
  id: string;
  reason: 'almoco' | 'oficina' | 'outros' | 'pausa_interna' | 'producao_fechada' | 'quebra_maquina';
  detailedReason?: string;
  isScheduledPause?: boolean;
  notes?: string;
  machineId?: string;
  pausedAt: string;
  resumedAt?: string;
  durationMs?: number;
  step: string;
}

export type MachineStatus = 'operacional' | 'pausada_almoco' | 'encerrada_dia' | 'quebrada' | 'manutencao' | 'pausada_outros';

export interface MachineInfo {
  id: string; // 'machine_1' | 'machine_2'
  name: string; // 'Máquina 1 (Linha Pesada)' | 'Máquina 2 (Linha Média)'
  lineType: 'pesada' | 'media';
  status: MachineStatus;
  capacityPerHour?: number; // Metas de produção
  reason?: string;
  stoppedAt?: string;
  stoppedBy?: string;
  notes?: string;
  resumedAt?: string;
}

export interface ProductionStatusDetail {
  isOpen: boolean;
  closedAt?: string;
  closedBy?: string;
  reason?: string;
  customReason?: string;
  isScheduledPause?: boolean;
  notes?: string;
  machineId?: string;
}

export interface ProductionStopLog {
  id: string;
  unit: string;
  stoppedAt: string;
  resumedAt?: string;
  durationMs?: number;
  stoppedBy: string;
  resumedBy?: string;
  reason: string;
  customReason?: string;
  isScheduledPause: boolean;
  notes?: string;
  machineId?: string;
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
  reason: 'venda' | 'vasilhame_cliente' | 'falta' | 'outros' | 'comodato' | 'troca_avarias';
  qty: number;
}

export interface UnloadingEditLog {
  id: string;
  reason: string;
  timestamp: string;
  editedBy: string;
}

export interface ProductionControl {
  descarregadoFormula?: string;
  descarregadoQty: number;
  avariasDescarregamento: AvariaEntry[];
  avariasDescarregamentoPhoto?: string; // base64 string
  hasAvariasDescarregamentoPhoto?: boolean; // base64 exists on server
  avariasCarregamento: AvariaEntry[];
  avariasCarregamentoPhoto?: string; // base64 string
  hasAvariasCarregamentoPhoto?: boolean; // base64 exists on server
  observacoes?: string;
  totalCarregado: number;
  retornoVasilhameCheio?: number;
  vasilhamesRetornadosLavagem?: number; // Retornados para lavar, usados para controle de tampas
  // Proprietary vehicle check
  expectedDischargeQty?: number;
  differenceQty?: number; // expectedDischargeQty - descarregadoQty
  differenceReason?: string; // description or reason
  differenceReasonsBreakdown?: DifferenceReasonBreakdown[];
  differenceExplanation?: string;
  stockRequests?: StockRequest[]; // Separate independent requests for inventory approval
  retiradaVasilhameCarga?: number; // Qty of containers withdrawn from load to routing container stock
  
  unloadingEditLogs?: UnloadingEditLog[];
  cleanCargo?: boolean;

  // Mobile app data for motorista during the trip
  mobileSales?: SettlementSale[];
  mobileExpenses?: SettlementExpense[];
  mobileBonifications?: number; 
  mobileComodato?: number;
  mobileComodatoReturn?: number;
  mobileExchanges?: number;
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
    linha_descartavel?: boolean;
  };
}

export interface CustomAvariaType {
  id: string;
  type: string;
  classification: 'descarregamento' | 'carregamento' | 'ambos';
  category?: 'avaria' | 'compra' | 'vasilhame_rota' | 'retorno_lavagem';
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
  productType?: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca';
  exchangeAvariasQty?: number;
  exchangeRatio?: number;
  clientName?: string;
  signature?: string;
  timestamp?: string;
  wasPreSale?: boolean;
  linkedPreSaleId?: string;
  preSaleProducts?: {
    productType: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca';
    qty: number;
    unitPrice: number;
    exchangeRatio?: number;
  }[];
  paymentsBreakdown?: {
    dinheiro?: number;
    pix?: number;
    boleto?: number;
    cheque?: number;
    outros?: number;
  };
  nfIssued?: boolean;
  nfNumber?: string;
  nfQty?: number;
  boletoIssued?: boolean;
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
  detailedSales?: SettlementSale[]; // Original detailed sales with client names
  expenses: SettlementExpense[];
  suprimentos?: SettlementSuprimento[];
  payments: SettlementPaymentForms;
  avarias: SettlementAvaria;
  observation?: string;
  commissionPercent: number; // e.g. 8
  cidade?: string; // Cidade da viagem
  
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
  trocaVasilhameQty?: number;
  trocaAvariasQty?: number;
  missingBottlesQty?: number;
  finalUnaccountedShortage?: number;
}

export type AuditActionType = 'exclusao' | 'alteracao' | 'ajuste_estoque' | 'estorno' | 'cadastro';

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actionType: AuditActionType;
  entityType: string;
  entityId?: string;
  description: string;
  operator: string;
  reason: string;
  details?: string;
  unit?: 'matriz' | 'filial';
  plate?: string;
  driver?: string;
}

export interface BankTransaction {
  id: string; // unique identifier
  date: string; // date of transaction (YYYY-MM-DD)
  description: string; // description (e.g., "RECEBIMENTO PIX")
  amount: number; // positive amount for incoming transactions (negative for refunds)
  documentRef?: string; // transaction reference
  isReconciled: boolean;
  reconciledWithSettlementId?: string;
  manualReconciliationReason?: string;
  importedAt: string;
  unit: 'matriz' | 'filial';
  importedFileId?: string;
  importFilename?: string;
  institution?: string;
  isRefund?: boolean;
  refundsTransactionId?: string;
  isVoided?: boolean;
  voidedWithTransactionId?: string;
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
  registeredSupervisors?: RegisteredSupervisor[]; // Master list of sales supervisors
  registeredClients?: RegisteredClient[]; // Master list of pre-registered clients
  registeredCities?: RegisteredCity[]; // Master list of pre-registered cities
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
  preSales?: PreSale[]; // Pending pre-sales for drivers
  productionOpen?: Record<string, boolean>; // Indicates if production is open for a given unit
  productionStatusDetails?: Record<string, ProductionStatusDetail>; // Detailed status info per unit
  productionStopLogs?: ProductionStopLog[]; // Log of production pauses/stops
  productionMachines?: Record<string, Record<string, MachineInfo>>; // Production machines per unit (e.g. Matriz: machine_1, machine_2)
  deletedMovementsLogs?: any[]; // Log of deleted movements with reason
  systemAuditLogs?: SystemAuditLog[]; // Comprehensive system-wide audit logs
  clearedAt?: number; // Timestamp of last database clear action
  deletedIds?: string[]; // Log of deleted IDs to prevent syncing resurrection
  
  // Disposable Line (Linha Descartável)
  disposableProducts?: DisposableProduct[];
  disposableProductionLogs?: DisposableProductionLog[];
  disposableInsumoEntries?: DisposableInsumoEntry[];
  disposableExpeditions?: DisposableExpedition[];
  driverTripLoads?: DriverTripLoad[];
  driverTripDeliveries?: DriverTripDelivery[];
}

export interface DisposableProduct {
  id: string;
  name: string;
  category: 'produto_acabado' | 'insumo';
  unit: 'matriz' | 'filial';
  currentStock: number;
  minStock?: number;
  unitMeasure: string; // e.g. 'caixas', 'unidades', 'kg', 'fardos'
  status?: 'ativo' | 'inativo';
  linkedProductId?: string; // ID do produto acabado a qual este insumo está vinculado
  linkedProductName?: string; // Nome do produto acabado vinculado
  consumptionRate?: number; // Quantidade deste insumo baixada por unidade produzida do produto vinculado
}

export interface InsumoAvariaEntry {
  insumoId: string;
  insumoName: string;
  qty: number;
}

export interface DisposableProductionLog {
  id: string;
  date: string; // YYYY-MM-DD
  productId: string;
  productName: string;
  qtyProduced: number; // e.g. caixas produzidas
  avariasQty?: number;
  avariasReason?: string;
  avariasInsumos?: InsumoAvariaEntry[];
  qtyAvariasTotal?: number;
  operator: string;
  unit: 'matriz' | 'filial';
  notes?: string;
  timestamp: string;
}

export interface DisposableInsumoEntry {
  id: string;
  date: string;
  insumoId: string;
  insumoName: string;
  qtyReceived: number;
  supplier?: string;
  documentRef?: string;
  operator: string;
  unit: 'matriz' | 'filial';
  notes?: string;
  timestamp: string;
  attachmentUrl?: string; // Data URL Base64 da foto ou arquivo (NF/Pedido)
  attachmentName?: string; // Nome do arquivo
}

export interface DisposableExpedition {
  id: string;
  date: string;
  productId: string;
  productName: string;
  qtyExpedited: number;
  destination?: string; // e.g. Motorista / Veículo / Cliente / NFe
  clientId?: string;
  clientName?: string;
  clientOrDriver?: string;
  driverName?: string;
  vehiclePlate?: string;
  gateMovementId?: string;
  documentRef?: string;
  attachmentUrl?: string; // Foto obrigatória do pedido
  attachmentName?: string;
  operator: string;
  unit: 'matriz' | 'filial';
  notes?: string;
  timestamp: string;
  deleted?: boolean;
  deleteReason?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface DriverTripLoad {
  id: string;
  expeditionId: string;
  gateMovementId?: string;
  driverName: string;
  vehiclePlate: string;
  productId: string;
  productName: string;
  initialQty: number; // Quantidade total carregada no caminhão
  currentTruckStock: number; // Saldo atual no caminhão
  unitMeasure: string;
  attachmentUrl?: string; // Foto do pedido/carga
  unit: 'matriz' | 'filial';
  status: 'em_viagem' | 'finalizada' | 'cancelada';
  timestamp: string;
  deleted?: boolean;
  deleteReason?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface DriverTripDelivery {
  id: string;
  tripLoadId: string;
  driverName: string;
  vehiclePlate: string;
  clientId?: string;
  clientName: string;
  productId: string;
  productName: string;
  qtyDelivered: number; // Baixa no estoque do caminhão
  unitPrice: number;
  totalReceived: number; // Alimenta o caixa do motorista
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'cheque';
  isCopo200ml: boolean;
  commissionRate: number; // 0.015 (1.5%)
  commissionValue: number; // Valor da comissão (1.5% para Copo 200ml)
  operator: string;
  unit: 'matriz' | 'filial';
  timestamp: string;
  notes?: string;
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

export interface RegisteredCity {
  id: string;
  name: string;
  uf?: string;
}

export interface RegisteredSupervisor {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  createdAt?: string;
  unit?: 'matriz' | 'filial';
}

export interface PreSaleProduct {
  productType: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca';
  productName?: string;
  qty: number;
  unitPrice: number;
  exchangeRatio?: number;
  exchangeAvariasQty?: number;
}

export interface PreSale {
  id: string;
  driverName: string;
  vehiclePlate?: string;
  clientName: string;
  supervisorId?: string;
  supervisorName?: string;
  createdBy?: string;
  createdByRole?: Role;
  products: PreSaleProduct[];
  timestamp: string;
  isUsed: boolean;
  unit?: 'matriz' | 'filial';
  deleted?: boolean;
  deleteReason?: string;
  deletedBy?: string;
  deletedAt?: string;
  nfIssued?: boolean;
  nfNumber?: string;
  nfQty?: number;
  boletoIssued?: boolean;
  nfCancelled?: boolean;
  expeditionApproved?: boolean;
  expeditionPhoto?: string;
  expeditionPhotoName?: string;
  expeditionAttachmentUrl?: string;
  expeditionApprovedBy?: string;
  expeditionApprovedAt?: string;
}



