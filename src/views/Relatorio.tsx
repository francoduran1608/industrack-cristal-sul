import React, { useState } from 'react';
import { useStore, cleanOccurrenceTypeName, getProductionCode, isRewashType } from '../store';
import { Movement, AvariaEntry } from '../types';
import { Sparkles, Bot, Loader2, AlertTriangle, X, Calendar, Truck, User, Fuel, Search, TrendingUp, Info, Printer, Download, ListFilter, Edit, Undo2, AlertCircle, Check, ExternalLink, FileText, Clock, Camera, Eye, PenTool, ChevronUp, ChevronDown, Lock, MapPin, DollarSign, Package, Layers, FileBarChart, ShieldCheck, History, Boxes, Trash2, Sun, Sunset, Droplets, Gauge, Zap, BarChart3, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { OrderPhotoSelector } from '../components/OrderPhotoSelector';
import { DynamicTable } from '../components/DynamicTable';
import { SignaturePad } from '../components/SignaturePad';
import { LinhaDescartavel } from './LinhaDescartavel';
import { MachineStopsReportView } from '../components/MachineStopsReportView';
import { printElementDirectly } from '../utils/printReceipt';

const MovementOrderPhotoBtn = ({ movement, setViewerPhoto }: { movement: any, setViewerPhoto: (val: any) => void }) => {
  const { getMovementPhotos } = useStore();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (movement.orderPhoto) {
      setViewerPhoto({ url: movement.orderPhoto, title: `Pedido do Veículo ${movement.plate}` });
      return;
    }
    setLoading(true);
    try {
      const photos = await getMovementPhotos(movement.id);
      if (photos?.orderPhoto) {
        setViewerPhoto({ url: photos.orderPhoto, title: `Pedido do Veículo ${movement.plate}` });
      } else {
        alert("A foto do pedido não foi localizada no servidor.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-1.5 inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded px-2 py-0.5 text-amber-800 text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer disabled:opacity-50"
      title="Visualizar foto do pedido anexada na saída"
    >
      <FileText size={10} className="text-amber-700" />
      {loading ? "Carregando..." : "Ver Pedido"}
    </button>
  );
};

const MovementAuditPhotos = ({ movement, setActiveLightboxPhoto }: { movement: any, setActiveLightboxPhoto: (url: string) => void }) => {
  const { getMovementPhotos } = useStore();
  const [loadedData, setLoadedData] = useState<{
    avariasDescarregamentoPhoto?: string;
    avariasCarregamentoPhoto?: string;
    loading: boolean;
  } | null>(null);

  const hasDesc = movement.productionControl?.hasAvariasDescarregamentoPhoto || !!movement.productionControl?.avariasDescarregamentoPhoto;
  const hasCarr = movement.productionControl?.hasAvariasCarregamentoPhoto || !!movement.productionControl?.avariasCarregamentoPhoto;

  if (!hasDesc && !hasCarr) return null;

  // Extract from the object if present
  const inlineDesc = movement.productionControl?.avariasDescarregamentoPhoto || '';
  const inlineCarr = movement.productionControl?.avariasCarregamentoPhoto || '';

  const descPhotos = (loadedData?.avariasDescarregamentoPhoto || inlineDesc)?.split('||').filter(Boolean) || [];
  const carrPhotos = (loadedData?.avariasCarregamentoPhoto || inlineCarr)?.split('||').filter(Boolean) || [];
  const totalPhotosCount = descPhotos.length + carrPhotos.length;

  const handleLoad = async () => {
    setLoadedData({ loading: true });
    try {
      const photos = await getMovementPhotos(movement.id);
      setLoadedData({
        avariasDescarregamentoPhoto: photos?.avariasDescarregamentoPhoto || '',
        avariasCarregamentoPhoto: photos?.avariasCarregamentoPhoto || '',
        loading: false
      });
    } catch (err) {
      console.error(err);
      setLoadedData({ loading: false });
    }
  };

  const needsLoading = totalPhotosCount === 0 && (hasDesc || hasCarr) && !loadedData;

  return (
    <div className="border-t border-slate-200 pt-6 space-y-5">
      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 print-photo-header">
        <Camera size={14} className="text-blue-600" />
        Registro Fotográfico de Auditoria ({needsLoading ? 'Disponível na nuvem' : `${totalPhotosCount} fotos`})
      </h3>

      {needsLoading ? (
        <div className="py-2">
          <button
            onClick={handleLoad}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Camera size={14} />
            Carregar Fotos de Auditoria
          </button>
        </div>
      ) : loadedData?.loading ? (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600"></span>
          Baixando fotos da nuvem com segurança...
        </div>
      ) : (
        <>
          {/* Descarregamento Photos */}
          {descPhotos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block font-sans">Etapa 1: Fotos obtidas no Descarregamento ({descPhotos.length})</span>
              <div className="flex flex-wrap gap-3.5 print:flex print:flex-wrap print:gap-2">
                {descPhotos.map((url, idx) => (
                  <div 
                    key={idx} 
                    className="relative group cursor-zoom-in bg-slate-900 rounded-xl overflow-hidden border border-slate-250 hover:border-blue-500 w-28 h-28 shrink-0 transition-all shadow-xs print:w-24 print:h-24 print:rounded print:shadow-none"
                    onClick={() => setActiveLightboxPhoto(url)}
                  >
                    <img 
                      src={url || undefined} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity print:hidden">
                      <Eye size={16} className="text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carregamento Photos */}
          {carrPhotos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block font-sans">Etapa 2: Fotos obtidas no Carregamento / Envase ({carrPhotos.length})</span>
              <div className="flex flex-wrap gap-3.5 print:flex print:flex-wrap print:gap-2">
                {carrPhotos.map((url, idx) => (
                  <div 
                    key={idx} 
                    className="relative group cursor-zoom-in bg-slate-900 rounded-xl overflow-hidden border border-slate-250 hover:border-blue-500 w-28 h-28 shrink-0 transition-all shadow-xs print:w-24 print:h-24 print:rounded print:shadow-none"
                    onClick={() => setActiveLightboxPhoto(url)}
                  >
                    <img 
                      src={url || undefined} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity print:hidden">
                      <Eye size={16} className="text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const getPaymentsBreakdown = (item: any): Record<string, number> => {
  if (item.paymentsBreakdown) {
    const bd = item.paymentsBreakdown;
    const res: Record<string, number> = {};
    if (Number(bd.dinheiro) > 0) res.dinheiro = Number(bd.dinheiro);
    if (Number(bd.pix) > 0) res.pix = Number(bd.pix);
    if (Number(bd.boleto) > 0) res.boleto = Number(bd.boleto);
    if (Number(bd.cheque) > 0) res.cheque = Number(bd.cheque);
    if (Number(bd.outros) > 0) res.outros = Number(bd.outros);
    if (Object.keys(res).length > 0) return res;
  }
  
  if (item.paymentMethodNote) {
    const parts = item.paymentMethodNote.split('|');
    const res: Record<string, number> = {};
    parts.forEach((p: string) => {
      const sub = p.split(':');
      if (sub.length === 2) {
        const methodStr = (sub[0] || '').trim().toLowerCase();
        const valStr = (sub[1] || '').replace('R$', '').replace(',', '.').trim();
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > 0) {
          let m = 'outros';
          if (methodStr.includes('dinheiro')) m = 'dinheiro';
          else if (methodStr.includes('pix')) m = 'pix';
          else if (methodStr.includes('boleto')) m = 'boleto';
          else if (methodStr.includes('cheque')) m = 'cheque';
          else if (methodStr.includes('a prazo') || methodStr.includes('outros')) m = 'outros';
          res[m] = (res[m] || 0) + val;
        }
      }
    });
    if (Object.keys(res).length > 0) return res;
  }
  
  const method = (item.paymentMethod || 'dinheiro').toLowerCase().trim();
  const val = (item.qty || 1) * (item.value || 0);
  return { [method]: val };
};

export const isAgua20L = (p: any): boolean => {
  if (!p) return false;
  if (p.productType) {
    return p.productType === 'agua';
  }
  const itemStr = (p.item || p.productName || p.label || p.productType || '').toLowerCase();
  if (
    itemStr.includes('copo') ||
    itemStr.includes('510') ||
    itemStr.includes('1,5l') ||
    itemStr.includes('1.5l') ||
    itemStr.includes('vasilhame') ||
    itemStr.includes('comodato') ||
    itemStr.includes('retorno') ||
    itemStr.includes('troca')
  ) {
    return false;
  }
  if (
    itemStr.includes('20l') ||
    itemStr.includes('20 l') ||
    itemStr.includes('20litros') ||
    itemStr.includes('20 litros') ||
    itemStr.includes('garrafão') ||
    itemStr.includes('garrafao') ||
    itemStr.includes('água') ||
    itemStr.includes('agua')
  ) {
    return true;
  }
  return false;
};

interface InvoiceCellProps {
  saleNumber: string;
  initialNfIssued?: boolean;
  initialNfNumber?: string;
  initialNfQty?: number;
  initialBoletoIssued?: boolean;
  onUpdateNf: (
    saleNumber: string,
    nfIssued: boolean,
    nfNumber: string,
    nfQty?: number,
    boletoIssued?: boolean
  ) => void;
  preSaleProducts?: any[];
  products?: any[];
  payments?: any[];
  wasPreSale?: boolean;
  isPreSaleOnly?: boolean;
}

const InvoiceCell: React.FC<InvoiceCellProps> = ({
  saleNumber,
  initialNfIssued = false,
  initialNfNumber = '',
  initialNfQty,
  initialBoletoIssued = false,
  onUpdateNf,
  preSaleProducts = [],
  products = [],
  payments = [],
  wasPreSale = false,
  isPreSaleOnly = false
}) => {
  const [nfIssued, setNfIssued] = React.useState(initialNfIssued);
  const [nfNumber, setNfNumber] = React.useState(initialNfNumber);
  const [nfQty, setNfQty] = React.useState<number | undefined>(initialNfQty);
  const [boletoIssued, setBoletoIssued] = React.useState(initialBoletoIssued);

  React.useEffect(() => {
    setNfIssued(initialNfIssued);
  }, [initialNfIssued]);

  React.useEffect(() => {
    setNfNumber(initialNfNumber);
  }, [initialNfNumber]);

  React.useEffect(() => {
    setNfQty(initialNfQty);
  }, [initialNfQty]);

  React.useEffect(() => {
    setBoletoIssued(initialBoletoIssued);
  }, [initialBoletoIssued]);

  const handleToggleIssued = (val: boolean) => {
    setNfIssued(val);
    onUpdateNf(saleNumber, val, nfNumber, nfQty, boletoIssued);
  };

  const handleBlurNumber = () => {
    onUpdateNf(saleNumber, nfIssued, nfNumber, nfQty, boletoIssued);
  };

  const handleBlurNfQty = () => {
    onUpdateNf(saleNumber, nfIssued, nfNumber, nfQty, boletoIssued);
  };

  const handleToggleBoleto = (val: boolean) => {
    setBoletoIssued(val);
    onUpdateNf(saleNumber, nfIssued, nfNumber, nfQty, val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const preSaleMap: Record<string, number> = {};
  preSaleProducts.forEach(p => {
    const name = p.productType === 'agua' ? 'Água 20L' : p.productType === 'agua_copo' ? 'Água Copo 200ml' : p.productType === 'garrafa510' ? 'Água 510ml' : p.productType === 'garrafa15l' ? 'Água 1,5L' : p.productType === 'vasilhame' ? 'Vasilhame' : p.productType === 'troca' ? 'Troca' : p.productType === 'bonificacao' ? 'Bonificação' : p.productType === 'comodato' ? 'Comodato' : p.productType === 'retorno' ? 'Retorno' : p.productType;
    preSaleMap[name] = (preSaleMap[name] || 0) + (p.qty || 0);
  });

  const saleMap: Record<string, number> = {};
  products.forEach(p => {
    const name = p.item || '';
    saleMap[name] = (saleMap[name] || 0) + (p.qty || 0);
  });

  const allKeys = Array.from(new Set([...Object.keys(preSaleMap), ...Object.keys(saleMap)]));
  
  const targetProducts = isPreSaleOnly ? preSaleProducts : products;
  const agua20LProducts = (targetProducts || []).filter(isAgua20L);
  const totalQtySold = agua20LProducts.reduce((sum, p) => sum + (p.qty || 0), 0);

  const pendingNfQty = totalQtySold - (nfQty || 0);

  const hasBoleto = isPreSaleOnly ? true : payments.some(p => {
    const m = (p.method || '').toLowerCase().trim();
    return m === 'boleto' || m.includes('boleto');
  });

  return (
    <div className="flex flex-col gap-1.5 p-1 text-left min-w-[220px] font-sans">
      {isPreSaleOnly ? (
        <div className="flex items-center gap-1">
          <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-black uppercase tracking-wider">
            📝 Pré-Venda Pendente
          </span>
        </div>
      ) : wasPreSale && (
        <div className="flex items-center gap-1">
          <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-black uppercase tracking-wider">
            ⚡ Origem: Pré-Venda
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleToggleIssued(!nfIssued)}
          className={`text-[10px] font-extrabold uppercase rounded px-2.5 py-1 border transition-all cursor-pointer hover:brightness-95 active:scale-95 select-none ${
            nfIssued 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/50' 
              : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100/50'
          }`}
        >
          {nfIssued ? '🟢 Emitida' : '🔴 Pendente'}
        </button>

        <input
          type="text"
          value={nfNumber}
          onChange={(e) => setNfNumber(e.target.value)}
          onBlur={handleBlurNumber}
          onKeyDown={handleKeyDown}
          placeholder="Nº da NF"
          className="w-20 text-[10px] px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">
          {isPreSaleOnly ? 'Qtd Faturada (20L):' : 'Qtd Emitida (20L):'}
        </span>
        <input
          type="number"
          value={nfQty === undefined ? '' : nfQty}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : Number(e.target.value);
            setNfQty(val);
          }}
          onBlur={handleBlurNfQty}
          onKeyDown={handleKeyDown}
          placeholder="Qtd na Nota"
          className="w-16 text-[10px] px-1.5 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono font-bold"
        />
        <span className="text-[9px] font-bold text-slate-400" title="Quantidade Total de Galões Água 20L">
          / {totalQtySold}
        </span>
      </div>

      {hasBoleto && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Boleto:</span>
          <button
            type="button"
            onClick={() => handleToggleBoleto(!boletoIssued)}
            className={`text-[9px] font-extrabold uppercase rounded px-2.5 py-0.5 border transition-all cursor-pointer hover:brightness-95 active:scale-95 select-none ${
              boletoIssued 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/50' 
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/50'
            }`}
          >
            {boletoIssued ? '✅ Emitido' : '❌ Pendente'}
          </button>
        </div>
      )}

      <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[9px] space-y-1 mt-0.5">
        <div className="font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between text-[8px]">
          <span title="Conferência de NF aplicável exclusivamente à Água 20 Litros">Conferência NF (Água 20L):</span>
          {pendingNfQty === 0 ? (
            <span className="text-[8px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black uppercase">Faturado</span>
          ) : pendingNfQty > 0 ? (
            <span className="text-[8px] px-1 py-0.2 bg-red-100 text-red-800 rounded font-black uppercase">Falta {pendingNfQty}</span>
          ) : (
            <span className="text-[8px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-black uppercase">Sobra {-pendingNfQty}</span>
          )}
        </div>
        
        <div className="space-y-0.5 max-h-24 overflow-y-auto font-mono text-[9px]">
          {allKeys.map(k => {
            const preQty = preSaleMap[k] || 0;
            const realQty = saleMap[k] || 0;
            const kLower = k.toLowerCase();
            const isDescartavel = kLower.includes('copo') || kLower.includes('510') || kLower.includes('1,5l') || kLower.includes('1.5l');
            return (
              <div key={k} className="flex justify-between items-center text-slate-600 border-b border-dashed border-slate-200 pb-0.5 last:border-0 last:pb-0">
                <span className="truncate max-w-[110px] font-semibold text-slate-700 flex items-center gap-1" title={k}>
                  {k}
                  {isDescartavel && (
                    <span className="text-[7px] bg-cyan-50 text-cyan-700 border border-cyan-200 rounded px-0.5 font-extrabold" title="Produto descartável expedido com NF já emitida na fábrica">Descartável</span>
                  )}
                </span>
                <span className="shrink-0 flex items-center gap-1 font-bold">
                  {isPreSaleOnly ? (
                    <span className="text-blue-600 font-bold" title="Quantidade Estimada na Pré-venda">Est: {preQty}</span>
                  ) : wasPreSale ? (
                    <span className="text-[8px] flex gap-1">
                      <span className="text-blue-600 font-bold" title="Quantidade Estimada na Pré-venda">Est: {preQty}</span>
                      <span className="text-slate-800 font-bold" title="Quantidade Realizada na Venda">Real: {realQty}</span>
                    </span>
                  ) : (
                    <span className="text-slate-800 font-bold" title="Quantidade Realizada na Venda">Real: {realQty}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Relatorio: React.FC = () => {
  const { 
    movements, 
    supplies, 
    customVehicleCategories = [], 
    customEntryPurposes = [],
    currentUser,
    updateMovementDetails,
    revertMovementExit,
    registeredVehicles = [],
    companyLogo,
    avgTimeDischarging = 30,
    avgTimeLoading = 45,
    customAvariaTypes = [],
    driverSettlements = [],
    updateDriverSettlement,
    registeredDrivers = [],
    preSales = [],
    updatePreSale,
    deletedMovementsLogs = [],
    manualStockAdjustments = [],
    systemAuditLogs = [],
    driverTripLoads = []
  } = useStore();

  const isProprioMovement = React.useCallback((m: any) => {
    if (!m) return false;
    if (m.ownerType === 'proprio') return true;
    const cleanPlate = (m.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (cleanPlate) {
      const matchedVeh = registeredVehicles.find(v => (v.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanPlate);
      if (matchedVeh && matchedVeh.ownerType === 'proprio') return true;
    }
    if (m.driver) {
      const matchedDrv = (registeredDrivers || []).find(d => (d.name || '').toLowerCase().trim() === m.driver.toLowerCase().trim());
      if (matchedDrv && matchedDrv.driverType === 'interno') return true;
    }
    return false;
  }, [registeredVehicles, registeredDrivers]);

  const isPurchaseType = (type: any): boolean => {
    if (!type || typeof type !== 'string') return false;
    const cleaned = cleanOccurrenceTypeName(type).toLowerCase().trim();
    const found = (customAvariaTypes || []).find(t => cleanOccurrenceTypeName(t?.type || '').toLowerCase().trim() === cleaned);
    if (found) {
      return found.category === 'compra' || found.category === 'vasilhame_rota';
    }
    const norm = (type || '').toLowerCase().trim();
    return norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || norm.includes('são pedro') || norm.includes('sao pedro') || norm.includes('prime') || norm.includes('rota');
  };

  const SUBTAB_LABELS: Record<string, string> = {
    viagens: 'Dossiê da Viagem (Unificado)',
    producao: 'Produção Retornável (20L)',
    paradas_maquina: 'Paradas & Ociosidade de Máquinas',
    descartavel: 'Linha Descartável & Expedição',
    vendas: 'Relatório Geral de Vendas',
    presales: 'Pré-Vendas & Expedição',
    acertos: 'Acerto de Contas (Motoristas)',
    auditoria: 'Auditoria & Modificações do Sistema',
    logs: 'Logs de Portaria',
    abastecimentos: 'Abastecimentos & Média',
    compras_cliente: 'Compras por Cliente',
    cidades: 'Vendas por Cidade',
    avarias: 'Avarias & Perdas',
    inspecoes: 'Inspeção e Vistorias',
  };

  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'abastecimentos' | 'inspecoes' | 'producao' | 'paradas_maquina' | 'descartavel' | 'acertos' | 'viagens' | 'vendas' | 'presales' | 'compras_cliente' | 'cidades' | 'avarias' | 'auditoria'>(() => {
    return (localStorage.getItem('relatorio_subtab') as any) || 'viagens';
  });

  React.useEffect(() => {
    const handleSubtabChange = (e: any) => {
      if (e.detail) {
        setActiveSubTab(e.detail);
      }
    };
    window.addEventListener('relatorio_subtab_change', handleSubtabChange);
    return () => window.removeEventListener('relatorio_subtab_change', handleSubtabChange);
  }, []);

  const changeSubTab = (newTab: any) => {
    setActiveSubTab(newTab);
    localStorage.setItem('relatorio_subtab', newTab);
    window.dispatchEvent(new CustomEvent('relatorio_subtab_change', { detail: newTab }));
  };
  const [showFilters, setShowFilters] = useState(true);
  const [lastSaleForPrint, setLastSaleForPrint] = useState<{ saleNumber: string; sales: any[] } | null>(null);
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [viewingSignature, setViewingSignature] = useState<string | null>(null);
  const [searchClientQuery, setSearchClientQuery] = useState<string>('');
  const [comprasViewMode, setComprasViewMode] = useState<'detailed' | 'consolidated'>('detailed');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [avariasViewTab, setAvariasViewTab] = useState<'geral' | 'periodo' | 'cliente' | 'motorista'>('geral');
  const [excludePurchasesAvarias, setExcludePurchasesAvarias] = useState<boolean>(true);

  // Auto print when URL param ?autoPrint=true is present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoPrint') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 1200); // 1.2s delay to make sure rendering and data load are complete
      return () => clearTimeout(timer);
    }
  }, []);

  // Existing states
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Fueling report states
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterPlate, setFilterPlate] = useState<string>('');
  const [filterDriver, setFilterDriver] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterNfStatus, setFilterNfStatus] = useState<string>('all');
  const [filterNfQtyDiff, setFilterNfQtyDiff] = useState<string>('all');
  const [filterBoletoStatus, setFilterBoletoStatus] = useState<string>('all');
  const [filterPreSaleStatus, setFilterPreSaleStatus] = useState<string>('todas');
  const [filterProductionCode, setFilterProductionCode] = useState<string>('');
  const [filterAuditActionType, setFilterAuditActionType] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  const allAuditLogs = React.useMemo(() => {
    const list: any[] = [];

    // 1. Saved system audit logs in state
    if (systemAuditLogs && Array.isArray(systemAuditLogs)) {
      list.push(...systemAuditLogs);
    }

    // 2. Convert deletedMovementsLogs
    if (deletedMovementsLogs && Array.isArray(deletedMovementsLogs)) {
      deletedMovementsLogs.forEach((d: any) => {
        if (!list.some(l => l.details === `delLog-${d.id}` || (l.actionType === 'exclusao' && l.timestamp === d.timestamp && l.plate === d.plate))) {
          list.push({
            id: `del-mov-${d.id || Math.random()}`,
            timestamp: d.timestamp || new Date().toISOString(),
            actionType: 'exclusao',
            entityType: 'Movimentação de Portaria',
            description: `Exclusão do registro do veículo ${d.plate || 'N/I'} (Condutor: ${d.driver || 'N/I'})`,
            operator: d.deletedBy || 'Sistema',
            reason: d.reason || d.deleteReason || 'Não informado',
            plate: d.plate,
            driver: d.driver,
            details: `delLog-${d.id}`
          });
        }
      });
    }

    // 3. Convert manualStockAdjustments
    if (manualStockAdjustments && Array.isArray(manualStockAdjustments)) {
      manualStockAdjustments.forEach((adj: any) => {
        if (!list.some(l => l.details === `adj-${adj.id}` || (l.actionType === 'ajuste_estoque' && l.timestamp === adj.timestamp))) {
          list.push({
            id: `adj-log-${adj.id || Math.random()}`,
            timestamp: adj.timestamp || new Date().toISOString(),
            actionType: 'ajuste_estoque',
            entityType: 'Estoque Vasilhame 20L / Insumo',
            description: `Ajuste manual em '${adj.product}': ${adj.delta > 0 ? '+' : ''}${adj.delta} un (Novo saldo: ${adj.newTotal} un)`,
            operator: adj.operator || 'Sistema',
            reason: adj.reason || 'Ajuste manual de inventário',
            unit: adj.unit || 'matriz',
            details: `adj-${adj.id}`
          });
        }
      });
    }

    // 4. Convert movement edits (wasEdited) and reverts (productionReverts)
    (movements || []).forEach((m: any) => {
      if (m.wasEdited || m.editedBy) {
        if (!list.some(l => l.details === `movEdit-${m.id}-${m.editedAt}`)) {
          list.push({
            id: `mov-edit-${m.id}-${Math.random()}`,
            timestamp: m.editedAt || m.timestamp || new Date().toISOString(),
            actionType: 'alteracao',
            entityType: 'Portaria / Dados da Viagem',
            description: `Alteração nos dados do veículo ${m.plate} (${m.driver}). ${m.alteredFields ? `Campos: ${m.alteredFields}` : ''}`,
            operator: m.editedBy || 'Operador',
            reason: m.editReason || 'Ajuste cadastral de portaria',
            plate: m.plate,
            driver: m.driver,
            unit: m.unit || 'matriz',
            details: `movEdit-${m.id}-${m.editedAt}`
          });
        }
      }

      if (m.productionReverts && Array.isArray(m.productionReverts)) {
        m.productionReverts.forEach((rev: any) => {
          if (!list.some(l => l.details === `rev-${m.id}-${rev.revertedAt}`)) {
            list.push({
              id: `mov-rev-${m.id}-${Math.random()}`,
              timestamp: rev.revertedAt || new Date().toISOString(),
              actionType: 'estorno',
              entityType: 'Etapa do Kanban de Produção',
              description: `Estorno de etapa do veículo ${m.plate}: '${rev.fromStep}' ➔ '${rev.toStep}'`,
              operator: rev.revertedBy || 'Operador',
              reason: rev.revertReason || 'Estorno operacional',
              plate: m.plate,
              driver: m.driver,
              unit: m.unit || 'matriz',
              details: `rev-${m.id}-${rev.revertedAt}`
            });
          }
        });
      }

      if (m.productionControl?.unloadingEditLogs && Array.isArray(m.productionControl.unloadingEditLogs)) {
        m.productionControl.unloadingEditLogs.forEach((ulog: any) => {
          if (!list.some(l => l.details === `ulog-${m.id}-${ulog.timestamp}`)) {
            list.push({
              id: `unloading-log-${m.id}-${Math.random()}`,
              timestamp: ulog.timestamp || new Date().toISOString(),
              actionType: 'alteracao',
              entityType: 'Contagem de Descarregamento (20L)',
              description: `Ajuste na contagem do descarregamento do veículo ${m.plate}`,
              operator: ulog.editedBy || 'Operador',
              reason: ulog.reason || 'Correção de contagem',
              plate: m.plate,
              driver: m.driver,
              unit: m.unit || 'matriz',
              details: `ulog-${m.id}-${ulog.timestamp}`
            });
          }
        });
      }
    });

    // 5. Convert deleted preSales
    (preSales || []).forEach((p: any) => {
      if (p.deleted) {
        if (!list.some(l => l.details === `preSaleDel-${p.id}`)) {
          list.push({
            id: `presale-del-${p.id}`,
            timestamp: p.deletedAt || p.timestamp || new Date().toISOString(),
            actionType: 'exclusao',
            entityType: 'Pré-Venda',
            description: `Cancelamento de pré-venda para cliente '${p.clientName}' (Condutor: ${p.driverName})`,
            operator: p.deletedBy || 'Sistema',
            reason: p.deleteReason || 'Cancelamento de pedido/pré-venda',
            driver: p.driverName,
            unit: p.unit || 'matriz',
            details: `preSaleDel-${p.id}`
          });
        }
      }
    });

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return list;
  }, [systemAuditLogs, deletedMovementsLogs, manualStockAdjustments, movements, preSales]);

  const filteredAuditLogs = React.useMemo(() => {
    return allAuditLogs.filter(log => {
      // Date filter
      if (filterStartDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr < filterStartDate) return false;
      }
      if (filterEndDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr > filterEndDate) return false;
      }

      // Plate filter
      if (filterPlate && log.plate) {
        if (!log.plate.toUpperCase().includes(filterPlate.toUpperCase().trim())) return false;
      }

      // Driver filter
      if (filterDriver && log.driver) {
        if (!log.driver.toLowerCase().includes(filterDriver.toLowerCase().trim())) return false;
      }

      // Action type filter
      if (filterAuditActionType !== 'all' && log.actionType !== filterAuditActionType) {
        return false;
      }

      // Search query
      if (auditSearchQuery) {
        const query = auditSearchQuery.toLowerCase().trim();
        const textToSearch = `${log.description} ${log.operator} ${log.reason} ${log.entityType} ${log.plate || ''} ${log.driver || ''}`.toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }

      return true;
    });
  }, [allAuditLogs, filterStartDate, filterEndDate, filterPlate, filterDriver, filterAuditActionType, auditSearchQuery]);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [expandedViagemId, setExpandedViagemId] = useState<string | null>(null);
  const [viewingSettlement, setViewingSettlement] = useState<any>(null);
  const [salesViewMode, setSalesViewMode] = useState<'detailed' | 'consolidated' | 'pre_sales'>('detailed');

  // Edit & Estorno states
  const [editingMovement, setEditingMovement] = useState<any>(null);
  const [editDriver, setEditDriver] = useState('');
  const [editEntryTime, setEditEntryTime] = useState('');
  const [editExitTime, setEditExitTime] = useState('');
  const [showExitTimeField, setShowExitTimeField] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isAdminAlert, setIsAdminAlert] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isMovementSettled = (m: any) => {
    if (!m) return false;
    
    // 1. Direct match by movement ID (checking both raw ID and settled- prefixed ID)
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
  };

  // Production History detail/print states
  const [viewingProductionMovement, setViewingProductionMovement] = useState<Movement | null>(null);
  const [activeProductionTab, setActiveProductionTab] = useState<'details' | 'ticket'>('details');
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<{ url: string; title: string } | null>(null);
  const [editOrderPhoto, setEditOrderPhoto] = useState<string | null>(null);

  const groupSales = (salesList: any[]) => {
    const groups: Record<string, any[]> = {};
    salesList.forEach(s => {
      const num = s.saleNumber || 'S/N';
      if (!groups[num]) {
        groups[num] = [];
      }
      groups[num].push(s);
    });

    return Object.entries(groups).map(([saleNumber, items]) => {
      const first = items[0];
      const clientName = first?.clientName || 'Consumidor';
      const signature = items.find(i => i.signature)?.signature;
      const timestamp = first?.timestamp;

      const productsMap: Record<string, { itemDisplayName: string; qty: number; unitPrice: number; productType?: string }> = {};
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
            productType: item.productType
          };
        }
        productsMap[key].qty += item.qty;
      });

      const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
      items.forEach(item => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        if (isZeroVal) return;

        const bd = getPaymentsBreakdown(item);
        Object.entries(bd).forEach(([method, amt]) => {
          const m = method.toLowerCase().trim();
          if (!paymentsMap[m]) {
            paymentsMap[m] = {
              method: m,
              amount: 0,
              note: item.paymentMethodNote
            };
          }
          paymentsMap[m].amount += amt;
        });
      });

      const totalValue = items.reduce((sum, item) => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        return sum + (isZeroVal ? 0 : item.qty * item.value);
      }, 0);

      return {
        saleNumber,
        clientName,
        signature,
        timestamp,
        products: Object.values(productsMap),
        payments: Object.values(paymentsMap),
        totalValue
      };
    });
  };

  const handleSaveSignatureForSaleInReport = (saleNumber: string, signature: string | null) => {
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'visualizador') {
      alert('Supervisores e visualizadores têm permissão apenas para visualizar ou imprimir o comprovante.');
      return;
    }
    // Check if the sale is from a finalized settlement
    const isCompleted = driverSettlements.some(ds => 
      ds.status === 'completed' && ds.sales?.some(s => s.saleNumber === saleNumber)
    );
    if (isCompleted) return;

    // 1. Update in driverSettlements
    driverSettlements.forEach(ds => {
      const hasSale = ds.sales?.some(s => s.saleNumber === saleNumber);
      if (hasSale) {
        const updatedSales = ds.sales.map(s => 
          s.saleNumber === saleNumber ? { ...s, signature: signature || undefined } : s
        );
        updateDriverSettlement(ds.id, { sales: updatedSales });
      }
    });

    // 2. Update in movements
    movements.forEach(m => {
      const hasSale = m.productionControl?.mobileSales?.some(s => s.saleNumber === saleNumber);
      if (hasSale) {
        const updatedSales = m.productionControl.mobileSales.map(s => 
          s.saleNumber === saleNumber ? { ...s, signature: signature || undefined } : s
        );
        updateMovementDetails(m.id, {
          productionControl: {
            ...m.productionControl,
            mobileSales: updatedSales
          }
        });
      }
    });

    // 3. Update lastSaleForPrint state if open
    if (lastSaleForPrint && lastSaleForPrint.saleNumber === saleNumber) {
      setLastSaleForPrint({
        ...lastSaleForPrint,
        sales: lastSaleForPrint.sales.map(s => 
          s.saleNumber === saleNumber ? { ...s, signature: signature || undefined } : s
        )
      });
    }
  };

  const handleUpdateNfForSaleInReport = (
    saleNumber: string,
    nfIssued: boolean,
    nfNumber: string,
    nfQty?: number,
    boletoIssued?: boolean
  ) => {
    // 1. Update in driverSettlements
    driverSettlements.forEach(ds => {
      const hasSale = ds.sales?.some(s => s.saleNumber === saleNumber);
      const hasDetailedSale = ds.detailedSales?.some(s => s.saleNumber === saleNumber);
      if (hasSale || hasDetailedSale) {
        const updatedSales = ds.sales?.map(s => 
          s.saleNumber === saleNumber ? { ...s, nfIssued, nfNumber, nfQty, boletoIssued } : s
        ) || [];
        const updatedDetailedSales = ds.detailedSales?.map(s => 
          s.saleNumber === saleNumber ? { ...s, nfIssued, nfNumber, nfQty, boletoIssued } : s
        );
        updateDriverSettlement(ds.id, { 
          sales: updatedSales,
          ...(updatedDetailedSales ? { detailedSales: updatedDetailedSales } : {})
        });
      }
    });

    // 2. Update in movements
    movements.forEach(m => {
      const hasSale = m.productionControl?.mobileSales?.some(s => s.saleNumber === saleNumber);
      if (hasSale) {
        const updatedSales = m.productionControl.mobileSales.map(s => 
          s.saleNumber === saleNumber ? { ...s, nfIssued, nfNumber, nfQty, boletoIssued } : s
        );
        updateMovementDetails(m.id, {
          productionControl: {
            ...m.productionControl,
            mobileSales: updatedSales
          }
        });
      }
    });

    // 3. Update lastSaleForPrint state if open
    if (lastSaleForPrint && lastSaleForPrint.saleNumber === saleNumber) {
      setLastSaleForPrint({
        ...lastSaleForPrint,
        sales: lastSaleForPrint.sales.map(s => 
          s.saleNumber === saleNumber ? { ...s, nfIssued, nfNumber, nfQty, boletoIssued } : s
        )
      });
    }
  };

  const handleUpdateNfForPreSale = (
    preSaleId: string,
    nfIssued: boolean,
    nfNumber: string,
    nfQty?: number,
    boletoIssued?: boolean
  ) => {
    updatePreSale(preSaleId, { nfIssued, nfNumber, nfQty, boletoIssued });
  };

  const handleStartEdit = (m: any) => {
    setEditingMovement(m);
    setEditDriver(m.driver);
    setEditReason('');
    setShowRevertConfirm(false);
    setValidationError('');
    setEditOrderPhoto(m.orderPhoto || null);
    
    const entryIso = m.entryTimestamp || m.timestamp;
    try {
      const d = new Date(entryIso);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setEditEntryTime(localIso);
    } catch (e) {
      setEditEntryTime('');
    }

    if (m.status === 'saida') {
      const exitIso = m.exitTimestamp || m.timestamp;
      try {
        const d = new Date(exitIso);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setEditExitTime(localIso);
        setShowExitTimeField(true);
      } catch (e) {
        setEditExitTime('');
        setShowExitTimeField(false);
      }
    } else {
      setEditExitTime('');
      setShowExitTimeField(false);
    }
    
    setIsAdminAlert(false);
    setSaveSuccessMsg('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;

    if (!editReason.trim()) {
      alert('Por favor, informe o motivo da alteração.');
      return;
    }

    const changedFields: string[] = [];
    if (editDriver.trim() !== editingMovement.driver) {
      changedFields.push(`Motorista (${editingMovement.driver} ➔ ${editDriver.trim()})`);
    }

    const updates: any = {
      driver: editDriver.trim(),
      editedBy: currentUser?.name || 'Operador',
      editReason: editReason.trim(),
      orderPhoto: editOrderPhoto || undefined,
      wasEdited: true,
      editedAt: new Date().toISOString()
    };

    if (editEntryTime) {
      try {
        const isoEntry = new Date(editEntryTime).toISOString();
        const oldEntry = editingMovement.entryTimestamp || editingMovement.timestamp;
        
        const dOld = new Date(oldEntry);
        const dNew = new Date(isoEntry);
        const sameMinute = dOld.getFullYear() === dNew.getFullYear() &&
                           dOld.getMonth() === dNew.getMonth() &&
                           dOld.getDate() === dNew.getDate() &&
                           dOld.getHours() === dNew.getHours() &&
                           dOld.getMinutes() === dNew.getMinutes();

        if (!sameMinute) {
          const oldFormatted = new Date(oldEntry).toLocaleString('pt-BR');
          const newFormatted = new Date(isoEntry).toLocaleString('pt-BR');
          changedFields.push(`Entrada (${oldFormatted} ➔ ${newFormatted})`);
          updates.entryTimestamp = isoEntry;
          updates.timestamp = isoEntry;
        }
      } catch (err) {
        console.error("Invalid entry date", err);
      }
    }

    if (editingMovement.status === 'saida' && editExitTime) {
      try {
        const isoExit = new Date(editExitTime).toISOString();
        const oldExit = editingMovement.exitTimestamp;
        
        let sameMinute = false;
        if (oldExit) {
          const dOld = new Date(oldExit);
          const dNew = new Date(isoExit);
          sameMinute = dOld.getFullYear() === dNew.getFullYear() &&
                       dOld.getMonth() === dNew.getMonth() &&
                       dOld.getDate() === dNew.getDate() &&
                       dOld.getHours() === dNew.getHours() &&
                       dOld.getMinutes() === dNew.getMinutes();
        }

        if (!oldExit || !sameMinute) {
          const oldFormatted = oldExit ? new Date(oldExit).toLocaleString('pt-BR') : 'Sem data';
          const newFormatted = new Date(isoExit).toLocaleString('pt-BR');
          changedFields.push(`Saída (${oldFormatted} ➔ ${newFormatted})`);
          updates.exitTimestamp = isoExit;
        }
      } catch (err) {
        console.error("Invalid exit date", err);
      }
    }

    if (editOrderPhoto !== editingMovement.orderPhoto) {
      changedFields.push('Foto do Pedido');
    }

    updates.alteredFields = changedFields.length > 0 ? changedFields.join(' | ') : 'Sem campos alterados';

    updateMovementDetails(editingMovement.id, updates);
    setSaveSuccessMsg('Alterações salvas com sucesso!');
    setTimeout(() => {
      setEditingMovement(null);
      setSaveSuccessMsg('');
    }, 1500);
  };

  const handleEstornar = () => {
    if (!editingMovement) return;
    
    if (currentUser?.role !== 'admin') {
      setIsAdminAlert(true);
      return;
    }

    if (!editReason.trim()) {
      setValidationError('Por favor, informe o motivo da alteração/estorno no campo de texto acima.');
      return;
    }

    setValidationError('');
    setShowRevertConfirm(true);
  };

  const handleConfirmEstorno = () => {
    if (!editingMovement) return;

    revertMovementExit(
      editingMovement.id,
      currentUser?.name || 'Operador Admin',
      editReason.trim()
    );
    setSaveSuccessMsg('Estorno de saída realizado com sucesso! O veículo retornou ao pátio.');
    setShowRevertConfirm(false);
    setTimeout(() => {
      setEditingMovement(null);
      setSaveSuccessMsg('');
    }, 2000);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis('');
    setErrorMessage(null);
    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { movements, supplies } })
      });
      const json = await resp.json();
      if (resp.ok) {
        setAnalysis(json.text);
      } else {
        setErrorMessage(json.error || 'Erro desconhecido ao tentar analisar os logs.');
      }
    } catch (e: any) {
      setErrorMessage('Erro ao conectar com API de IA. Verifique as credenciais ou tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: calculate consumption per trip for a given supply record
  const getConsumptionForSupply = (supply: typeof supplies[0]) => {
    if (supply.type !== 'diesel') return null;

    // Filter all diesel supplies for this plate and sort them chronologically (by date/time)
    const plateDieselSupplies = supplies
      .filter(s => s.plate === supply.plate && s.type === 'diesel')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Find the index of the current supply record
    const currentIndex = plateDieselSupplies.findIndex(s => s.id === supply.id);
    if (currentIndex <= 0) {
      // First supply record, no previous baseline for distance
      return null;
    }

    const previousSupply = plateDieselSupplies[currentIndex - 1];
    const odoDiff = supply.odometer - previousSupply.odometer;

    // Reject negative or zeroes (invalid mileage delta)
    if (odoDiff <= 0) {
      return null;
    }

    return odoDiff / supply.amount; // km per liter
  };

  // Assemble full enrich item representation of supply logs
  const enrichedSupplies = supplies.map(supply => {
    // Locate corresponding driver from the movement
    const movement = movements.find(m => m.id === supply.movementId);
    const driverName = movement ? movement.driver : 'Não Identificado';
    
    // Determine vehicle ownership: first try associated movement, then try master list of Vehicles (registeredVehicles)
    let ownerType: 'proprio' | 'terceiro' = 'proprio';
    if (movement) {
      ownerType = isProprioMovement(movement) ? 'proprio' : 'terceiro';
    } else {
      const cleanPlate = (supply.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const regVeh = registeredVehicles.find(v => (v.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanPlate);
      if (regVeh) {
        ownerType = regVeh.ownerType;
      } else {
        ownerType = 'terceiro';
      }
    }

    const dSym = new Date(supply.timestamp);
    const yyyy = dSym.getFullYear();
    const mm = String(dSym.getMonth() + 1).padStart(2, '0');
    const dd = String(dSym.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;
    const utcDateStr = (supply.timestamp || '').split('T')[0];
    const consumptionKmL = getConsumptionForSupply(supply);

    return {
      ...supply,
      driver: driverName,
      ownerType,
      dateString: utcDateStr,
      localDateString: localDateStr,
      consumption: consumptionKmL,
    };
  });

  // Apply filters
  const filteredSupplies = enrichedSupplies.filter(item => {
    // Fueling/Abastecimento control is strictly for own-fleet vehicles ('proprio')
    if (item.ownerType !== 'proprio') return false;

    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && (item.dateString >= filterStartDate || item.localDateString >= filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && (item.dateString <= filterEndDate || item.localDateString <= filterEndDate);
    }
    const matchesPlate = filterPlate ? item.plate.toUpperCase().includes(filterPlate.toUpperCase().trim()) : true;
    const matchesDriver = filterDriver ? item.driver.toLowerCase().includes(filterDriver.toLowerCase().trim()) : true;
    
    let matchesType = true;
    if (filterType !== 'all') {
      matchesType = item.type === filterType;
    }

    let matchesOwner = true;
    if (filterOwner !== 'all') {
      matchesOwner = item.ownerType === filterOwner;
    }

    const matchesUnit = (item.unit || 'matriz') === (currentUser?.unit || 'matriz');

    return matchesDate && matchesPlate && matchesDriver && matchesType && matchesOwner && matchesUnit;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply filters to movements
  const filteredMovements = movements.filter(m => {
    if (m.isInitialTrip) return false;
    const d = new Date(m.entryTimestamp || m.timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;
    const utcDateStr = (m.entryTimestamp || m.timestamp || '').split('T')[0];

    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && (utcDateStr >= filterStartDate || localDateStr >= filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && (utcDateStr <= filterEndDate || localDateStr <= filterEndDate);
    }
    const matchesPlate = filterPlate ? m.plate.toUpperCase().includes(filterPlate.toUpperCase().trim()) : true;
    const matchesDriver = filterDriver ? m.driver.toLowerCase().includes(filterDriver.toLowerCase().trim()) : true;
    const matchesClient = filterClient ? (m.client || '').toLowerCase().includes(filterClient.toLowerCase().trim()) : true;
    
    let matchesOwner = true;
    if (filterOwner !== 'all') {
      matchesOwner = m.ownerType === filterOwner;
    }

    const matchesUnit = (m.unit || 'matriz') === (currentUser?.unit || 'matriz');

    return matchesDate && matchesPlate && matchesDriver && matchesClient && matchesOwner && matchesUnit;
  }).sort((a, b) => {
    const timeA = new Date(a.exitTimestamp || a.entryTimestamp || a.timestamp || 0).getTime();
    const timeB = new Date(b.exitTimestamp || b.entryTimestamp || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('pt-BR');
    } catch (e) {
      return isoString;
    }
  };

  const formatDurationStatus = (ms?: number) => {
    if (ms === undefined || ms === null || isNaN(ms)) return '-';
    if (ms < 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const hours = Math.floor(mins / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    if (mins > 0) {
      return `${mins}m ${totalSecs % 60}s`;
    }
    return `${totalSecs}s`;
  };

  const formatVoyageDuration = (diffMs?: number): string => {
    if (diffMs === undefined || diffMs === null || isNaN(diffMs) || diffMs <= 0) return '0 minutos';
    const totalMinutes = Math.floor(diffMs / 60000);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} ${totalMinutes === 1 ? 'minuto' : 'minutos'}`;
    }
    
    const days = Math.floor(totalMinutes / 1440);
    const remainingMinutes = totalMinutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    
    if (days >= 1) {
      const dayPart = `${days} ${days === 1 ? 'dia' : 'dias'}`;
      const hourPart = hours > 0 ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : '';
      const minPart = minutes > 0 ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : '';
      
      if (hourPart && minPart) {
        return `${dayPart}, ${hourPart} e ${minPart}`;
      } else if (hourPart) {
        return `${dayPart} e ${hourPart}`;
      } else if (minPart) {
        return `${dayPart} e ${minPart}`;
      }
      return dayPart;
    }
    
    // Entre 1 hora e 23h59min (mostrar em horas:minutos)
    const hourPart = `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    const minPart = minutes > 0 ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : '';
    
    if (minPart) {
      return `${hours}h ${String(minutes).padStart(2, '0')}min (${hourPart} e ${minPart})`;
    }
    return `${hours}h 00min (${hourPart})`;
  };

  // Safe timing parser
  const getMovementDurations = (m: Movement) => {
    const timings = m.kanbanTimings || {};
    const start = timings['aguardando_descarregamento'] || m.timestamp;
    const end = timings['concluido'] || m.exitTimestamp || timings['carregamento'];
    if (!start || !end) return null;
    
    const totalMs = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(totalMs) || totalMs < 0) return null;
    
    const pauses = m.kanbanTotalPause || {};
    const sumPauses = (Object.values(pauses) as number[]).reduce((a, b) => a + b, 0);
    const activeMs = Math.max(0, totalMs - sumPauses);
    return { totalMs: totalMs, activeMs: activeMs, sumPauses: sumPauses };
  };

  // Extract individual stage active timings safely
  const getStageActiveTime = (m: Movement, stage: 'descarregamento' | 'carregamento') => {
    const timings = m.kanbanTimings || {};
    const pauses = m.kanbanTotalPause || {};
    
    if (stage === 'descarregamento') {
      const start = timings['descarregamento'];
      const end = timings['aguardando_carregamento'] || timings['carregamento'];
      if (!start || !end) return null;
      const ms = new Date(end).getTime() - new Date(start).getTime();
      return Math.max(0, ms - (pauses['descarregamento'] || 0));
    } else {
      const start = timings['carregamento'];
      const end = timings['concluido'];
      if (!start || !end) return null;
      const ms = new Date(end).getTime() - new Date(start).getTime();
      return Math.max(0, ms - (pauses['carregamento'] || 0));
    }
  };

  const getStepComparison = (qty: number, avg: number, activeMs: number | null) => {
    const predictedSecs = avg > 0 ? (qty / avg) * 60 : 0;
    const predictedMs = predictedSecs * 1000;
    
    const textPrevisto = predictedSecs > 0 ? formatDurationStatus(predictedMs) : '-';
    const textRealizado = activeMs !== null ? formatDurationStatus(activeMs) : '-';
    
    let deviationNode = null;
    if (activeMs !== null && predictedMs > 0) {
      const diffMs = activeMs - predictedMs;
      const over = diffMs > 0;
      const diffSecs = Math.abs(Math.floor(diffMs / 1000));
      const formattedDiff = formatDurationStatus(diffSecs * 1000);
      deviationNode = (
        <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
          over ? 'bg-rose-50 border border-rose-100/50 text-rose-600' : 'bg-emerald-50 border border-emerald-100/50 text-emerald-600'
        }`}>
          {over ? `⚠️ +${formattedDiff}` : `✅ -${formattedDiff}`}
        </span>
      );
    }
    
    return (
      <div className="flex flex-col items-end gap-1 font-sans">
        <div className="text-[10px] text-slate-400 font-medium">
          Prev: <span className="font-mono font-bold text-slate-600">{textPrevisto}</span>
        </div>
        <div className="text-[11px] text-slate-800 font-bold">
          Real: <span className="font-mono">{textRealizado}</span>
        </div>
        {deviationNode}
      </div>
    );
  };

  // Filter only movements that have been through/are in production
  const filteredProductionMovements = movements.filter(m => {
    if (m.isInitialTrip) return false;
    const isInProduction = m.kanbanStep !== undefined || m.productionControl !== undefined;
    if (!isInProduction) return false;

    const dSym = new Date(m.entryTimestamp || m.timestamp);
    const yyyy = dSym.getFullYear();
    const mm = String(dSym.getMonth() + 1).padStart(2, '0');
    const dd = String(dSym.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;
    const utcDateStr = (m.entryTimestamp || m.timestamp || '').split('T')[0];

    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && (utcDateStr >= filterStartDate || localDateStr >= filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && (utcDateStr <= filterEndDate || localDateStr <= filterEndDate);
    }
    const matchesPlate = filterPlate ? m.plate.toUpperCase().includes(filterPlate.toUpperCase().trim()) : true;
    const matchesDriver = filterDriver ? m.driver.toLowerCase().includes(filterDriver.toLowerCase().trim()) : true;
    const matchesClient = filterClient ? (m.client || '').toLowerCase().includes(filterClient.toLowerCase().trim()) : true;
    
    let matchesOwner = true;
    if (filterOwner !== 'all') {
      matchesOwner = m.ownerType === filterOwner;
    }

    let matchesProductionCode = true;
    if (filterProductionCode) {
      const prodCode = getProductionCode(m);
      matchesProductionCode = prodCode.toLowerCase().includes(filterProductionCode.toLowerCase().trim());
    }

    const matchesUnit = (m.unit || 'matriz') === (currentUser?.unit || 'matriz');

    return matchesDate && matchesPlate && matchesDriver && matchesClient && matchesOwner && matchesProductionCode && matchesUnit;
  }).sort((a, b) => {
    const timeA = new Date(a.entryTimestamp || a.timestamp || 0).getTime();
    const timeB = new Date(b.entryTimestamp || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const avariasData = React.useMemo(() => {
    const records: Array<{
      type: string;
      qty: number;
      phase: 'descarregamento' | 'carregamento';
      driver: string;
      client: string;
      date: string;
      plate: string;
      movementId: string;
    }> = [];

    filteredProductionMovements.forEach(m => {
      const driverName = m.driver ? m.driver.trim() : 'Não especificado';
      const clientName = m.client ? m.client.trim() : 'Sem Cliente';
      const plate = m.plate || 'Sem Placa';
      const rawDate = m.entryTimestamp || m.timestamp || '';
      let dateStr = 'Sem data';
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dateStr = `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          dateStr = rawDate.split('T')[0];
        }
      }

      // Descarregamento
      const descList = m.productionControl?.avariasDescarregamento || [];
      descList.forEach((item: any) => {
        const cleanedType = cleanOccurrenceTypeName(item.type || '');
        if (!cleanedType) return;
        if (excludePurchasesAvarias && isPurchaseType(item.type)) return;
        
        records.push({
          type: cleanedType,
          qty: Number(item.qty || 0),
          phase: 'descarregamento',
          driver: driverName,
          client: clientName,
          date: dateStr,
          plate: plate,
          movementId: m.id
        });
      });

      // Carregamento
      const carregList = m.productionControl?.avariasCarregamento || [];
      carregList.forEach((item: any) => {
        const cleanedType = cleanOccurrenceTypeName(item.type || '');
        if (!cleanedType) return;
        if (excludePurchasesAvarias && isPurchaseType(item.type)) return;

        records.push({
          type: cleanedType,
          qty: Number(item.qty || 0),
          phase: 'carregamento',
          driver: driverName,
          client: clientName,
          date: dateStr,
          plate: plate,
          movementId: m.id
        });
      });
    });

    const byType: Record<string, { type: string; totalQty: number; descQty: number; carregQty: number; occurrences: number }> = {};
    const byDriver: Record<string, { driver: string; totalQty: number; types: Record<string, number> }> = {};
    const byClient: Record<string, { client: string; totalQty: number; types: Record<string, number> }> = {};
    const byDate: Record<string, { date: string; totalQty: number; types: Record<string, number> }> = {};

    records.forEach(rec => {
      const q = rec.qty;
      if (q <= 0) return;

      // Group by Type
      if (!byType[rec.type]) {
        byType[rec.type] = { type: rec.type, totalQty: 0, descQty: 0, carregQty: 0, occurrences: 0 };
      }
      byType[rec.type].totalQty += q;
      if (rec.phase === 'descarregamento') {
        byType[rec.type].descQty += q;
      } else {
        byType[rec.type].carregQty += q;
      }
      byType[rec.type].occurrences += 1;

      // Group by Driver
      if (!byDriver[rec.driver]) {
        byDriver[rec.driver] = { driver: rec.driver, totalQty: 0, types: {} };
      }
      byDriver[rec.driver].totalQty += q;
      byDriver[rec.driver].types[rec.type] = (byDriver[rec.driver].types[rec.type] || 0) + q;

      // Group by Client
      if (!byClient[rec.client]) {
        byClient[rec.client] = { client: rec.client, totalQty: 0, types: {} };
      }
      byClient[rec.client].totalQty += q;
      byClient[rec.client].types[rec.type] = (byClient[rec.client].types[rec.type] || 0) + q;

      // Group by Date
      if (!byDate[rec.date]) {
        byDate[rec.date] = { date: rec.date, totalQty: 0, types: {} };
      }
      byDate[rec.date].totalQty += q;
      byDate[rec.date].types[rec.type] = (byDate[rec.date].types[rec.type] || 0) + q;
    });

    const sortedTypes = Object.values(byType).sort((a, b) => b.totalQty - a.totalQty);
    const sortedDrivers = Object.values(byDriver).sort((a, b) => b.totalQty - a.totalQty);
    const sortedClients = Object.values(byClient).sort((a, b) => b.totalQty - a.totalQty);
    const sortedDates = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));

    const totalDamagesCount = records.reduce((sum, r) => sum + r.qty, 0);

    return {
      records,
      byType: sortedTypes,
      byDriver: sortedDrivers,
      byClient: sortedClients,
      byDate: sortedDates,
      totalDamagesCount,
      uniqueTypesCount: sortedTypes.length,
      affectedMovementsCount: new Set(records.map(r => r.movementId)).size
    };
  }, [filteredProductionMovements, excludePurchasesAvarias]);

  const totalLoaded = filteredProductionMovements.reduce((sum, m) => sum + (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0), 0);
  const totalDischarged = filteredProductionMovements.reduce((sum, m) => sum + (m.productionControl?.descarregadoQty || 0), 0);
  
  const totalProductionAvarias = filteredProductionMovements.reduce((sum, m) => {
    const desc = (m.productionControl?.avariasDescarregamento || [])
      .filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca'))
      .reduce((s, a) => s + (a.qty || 0), 0);
    const carr = (m.productionControl?.avariasCarregamento || [])
      .filter(c => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca'))
      .reduce((s, a) => s + (a.qty || 0), 0);
    return sum + desc + carr;
  }, 0);

  const durationObjects = filteredProductionMovements.map(getMovementDurations).filter(Boolean) as { totalMs: number; activeMs: number; sumPauses: number }[];
  const avgActiveTime = durationObjects.length > 0 
    ? durationObjects.reduce((acc, obj) => acc + obj.activeMs, 0) / durationObjects.length 
    : 0;

  const totalFaltasFrotaPropria = filteredProductionMovements.reduce((sum, m) => {
    if (m.ownerType === 'proprio' && m.productionControl) {
      const expected = m.productionControl.expectedDischargeQty !== undefined ? m.productionControl.expectedDischargeQty : 0;
      const discrepancyValue = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : (expected - m.productionControl.descarregadoQty);
      if (discrepancyValue > 0) {
        return sum + discrepancyValue;
      }
    }
    return sum;
  }, 0);

  const totalVendido = filteredProductionMovements.reduce((sum, m) => {
    if (m.ownerType === 'proprio' && m.productionControl) {
      const diff = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
      if (diff > 0) {
        if (m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
          const vBreak = m.productionControl.differenceReasonsBreakdown.find(b => b.reason === 'venda');
          return sum + (vBreak?.qty || 0);
        } else if (m.productionControl.differenceReason === 'venda') {
          return sum + diff;
        }
      }
    }
    return sum;
  }, 0);

  const totalFaltas = filteredProductionMovements.reduce((sum, m) => {
    if (m.ownerType === 'proprio' && m.productionControl) {
      const diff = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
      if (diff > 0) {
        if (m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
          const fBreak = m.productionControl.differenceReasonsBreakdown.find(b => b.reason === 'falta');
          return sum + (fBreak?.qty || 0);
        } else if (m.productionControl.differenceReason === 'falta') {
          return sum + diff;
        }
      }
    }
    return sum;
  }, 0);

  const totalAdicionado = filteredProductionMovements.reduce((sum, m) => {
    if (m.ownerType === 'proprio' && m.productionControl) {
      const diff = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
      if (diff < 0) {
        return sum + Math.abs(diff);
      }
      if (diff > 0) {
        if (m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
          const oQty = m.productionControl.differenceReasonsBreakdown
            .filter(b => b.reason === 'outros' || b.reason === 'vasilhame_cliente' || b.reason === 'comodato' || b.reason === 'troca_avarias')
            .reduce((s, b) => s + b.qty, 0);
          return sum + oQty;
        } else if (m.productionControl.differenceReason === 'outros' || m.productionControl.differenceReason === 'vasilhame_cliente' || m.productionControl.differenceReason === 'comodato' || m.productionControl.differenceReason === 'troca_avarias') {
          return sum + diff;
        }
      }
    }
    return sum;
  }, 0);

  // Group by Day (YYYY-MM-DD)
  const dailyProductionMap: Record<string, {
    date: string;
    vehicleCount: number;
    discharged: number;
    loaded: number;
    avarias: number;
    durations: number[];
    vendido: number;
    adicionado: number;
    falta: number;
  }> = {};

  filteredProductionMovements.forEach(m => {
    const date = (m.entryTimestamp || m.timestamp || '').split('T')[0];
    if (!dailyProductionMap[date]) {
      dailyProductionMap[date] = { 
        date, 
        vehicleCount: 0, 
        discharged: 0, 
        loaded: 0, 
        avarias: 0, 
        durations: [],
        vendido: 0,
        adicionado: 0,
        falta: 0
      };
    }
    
    const d = dailyProductionMap[date];
    d.vehicleCount += 1;
    d.discharged += m.productionControl?.descarregadoQty || 0;
    d.loaded += (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0);
    
    const descAvarias = (m.productionControl?.avariasDescarregamento || [])
      .filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca'))
      .reduce((s, a) => s + (a.qty || 0), 0);
    const carrAvarias = (m.productionControl?.avariasCarregamento || [])
      .filter(c => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca'))
      .reduce((s, a) => s + (a.qty || 0), 0);
    d.avarias += (descAvarias + carrAvarias);

    if (m.ownerType === 'proprio' && m.productionControl) {
      const diff = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
      if (diff > 0) {
        if (m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
          m.productionControl.differenceReasonsBreakdown.forEach(b => {
            if (b.reason === 'venda') {
              d.vendido += b.qty || 0;
            } else if (b.reason === 'falta') {
              d.falta += b.qty || 0;
            } else {
              d.adicionado += b.qty || 0;
            }
          });
        } else {
          if (m.productionControl.differenceReason === 'venda') {
            d.vendido += diff;
          } else if (m.productionControl.differenceReason === 'falta') {
            d.falta += diff;
          } else {
            d.adicionado += diff;
          }
        }
      } else if (diff < 0) {
        d.adicionado += Math.abs(diff);
      }
    }
    
    const durObj = getMovementDurations(m);
    if (durObj) {
      d.durations.push(durObj.activeMs);
    }
  });

  const dailyProductionData = Object.values(dailyProductionMap).sort((a, b) => b.date.localeCompare(a.date));

  // Comprehensive Água Envasada Analytics: Total Dia, Por Linha, Por Expediente (Manhã/Tarde) e Por Máquina x Expediente
  const envasamentoAnalytics = React.useMemo(() => {
    const getShiftType = (m: any): 'manha' | 'tarde' => {
      const ts = (m.productionControl as any)?.carregamentoFinishedAt || 
                 (m.productionControl as any)?.finishedAt || 
                 m.exitTimestamp || 
                 m.entryTimestamp || 
                 m.timestamp;
      if (!ts) return 'manha';
      try {
        const d = new Date(ts);
        const hour = d.getHours();
        return hour < 12 ? 'manha' : 'tarde';
      } catch (e) {
        return 'manha';
      }
    };

    const getLineAndMachine = (m: any) => {
      const isFilial = (m.unit || 'matriz') === 'filial';
      const isPesada = ['carreta', 'truck'].includes((m.vehicleType || '').toLowerCase().trim());
      if (isFilial) {
        return { lineKey: 'filial', lineLabel: 'Linha Filial', machineKey: 'machine_filial', machineName: 'Máquina Filial' };
      }
      if (isPesada) {
        return { lineKey: 'pesada', lineLabel: 'Linha Pesada (Carreta / Truck)', machineKey: 'machine_1', machineName: 'Máquina 1 (Linha Pesada)' };
      }
      return { lineKey: 'media', lineLabel: 'Linha Média (Toco / 3/4 / Van)', machineKey: 'machine_2', machineName: 'Máquina 2 (Linha Média)' };
    };

    const getEnvasadaQty = (m: any) => {
      return (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0);
    };

    let totalGeral = 0;
    let totalVeiculos = 0;

    let totalPesada = 0;
    let totalMedia = 0;
    let totalFilial = 0;

    let totalManha = 0;
    let totalTarde = 0;
    let veiculosManha = 0;
    let veiculosTarde = 0;

    let m1Manha = 0;
    let m1Tarde = 0;
    let m1VeiculosManha = 0;
    let m1VeiculosTarde = 0;

    let m2Manha = 0;
    let m2Tarde = 0;
    let m2VeiculosManha = 0;
    let m2VeiculosTarde = 0;

    let filialManha = 0;
    let filialTarde = 0;
    let filialVeiculosManha = 0;
    let filialVeiculosTarde = 0;

    const dailyMap: Record<string, {
      date: string;
      totalDia: number;
      veiculosTotal: number;
      manhaTotal: number;
      tardeTotal: number;
      m1Total: number;
      m1Manha: number;
      m1Tarde: number;
      m2Total: number;
      m2Manha: number;
      m2Tarde: number;
      filialTotal: number;
      filialManha: number;
      filialTarde: number;
    }> = {};

    filteredProductionMovements.forEach(m => {
      const qty = getEnvasadaQty(m);
      const shift = getShiftType(m);
      const { lineKey, machineKey } = getLineAndMachine(m);
      const date = (m.entryTimestamp || m.timestamp || '').split('T')[0];

      totalGeral += qty;
      totalVeiculos += 1;

      if (shift === 'manha') {
        totalManha += qty;
        veiculosManha += 1;
        if (machineKey === 'machine_1') {
          m1Manha += qty;
          m1VeiculosManha += 1;
        } else if (machineKey === 'machine_2') {
          m2Manha += qty;
          m2VeiculosManha += 1;
        } else {
          filialManha += qty;
          filialVeiculosManha += 1;
        }
      } else {
        totalTarde += qty;
        veiculosTarde += 1;
        if (machineKey === 'machine_1') {
          m1Tarde += qty;
          m1VeiculosTarde += 1;
        } else if (machineKey === 'machine_2') {
          m2Tarde += qty;
          m2VeiculosTarde += 1;
        } else {
          filialTarde += qty;
          filialVeiculosTarde += 1;
        }
      }

      if (machineKey === 'machine_1') {
        totalPesada += qty;
      } else if (machineKey === 'machine_2') {
        totalMedia += qty;
      } else {
        totalFilial += qty;
      }

      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          totalDia: 0,
          veiculosTotal: 0,
          manhaTotal: 0,
          tardeTotal: 0,
          m1Total: 0,
          m1Manha: 0,
          m1Tarde: 0,
          m2Total: 0,
          m2Manha: 0,
          m2Tarde: 0,
          filialTotal: 0,
          filialManha: 0,
          filialTarde: 0
        };
      }

      const d = dailyMap[date];
      d.totalDia += qty;
      d.veiculosTotal += 1;

      if (shift === 'manha') {
        d.manhaTotal += qty;
        if (machineKey === 'machine_1') {
          d.m1Manha += qty;
          d.m1Total += qty;
        } else if (machineKey === 'machine_2') {
          d.m2Manha += qty;
          d.m2Total += qty;
        } else {
          d.filialManha += qty;
          d.filialTotal += qty;
        }
      } else {
        d.tardeTotal += qty;
        if (machineKey === 'machine_1') {
          d.m1Tarde += qty;
          d.m1Total += qty;
        } else if (machineKey === 'machine_2') {
          d.m2Tarde += qty;
          d.m2Total += qty;
        } else {
          d.filialTarde += qty;
          d.filialTotal += qty;
        }
      }
    });

    const dailyList = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalGeral,
      totalVeiculos,
      totalManha,
      totalTarde,
      veiculosManha,
      veiculosTarde,
      totalPesada,
      totalMedia,
      totalFilial,
      m1Manha,
      m1Tarde,
      m1Total: totalPesada,
      m1VeiculosManha,
      m1VeiculosTarde,
      m1VeiculosTotal: m1VeiculosManha + m1VeiculosTarde,
      m2Manha,
      m2Tarde,
      m2Total: totalMedia,
      m2VeiculosManha,
      m2VeiculosTarde,
      m2VeiculosTotal: m2VeiculosManha + m2VeiculosTarde,
      filialManha,
      filialTarde,
      filialTotal: totalFilial,
      filialVeiculosManha,
      filialVeiculosTarde,
      filialVeiculosTotal: filialVeiculosManha + filialVeiculosTarde,
      dailyList
    };
  }, [filteredProductionMovements]);

  // Avarias Breakdown
  const avariasBreakdownMap: Record<string, { type: string; unloadingQty: number; loadingQty: number; totalQty: number }> = {};
  
  filteredProductionMovements.forEach(m => {
    const descarregamentoList = (m.productionControl?.avariasDescarregamento || []).filter(av => !isPurchaseType(av.type) && !av.type.toLowerCase().includes('troca'));
    descarregamentoList.forEach(av => {
      const typeStr = (av.type || 'Não especificado').trim();
      const normKey = typeStr.toLowerCase();
      if (!avariasBreakdownMap[normKey]) {
        avariasBreakdownMap[normKey] = { type: typeStr, unloadingQty: 0, loadingQty: 0, totalQty: 0 };
      }
      avariasBreakdownMap[normKey].unloadingQty += av.qty || 0;
      avariasBreakdownMap[normKey].totalQty += av.qty || 0;
    });

    const carregamentoList = (m.productionControl?.avariasCarregamento || []).filter(av => !isPurchaseType(av.type) && !av.type.toLowerCase().includes('troca'));
    carregamentoList.forEach(av => {
      const typeStr = (av.type || 'Não especificado').trim();
      const normKey = typeStr.toLowerCase();
      if (!avariasBreakdownMap[normKey]) {
        avariasBreakdownMap[normKey] = { type: typeStr, unloadingQty: 0, loadingQty: 0, totalQty: 0 };
      }
      avariasBreakdownMap[normKey].loadingQty += av.qty || 0;
      avariasBreakdownMap[normKey].totalQty += av.qty || 0;
    });
  });

  const avariasBreakdownData = Object.values(avariasBreakdownMap).sort((a, b) => b.totalQty - a.totalQty);

  // Filter only movements that completed inspection (where checklistEvaluator is present)
  const filteredInspections = movements.filter(m => {
    if (m.isInitialTrip) return false;
    if (!m.checklistEvaluator) return false;
    
    const matchedSupply = supplies.find(s => s.movementId === m.id);
    const inspectionTime = matchedSupply?.timestamp || m.exitTimestamp || m.entryTimestamp || m.timestamp;
    
    const dSym = new Date(inspectionTime);
    const yyyy = dSym.getFullYear();
    const mm = String(dSym.getMonth() + 1).padStart(2, '0');
    const dd = String(dSym.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;
    const utcDateStr = (inspectionTime || '').split('T')[0];
    
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && (utcDateStr >= filterStartDate || localDateStr >= filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && (utcDateStr <= filterEndDate || localDateStr <= filterEndDate);
    }
    const matchesPlate = filterPlate ? m.plate.toUpperCase().includes(filterPlate.toUpperCase().trim()) : true;
    const matchesDriver = filterDriver ? m.driver.toLowerCase().includes(filterDriver.toLowerCase().trim()) : true;
    
    let matchesOwner = true;
    if (filterOwner !== 'all') {
      matchesOwner = m.ownerType === filterOwner;
    }
    
    const matchesUnit = (m.unit || 'matriz') === (currentUser?.unit || 'matriz');

    return matchesDate && matchesPlate && matchesDriver && matchesOwner && matchesUnit;
  }).sort((a, b) => {
    const matchedSupplyA = supplies.find(s => s.movementId === a.id);
    const timeA = new Date(matchedSupplyA?.timestamp || a.exitTimestamp || a.entryTimestamp || a.timestamp || 0).getTime();
    const matchedSupplyB = supplies.find(s => s.movementId === b.id);
    const timeB = new Date(matchedSupplyB?.timestamp || b.exitTimestamp || b.entryTimestamp || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // Calculate quick metrics for filtered supplies
  const filteredDieselList = filteredSupplies.filter(s => s.type === 'diesel');
  const filteredArlaList = filteredSupplies.filter(s => s.type === 'arla');

  const totalDieselVolume = filteredDieselList.reduce((sum, s) => sum + s.amount, 0);
  const totalArlaVolume = filteredArlaList.reduce((sum, s) => sum + s.amount, 0);

  // Average consumption
  const consumptionsWithValues = filteredDieselList
    .map(s => s.consumption)
    .filter((c): c is number => c !== null && c > 0);
  
  const averageConsumption = consumptionsWithValues.length > 0
    ? consumptionsWithValues.reduce((sum, val) => sum + val, 0) / consumptionsWithValues.length
    : 0;

  // -------------------------------------------------------------
  // FILTERED UNIFIED VOYAGES (DOSSIÊ CONSOLIDADO DE VIAGENS)
  // -------------------------------------------------------------
  const getReturnMovement = React.useCallback((mov: Movement) => {
    if (mov.type === 'entrada') return mov;
    
    // Find subsequent movements of the same vehicle that started after this departure
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
    
    // Check if there is another 'saida' movement of the same vehicle between mov and candidate
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

  const getLocalDateString = React.useCallback((isoString: string) => {
    if (!isoString) return '';
    try {
      // If already in YYYY-MM-DD format (10 chars, e.g. "2026-07-14")
      if (isoString.length === 10 && isoString.charAt(4) === '-' && isoString.charAt(7) === '-') {
        return isoString;
      }
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString.substring(0, 10);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return isoString.substring(0, 10);
    }
  }, []);

  const filteredViagens = movements.filter(m => {
    // A trip MUST always be a 'saida' movement (carregamento/loading)
    if (m.type !== 'saida') return false;
    
    // Only own fleet vehicles ('proprio') are eligible for voyage dossier (dossiê)
    if (!isProprioMovement(m)) return false;

    const retMov = getReturnMovement(m);
    const departureDate = m.exitTimestamp || m.timestamp || '';
    const returnDate = retMov ? (retMov.entryTimestamp || retMov.timestamp || '') : '';

    const departureLocalDate = getLocalDateString(departureDate);
    const departureUtcDate = departureDate.split('T')[0];
    const returnLocalDate = returnDate ? getLocalDateString(returnDate) : '';
    const returnUtcDate = returnDate ? returnDate.split('T')[0] : '';

    if (filterStartDate) {
      const departureMatches = (departureLocalDate >= filterStartDate) || (departureUtcDate >= filterStartDate);
      const returnMatches = returnDate ? ((returnLocalDate >= filterStartDate) || (returnUtcDate >= filterStartDate)) : false;
      if (!departureMatches && !returnMatches) return false;
    }

    if (filterEndDate) {
      const departureMatches = (departureLocalDate <= filterEndDate) || (departureUtcDate <= filterEndDate);
      const returnMatches = returnDate ? ((returnLocalDate <= filterEndDate) || (returnUtcDate <= filterEndDate)) : false;
      if (!departureMatches && !returnMatches) return false;
    }

    if (filterPlate && !m.plate.toUpperCase().includes(filterPlate.toUpperCase().trim())) return false;
    if (filterDriver && !m.driver.toUpperCase().includes(filterDriver.toUpperCase().trim())) return false;
    if (filterClient && !(m.client || '').toUpperCase().includes(filterClient.toUpperCase().trim())) return false;
    if (filterProductionCode) {
      const prodCode = getProductionCode(m);
      if (!prodCode.toUpperCase().includes(filterProductionCode.toUpperCase().trim())) return false;
    }
    if (filterType !== 'all' && m.vehicleType !== filterType) return false;
    if (filterOwner !== 'all' && m.ownerType !== filterOwner) return false;
    return true;
  }).sort((a, b) => {
    const retA = getReturnMovement(a);
    const retB = getReturnMovement(b);
    const dateA = retA ? (retA.entryTimestamp || retA.timestamp) : (a.exitTimestamp || a.timestamp);
    const dateB = retB ? (retB.entryTimestamp || retB.timestamp) : (b.exitTimestamp || b.timestamp);
    return new Date(dateB || '').getTime() - new Date(dateA || '').getTime();
  });

  // -------------------------------------------------------------
  // CALCULATIONS FOR THE DRIVER SETTLEMENTS (ACERTO DE CONTAS)
  // -------------------------------------------------------------
  const filteredSettlements = (driverSettlements || []).filter(ds => {
    const date = ds.dateSettlement || ds.dateArrival || '';
    const localDate = getLocalDateString(date);
    if (filterStartDate && localDate < filterStartDate) return false;
    if (filterEndDate && localDate > filterEndDate) return false;
    if (filterDriver && !(ds.driverName || '').toLowerCase().includes((filterDriver || '').toLowerCase())) return false;
    if (filterPlate && !(ds.plate || '').toUpperCase().includes((filterPlate || '').toUpperCase())) return false;
    
    const movement = movements.find(m => m.id === ds.movementId.replace('settled-', ''));
    
    if (filterClient) {
      const parentCli = movement?.client || '';
      if (!parentCli.toLowerCase().includes(filterClient.toLowerCase().trim())) return false;
    }
    
    // Settlements are strictly for own fleet vehicles ('proprio')
    const isProprio = movement ? isProprioMovement(movement) : (() => {
      const cleanPlate = (ds.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (!cleanPlate) return false;
      const matchedVeh = registeredVehicles.find(v => (v.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanPlate);
      if (matchedVeh && matchedVeh.ownerType === 'proprio') return true;
      const matchedDrv = (registeredDrivers || []).find(d => (d.name || '').toLowerCase().trim() === (ds.driverName || '').toLowerCase().trim());
      if (matchedDrv && matchedDrv.driverType === 'interno') return true;
      return false;
    })();
    if (!isProprio) return false;
    
    if (filterOwner !== 'all') {
      if (!movement) return false;
      if (filterOwner === 'proprio' && movement.ownerType !== 'proprio') return false;
      if (filterOwner === 'terceiro' && movement.ownerType !== 'terceiro') return false;
    }
    
    if (filterProductionCode) {
      if (!movement) return false;
      const prodCode = getProductionCode(movement);
      if (!prodCode.toLowerCase().includes(filterProductionCode.toLowerCase().trim())) return false;
    }
    
    return true;
  });

  const totalCommOverall = filteredSettlements.reduce((sum, ds) => sum + (ds.basicCommission || 0), 0);
  const totalWaterOverall = filteredSettlements.reduce((sum, ds) => {
    return sum + (ds.sales || [])
      .filter(s => {
        const itemLower = (s.item || '').toLowerCase();
        const isWater = ((itemLower.includes('água') || itemLower.includes('agua')) && !itemLower.includes('copo') && !itemLower.includes('200ml') && !itemLower.includes('510ml') && !itemLower.includes('1,5'));
        const isBonif = itemLower.includes('bonific') || itemLower.includes('brinde') || itemLower.includes('cortesia') || s.value === 0;
        const isComodato = itemLower.includes('comodato');
        return isWater && !isBonif && !isComodato;
      })
      .reduce((sSum, s) => sSum + (s.qty || 0), 0);
  }, 0);
  const totalSalesOverall = filteredSettlements.reduce((sum, ds) => sum + (ds.totalSales || 0), 0);
  const totalComodatoOverall = filteredSettlements.reduce((sum, ds) => sum + (ds.comodatoVasilhameQty || 0), 0);
  const totalBonifOverall = filteredSettlements.reduce((sum, ds) => {
    return sum + (ds.sales || [])
      .filter(s => {
        const itemLower = (s.item || '').toLowerCase();
        const isComodato = itemLower.includes('comodato');
        const isBonif = itemLower.includes('bonific') || itemLower.includes('brinde') || itemLower.includes('cortesia') || s.value === 0;
        return isBonif && !isComodato;
      })
      .reduce((sSum, s) => sSum + (s.qty || 0), 0);
  }, 0);

  const driverGroups = filteredSettlements.reduce((acc: { [driverName: string]: any }, ds) => {
    const dName = ds.driverName || 'Sem Motorista';
    if (!acc[dName]) {
      acc[dName] = {
        driverName: dName,
        settlementsCount: 0,
        totalCommission: 0,
        totalWaterSold: 0,
        totalSalesValue: 0,
        totalComodato: 0,
        totalBonificacao: 0,
        totalExpenses: 0,
        totalAvarias: 0
      };
    }
    
    const waterQty = (ds.sales || [])
      .filter(s => {
        const itemLower = (s.item || '').toLowerCase();
        const isWater = ((itemLower.includes('água') || itemLower.includes('agua')) && !itemLower.includes('copo') && !itemLower.includes('200ml') && !itemLower.includes('510ml') && !itemLower.includes('1,5'));
        const isBonif = itemLower.includes('bonific') || itemLower.includes('brinde') || itemLower.includes('cortesia') || s.value === 0;
        const isComodato = itemLower.includes('comodato');
        return isWater && !isBonif && !isComodato;
      })
      .reduce((sum, s) => sum + (s.qty || 0), 0);

    const bonifQty = (ds.sales || [])
      .filter(s => {
        const itemLower = (s.item || '').toLowerCase();
        const isComodato = itemLower.includes('comodato');
        const isBonif = itemLower.includes('bonific') || itemLower.includes('brinde') || itemLower.includes('cortesia') || s.value === 0;
        return isBonif && !isComodato;
      })
      .reduce((sum, s) => sum + (s.qty || 0), 0);

    const avariaCount = ds.avarias?.qty || 0;

    acc[dName].settlementsCount += 1;
    acc[dName].totalCommission += ds.basicCommission || 0;
    acc[dName].totalWaterSold += waterQty;
    acc[dName].totalSalesValue += ds.totalSales || 0;
    acc[dName].totalComodato += ds.comodatoVasilhameQty || 0;
    acc[dName].totalBonificacao += bonifQty;
    acc[dName].totalExpenses += ds.totalExpenses || 0;
    acc[dName].totalAvarias += avariaCount;

    return acc;
  }, {});

  const driverGroupsList = Object.values(driverGroups);

  const allSalesWithDetails = React.useMemo(() => {
    const list: any[] = [];
    const completedMovementIds = new Set<string>();
    
    // 1. Process COMPLETED driver settlements (finalized)
    driverSettlements.forEach(ds => {
      if (ds.status !== 'completed') return;
      const realId = (ds.movementId || '').replace('settled-', '');
      if (realId) completedMovementIds.add(realId);
      
      const parentMovement = movements.find(m => m.id === realId);

      const isProprio = parentMovement ? isProprioMovement(parentMovement) : (() => {
        try {
          const cleanPlate = (ds.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
          const matchedVeh = registeredVehicles.find(v => (v.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanPlate);
          if (matchedVeh && matchedVeh.ownerType === 'proprio') return true;
          const matchedDrv = (registeredDrivers || []).find(d => (d.name || '').toLowerCase().trim() === (ds.driverName || '').toLowerCase().trim());
          if (matchedDrv && matchedDrv.driverType === 'interno') return true;
        } catch (err) {
          console.error("Error evaluating isProprio for completed settlement", err);
        }
        return false;
      })();
      const ownerType = isProprio ? 'proprio' : 'terceiro';

      (ds.detailedSales || ds.sales || []).forEach(s => {
        list.push({
          id: s.id,
          saleNumber: s.saleNumber || 'S/N',
          item: s.item,
          qty: s.qty,
          value: s.value,
          paymentMethod: s.paymentMethod || 'dinheiro',
          paymentMethodNote: s.paymentMethodNote || '',
          productType: s.productType,
          driverName: ds.driverName || parentMovement?.driver || 'S/M',
          plate: ds.plate || parentMovement?.plate || 'S/P',
          date: ds.dateSettlement || ds.dateArrival || s.timestamp || (parentMovement ? (parentMovement.exitTimestamp || parentMovement.timestamp) : new Date().toISOString()),
          tripControlNumber: ds.tripControlNumber || parentMovement?.productionCode || parentMovement?.id || 'S/N',
          source: 'Acertado',
          clientName: s.clientName || 'Consumidor',
          signature: s.signature,
          paymentsBreakdown: s.paymentsBreakdown,
          ownerType,
          nfIssued: s.nfIssued,
          nfNumber: s.nfNumber,
          wasPreSale: s.wasPreSale,
          preSaleProducts: s.preSaleProducts,
          nfQty: s.nfQty,
          boletoIssued: s.boletoIssued
        });
      });
    });

    // 2. Process all movements that do not have a completed settlement
    movements.forEach(m => {
      if (completedMovementIds.has(m.id)) return; // Skip if already completed

      const isProprio = isProprioMovement(m);
      const ownerType = isProprio ? 'proprio' : 'terceiro';

      // Check if there are active driver-logged mobile sales
      const mobileSales = m.productionControl?.mobileSales || [];
      const hasDraft = driverSettlements.find(d => (d.movementId || '').replace('settled-', '') === m.id && d.status === 'pending');
      
      const statusStr = hasDraft ? 'Rascunho de Acerto' : 'Em Viagem (Motorista)';

      if (hasDraft) {
        // Use the draft settlement sales (which include cashier corrections/manual sales) as source of truth if draft exists,
        // but also include any new driver-logged mobileSales that are not yet in the draft
        const draftSales = hasDraft.detailedSales || hasDraft.sales || [];
        const draftSaleIds = new Set(draftSales.map(s => s.id || s.saleNumber));
        
        const mergedSales = [...draftSales];
        mobileSales.forEach(ms => {
          const idToCheck = ms.id || ms.saleNumber;
          if (idToCheck && !draftSaleIds.has(idToCheck)) {
            mergedSales.push(ms);
          }
        });

        mergedSales.forEach(s => {
          const isFromDraft = draftSaleIds.has(s.id || s.saleNumber);
          list.push({
            id: s.id,
            saleNumber: s.saleNumber || 'S/N',
            item: s.item,
            qty: s.qty,
            value: s.value,
            paymentMethod: s.paymentMethod || 'dinheiro',
            paymentMethodNote: s.paymentMethodNote || '',
            productType: s.productType,
            driverName: hasDraft.driverName || m.driver || 'S/M',
            plate: hasDraft.plate || m.plate || 'S/P',
            date: s.timestamp || hasDraft.dateSettlement || hasDraft.dateArrival || m.exitTimestamp || m.timestamp,
            tripControlNumber: hasDraft.tripControlNumber || m.productionCode || m.id || 'S/N',
            source: isFromDraft ? 'Rascunho de Acerto' : 'Em Viagem (Motorista)',
            clientName: s.clientName || 'Consumidor',
            signature: s.signature,
            paymentsBreakdown: s.paymentsBreakdown,
            ownerType,
            nfIssued: s.nfIssued,
            nfNumber: s.nfNumber,
            wasPreSale: s.wasPreSale,
            preSaleProducts: s.preSaleProducts,
            nfQty: s.nfQty,
            boletoIssued: s.boletoIssued
          });
        });
      } else if (mobileSales.length > 0) {
        // Use real-time mobileSales as source of truth!
        mobileSales.forEach(s => {
          list.push({
            id: s.id,
            saleNumber: s.saleNumber || 'S/N',
            item: s.item,
            qty: s.qty,
            value: s.value,
            paymentMethod: s.paymentMethod || 'dinheiro',
            paymentMethodNote: s.paymentMethodNote || '',
            productType: s.productType,
            driverName: m.driver || 'S/M',
            plate: m.plate || 'S/P',
            date: s.timestamp || m.exitTimestamp || m.timestamp,
            tripControlNumber: m.productionCode || m.id || 'S/N',
            source: statusStr,
            clientName: s.clientName || 'Consumidor',
            signature: s.signature,
            paymentsBreakdown: s.paymentsBreakdown,
            ownerType,
            nfIssued: s.nfIssued,
            nfNumber: s.nfNumber,
            wasPreSale: s.wasPreSale,
            preSaleProducts: s.preSaleProducts,
            nfQty: s.nfQty,
            boletoIssued: s.boletoIssued
          });
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [driverSettlements, movements, isProprioMovement, registeredVehicles, registeredDrivers]);

  const filteredSalesForReport = React.useMemo(() => {
    return allSalesWithDetails.filter(s => {
      const sDate = getLocalDateString(s.date);
      if (filterStartDate && sDate < filterStartDate) return false;
      if (filterEndDate && sDate > filterEndDate) return false;
      if (filterDriver && !(s.driverName || '').toUpperCase().includes(filterDriver.toUpperCase().trim())) return false;
      if (filterPlate && !(s.plate || '').toUpperCase().includes(filterPlate.toUpperCase().trim())) return false;
      if (filterClient && !(s.clientName || '').toUpperCase().includes(filterClient.toUpperCase().trim())) return false;
      if (filterOwner !== 'all' && s.ownerType !== filterOwner) return false;
      if (filterType !== 'all') {
        const itemLower = s.item.toLowerCase();
        if (filterType === 'agua' && !itemLower.includes('água') && !itemLower.includes('agua')) return false;
        if (filterType === 'vasilhame' && !itemLower.includes('vasilhame') && s.productType !== 'vasilhame') return false;
        if (filterType === 'bonificacao' && s.productType !== 'bonificacao') return false;
        if (filterType === 'comodato' && s.productType !== 'comodato') return false;
        if (filterType === 'troca' && s.productType !== 'troca') return false;
      }
      return true;
    });
  }, [allSalesWithDetails, filterStartDate, filterEndDate, filterDriver, filterPlate, filterClient, filterType, filterOwner]);

  const filteredSalesForReportGrouped = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    const ungrouped: any[] = [];

    filteredSalesForReport.forEach(s => {
      if (s.saleNumber && s.saleNumber !== 'S/N') {
        const groupKey = `${s.saleNumber}_${s.tripControlNumber || 'SN'}`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(s);
      } else {
        ungrouped.push(s);
      }
    });

    const result: any[] = [];

    Object.entries(groups).forEach(([saleNumber, items]) => {
      const firstItem = items[0];
      const productsMap: Record<string, { item: string; qty: number; value: number; total: number; productType?: string }> = {};
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
            item: itemDisplayName,
            qty: 0,
            value: item.value,
            total: 0,
            productType: item.productType
          };
        }
        productsMap[key].qty += item.qty;
        productsMap[key].total += item.qty * item.value;
      });

      const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
      items.forEach(item => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        if (isZeroVal) return;

        const bd = getPaymentsBreakdown(item);
        Object.entries(bd).forEach(([method, amt]) => {
          const m = method.toLowerCase().trim();
          if (!paymentsMap[m]) {
            paymentsMap[m] = {
              method: m,
              amount: 0,
              note: item.paymentMethodNote
            };
          }
          paymentsMap[m].amount += amt;
        });
      });

      const signature = items.find(i => i.signature)?.signature;
      const nfIssued = items.some(i => i.nfIssued);
      const nfNumber = items.find(i => i.nfNumber)?.nfNumber || '';
      const totalValue = items.reduce((sum, item) => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        return sum + (isZeroVal ? 0 : item.qty * item.value);
      }, 0);

      const wasPreSale = items.some(i => i.wasPreSale);
      const preSaleProducts = items.find(i => i.preSaleProducts)?.preSaleProducts || firstItem.preSaleProducts;
      const nfQty = items.find(i => i.nfQty !== undefined && i.nfQty !== null)?.nfQty;
      const boletoIssued = items.some(i => i.boletoIssued);

      result.push({
        ...firstItem,
        products: Object.values(productsMap),
        payments: Object.values(paymentsMap),
        totalValue,
        signature,
        nfIssued,
        nfNumber,
        wasPreSale,
        preSaleProducts,
        nfQty,
        boletoIssued,
        rawSales: items
      });
    });

    ungrouped.forEach(s => {
      let itemDisplayName = s.item || 'Outros';
      const itemLower = (s.item || '').toLowerCase();
      if (s.clientName && s.item && s.item.startsWith(s.clientName + ' - ')) {
        itemDisplayName = s.item.substring(s.clientName.length + 3);
      } else if (s.item && s.item.includes(' - ')) {
        itemDisplayName = s.item.split(' - ').slice(1).join(' - ');
      }
      const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.productType === 'troca' || itemLower.includes('bonifica') || itemLower.includes('comodato') || itemLower.includes('retorno') || itemLower.includes('troca');
      result.push({
        ...s,
        products: [{
          item: itemDisplayName,
          qty: s.qty,
          value: s.value,
          total: isZeroVal ? 0 : s.qty * s.value,
          productType: s.productType
        }],
        payments: isZeroVal ? [] : (() => {
          const bd = getPaymentsBreakdown(s);
          return Object.entries(bd).map(([method, amt]) => ({
            method,
            amount: amt,
            note: s.paymentMethodNote
          }));
        })(),
        totalValue: isZeroVal ? 0 : s.qty * s.value,
        rawSales: [s]
      });
    });

    const filteredResult = result.filter(s => {
      // NF Status filter
      if (filterNfStatus === 'sem_nf' && s.nfIssued) return false;
      if (filterNfStatus === 'com_nf' && !s.nfIssued) return false;

      // NF Qty difference filter (apenas para Água 20L)
      const totalQtySold = s.products.filter(isAgua20L).reduce((sum: number, p: any) => sum + (p.qty || 0), 0);
      const isDivergent = s.nfQty !== undefined && s.nfQty !== null && s.nfQty !== totalQtySold;
      if (filterNfQtyDiff === 'divergente' && !isDivergent) return false;
      if (filterNfQtyDiff === 'sem_divergencia' && isDivergent) return false;

      // Boleto Status filter
      const hasBoleto = s.payments.some((p: any) => p.method === 'boleto');
      if (filterBoletoStatus === 'pendente' && (!hasBoleto || s.boletoIssued)) return false;
      if (filterBoletoStatus === 'emitido' && (!hasBoleto || !s.boletoIssued)) return false;

      return true;
    });

    return filteredResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSalesForReport, filterNfStatus, filterNfQtyDiff, filterBoletoStatus]);

  const productSummary = React.useMemo(() => {
    const summary: Record<string, {
      name: string;
      totalQty: number;
      totalValue: number;
      payments: {
        dinheiro: number;
        pix: number;
        boleto: number;
        cheque: number;
        outros: number;
      };
    }> = {};

    filteredSalesForReport.forEach(s => {
      let itemDisplayName = s.item || 'Outros';
      const itemLower = (s.item || '').toLowerCase();
      if (s.clientName && s.item && s.item.startsWith(s.clientName + ' - ')) {
        itemDisplayName = s.item.substring(s.clientName.length + 3);
      } else if (s.item && s.item.includes(' - ')) {
        itemDisplayName = s.item.split(' - ').slice(1).join(' - ');
      }
      const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || itemLower.includes('bonifica') || itemLower.includes('comodato') || itemLower.includes('retorno');

      const key = itemDisplayName.trim() || 'Outros';
      if (!summary[key]) {
        summary[key] = {
          name: key,
          totalQty: 0,
          totalValue: 0,
          payments: { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 }
        };
      }

      summary[key].totalQty += s.qty;
      if (!isZeroVal) {
        const val = s.qty * s.value;
        summary[key].totalValue += val;
        const bd = getPaymentsBreakdown(s);
        Object.entries(bd).forEach(([method, amt]) => {
          const m = method.toLowerCase().trim();
          if (m in summary[key].payments) {
            (summary[key].payments as any)[m] += amt;
          } else {
            summary[key].payments.outros += amt;
          }
        });
      }
    });

    return Object.values(summary).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredSalesForReport]);

  const filteredPreSales = React.useMemo(() => {
    let list = preSales;
    if (filterPreSaleStatus === 'pendentes') {
      list = preSales.filter(ps => !ps.isUsed && !ps.expeditionApproved && !ps.deleted);
    } else if (filterPreSaleStatus === 'expedidas') {
      list = preSales.filter(ps => (ps.isUsed || ps.expeditionApproved) && !ps.deleted);
    } else if (filterPreSaleStatus === 'excluidas') {
      list = preSales.filter(ps => ps.deleted);
    }
    
    return list.filter(ps => {
      // 1. Date filters
      if (filterStartDate) {
        const itemDateStr = ps.timestamp || new Date().toISOString();
        if (itemDateStr.substring(0, 10) < filterStartDate) return false;
      }
      if (filterEndDate) {
        const itemDateStr = ps.timestamp || new Date().toISOString();
        if (itemDateStr.substring(0, 10) > filterEndDate) return false;
      }

      // 2. Driver filter
      if (filterDriver) {
        if ((ps.driverName || '').toLowerCase().trim() !== filterDriver.toLowerCase().trim()) return false;
      }

      // 3. Client filter
      if (filterClient) {
        if (!(ps.clientName || '').toLowerCase().includes(filterClient.toLowerCase().trim())) return false;
      }

      // 4. NF Status filter
      if (filterNfStatus === 'sem_nf' && ps.nfIssued) return false;
      if (filterNfStatus === 'com_nf' && !ps.nfIssued) return false;

      // 5. NF Qty difference filter (apenas para Água 20L)
      const totalEstimatedQty = ps.products?.filter(isAgua20L).reduce((sum: number, p: any) => sum + (p.qty || 0), 0) || 0;
      const isDivergent = ps.nfIssued ? (ps.nfQty || 0) !== totalEstimatedQty : false;
      if (filterNfQtyDiff === 'divergente' && !isDivergent) return false;
      if (filterNfQtyDiff === 'sem_divergencia' && isDivergent) return false;

      // 6. Boleto Status filter
      if (filterBoletoStatus === 'pendente' && ps.boletoIssued) return false;
      if (filterBoletoStatus === 'emitido' && !ps.boletoIssued) return false;

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [preSales, filterStartDate, filterEndDate, filterDriver, filterClient, filterNfStatus, filterNfQtyDiff, filterBoletoStatus, filterPreSaleStatus]);

  const purchasesByClientFiltered = React.useMemo(() => {
    return allSalesWithDetails.filter(s => {
      const sDate = getLocalDateString(s.date);
      if (filterStartDate && sDate < filterStartDate) return false;
      if (filterEndDate && sDate > filterEndDate) return false;
      if (filterOwner !== 'all' && s.ownerType !== filterOwner) return false;
      
      if (searchClientQuery) {
        const query = searchClientQuery.toLowerCase().trim();
        const client = (s.clientName || 'Consumidor').toLowerCase();
        if (!client.includes(query)) return false;
      }
      return true;
    });
  }, [allSalesWithDetails, filterStartDate, filterEndDate, searchClientQuery, filterOwner]);

  const cityReportData = React.useMemo(() => {
    const groups: Record<string, {
      cidade: string;
      tripsCount: number;
      waterSoldQty: number;
      totalSalesVal: number;
      settlements: any[];
    }> = {};

    const filtered = (driverSettlements || []).filter(ds => {
      const date = ds.dateSettlement || ds.dateArrival || '';
      const localDate = date.includes('T') ? getLocalDateString(date) : date.substring(0, 10);
      
      if (filterStartDate) {
        if (localDate < filterStartDate) return false;
      }
      if (filterEndDate) {
        if (localDate > filterEndDate) return false;
      }
      if (filterDriver) {
        const drvLower = (ds.driverName || '').toLowerCase();
        if (!drvLower.includes(filterDriver.toLowerCase().trim())) return false;
      }
      if (filterPlate) {
        const pltUpper = (ds.plate || '').toUpperCase();
        if (!pltUpper.includes(filterPlate.toUpperCase().trim())) return false;
      }
      if (filterClient) {
        const parentMovement = movements.find(m => m.id === ds.movementId.replace('settled-', ''));
        const parentCli = parentMovement?.client || '';
        if (!parentCli.toLowerCase().includes(filterClient.toLowerCase().trim())) return false;
      }
      return true;
    });

    filtered.forEach(ds => {
      const rawCity = (ds.cidade || '').trim();
      const cityName = rawCity || 'Não informada';
      const cityKey = cityName.toUpperCase();

      if (!groups[cityKey]) {
        groups[cityKey] = {
          cidade: cityName,
          tripsCount: 0,
          waterSoldQty: 0,
          totalSalesVal: 0,
          settlements: []
        };
      }

      const group = groups[cityKey];
      if (!group.settlements.some(s => s.id === ds.id)) {
        group.tripsCount += 1;
        group.settlements.push(ds);
      }

      const waterSales = (ds.sales || []).filter((s: any) => 
        s.productType === 'agua' || 
        s.productType === 'troca' || 
        s.item.toLowerCase().includes('água') || 
        s.item.toLowerCase().includes('agua') && !s.item.toLowerCase().includes('copo') && !s.item.toLowerCase().includes('200ml') && !s.item.toLowerCase().includes('510ml') && !s.item.toLowerCase().includes('1,5')
      );

      const waterQty = waterSales.reduce((sum, s) => sum + (s.qty || 0), 0);
      const salesVal = waterSales.reduce((sum, s) => sum + ((s.qty || 0) * (s.value || 0)), 0);

      group.waterSoldQty += waterQty;
      group.totalSalesVal += salesVal;
    });

    return Object.values(groups).sort((a, b) => b.tripsCount - a.tripsCount);
  }, [driverSettlements, filterStartDate, filterEndDate, filterDriver, filterPlate, filterClient, movements, getLocalDateString]);

  const purchasesByClientFilteredGrouped = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    const ungrouped: any[] = [];

    purchasesByClientFiltered.forEach(s => {
      if (s.saleNumber && s.saleNumber !== 'S/N') {
        const groupKey = `${s.saleNumber}_${s.tripControlNumber || 'SN'}`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(s);
      } else {
        ungrouped.push(s);
      }
    });

    const result: any[] = [];

    Object.entries(groups).forEach(([saleNumber, items]) => {
      const firstItem = items[0];
      const productsMap: Record<string, { item: string; qty: number; value: number; total: number; productType?: string }> = {};
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
            item: itemDisplayName,
            qty: 0,
            value: item.value,
            total: 0,
            productType: item.productType
          };
        }
        productsMap[key].qty += item.qty;
        productsMap[key].total += item.qty * item.value;
      });

      const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
      items.forEach(item => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        if (isZeroVal) return;

        const bd = getPaymentsBreakdown(item);
        Object.entries(bd).forEach(([method, amt]) => {
          const m = method.toLowerCase().trim();
          if (!paymentsMap[m]) {
            paymentsMap[m] = {
              method: m,
              amount: 0,
              note: item.paymentMethodNote
            };
          }
          paymentsMap[m].amount += amt;
        });
      });

      const signature = items.find(i => i.signature)?.signature;
      const totalValue = items.reduce((sum, item) => {
        const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.productType === 'troca' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno') || item.item.toLowerCase().includes('troca');
        return sum + (isZeroVal ? 0 : item.qty * item.value);
      }, 0);

      result.push({
        ...firstItem,
        products: Object.values(productsMap),
        payments: Object.values(paymentsMap),
        totalValue,
        signature,
        rawSales: items
      });
    });

    ungrouped.forEach(s => {
      let itemDisplayName = s.item;
      if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
        itemDisplayName = s.item.substring(s.clientName.length + 3);
      } else if (s.item.includes(' - ')) {
        itemDisplayName = s.item.split(' - ').slice(1).join(' - ');
      }
      const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.productType === 'troca' || s.item.toLowerCase().includes('bonifica') || s.item.toLowerCase().includes('comodato') || s.item.toLowerCase().includes('retorno') || s.item.toLowerCase().includes('troca');
      result.push({
        ...s,
        products: [{
          item: itemDisplayName,
          qty: s.qty,
          value: s.value,
          total: isZeroVal ? 0 : s.qty * s.value,
          productType: s.productType
        }],
        payments: isZeroVal ? [] : (() => {
          const bd = getPaymentsBreakdown(s);
          return Object.entries(bd).map(([method, amt]) => ({
            method,
            amount: amt,
            note: s.paymentMethodNote
          }));
        })(),
        totalValue: isZeroVal ? 0 : s.qty * s.value,
        rawSales: [s]
      });
    });

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchasesByClientFiltered]);

  const consolidatedPurchasesByClient = React.useMemo(() => {
    const groupMap: Record<string, {
      clientName: string;
      totalQty: number;
      totalValue: number;
      purchasesCount: number;
      lastPurchaseDate: string;
      deliveries: Array<{
        date: string;
        driverName: string;
        plate: string;
        item: string;
        qty: number;
        value: number;
        paymentMethod: string;
        payments?: Array<{ method: string; amount: number }>;
        signature?: string;
        saleNumber: string;
        tripControlNumber: string;
      }>;
    }> = {};

    purchasesByClientFiltered.forEach(s => {
      const clientKey = (s.clientName || 'Consumidor').trim();
      if (!groupMap[clientKey]) {
        groupMap[clientKey] = {
          clientName: clientKey,
          totalQty: 0,
          totalValue: 0,
          purchasesCount: 0,
          lastPurchaseDate: s.date,
          deliveries: []
        };
      }

      const g = groupMap[clientKey];
      g.totalQty += s.qty;
      g.totalValue += s.qty * s.value;
      g.purchasesCount += 1;
      if (new Date(s.date).getTime() > new Date(g.lastPurchaseDate).getTime()) {
        g.lastPurchaseDate = s.date;
      }
      const bd = getPaymentsBreakdown(s);
      const deliveryPayments = Object.entries(bd).map(([method, amount]) => ({ method, amount }));
      g.deliveries.push({
        date: s.date,
        driverName: s.driverName,
        plate: s.plate,
        item: s.item,
        qty: s.qty,
        value: s.value,
        paymentMethod: s.paymentMethod,
        payments: deliveryPayments,
        signature: s.signature,
        saleNumber: s.saleNumber,
        tripControlNumber: s.tripControlNumber
      });
    });

    return Object.values(groupMap).sort((a, b) => b.totalValue - a.totalValue);
  }, [purchasesByClientFiltered]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterPlate('');
    setFilterDriver('');
    setFilterClient('');
    setFilterType('all');
    setFilterOwner('all');
    setFilterNfStatus('all');
    setFilterNfQtyDiff('all');
    setFilterBoletoStatus('all');
    setFilterProductionCode('');
  };

  const handleExportCSV = () => {
    if (activeSubTab === 'viagens') {
      const headers = [
        'Cod Producao', 'Placa', 'Motorista', 'Cidade da Viagem', 'Frota', 'Status Viagem', 
        'Data Entrada', 'Data Saida', 'Duração (hh:mm)', 'KM Inicial', 'KM Final', 'Distância (KM)',
        'Checklist Vistoria', 'Total Diesel (L)', 'Consumo Medio (km/L)', 'Descarregado (un)', 
        'Carregado (un)', 'Status Acerto', 'Comissao Liquida (R$)'
      ];
      const rows = filteredViagens.map(v => {
        const prodCode = getProductionCode(v);
        const retMov = getReturnMovement(v);
        
        // Refueling from return movement
        const vSupplies = retMov ? supplies.filter(s => s.movementId === retMov.id && s.type === 'diesel') : [];
        const matchedSupplies = retMov ? supplies.filter(s => s.movementId === retMov.id) : [];
        
        const totalDiesel = vSupplies.reduce((sum, s) => sum + (s.amount || 0), 0);
        
        const consumptions = vSupplies.map(s => getConsumptionForSupply(s)).filter((c): c is number => c !== null && c > 0);
        const avgCons = consumptions.length > 0 ? (consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length).toFixed(2) : '-';

        const vSettlement = driverSettlements.find(ds => 
          ds.movementId === v.id || ds.movementId === `settled-${v.id}`
        );
        const effectiveExit = v.exitTimestamp || (v.isInitialTrip ? (v.entryTimestamp || v.timestamp) : undefined);
        const settlementStatus = !retMov ? (effectiveExit ? 'Em Rota' : 'Ainda na Planta') : (vSettlement ? (((vSettlement.isReconciled || (vSettlement.reconciledPixTransactionIds && vSettlement.reconciledPixTransactionIds.length > 0) || vSettlement.reconciledPixTransactionId) || (vSettlement.payments?.pix || 0) === 0) ? 'Reconciliado' : 'Pendente') : 'Sem Acerto');
        const netCommission = vSettlement ? vSettlement.finalCommission.toFixed(2) : '0.00';

        const descarregadoQty = retMov ? (retMov.productionControl?.descarregadoQty || 0) : 0;

        // Duração
        let duracaoStr = '-';
        if (v.isInitialTrip) {
          duracaoStr = 'N/A (Viagem Inicial)';
        } else if (effectiveExit) {
          const startMs = new Date(effectiveExit).getTime();
          const endMs = retMov ? new Date(retMov.entryTimestamp || retMov.timestamp).getTime() : Date.now();
          const diffMs = endMs - startMs;
          duracaoStr = formatVoyageDuration(diffMs);
        }

        // KM
        let kmIni: number | undefined = v.odometer;
        if (kmIni === undefined || kmIni === null || kmIni === 0) {
          const depTime = new Date(effectiveExit || v.timestamp).getTime();
          const prevSupplies = supplies.filter(s => 
            (s.plate || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (v.plate || '').toLowerCase().replace(/[^a-z0-9]/g, '') &&
            new Date(s.timestamp).getTime() < depTime &&
            s.odometer !== undefined && s.odometer !== null && s.odometer > 0
          ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          if (prevSupplies.length > 0) kmIni = prevSupplies[0].odometer;
        }

        let kmFim: number | undefined = retMov?.odometer;
        if (kmFim === undefined || kmFim === null || kmFim === 0) {
          const supplyWithOdo = matchedSupplies.find(s => s.odometer !== undefined && s.odometer !== null && s.odometer > 0);
          if (supplyWithOdo) kmFim = supplyWithOdo.odometer;
        }

        const kmDist = (kmIni !== undefined && kmFim !== undefined && kmFim >= kmIni) ? (kmFim - kmIni) : '-';

        return [
          prodCode,
          v.plate,
          v.driver,
          vSettlement ? (vSettlement.cidade || 'Não informada') : 'Não informada',
          v.ownerType === 'proprio' ? 'Próprio' : 'Terceiro',
          retMov ? 'Concluída' : 'Em Andamento',
          v.entryTimestamp ? new Date(v.entryTimestamp).toLocaleString('pt-BR') : new Date(v.timestamp).toLocaleString('pt-BR'),
          effectiveExit ? new Date(effectiveExit).toLocaleString('pt-BR') : '-',
          duracaoStr,
          kmIni !== undefined ? kmIni : '-',
          kmFim !== undefined ? kmFim : '-',
          kmDist,
          v.checklist?.passed ? 'APROVADO' : 'REPROVADO',
          totalDiesel > 0 ? totalDiesel : '-',
          avgCons,
          descarregadoQty,
          (v.productionControl?.totalCarregado || 0) + (v.productionControl?.retornoVasilhameCheio || 0),
          settlementStatus,
          netCommission
        ];
      });

      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_dossie_viagens_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'vendas') {
      let headers: string[] = [];
      let rows: any[][] = [];
      let filename = '';

      if (salesViewMode === 'consolidated') {
        headers = [
          'Produto',
          'Quantidade Total',
          'Valor Total (R$)',
          'Dinheiro (R$)',
          'PIX (R$)',
          'Boleto (R$)',
          'Cheque (R$)',
          'Outros (R$)'
        ];
        rows = productSummary.map(p => [
          p.name,
          p.totalQty,
          p.totalValue.toFixed(2),
          p.payments.dinheiro.toFixed(2),
          p.payments.pix.toFixed(2),
          p.payments.boleto.toFixed(2),
          p.payments.cheque.toFixed(2),
          p.payments.outros.toFixed(2)
        ]);
        filename = `relatorio_vendas_por_produto_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        headers = [
          'Numero Venda', 
          'Controle Viagem', 
          'Data', 
          'Motorista', 
          'Placa', 
          'Cliente/Item', 
          'Quantidade', 
          'Valor Unitario (R$)', 
          'Total (R$)', 
          'Forma Pagamento', 
          'Observacao Pagto', 
          'Status'
        ];
        rows = filteredSalesForReport.map(s => [
          s.saleNumber,
          s.tripControlNumber,
          s.date && typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleString('pt-BR') : (s.date || ''),
          s.driverName,
          s.plate,
          s.item,
          s.qty,
          (s.value ?? 0).toFixed(2),
          ((s.qty || 0) * (s.value || 0)).toFixed(2),
          (s.paymentMethod || '').toUpperCase(),
          s.paymentMethodNote || '',
          s.source
        ]);
        filename = `relatorio_vendas_detalhado_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'compras_cliente') {
      let headers: string[] = [];
      let rows: any[][] = [];
      let filename = '';

      if (comprasViewMode === 'consolidated') {
        headers = [
          'Cliente',
          'Quantidade de Vendas',
          'Quantidade Total Comprada',
          'Valor Total Comprado (R$)',
          'Ultima Compra'
        ];
        rows = consolidatedPurchasesByClient.map(c => [
          c.clientName,
          c.purchasesCount,
          c.totalQty,
          c.totalValue.toFixed(2),
          c.lastPurchaseDate.includes('T') ? new Date(c.lastPurchaseDate).toLocaleString('pt-BR') : c.lastPurchaseDate
        ]);
        filename = `compras_por_cliente_consolidado_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        headers = [
          'Cliente',
          'Data',
          'Nº Venda',
          'Controle Viagem',
          'Quem Entregou (Motorista)',
          'Veiculo (Placa)',
          'Produto / Item',
          'Quantidade',
          'Valor Unitario (R$)',
          'Total (R$)',
          'Forma Pagamento',
          'Assinatura'
        ];
        rows = purchasesByClientFiltered.map(s => [
          s.clientName,
          s.date && typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleString('pt-BR') : (s.date || ''),
          s.saleNumber,
          s.tripControlNumber,
          s.driverName,
          s.plate,
          s.item,
          s.qty,
          (s.value ?? 0).toFixed(2),
          ((s.qty || 0) * (s.value || 0)).toFixed(2),
          (s.paymentMethod || '').toUpperCase(),
          s.signature ? 'ASSINADO' : 'PENDENTE'
        ]);
        filename = `compras_por_cliente_detalhado_${new Date().toISOString().split('T')[0]}.csv`;
      }

      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'auditoria') {
      const headers = ['Data/Hora', 'Tipo de Ação', 'Módulo/Entidade', 'O Que Foi Feito', 'Operador (Por Quem)', 'Motivo/Justificativa', 'Placa/Motorista/Detalhes'];
      const rows = filteredAuditLogs.map(log => [
        new Date(log.timestamp).toLocaleString('pt-BR'),
        log.actionType === 'exclusao' ? 'EXCLUSÃO' : log.actionType === 'alteracao' ? 'ALTERAÇÃO' : log.actionType === 'ajuste_estoque' ? 'AJUSTE DE ESTOQUE' : log.actionType === 'estorno' ? 'ESTORNO' : 'CADASTRO',
        log.entityType || 'Geral',
        log.description || '-',
        log.operator || 'Sistema',
        log.reason || 'Não informado',
        `${log.plate ? `Placa: ${log.plate} ` : ''}${log.driver ? `Motorista: ${log.driver}` : ''}`.trim() || '-'
      ]);

      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_auditoria_sistema_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'acertos') {
      const headers = [
        'Motorista', 
        'Acertos Realizados', 
        'Aguas Vendidas (un)', 
        'Total de Vendas (R$)', 
        'Comodatos (un)', 
        'Bonificacoes (un)', 
        'Despesas (R$)', 
        'Avarias (un)', 
        'Comissao Total (R$)'
      ];
      const rows = driverGroupsList.map(g => [
        g.driverName,
        g.settlementsCount,
        g.totalWaterSold,
        g.totalSalesValue.toFixed(2),
        g.totalComodato,
        g.totalBonificacao,
        g.totalExpenses.toFixed(2),
        g.totalAvarias,
        g.totalCommission.toFixed(2)
      ]);
      
      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_comissao_motoristas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'abastecimentos') {
      const headers = ['Data/Hora', 'Veiculo (Placa)', 'Motorista Condutor', 'Insumo', 'Volume/Qtd (L)', 'Odometro (km)', 'Operador da Bomba', 'Consumo (km/L)'];
      const rows = filteredSupplies.map(supply => {
        const formattedDate = new Date(supply.timestamp).toLocaleString('pt-BR');
        const typeLabels: Record<string, string> = {
          diesel: 'DIESEL S10',
          arla: 'ARLA 32',
          lubrificacao: 'LUBRIFICAÇÃO',
          calibracao: 'CALIBRAGEM'
        };
        const label = typeLabels[supply.type] || String(supply.type).toUpperCase();
        const displayAmount = ['lubrificacao', 'calibracao'].includes(supply.type) ? '-' : supply.amount;

        return [
          formattedDate,
          supply.plate,
          supply.driver,
          label,
          displayAmount,
          supply.odometer,
          supply.operator,
          supply.consumption ? supply.consumption.toFixed(2) : '-'
        ];
      });
      
      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_abastecimentos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'inspecoes') {
      const headers = ['Data/Hora', 'Veiculo (Placa)', 'Condutor/Motorista', 'Vistoriador/Operador', 'Freios', 'Pneus', 'Luzes/Sinalizacao', 'Ausencia de Vazamentos', 'Itens Customizados', 'Observacoes', 'Resultado'];
      const rows = filteredInspections.map(m => {
        const matchedSupply = supplies.find(s => s.movementId === m.id);
        const inspectionTime = matchedSupply?.timestamp || m.exitTimestamp || m.entryTimestamp || m.timestamp;
        const formattedDate = new Date(inspectionTime).toLocaleString('pt-BR');
        
        const brakes = m.checklist?.brakes ? 'APROVADO' : 'FALHA';
        const tires = m.checklist?.tires ? 'APROVADO' : 'FALHA';
        const lights = m.checklist?.lights ? 'APROVADO' : 'FALHA';
        const leaks = m.checklist?.leaks ? 'FALHA (COM VAZAMENTO)' : 'APROVADO (SEM VAZAMENTOS)';
        
        let customText = '-';
        if (m.checklist?.customItems) {
          customText = Object.entries(m.checklist.customItems)
              .map(([k, v]) => `${k}: ${v ? 'CONFORME' : 'FALHA'}`)
              .join(' | ');
        }
        
        const outcome = m.checklist?.passed ? 'APROVADO' : 'REPROVADO';
        
        return [
          formattedDate,
          m.plate,
          m.driver,
          m.checklistEvaluator || '-',
          brakes,
          tires,
          lights,
          leaks,
          customText,
          m.checklist?.notes || '',
          outcome
        ];
      });
      
      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_inspecoes_vistoria_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeSubTab === 'producao') {
      const headers = [
        'Data',
        'Hora',
        'Placa',
        'Motorista',
        'Cliente/Empresa',
        'Porte / Categoria',
        'Linha de Produção',
        'Máquina',
        'Expediente',
        'Água Envasada (u)',
        'Vasilhames Descarregados (u)',
        'Avarias Descarregamento (u)',
        'Avarias Carregamento (u)',
        'Total Avarias (u)',
        'Tempo Ativo',
        'Status'
      ];

      const rows = filteredProductionMovements.map(m => {
        const ts = (m.productionControl as any)?.carregamentoFinishedAt || 
                   (m.productionControl as any)?.finishedAt || 
                   m.exitTimestamp || 
                   m.entryTimestamp || 
                   m.timestamp;
        const dObj = ts ? new Date(ts) : new Date();
        const dateFormatted = dObj.toLocaleDateString('pt-BR');
        const timeFormatted = dObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const hour = dObj.getHours();
        const shift = hour < 12 ? 'Manhã (07h-12h)' : 'Tarde (12h-18h+)';

        const isFilial = (m.unit || 'matriz') === 'filial';
        const isPesada = ['carreta', 'truck'].includes((m.vehicleType || '').toLowerCase().trim());
        const linha = isFilial ? 'Linha Filial' : isPesada ? 'Linha Pesada' : 'Linha Média';
        const maquina = isFilial ? 'Máquina Filial' : isPesada ? 'Máquina 1' : 'Máquina 2';

        const envasada = (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0);
        const descarregado = m.productionControl?.descarregadoQty || 0;

        const descAvarias = (m.productionControl?.avariasDescarregamento || [])
          .filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca'))
          .reduce((s, a) => s + (a.qty || 0), 0);
        const carrAvarias = (m.productionControl?.avariasCarregamento || [])
          .filter(c => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca'))
          .reduce((s, c) => s + (c.qty || 0), 0);

        const durObj = getMovementDurations(m);
        const tempoAtivoStr = durObj ? formatDurationStatus(durObj.activeMs) : '-';

        return [
          dateFormatted,
          timeFormatted,
          m.plate,
          m.driver,
          m.client || '-',
          customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType,
          linha,
          maquina,
          shift,
          envasada,
          descarregado,
          descAvarias,
          carrAvarias,
          descAvarias + carrAvarias,
          tempoAtivoStr,
          m.kanbanStep === 'concluido' ? 'CONCLUÍDO' : 'EM PROCESSO'
        ];
      });

      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_producao_envasamento_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Entrada', 'Saida', 'Placa', 'Tipo Veiculo', 'Proprietario', 'Motorista', 'Vistoria Status', 'Vistoriador', 'Status Geral'];
      const rows = filteredMovements.map(m => {
        const entryTime = m.entryTimestamp || m.timestamp;
        const exitTime = m.exitTimestamp || (m.status === 'saida' ? m.timestamp : undefined);
        const entryFormatted = new Date(entryTime).toLocaleString('pt-BR');
        const exitFormatted = exitTime ? new Date(exitTime).toLocaleString('pt-BR') : '-';
        const isChecked = m.checklist && m.checklist.brakes && m.checklist.tires;
        const checklistStatus = isChecked ? 'REALIZADA' : 'PENDENTE';
        
        return [
          entryFormatted,
          exitFormatted,
          m.plate,
          customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType,
          m.ownerType,
          m.driver,
          checklistStatus,
          m.checklistEvaluator || '-',
          m.status.toUpperCase()
        ];
      });
      
      const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_portaria_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handlePrint = () => {
    if (isIframe) {
      setShowPrintGuide(true);
    } else {
      window.print();
    }
  };

  const handlePrintSettlement = (settlement: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Prestação de Contas - ${settlement.driverName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0.6cm;
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #1e293b; 
              line-height: 1.3; 
              font-size: 10px;
            }
            .header { border-bottom: 1.5px solid #334155; padding-bottom: 4px; margin-bottom: 8px; }
            .title { font-size: 13px; font-weight: 800; margin: 0; text-transform: uppercase; color: #0f172a; }
            .subtitle { font-size: 8px; color: #64748b; margin: 2px 0 0 0; font-weight: 600; text-transform: uppercase; }
            h3 { 
              font-size: 9px; 
              font-weight: 800; 
              margin: 8px 0 4px 0; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 1px;
            }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
            .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 8px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
            .info-label { font-size: 7.5px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.3px; }
            .info-value { font-size: 10px; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-size: 9.5px; }
            th { background-color: #f8fafc; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #475569; }
            .totals { font-weight: bold; text-align: right; }
            .commission-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; margin-top: 8px; }
            .green { color: #15803d; }
            .red { color: #b91c1c; }
            .obs-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-top: 6px; font-size: 9px; }
            .signature-section { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
            .signature-line { border-top: 1px solid #475569; margin-top: 20px; padding-top: 3px; font-size: 9px; font-weight: bold; text-align: center; text-transform: uppercase; color: #1e293b; }
            .receipt-section { margin-top: 20px; border-top: 1.5px dashed #cbd5e1; padding-top: 12px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">RESUMO DE PRESTAÇÃO DE CONTAS - MOTORISTA</h1>
            <p class="subtitle">ID Acerto: ${settlement.id} | Data: ${settlement.dateSettlement} | Terrasul envasadora de bebidas Ltda.</p>
          </div>
          
          <div class="grid-5">
            <div>
              <div class="info-label">Motorista</div>
              <div class="info-value">${settlement.driverName}</div>
            </div>
            <div>
              <div class="info-label">Veículo / Placa</div>
              <div class="info-value">${settlement.plate}</div>
            </div>
            <div>
              <div class="info-label">Cidade da Viagem</div>
              <div class="info-value" style="color: #4f46e5;">${settlement.cidade || 'Não informada'}</div>
            </div>
            <div>
              <div class="info-label">Data Saída</div>
              <div class="info-value">${new Date(settlement.dateExit).toLocaleDateString('pt-BR')} ${new Date(settlement.dateExit).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div>
              <div class="info-label">Data Chegada</div>
              <div class="info-value">${new Date(settlement.dateArrival).toLocaleDateString('pt-BR')} ${new Date(settlement.dateArrival).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          <h3>PRODUTOS E VENDAS ENTREGUES</h3>
          <table>
            <thead>
              <tr>
                <th>Item / Descrição</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${renderSalesRows(settlement.sales)}
              <tr style="font-weight: bold; background-color: #f8fafc;">
                <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 8px; color: #475569;">Total de Vendas:</td>
                <td style="font-family: monospace;">R$ ${settlement.totalSales.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <h3>DESPESAS DE VIAGEM</h3>
              <table>
                <thead>
                  <tr>
                    <th>Descrição da Despesa</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderExpensesRows(settlement.expenses)}
                  <tr style="font-weight: bold; background-color: #f8fafc;">
                    <td style="text-align: right; text-transform: uppercase; font-size: 8px; color: #475569;">Total de Despesas:</td>
                    <td style="font-family: monospace;">R$ ${settlement.totalExpenses.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>VALORES ENTREGUES</h3>
              <table>
                <thead>
                  <tr>
                    <th>Forma</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${settlement.payments.dinheiro > 0 ? `<tr><td>Dinheiro</td><td style="font-family: monospace; font-weight: 600;">R$ ${settlement.payments.dinheiro.toFixed(2)}</td></tr>` : ''}
                  ${settlement.payments.pix > 0 ? `<tr><td>PIX</td><td style="font-family: monospace; font-weight: 600;">R$ ${settlement.payments.pix.toFixed(2)}</td></tr>` : ''}
                  ${settlement.payments.boleto > 0 ? `<tr><td>Boleto</td><td style="font-family: monospace; font-weight: 600;">R$ ${settlement.payments.boleto.toFixed(2)}</td></tr>` : ''}
                  ${settlement.payments.cheque > 0 ? `<tr><td>Cheque</td><td style="font-family: monospace; font-weight: 600;">R$ ${settlement.payments.cheque.toFixed(2)}</td></tr>` : ''}
                  ${settlement.payments.outros > 0 ? `<tr><td>Outros</td><td style="font-family: monospace; font-weight: 600;">R$ ${settlement.payments.outros.toFixed(2)}</td></tr>` : ''}
                  ${!(settlement.payments.dinheiro > 0 || settlement.payments.pix > 0 || settlement.payments.boleto > 0 || settlement.payments.cheque > 0 || settlement.payments.outros > 0) ? '<tr><td colspan="2" style="color: #64748b; font-style: italic;">Nenhum valor informado</td></tr>' : ''}
                  <tr style="font-weight: bold; background-color: #f8fafc;">
                    <td style="text-transform: uppercase; font-size: 8px; color: #475569;">Total Entregue:</td>
                    <td style="font-family: monospace;">R$ ${settlement.totalDelivered.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid-2">
            <div>
              <div class="info-label">Valor Esperado Liquido (Vendas - Despesas)</div>
              <div class="info-value" style="font-family: monospace;">R$ ${settlement.totalToReceive.toFixed(2)}</div>
            </div>
            <div>
              <div class="info-label">Diferença de Caixa</div>
              <div class="info-value ${settlement.difference < 0 ? 'red' : 'green'}" style="font-family: monospace;">
                R$ ${settlement.difference.toFixed(2)} ${settlement.difference < 0 ? '(Falta)' : '(Sobra)'}
              </div>
            </div>
          </div>

          <div class="commission-card">
            <h4 style="margin: 0 0 6px 0; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">FECHAMENTO DA COMISSÃO DO MOTORISTA</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Comissão Básica (${settlement.commissionPercent}% sobre Vendas):</span>
              <span style="font-weight: 700; font-family: monospace;">R$ ${settlement.basicCommission.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #b91c1c;">
              <span>Desconto de Avarias / Perdas (${settlement.avarias.qty} un):</span>
              <span style="font-weight: 700; font-family: monospace;">- R$ ${settlement.avariaDeduction.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: ${settlement.difference < 0 ? '#b91c1c' : 'inherit'};">
              <span>Desconto de Falta de Caixa:</span>
              <span style="font-weight: 700; font-family: monospace;">- R$ ${settlement.shortageDeduction.toFixed(2)}</span>
            </div>
            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 4px 0;" />
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; margin-top: 4px;">
              <span>COMISSÃO LÍQUIDA A PAGAR:</span>
              <span class="green" style="font-family: monospace;">R$ ${settlement.finalCommission.toFixed(2)}</span>
            </div>
          </div>

          ${settlement.observation ? `
            <div class="obs-box">
              <strong style="text-transform: uppercase; font-size: 7.5px; color: #64748b; display: block; margin-bottom: 2px; letter-spacing: 0.3px;">Observações:</strong>
              <div style="line-height: 1.3; white-space: pre-wrap; color: #334155;">${settlement.observation}</div>
            </div>
          ` : ''}

          ${(settlement.isReconciled || (settlement.reconciledPixTransactionIds && settlement.reconciledPixTransactionIds.length > 0) || settlement.reconciledPixTransactionId) ? `
            <div style="margin-top: 8px; padding: 4px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; font-size: 9px; font-weight: bold; color: #166534; text-align: center;">
              ✓ ACERTO CONCILIADO VIA PIX BANCÁRIO
            </div>
          ` : ''}

          <!-- SIGNATURE FIELD IN SETTLEMENT SUMMARY FOR CONFERENTE AND MOTORISTA -->
          <div class="signature-section" style="margin-top: 25px;">
            <div>
              <div class="signature-line" style="margin-top: 45px;">
                ${settlement.driverName}<br/>
                <span style="font-weight: normal; color: #64748b; font-size: 8px; text-transform: none;">Motorista (Assinatura do Acerto)</span>
              </div>
            </div>
            <div>
              <div class="signature-line" style="margin-top: 45px;">
                ${currentUser?.name || 'Conferente'}<br/>
                <span style="font-weight: normal; color: #64748b; font-size: 8px; text-transform: none;">Assinatura do Conferente (Operador)</span>
              </div>
            </div>
          </div>
          
          <!-- COMMISSION RECEIPT FOR MOTORISTA TO SIGN -->
          <div class="receipt-section">
            <div style="text-align: center; margin-bottom: 6px;">
              <h2 style="font-size: 11px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">Comprovante de Recebimento de Comissão</h2>
              <p style="font-size: 7.5px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">ID Acerto: ${settlement.id} | Data: ${settlement.dateSettlement}</p>
            </div>
            
            <p style="font-size: 9.5px; line-height: 1.4; text-align: justify; margin: 4px 0 10px 0; color: #334155;">
              Declaro que recebi de <strong>Terrasul envasadora de bebidas Ltda.</strong> a importância líquida de 
              <strong>R$ ${settlement.finalCommission.toFixed(2)}</strong> 
              (<em>${valorPorExtenso(settlement.finalCommission)}</em>), referente ao pagamento de minha comissão de viagens e entregas realizada no veículo de placa <strong>${settlement.plate}</strong>, no período de <strong>${new Date(settlement.dateExit).toLocaleDateString('pt-BR')}</strong> a <strong>${new Date(settlement.dateArrival).toLocaleDateString('pt-BR')}</strong>, com os descontos devidamente processados, conforme memória de cálculo detalhada abaixo:
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; font-size: 8.5px; margin: 6px 0 12px 0; font-family: monospace; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; justify-content: space-between;">
                <span>(+) Comissão de Viagem Calculada (Valor Real):</span>
                <span style="font-weight: bold;">R$ ${settlement.basicCommission.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #b91c1c;">
                <span>(-) Desconto de Avarias / Perdas:</span>
                <span>- R$ ${settlement.avariaDeduction.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #b91c1c;">
                <span>(-) Desconto de Falta de Caixa:</span>
                <span>- R$ ${settlement.shortageDeduction.toFixed(2)}</span>
              </div>
              <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 3px 0;" />
              <div style="display: flex; justify-content: space-between; font-weight: bold; color: #15803d; font-size: 9px;">
                <span>(=) VALOR REAL RECEBIDO (COMISSÃO LÍQUIDA):</span>
                <span>R$ ${settlement.finalCommission.toFixed(2)}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px;">
              <div style="font-size: 9px; color: #475569; font-weight: 600;">
                Data de Emissão: _____/_____/_________
              </div>
              <div style="width: 220px; text-align: center;">
                <div style="border-top: 1px solid #475569; padding-top: 2px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #1e293b; margin-top: 45px;">
                  ${settlement.driverName}<br/>
                  <span style="font-weight: normal; color: #64748b; font-size: 8px; text-transform: none;">Motorista (Beneficiário)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 15px; text-align: center; font-size: 8px; color: #94a3b8; font-weight: 500;">
            Documento gerado eletronicamente via Terrasul envasadora de bebidas Ltda.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintCaixa = (settlement: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Caixa - ${settlement.driverName}</title>
          <style>
            @page {
              size: A5 landscape;
              margin: 0.5cm;
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #1e293b; 
              line-height: 1.4; 
              font-size: 11px;
            }
            .container {
              border: 2px solid #0f172a;
              padding: 15px;
              border-radius: 6px;
              background-color: #fff;
            }
            .header { 
              border-bottom: 2px solid #0f172a; 
              padding-bottom: 6px; 
              margin-bottom: 12px; 
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .company { 
              font-size: 12px; 
              font-weight: 800; 
              text-transform: uppercase; 
              color: #0f172a; 
            }
            .title { 
              font-size: 14px; 
              font-weight: 900; 
              text-transform: uppercase; 
              color: #0f172a; 
              border: 1.5px solid #0f172a;
              padding: 4px 10px;
              border-radius: 4px;
              background-color: #f1f5f9;
            }
            .grid-2 { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin-bottom: 12px; 
            }
            .info-box {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 8px 12px;
              border-radius: 4px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10px;
            }
            .info-label { 
              font-weight: bold; 
              color: #475569; 
              text-transform: uppercase;
              font-size: 8px;
            }
            .info-value { 
              font-weight: 700; 
              color: #0f172a; 
            }
            .amount-card {
              border: 2px solid #16a34a;
              background-color: #f0fdf4;
              padding: 10px 15px;
              border-radius: 6px;
              text-align: center;
              margin-bottom: 12px;
            }
            .amount-val {
              font-size: 20px;
              font-weight: 900;
              color: #166534;
              font-family: monospace;
            }
            .amount-words {
              font-size: 10px;
              font-weight: 700;
              color: #166534;
              font-style: italic;
              margin-top: 2px;
            }
            .desc {
              font-size: 10.5px;
              text-align: justify;
              margin-bottom: 25px;
              color: #334155;
            }
            .signatures { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-top: 30px;
            }
            .sig-line { 
              border-top: 1px solid #475569; 
              padding-top: 4px; 
              font-size: 9px; 
              font-weight: bold; 
              text-align: center; 
              text-transform: uppercase; 
              color: #1e293b; 
            }
            .footer {
              margin-top: 15px;
              text-align: center;
              font-size: 8px;
              color: #94a3b8;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company">Terrasul envasadora de bebidas Ltda.</div>
              <div class="title">Recibo de Caixa</div>
            </div>
            
            <div class="grid-2">
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Motorista (Favorecido):</span>
                  <span class="info-value">${settlement.driverName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Placa / Veículo:</span>
                  <span class="info-value">${settlement.plate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ID do Acerto:</span>
                  <span class="info-value">${settlement.id}</span>
                </div>
              </div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Data de Fechamento:</span>
                  <span class="info-value">${new Date(settlement.dateSettlement).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Unidade:</span>
                  <span class="info-value" style="text-transform: uppercase;">${settlement.unit || 'Matriz'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Período de Viagem:</span>
                  <span class="info-value">${new Date(settlement.dateExit).toLocaleDateString('pt-BR')} a ${new Date(settlement.dateArrival).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
            
            <div class="amount-card">
              <div class="info-label" style="color: #166534; font-size: 9px; margin-bottom: 2px;">Valor a Receber (Comissão Líquida)</div>
              <div class="amount-val">R$ ${settlement.finalCommission.toFixed(2)}</div>
              <div class="amount-words">(${valorPorExtenso(settlement.finalCommission)})</div>
            </div>
            
            <div class="desc">
              Autorizo o caixa a efetuar o pagamento da importância acima descrita ao motorista <strong>${settlement.driverName}</strong>, correspondente ao saldo líquido de comissão de viagem apurada após a devida prestação de contas de vendas, despesas de viagem e desconto de avarias/faltas.
            </div>
            
            <div class="signatures">
              <div>
                <div class="sig-line" style="margin-top: 45px;">
                  ${settlement.driverName}<br/>
                  <span style="font-weight: normal; color: #64748b; font-size: 8px; text-transform: none;">Assinatura do Motorista</span>
                </div>
              </div>
              <div>
                <div class="sig-line" style="margin-top: 45px;">
                  ${currentUser?.name || 'Conferente'}<br/>
                  <span style="font-weight: normal; color: #64748b; font-size: 8px; text-transform: none;">Assinatura do Conferente (Operador do Sistema)</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              Recibo emitido eletronicamente via sistema Terrasul em ${new Date().toLocaleString('pt-BR')}.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const productionColumns = [
    {
      id: 'carregamento',
      header: 'Carregamento',
      defaultWidth: 120,
      cell: (m: any) => (
        <span className="font-mono font-bold text-[10px] text-slate-500 whitespace-nowrap leading-relaxed">
          {formatDateTime(m.entryTimestamp || m.timestamp)}
        </span>
      )
    },
    {
      id: 'placa',
      header: 'Placa / Tipo',
      defaultWidth: 110,
      cell: (m: any) => (
        <div className="whitespace-nowrap leading-relaxed">
          <span className="font-extrabold text-slate-900 block font-mono tracking-wider">{m.plate}</span>
          <span className={`inline-block text-[9px] font-extrabold uppercase px-1 rounded-sm ${m.ownerType === 'proprio' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
            {m.ownerType === 'proprio' ? 'FROTA PRÓPRIA' : 'TERCEIRO'}
          </span>
        </div>
      )
    },
    {
      id: 'linha_maquina',
      header: 'Linha / Máquina',
      defaultWidth: 130,
      cell: (m: any) => {
        const isFilial = (m.unit || 'matriz') === 'filial';
        const isPesada = ['carreta', 'truck'].includes((m.vehicleType || '').toLowerCase().trim());
        return (
          <div className="whitespace-nowrap leading-relaxed">
            {isFilial ? (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">
                Filial
              </span>
            ) : isPesada ? (
              <div className="inline-flex flex-col">
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                  Máquina 1 (Pesada)
                </span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType}</span>
              </div>
            ) : (
              <div className="inline-flex flex-col">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                  Máquina 2 (Média)
                </span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'expediente',
      header: 'Expediente',
      defaultWidth: 100,
      cell: (m: any) => {
        const ts = m.productionControl?.carregamentoFinishedAt || 
                   m.productionControl?.finishedAt || 
                   m.exitTimestamp || 
                   m.entryTimestamp || 
                   m.timestamp;
        const dObj = ts ? new Date(ts) : null;
        const hour = dObj ? dObj.getHours() : 0;
        const isManha = hour < 12;
        return (
          <div className="whitespace-nowrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
              isManha 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              {isManha ? '☀️ Manhã' : '⛅ Tarde'}
            </span>
          </div>
        );
      }
    },
    {
      id: 'condutor',
      header: 'Condutor / Cliente',
      defaultWidth: 160,
      cell: (m: any) => {
        const diff = m.productionControl?.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
        return (
          <div className="leading-relaxed font-sans">
            <span className="font-bold text-slate-800 block truncate max-w-[150px]">{m.driver}</span>
            {m.client ? (
              <span className="text-[10px] text-slate-500 block truncate max-w-[150px] font-bold uppercase">Cli: {m.client}</span>
            ) : null}
            {m.ownerType === 'proprio' && m.productionControl && (
              <div className="mt-2 text-left bg-indigo-50/70 border border-indigo-100/80 text-indigo-950 p-2 rounded-lg text-[10px] leading-relaxed max-w-[280px]">
                <div className="font-extrabold uppercase tracking-wider text-[8px] text-indigo-900 mb-1.5 flex items-center gap-1">
                  <span>📊 CONCILIAÇÃO DE FROTA PRÓPRIA</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-indigo-100/50 pb-1.5 mb-1.5">
                  <div>
                    <span className="text-indigo-600/80 font-bold block text-[7.5px] uppercase leading-none">Deveria ter</span>
                    <span className="font-extrabold text-indigo-950 font-mono text-[10px] mt-0.5 block">
                      {m.productionControl.expectedDischargeQty !== undefined ? `${m.productionControl.expectedDischargeQty} u` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-600/80 font-bold block text-[7.5px] uppercase leading-none">Descarregou</span>
                    <span className="font-extrabold text-emerald-800 font-mono text-[10px] mt-0.5 block">
                      {m.productionControl.descarregadoQty} u
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-600/80 font-bold block text-[7.5px] uppercase leading-none">Carregou</span>
                    <span className="font-extrabold text-blue-800 font-mono text-[10px] mt-0.5 block">
                      {m.productionControl.totalCarregado} u
                    </span>
                  </div>
                </div>
                {m.productionControl.retiradaVasilhameCarga ? (
                  <div className="flex justify-between items-center text-[9px] border-b border-indigo-100/30 pb-1.5 mb-1.5 font-medium text-indigo-700">
                    <span>Retirada Vasilhame Rota:</span>
                    <span className="font-extrabold font-mono">-{m.productionControl.retiradaVasilhameCarga} u</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-1 mt-1 font-sans">
                  <span className="text-[8px] font-bold text-indigo-900/70 uppercase">Falta / Status:</span>
                  {(() => {
                    const expected = m.productionControl.expectedDischargeQty !== undefined ? m.productionControl.expectedDischargeQty : 0;
                    const diffVal = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : (expected - m.productionControl.descarregadoQty);
                    if (expected === 0) return <span className="text-slate-400 font-bold text-[9px]">-</span>;
                    if (diffVal > 0) {
                      return (
                        <span className="bg-rose-100/90 border border-rose-200 text-rose-800 font-black font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                          ❌ Falta: {diffVal} u
                          {m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.some((b: any) => b.qty > 0) ? (
                            <span className="text-[7px] uppercase font-sans font-black text-rose-900 opacity-90 block">
                              ({m.productionControl.differenceReasonsBreakdown.filter((b: any) => b.qty > 0).map((b: any) => `${b.qty} ${b.reason === 'venda' ? 'Venda' : b.reason === 'falta' ? 'Extravio' : b.reason === 'vasilhame_cliente' ? 'Vas. Cliente' : b.reason === 'comodato' ? 'Comodato' : b.reason === 'troca_avarias' ? 'Troca Avarias' : 'Outros'}`).join(', ')})
                            </span>
                          ) : m.productionControl.differenceReason && (
                            <span className="text-[7px] uppercase font-sans font-black text-rose-900 opacity-90">
                              ({m.productionControl.differenceReason === 'venda' ? 'Venda' : m.productionControl.differenceReason === 'falta' ? 'Extravio' : m.productionControl.differenceReason === 'vasilhame_cliente' ? 'Vas. Cliente' : m.productionControl.differenceReason === 'comodato' ? 'Comodato' : m.productionControl.differenceReason === 'troca_avarias' ? 'Troca Avarias' : 'Outros'})
                            </span>
                          )}
                        </span>
                      );
                    } else if (diffVal < 0) {
                      return (
                        <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 font-black font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0">
                          Sobra: {Math.abs(diffVal)} u
                        </span>
                      );
                    } else {
                      return (
                        <span className="bg-emerald-200/90 text-emerald-900 border border-emerald-300 font-black text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0 leading-none">
                          ✓ Sem Falta
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'descarregado',
      header: 'Descarregado',
      defaultWidth: 90,
      cell: (m: any) => (
        <div className="text-center font-bold font-mono text-slate-600">
          {m.productionControl?.descarregadoQty !== undefined ? `${m.productionControl.descarregadoQty} u` : '-'}
        </div>
      )
    },
    {
      id: 'vendido',
      header: 'Vendido / Entregue',
      defaultWidth: 100,
      cell: (m: any) => {
        let rowVendido = 0;
        const diff = m.productionControl?.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
        const hasControl = !!m.productionControl;
        if (m.ownerType === 'proprio' && hasControl) {
          if (m.productionControl?.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
            m.productionControl.differenceReasonsBreakdown.forEach((b: any) => { if (b.reason === 'venda') rowVendido += b.qty || 0; });
          } else if (diff > 0 && m.productionControl?.differenceReason === 'venda') {
            rowVendido = diff;
          }
        }
        return (
          <div className="text-center font-bold font-mono text-indigo-700 bg-indigo-50/5">
            {rowVendido > 0 ? `${rowVendido} u` : '-'}
          </div>
        );
      }
    },
    {
      id: 'adicionado',
      header: 'Adicionado / Sobra',
      defaultWidth: 110,
      cell: (m: any) => {
        let rowAdicionado = 0;
        const diff = m.productionControl?.differenceQty !== undefined ? m.productionControl.differenceQty : 0;
        const hasControl = !!m.productionControl;
        if (m.ownerType === 'proprio' && hasControl) {
          if (m.productionControl?.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.length > 0) {
            m.productionControl.differenceReasonsBreakdown.forEach((b: any) => {
              if (b.reason === 'outros' || b.reason === 'vasilhame_cliente' || b.reason === 'comodato' || b.reason === 'troca_avarias') rowAdicionado += b.qty || 0;
            });
          } else if (diff > 0 && (m.productionControl?.differenceReason === 'outros' || m.productionControl?.differenceReason === 'vasilhame_cliente' || m.productionControl?.differenceReason === 'comodato' || m.productionControl?.differenceReason === 'troca_avarias')) {
            rowAdicionado = diff;
          }
          if (diff < 0) rowAdicionado += Math.abs(diff);
        }
        return (
          <div className="text-center font-bold font-mono text-blue-700 bg-blue-50/5">
            {rowAdicionado > 0 ? `${rowAdicionado} u` : '-'}
          </div>
        );
      }
    },
    {
      id: 'carregado',
      header: 'Carregado',
      defaultWidth: 90,
      cell: (m: any) => (
        <div className="text-center font-extrabold font-mono text-blue-700 bg-blue-50/10 text-[11px]">
          {m.productionControl?.totalCarregado !== undefined ? `${m.productionControl.totalCarregado + (m.productionControl.retornoVasilhameCheio || 0)} u` : '-'}
        </div>
      )
    },
    {
      id: 'avarias_troca',
      header: 'Avarias de Troca',
      defaultWidth: 100,
      cell: (m: any) => {
        const descTrocaQty = (m.productionControl?.avariasDescarregamento || []).filter((a: any) => a.type.toLowerCase().includes('troca')).reduce((s: any, a: any) => s + (a.qty || 0), 0);
        const carrTrocaQty = (m.productionControl?.avariasCarregamento || []).filter((c: any) => c.type.toLowerCase().includes('troca')).reduce((s: any, c: any) => s + (c.qty || 0), 0);
        const totalTrocaQty = descTrocaQty + carrTrocaQty;
        return (
          <div className="text-center font-bold font-mono text-amber-600 bg-amber-50/20">
            {totalTrocaQty > 0 ? `${totalTrocaQty} u` : '-'}
          </div>
        );
      }
    },
    {
      id: 'avarias',
      header: 'Avarias Reais',
      defaultWidth: 100,
      cell: (m: any) => {
        const descAvariasQty = (m.productionControl?.avariasDescarregamento || []).filter((a: any) => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca')).reduce((s: any, a: any) => s + (a.qty || 0), 0);
        const carrAvariasQty = (m.productionControl?.avariasCarregamento || []).filter((c: any) => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca')).reduce((s: any, c: any) => s + (c.qty || 0), 0);
        const totalAvariasQty = descAvariasQty + carrAvariasQty;
        return (
          <div className="text-center leading-relaxed font-sans">
            {totalAvariasQty > 0 ? (
              <div className="inline-flex flex-col items-center">
                <span className="font-extrabold text-rose-700 font-mono text-[11px] bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                  {totalAvariasQty} u
                </span>
                <span className="text-[8px] font-bold text-slate-400 block mt-0.5 uppercase">
                  Desc: {descAvariasQty}u | Carr: {carrAvariasQty}u
                </span>
              </div>
            ) : (
              <span className="text-slate-400 font-bold font-sans">0</span>
            )}
          </div>
        );
      }
    },
    {
      id: 'tempoDesc',
      header: 'Tempo Descarreg.',
      defaultWidth: 100,
      cell: (m: any) => {
        const descActiveMs = getStageActiveTime(m, 'descarregamento');
        return (
          <div className="text-right">
            {getStepComparison(m.productionControl?.expectedDischargeQty || m.productionControl?.descarregadoQty || 0, avgTimeDischarging, descActiveMs)}
          </div>
        );
      }
    },
    {
      id: 'tempoCarr',
      header: 'Tempo Carreg.',
      defaultWidth: 100,
      cell: (m: any) => {
        const carrActiveMs = getStageActiveTime(m, 'carregamento');
        return (
          <div className="text-right">
            {getStepComparison((m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0) || m.productionControl?.descarregadoQty || 0, avgTimeLoading, carrActiveMs)}
          </div>
        );
      }
    },
    {
      id: 'totalAtivo',
      header: 'Total Ativo',
      defaultWidth: 110,
      cell: (m: any) => {
        const durObj = getMovementDurations(m);
        return (
          <div className="text-right leading-normal whitespace-nowrap">
            <span className="font-black font-mono text-[#0c2a5c] text-[11px] block">
              {durObj ? formatDurationStatus(durObj.activeMs) : '-'}
            </span>
            {durObj && durObj.sumPauses > 0 ? (
              <span className="text-[8px] font-bold text-amber-600 block">
                Pausas: {formatDurationStatus(durObj.sumPauses)}
              </span>
            ) : null}
            {m.productionReverted && (
              <div className="mt-1 text-left bg-amber-50 text-amber-900 p-2.5 rounded-lg text-[10px] space-y-1 border border-amber-200 shadow-2xs font-sans whitespace-normal max-w-[280px]">
                <p className="font-extrabold text-amber-800 flex items-center gap-1">⚠️ ESTORNO OPERADO</p>
                <p className="text-slate-500 text-[9px] font-bold leading-relaxed">
                  Por <span className="text-slate-800 font-bold">{m.productionRevertBy || 'Sistema'}</span> em <span className="text-slate-800 whitespace-nowrap font-mono">{m.productionRevertAt ? formatDateTime(m.productionRevertAt) : '-'}</span>
                </p>
                <p className="text-slate-700 italic border-l-2 border-amber-300 pl-1.5 mt-1 leading-normal text-[9.5px]">
                  "{m.productionRevertReason || 'Sem motivo informado'}"
                </p>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'acoes',
      header: 'Ações',
      defaultWidth: 100,
      cell: (m: any) => (
        <div className="text-center whitespace-nowrap">
          <button
            type="button"
            onClick={() => { setViewingProductionMovement(m); setActiveProductionTab('details'); }}
            className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold text-[10px] uppercase tracking-wide py-1.5 px-3 rounded-lg transition-all shadow-2xs cursor-pointer"
            title="Visualizar Ficha com Imagens e Comprovante"
          >
            <FileText size={13} /> Ficha & Recibo
          </button>
        </div>
      )
    }
  ];

  const logsColumns = [
    {
      id: 'registro_hora',
      header: 'Registro / Hora',
      defaultWidth: 150,
      cell: (m: any) => {
        const entryTime = m.entryTimestamp || m.timestamp;
        const exitTime = m.exitTimestamp || (m.status === 'saida' ? m.timestamp : undefined);
        const entryFormatted = new Date(entryTime).toLocaleString('pt-BR');
        const exitFormatted = exitTime ? new Date(exitTime).toLocaleString('pt-BR') : null;
        return (
          <div className="flex flex-col gap-0.5 tabular-nums leading-relaxed">
            <span className="text-slate-700 font-medium whitespace-nowrap">
              <span className="text-emerald-600 font-extrabold text-[9px] mr-1">ENT:</span> {entryFormatted}
            </span>
            {exitFormatted && (
              <span className="text-slate-400 font-normal whitespace-nowrap">
                <span className="text-amber-500 font-extrabold text-[9px] mr-1">SAI:</span> {exitFormatted}
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'identificacao',
      header: 'Identificação',
      defaultWidth: 100,
      cell: (m: any) => <span className="font-bold text-slate-800 tracking-tight">{m.plate}</span>
    },
    {
      id: 'condutor',
      header: 'Condutor',
      defaultWidth: 180,
      cell: (m: any) => (
        <div className="whitespace-normal leading-relaxed">
          <span className="font-semibold text-slate-700 block">{m.driver}</span>
          {m.client && (
            <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wide block mt-1">Cli: {m.client}</span>
          )}
          {(m.orderPhoto || m.hasOrderPhoto) && (
            <MovementOrderPhotoBtn movement={m} setViewerPhoto={setViewerPhoto} />
          )}
          {(m.wasEdited || m.productionReverted) && (
            <div className="mt-1 text-[9px] bg-amber-50 text-amber-800 font-medium px-2 py-1 rounded border border-amber-200/60 leading-tight space-y-0.5 max-w-[200px] whitespace-normal">
              <span className="font-extrabold uppercase text-[8px] tracking-wide text-amber-700 block">
                {m.productionReverted ? '▲ Estornado da Produção' : '▲ Alterado / Estornado'}
              </span>
              <span className="block text-slate-500 font-medium">
                Por: <strong className="text-slate-800 font-bold">
                  {m.productionReverted ? m.productionRevertBy : (m.editedBy || 'Operador')}
                </strong> em {
                  m.productionReverted && m.productionRevertAt 
                    ? new Date(m.productionRevertAt).toLocaleString('pt-BR')
                    : (m.editedAt ? new Date(m.editedAt).toLocaleString('pt-BR') : '')
                }
              </span>
              {(m.productionReverted || m.alteredFields) && (
                <span className="block text-slate-700 font-medium leading-normal">
                  <strong className="text-amber-950 font-bold">Alterou:</strong> {
                    m.productionReverted 
                      ? `Retornou Kanban para: ${
                          m.kanbanStep === 'aguardando_descarregamento' ? 'Fila p/ Descarr.' 
                          : m.kanbanStep === 'descarregamento' ? 'Oper. Descarreg.' 
                          : m.kanbanStep === 'carregamento' ? 'Oper. Carreg.' 
                          : m.kanbanStep || 'Fila inicial'
                        }`
                      : m.alteredFields
                  }
                </span>
              )}
              {(m.productionReverted ? m.productionRevertReason : m.editReason) && (
                <span className="block text-slate-600 font-medium italic bg-amber-100/40 p-1.5 rounded mt-1 border-l-2 border-amber-400">
                  "Motivo: {m.productionReverted ? m.productionRevertReason : m.editReason}"
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'inf_tecnica',
      header: 'Inf. Técnica',
      defaultWidth: 130,
      cell: (m: any) => (
        <div className="text-[10px] uppercase font-medium leading-relaxed">
          <span className="font-bold text-[11px] block text-slate-700">
            {customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType}
          </span>
          <span className="text-slate-400 block font-bold mt-0.5">({m.ownerType})</span>
          {m.odometer && <span className="block text-slate-400 font-mono font-bold mt-0.5">ODO: {m.odometer} KM</span>}
          {m.bypassProduction && (
            <span className="block text-purple-700 bg-purple-50 border border-purple-150 font-bold px-1 py-0.5 rounded text-[9px] uppercase mt-1 w-max">
              {m.purpose === 'producao' ? 'Visitante' : (customEntryPurposes.find(p => p.id === m.purpose)?.name || m.purpose)}
            </span>
          )}
        </div>
      )
    },
    {
      id: 'inspecao',
      header: 'Inspeção',
      defaultWidth: 100,
      cell: (m: any) => {
        return m.ownerType === 'terceiro' ? (
          <span className="text-slate-400 bg-slate-150 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">Dispensado</span>
        ) : m.checklistEvaluator ? (
          m.checklist?.passed ? (
            <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Aprovado</span>
          ) : (
            <span className="text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Reprovado</span>
          )
        ) : (
          <span className="text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded text-[10px] uppercase animate-pulse">Pendente</span>
        );
      }
    },
    {
      id: 'operadores',
      header: 'Operadores',
      defaultWidth: 140,
      cell: (m: any) => (
        <div className="text-[10px] leading-relaxed">
          <span className="block"><strong className="text-slate-500 uppercase text-[9px]">Entrada:</strong> {m.createdBy || 'Sistema'}</span>
          {m.ownerType !== 'terceiro' && (
            <span className="block"><strong className="text-slate-500 uppercase text-[9px]">Vistoria:</strong> {m.checklistEvaluator || 'Pendente'}</span>
          )}
          {m.status === 'saida' && (
            <span className="block"><strong className="text-slate-500 uppercase text-[9px]">Saída:</strong> {m.exitedBy || 'Sistema'}</span>
          )}
        </div>
      )
    },
    {
      id: 'log_servicos',
      header: 'Log de Serviços',
      defaultWidth: 200,
      cell: (m: any) => {
        const deps = supplies.filter(s => s.movementId === m.id);
        return (
          <div className="flex flex-col gap-1 leading-relaxed">
            {deps.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {deps.map(d => (
                  <span key={d.id} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-max uppercase block font-medium">
                    {d.type}: <span className="font-bold">{d.amount}</span> {['diesel', 'arla'].includes(d.type) ? 'L' : 'un'} <span className="text-slate-400 font-normal">({d.odometer} KM)</span>
                  </span>
                ))}
              </div>
            )}
            {m.earlyExitReason && (
              <span className={`text-[10px] w-max font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider block ${
                m.earlyExitReason.includes('Almoço') ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                m.earlyExitReason.includes('Oficina') ? 'bg-slate-100 text-slate-700 border-slate-300' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {m.earlyExitReason}
              </span>
            )}
            {m.purpose && (m.purpose.includes('Retorno') || m.purpose === 'Retorno Almoço' || m.purpose === 'Retorno Oficina') && (
              <span className={`text-[10px] w-max font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider block ${
                m.purpose.includes('Almoço') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}>
                ⏎ {customEntryPurposes.find(p => p.id === m.purpose)?.name || m.purpose}
              </span>
            )}

            {m.gateTemporaryExits && m.gateTemporaryExits.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 border-t border-slate-100 pt-1.5">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Trânsito Temporário:</span>
                {m.gateTemporaryExits.map((te: any, index: number) => {
                  const durationText = te.returnedAt && te.durationMs
                    ? (() => {
                        const mins = Math.floor(te.durationMs / 60000);
                        if (mins < 60) return `${mins}m`;
                        const hrs = Math.floor(mins / 60);
                        const remMins = mins % 60;
                        return `${hrs}h ${remMins}m`;
                      })()
                    : null;

                  return (
                     <div key={te.id || index} className="bg-slate-50 border border-slate-150 p-1.5 rounded flex flex-col gap-0.5 max-w-[200px]">
                       <div className="flex items-center justify-between gap-1.5">
                         <span className={`text-[8px] font-black px-1 py-0.2 rounded uppercase tracking-wider ${
                           te.type === 'almoco' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-200 text-slate-700 border border-slate-300'
                         }`}>
                           🚪 {te.type === 'almoco' ? 'Almoço' : 'Oficina'}
                         </span>
                         {durationText && (
                           <span className="text-[8px] font-mono text-slate-400 font-extrabold">
                             ⏱️ {durationText}
                           </span>
                         )}
                       </div>
                       <div className="text-[8px] text-slate-500 font-mono flex flex-col">
                         <span>Saiu: {new Date(te.exitedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({te.exitedBy || '-'})</span>
                         {te.returnedAt ? (
                           <span className="text-emerald-600 font-bold">Voltou: {new Date(te.returnedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({te.returnedBy || '-'})</span>
                         ) : (
                           <span className="text-amber-600 font-extrabold uppercase animate-pulse">Ausente / Fora</span>
                         )}
                       </div>
                     </div>
                  );
                })}
              </div>
            )}

            {deps.length === 0 && !m.earlyExitReason && (!m.purpose || (!m.purpose.includes('Retorno') && m.purpose !== 'Retorno Almoço' && m.purpose !== 'Retorno Oficina')) && (!m.gateTemporaryExits || m.gateTemporaryExits.length === 0) && '-'}
          </div>
        );
      }
    },
    {
      id: 'acoes',
      header: 'Ações',
      defaultWidth: 100,
      cell: (m: any) => {
        return isMovementSettled(m) && currentUser?.role !== 'admin' && currentUser?.role !== 'operador' ? (
          <span 
            className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wider inline-flex items-center gap-1 cursor-not-allowed select-none whitespace-nowrap"
            title="Este registro está bloqueado pois o acerto de contas correspondente já foi finalizado."
          >
            <Lock size={10} /> Bloqueado
          </span>
        ) : (
          <button
            onClick={() => handleStartEdit(m)}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wider transition-colors inline-block whitespace-nowrap cursor-pointer"
          >
            <span className="flex items-center gap-1"><Edit size={10} /> Editar</span>
          </button>
        );
      }
    }
  ];

  const inspecoesColumns = [
    {
      id: 'date_hora',
      header: 'Data/Hora',
      defaultWidth: 140,
      cell: (m: any) => {
        const matchedSupply = supplies.find(s => s.movementId === m.id);
        const inspectionTime = matchedSupply?.timestamp || m.exitTimestamp || m.entryTimestamp || m.timestamp;
        return <span className="font-mono text-slate-600 whitespace-nowrap">{new Date(inspectionTime || '').toLocaleString('pt-BR')}</span>;
      }
    },
    {
      id: 'veiculo',
      header: 'Veículo',
      defaultWidth: 110,
      cell: (m: any) => (
        <div>
          <span className="font-black text-xs text-slate-900 block font-mono">{m.plate}</span>
          <span className="text-[9px] text-slate-400 block uppercase font-bold">
            {customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType}
          </span>
        </div>
      )
    },
    {
      id: 'condutor',
      header: 'Condutor / Motorista',
      defaultWidth: 150,
      cell: (m: any) => <span className="font-semibold block text-slate-850 uppercase">{m.driver}</span>
    },
    {
      id: 'vistoriador',
      header: 'Vistoriador (Por quem)',
      defaultWidth: 140,
      cell: (m: any) => <span className="font-semibold text-slate-600 whitespace-nowrap uppercase">{m.checklistEvaluator || '-'}</span>
    },
    {
      id: 'itens',
      header: 'Itens Inspecionados',
      defaultWidth: 350,
      cell: (m: any) => {
        const pBrakes = m.checklist?.brakes ?? false;
        const pTires = m.checklist?.tires ?? false;
        const pLights = m.checklist?.lights ?? false;
        const hasLeaks = m.checklist?.leaks ?? false;
        return (
          <div className="flex flex-wrap gap-1 max-w-lg leading-relaxed">
            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${pBrakes ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Freios: {pBrakes ? 'APROVADO' : 'FALHA'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${pTires ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Pneus: {pTires ? 'APROVADO' : 'FALHA'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${pLights ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Luzes: {pLights ? 'APROVADO' : 'FALHA'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${!hasLeaks ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              Vazamento: {!hasLeaks ? 'NÃO APRESENTA' : 'APRESENTA'}
            </span>
            {m.checklist?.customItems && Object.entries(m.checklist.customItems).map(([k, v]) => (
              <span key={k} className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {k}: {v ? 'Ok' : 'Falha'}
              </span>
            ))}
            {m.checklist?.notes && (
              <div className="w-full mt-1.5 text-[9px] text-slate-600 font-semibold bg-slate-50 p-2 rounded border border-slate-150 block text-left">
                <span className="text-[8px] uppercase tracking-wider block text-slate-400 font-extrabold mb-0.5 font-bold">Observação da Vistoria:</span>
                {m.checklist.notes}
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'laudo',
      header: 'Laudo / Resultado',
      defaultWidth: 150,
      cell: (m: any) => {
        return m.checklist?.passed ? (
          <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded border border-emerald-200 uppercase tracking-wider">
            ✔ Aprovado p/ Viagem
          </span>
        ) : (
          <span className="inline-flex items-center justify-center text-rose-800 text-[10px] font-black px-3 py-1 rounded bg-rose-100 border border-rose-200 uppercase tracking-wider">
            ✘ Reprovado / Impedido
          </span>
        );
      }
    }
  ];

  const abastecimentosColumns = [
    {
      id: 'date_hora',
      header: 'Data / Hora',
      defaultWidth: 140,
      cell: (supply: any) => <span className="tabular-nums text-slate-500 font-mono">{new Date(supply.timestamp).toLocaleString('pt-BR')}</span>
    },
    {
      id: 'veiculo',
      header: 'Veículo (Placa)',
      defaultWidth: 110,
      cell: (supply: any) => <span className="font-bold text-slate-800 font-mono tracking-wider text-xs">{supply.plate}</span>
    },
    {
      id: 'motorista',
      header: 'Motorista Condutor',
      defaultWidth: 150,
      cell: (supply: any) => <span className="font-medium text-slate-700 uppercase">{supply.driver}</span>
    },
    {
      id: 'insumo',
      header: 'Insumo',
      defaultWidth: 120,
      cell: (supply: any) => {
        const isDiesel = supply.type === 'diesel';
        const isArla = supply.type === 'arla';
        return (
          <>
            {isDiesel && (
              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                Diesel S10
              </span>
            )}
            {isArla && (
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                ARLA 32
              </span>
            )}
            {supply.type === 'lubrificacao' && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                Lubrificação
              </span>
            )}
            {supply.type === 'calibracao' && (
              <span className="bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                Calibragem
              </span>
            )}
            {!['diesel', 'arla', 'lubrificacao', 'calibracao'].includes(supply.type) && (
              <span className="bg-slate-100 text-slate-700 border border-slate-205 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                {supply.type}
              </span>
            )}
          </>
        );
      }
    },
    {
      id: 'vol_qtd',
      header: 'Vol / Qtd',
      defaultWidth: 90,
      cell: (supply: any) => {
        return ['lubrificacao', 'calibracao'].includes(supply.type) ? (
          <span className="text-slate-400 font-semibold">—</span>
        ) : (
          <span className="font-black font-mono text-slate-800">
            {(supply?.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
            <span className="text-[9px] font-normal text-slate-400 ml-0.5">L</span>
          </span>
        );
      }
    },
    {
      id: 'valor_pago',
      header: 'Valor Pago',
      defaultWidth: 100,
      cell: (supply: any) => {
        return supply?.price ? (
          <span className="font-mono text-slate-600 font-semibold">
            <span className="text-[9px] text-slate-400 mr-0.5">R$</span>
            {(supply.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-[9px] text-slate-400 italic font-medium">Interno</span>
        );
      }
    },
    {
      id: 'marcador_odo',
      header: 'Marcador ODO',
      defaultWidth: 110,
      cell: (supply: any) => (
        <span className="font-mono font-bold text-slate-600">
          {(supply?.odometer ?? 0).toLocaleString('pt-BR')} <span className="text-[9px] font-normal text-slate-400">km</span>
        </span>
      )
    },
    {
      id: 'operador',
      header: 'Operador da Bomba',
      defaultWidth: 135,
      cell: (supply: any) => <span className="font-medium text-slate-700 uppercase">{supply?.operator || 'Sistema'}</span>
    },
    {
      id: 'consumo',
      header: 'Consumo da Viagem',
      defaultWidth: 150,
      cell: (supply: any) => {
        const isDiesel = supply?.type === 'diesel';
        return isDiesel ? (
          supply?.consumption !== null && supply?.consumption !== undefined ? (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold font-mono px-2 py-0.5 rounded-full text-[10px] inline-block">
              {(supply.consumption ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L
            </span>
          ) : (
            <span className="text-slate-405 italic text-[9px]" title="Necessita de outro abastecimento anterior deste veículo próprio para traçar histórico de milhas.">
              Primeiro Abastecimento
            </span>
          )
        ) : (
          <span className="text-slate-400 font-semibold">—</span>
        );
      }
    }
  ];

  const acertosDriverGroupsColumns = [
    {
      id: 'motorista',
      header: 'Motorista',
      defaultWidth: 180,
      cell: (driverGroup: any) => (
        <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase">
          <span className="text-slate-450 font-bold font-mono text-[9px] select-none shrink-0 w-3 text-center">
            {expandedDriver === driverGroup.driverName ? '▼' : '▶'}
          </span>
          {driverGroup.driverName}
        </span>
      )
    },
    {
      id: 'acertos_realizados',
      header: 'Acertos Realizados',
      defaultWidth: 120,
      cell: (driverGroup: any) => (
        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 font-mono">
          {driverGroup.settlementsCount}
        </span>
      )
    },
    {
      id: 'qtd_agua',
      header: 'Qtd Água Vendida (un)',
      defaultWidth: 140,
      cell: (driverGroup: any) => (
        <span className="font-black font-mono text-slate-800">
          {(driverGroup?.totalWaterSold ?? 0).toLocaleString('pt-BR')} un
        </span>
      )
    },
    {
      id: 'valor_total',
      header: 'Valor Total Vendas',
      defaultWidth: 130,
      cell: (driverGroup: any) => (
        <span className="font-mono text-slate-600 font-semibold">
          R$ {(driverGroup?.totalSales ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'comodato',
      header: 'Comodato (un)',
      defaultWidth: 110,
      cell: (driverGroup: any) => {
        return (driverGroup?.totalComodato ?? 0) > 0 ? (
          <span className="bg-amber-50 text-amber-850 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-amber-200">
            {driverGroup.totalComodato} un
          </span>
        ) : (
          <span className="text-slate-300 font-mono font-medium">0 un</span>
        );
      }
    },
    {
      id: 'bonificacao',
      header: 'Bonificação (un)',
      defaultWidth: 110,
      cell: (driverGroup: any) => {
        return (driverGroup?.totalBonificacao ?? 0) > 0 ? (
          <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-purple-200">
            {driverGroup.totalBonificacao} un
          </span>
        ) : (
          <span className="text-slate-300 font-mono font-medium">0 un</span>
        );
      }
    },
    {
      id: 'despesas_totais',
      header: 'Despesas Totais',
      defaultWidth: 120,
      cell: (driverGroup: any) => (
        <span className="font-mono text-rose-600 font-semibold">
          R$ {(driverGroup?.totalExpenses ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'avarias',
      header: 'Avarias (un)',
      defaultWidth: 100,
      cell: (driverGroup: any) => {
        return (driverGroup?.totalAvarias ?? 0) > 0 ? (
          <span className="bg-rose-50 text-rose-850 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-rose-200">
            {driverGroup.totalAvarias} un
          </span>
        ) : (
          <span className="text-slate-300 font-mono font-medium">0 un</span>
        );
      }
    },
    {
      id: 'comissao_consolidada',
      header: 'Comissão Consolidada',
      defaultWidth: 140,
      cell: (driverGroup: any) => (
        <span className="font-black font-mono text-emerald-700">
          R$ {(driverGroup?.totalCommission ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    }
  ];

  const acertosDetailedColumns = [
    {
      id: 'data_acerto',
      header: 'Data do Acerto',
      defaultWidth: 140,
      cell: (ds: any) => <span className="text-slate-900 font-mono">{new Date(ds.dateSettlement || ds.dateArrival || '').toLocaleString('pt-BR')}</span>
    },
    {
      id: 'veiculo_placa',
      header: 'Veículo / Placa',
      defaultWidth: 100,
      cell: (ds: any) => <span className="font-bold uppercase text-slate-850 font-mono">{ds.plate}</span>
    },
    {
      id: 'cod_producao',
      header: 'Código Produção',
      defaultWidth: 110,
      cell: (ds: any) => {
        const realId = ds.movementId.replace('settled-', '');
        const m = movements.find(mov => mov.id === realId);
        const prodCode = m ? getProductionCode(m) : 'N/A';
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              if (m) {
                setViewingProductionMovement(m);
                setActiveSubTab('producao');
                setActiveProductionTab('details');
              }
            }}
            className="font-mono text-[10px] text-blue-600 hover:text-blue-800 underline font-black uppercase cursor-pointer"
          >
            {prodCode}
          </span>
        );
      }
    },
    {
      id: 'vendas',
      header: 'Vendas (R$)',
      defaultWidth: 110,
      cell: (ds: any) => (
        <span className="font-mono font-bold text-slate-700">
          R$ {(ds?.totalSales ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'despesas',
      header: 'Despesas (R$)',
      defaultWidth: 110,
      cell: (ds: any) => (
        <span className="font-mono text-rose-600">
          R$ {(ds?.totalExpenses ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'comissao',
      header: 'Comissão (R$)',
      defaultWidth: 110,
      cell: (ds: any) => (
        <span className="font-mono font-black text-emerald-700">
          R$ {(ds?.totalCommission ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      defaultWidth: 100,
      cell: (ds: any) => {
        return ds.isClosed ? (
          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded inline-flex items-center gap-1 border border-emerald-200">
            <Check size={10} /> Fechado
          </span>
        ) : (
          <span className="bg-amber-100 text-amber-850 text-[9px] font-black uppercase px-2 py-0.5 rounded inline-flex items-center gap-1 border border-amber-200 animate-pulse">
            Aberto
          </span>
        );
      }
    },
    {
      id: 'acoes',
      header: 'Ações',
      defaultWidth: 90,
      cell: (ds: any) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setViewingSettlement(ds);
          }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wider transition-all inline-block cursor-pointer border border-slate-200"
        >
          Visualizar
        </button>
      )
    }
  ];

  const vendasConsolidatedColumns = [
    {
      id: 'produto',
      header: 'Produto / Item',
      defaultWidth: 180,
      cell: (p: any) => <span className="font-sans font-black text-slate-900 uppercase tracking-tight text-xs">{p.name}</span>
    },
    {
      id: 'qtd_total',
      header: 'Quantidade Total',
      defaultWidth: 130,
      cell: (p: any) => <span className="font-mono font-bold text-slate-900">{(p?.totalQty ?? 0).toLocaleString('pt-BR')} un</span>
    },
    {
      id: 'valor_total',
      header: 'Valor Total Comercializado (R$)',
      defaultWidth: 180,
      cell: (p: any) => <span className="font-mono font-black text-emerald-700 text-sm">R$ {(p?.totalValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    {
      id: 'pagamentos',
      header: 'Faturamento por Meio de Pagamento (R$)',
      defaultWidth: 350,
      cell: (p: any) => (
        <div className="flex flex-wrap gap-1.5 leading-normal">
          {(p?.payments?.dinheiro ?? 0) > 0 && (
            <span className="bg-amber-50 text-amber-805 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
              DINHEIRO: R$ {(p.payments?.dinheiro ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {(p?.payments?.pix ?? 0) > 0 && (
            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
              PIX: R$ {(p.payments?.pix ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {(p?.payments?.boleto ?? 0) > 0 && (
            <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
              BOLETO: R$ {(p.payments?.boleto ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {(p?.payments?.cheque ?? 0) > 0 && (
            <span className="bg-indigo-50 text-indigo-850 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
              CHEQUE: R$ {(p.payments?.cheque ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {(p?.payments?.outros ?? 0) > 0 && (
            <span className="bg-slate-50 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
              OUTROS: R$ {(p.payments?.outros ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {p.totalValue === 0 && (
            <span className="bg-slate-50 text-slate-400 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide font-sans">
              Sem faturamento (Bonificação/Comodato)
            </span>
          )}
        </div>
      )
    }
  ];

  const vendasPreSalesColumns = [
    {
      id: 'data',
      header: 'Data',
      defaultWidth: 140,
      cell: (ps: any) => <span className="text-slate-500 font-mono">{ps.timestamp ? new Date(ps.timestamp).toLocaleString('pt-BR') : '-'}</span>
    },
    {
      id: 'motorista',
      header: 'Motorista',
      defaultWidth: 130,
      cell: (ps: any) => <span className="text-slate-900 uppercase font-bold">{ps.driverName || '-'}</span>
    },
    {
      id: 'cliente',
      header: 'Cliente',
      defaultWidth: 150,
      cell: (ps: any) => <span className="text-slate-900 uppercase font-bold max-w-[200px] truncate" title={ps.clientName}>{ps.clientName || '-'}</span>
    },
    {
      id: 'produtos',
      header: 'Produtos Estimados',
      defaultWidth: 180,
      cell: (ps: any) => (
        <div className="flex flex-col gap-0.5 text-[10px] leading-relaxed">
          {ps.products?.map((p: any, pIdx: number) => {
            const name = p.productType === 'agua' ? 'Água 20L' : p.productType === 'agua_copo' ? 'Água Copo 200ml' : p.productType === 'garrafa510' ? 'Água 510ml' : p.productType === 'garrafa15l' ? 'Água 1,5L' : p.productType === 'vasilhame' ? 'Vasilhame' : p.productType === 'troca' ? 'Troca' : p.productType === 'bonificacao' ? 'Bonificação' : p.productType === 'comodato' ? 'Comodato' : p.productType === 'retorno' ? 'Retorno' : p.productType;
            return (
              <div key={pIdx} className="flex gap-1.5 justify-between max-w-[180px] font-mono">
                <span className="uppercase text-slate-500 font-bold">{name}</span>
                <span className="font-extrabold text-slate-800">{p.qty} un</span>
              </div>
            );
          })}
        </div>
      )
    },
    {
      id: 'qtd_total',
      header: 'Qtd Total',
      defaultWidth: 100,
      cell: (ps: any) => {
        const totalEstimatedQty = ps.products?.reduce((sum: number, p: any) => sum + (p.qty || 0), 0) || 0;
        return <span className="font-black font-mono text-slate-900">{totalEstimatedQty} un</span>;
      }
    },
    {
      id: 'faturamento',
      header: 'Controle de Faturamento (NF / Boleto)',
      defaultWidth: 240,
      cell: (ps: any) => (
        <InvoiceCell
          saleNumber={ps.id}
          initialNfIssued={ps.nfIssued}
          initialNfNumber={ps.nfNumber}
          initialNfQty={ps.nfQty}
          initialBoletoIssued={ps.boletoIssued}
          onUpdateNf={handleUpdateNfForPreSale}
          preSaleProducts={ps.products}
          products={[]}
          wasPreSale={false}
          isPreSaleOnly={true}
        />
      )
    },
    {
      id: 'status',
      header: 'Status',
      defaultWidth: 100,
      cell: () => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          Pendente
        </span>
      )
    }
  ];

  const vendasDetailedColumns = [
    {
      id: 'venda',
      header: 'Nº Venda',
      defaultWidth: 80,
      cell: (s: any) => <span className="font-bold text-slate-900 font-mono">{s.saleNumber}</span>
    },
    {
      id: 'controle_viagem',
      header: 'Controle Viagem',
      defaultWidth: 100,
      cell: (s: any) => <span className="font-bold text-slate-500 text-[10px] font-mono">{s.tripControlNumber}</span>
    },
    {
      id: 'data',
      header: 'Data',
      defaultWidth: 140,
      cell: (s: any) => <span className="text-slate-500 font-mono">{s.date && typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleString('pt-BR') : (s.date || '-')}</span>
    },
    {
      id: 'motorista',
      header: 'Motorista',
      defaultWidth: 140,
      cell: (s: any) => <span className="font-sans text-slate-800 uppercase font-bold">{s.driverName}</span>
    },
    {
      id: 'placa',
      header: 'Placa',
      defaultWidth: 100,
      cell: (s: any) => <span className="text-slate-500 font-bold font-mono uppercase">{s.plate}</span>
    },
    {
      id: 'cliente_produtos',
      header: 'Cliente / Produtos',
      defaultWidth: 200,
      cell: (s: any) => (
        <div>
          <span className="font-sans font-black text-slate-900 uppercase tracking-tight text-xs block truncate max-w-[200px]" title={s.clientName}>
            {s.clientName}
          </span>
          <div className="space-y-0.5 mt-1 leading-normal">
            {s.products.map((p: any, pIdx: number) => (
              <div key={pIdx} className="uppercase text-[10px] text-slate-500 font-semibold font-sans">
                ↳ {p.item}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'qtd',
      header: 'Qtd',
      defaultWidth: 80,
      cell: (s: any) => (
        <div className="space-y-0.5">
          {s.products.map((p: any, pIdx: number) => (
            <div key={pIdx} className="font-bold text-slate-800 font-mono">
              {Math.round(p.qty)} un
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'unitario',
      header: 'Unitário',
      defaultWidth: 90,
      cell: (s: any) => (
        <div className="space-y-0.5">
          {s.products.map((p: any, pIdx: number) => (
            <div key={pIdx} className="text-slate-400 font-mono">
              R$ {p.value.toFixed(2)}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'total',
      header: 'Total',
      defaultWidth: 100,
      cell: (s: any) => <span className="font-black text-emerald-700 text-sm font-mono">R$ {s.totalValue.toFixed(2)}</span>
    },
    {
      id: 'forma_pagto',
      header: 'Forma Pagto',
      defaultWidth: 140,
      cell: (s: any) => (
        <div className="flex flex-col gap-1 font-sans leading-normal">
          {s.payments.map((p: any, pIdx: number) => (
            <div key={pIdx} className="flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                p.method === 'pix' ? 'bg-blue-100 text-blue-800 font-black' :
                p.method === 'dinheiro' ? 'bg-amber-100 text-amber-800 font-black' :
                'bg-slate-100 text-slate-800'
              }`}>
                {p.method}
              </span>
              <span className="font-mono text-[10px] text-slate-650 font-semibold">R$ {p.amount.toFixed(2)}</span>
            </div>
          ))}
          {s.payments.length === 0 && (
            <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-center">
              Logística / Grátis
            </span>
          )}
        </div>
      )
    },
    {
      id: 'nota_fiscal',
      header: 'Nota Fiscal (NF)',
      defaultWidth: 240,
      cell: (s: any) => (
        <InvoiceCell
          saleNumber={s.saleNumber}
          initialNfIssued={s.nfIssued}
          initialNfNumber={s.nfNumber}
          initialNfQty={s.nfQty}
          initialBoletoIssued={s.boletoIssued}
          onUpdateNf={handleUpdateNfForSaleInReport}
          preSaleProducts={s.preSaleProducts}
          products={s.products}
          payments={s.payments}
          wasPreSale={s.wasPreSale}
        />
      )
    },
    {
      id: 'acoes_assinatura',
      header: 'Ações / Assinatura',
      defaultWidth: 100,
      cell: (s: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setLastSaleForPrint({
              saleNumber: s.saleNumber,
              sales: s.rawSales
            })}
            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors font-bold text-[10px] uppercase gap-1 cursor-pointer"
            title="Ver / Imprimir Pedido de Venda"
          >
            <Printer size={13} />
          </button>
          {s.signature ? (
            <button
              onClick={() => setViewingSignature(s.signature || null)}
              className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
              title="Ver Assinatura do Cliente"
            >
              <PenTool size={13} />
            </button>
          ) : (
            <span className="text-[9px] text-slate-300 font-extrabold uppercase bg-slate-50 border border-slate-200 px-1 py-0.5 rounded select-none" title="Sem Assinatura">S/A</span>
          )}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      defaultWidth: 100,
      cell: (s: any) => {
        const hasPreSale = s.wasPreSale;
        return hasPreSale ? (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-black text-[9px] px-2 py-0.5 rounded border border-emerald-150 uppercase tracking-wider">
            Faturado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 font-black text-[9px] px-2 py-0.5 rounded border border-blue-150 uppercase tracking-wider">
            Finalizado
          </span>
        );
      }
    }
  ];

  const comprasClienteDetailedColumns = [
    {
      id: 'cliente',
      header: 'Cliente',
      defaultWidth: 160,
      cell: (s: any) => <span className="font-sans font-black text-slate-900 uppercase tracking-tight text-xs">{s.clientName}</span>
    },
    {
      id: 'data',
      header: 'Data',
      defaultWidth: 140,
      cell: (s: any) => <span className="text-slate-500 font-mono">{s.date && typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleString('pt-BR') : (s.date || '-')}</span>
    },
    {
      id: 'venda',
      header: 'Nº Venda',
      defaultWidth: 80,
      cell: (s: any) => <span className="font-bold text-slate-900 font-mono">{s.saleNumber}</span>
    },
    {
      id: 'controle_viagem',
      header: 'Controle Viagem',
      defaultWidth: 100,
      cell: (s: any) => <span className="font-bold text-slate-500 text-[10px] font-mono">{s.tripControlNumber}</span>
    },
    {
      id: 'motorista',
      header: 'Quem Entregou (Motorista)',
      defaultWidth: 150,
      cell: (s: any) => (
        <div className="flex items-center gap-1.5 font-sans uppercase font-bold text-slate-800">
          <User size={13} className="text-slate-400" />
          {s.driverName}
        </div>
      )
    },
    {
      id: 'veiculo',
      header: 'Veículo',
      defaultWidth: 100,
      cell: (s: any) => <span className="text-slate-500 font-bold font-mono uppercase">{s.plate}</span>
    },
    {
      id: 'produtos',
      header: 'Produtos',
      defaultWidth: 150,
      cell: (s: any) => (
        <div className="space-y-0.5 leading-normal">
          {s.products.map((p: any, pIdx: number) => (
            <div key={pIdx} className="uppercase font-sans font-medium text-[10px] text-slate-700">
              {p.item}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'qtd',
      header: 'Qtd',
      defaultWidth: 80,
      cell: (s: any) => (
        <div className="space-y-0.5">
          {s.products.map((p: any, pIdx: number) => (
            <div key={pIdx} className="font-bold text-slate-900 font-mono">
              {Math.round(p.qty)} un
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'unitario',
      header: 'Unitário',
      defaultWidth: 90,
      cell: (s: any) => (
        <div className="space-y-0.5">
          {s.products.map((p: any, pIdx: number) => (
            <div key={pIdx} className="text-slate-500 font-mono">
              R$ {p.value.toFixed(2)}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'total',
      header: 'Total',
      defaultWidth: 100,
      cell: (s: any) => <span className="font-bold text-emerald-700 text-sm font-mono">R$ {s.totalValue.toFixed(2)}</span>
    },
    {
      id: 'forma_pagto',
      header: 'Forma Pagto',
      defaultWidth: 140,
      cell: (s: any) => (
        <div className="flex flex-col gap-1 font-sans leading-normal">
          {s.payments.map((p: any, pIdx: number) => (
            <div key={pIdx} className="flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                p.method === 'pix' ? 'bg-blue-100 text-blue-800' :
                p.method === 'dinheiro' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {p.method}
              </span>
              <span className="font-mono text-[10px] text-slate-600 font-semibold">R$ {p.amount.toFixed(2)}</span>
            </div>
          ))}
          {s.payments.length === 0 && (
            <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-center">
              Logística / Grátis
            </span>
          )}
        </div>
      )
    },
    {
      id: 'acoes_assinatura',
      header: 'Ações / Assinatura',
      defaultWidth: 100,
      cell: (s: any) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setLastSaleForPrint({
              saleNumber: s.saleNumber,
              sales: s.rawSales
            })}
            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors font-bold text-[10px] uppercase gap-1 cursor-pointer"
            title="Ver / Imprimir Pedido de Venda"
          >
            <Printer size={13} />
          </button>
          {s.signature ? (
            <button
              onClick={() => setViewingSignature(s.signature || null)}
              className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
              title="Ver Assinatura do Cliente"
            >
              <PenTool size={13} />
            </button>
          ) : (
            <span className="text-[9px] text-slate-300 font-extrabold uppercase bg-slate-50 border border-slate-200 px-1 py-0.5 rounded select-none" title="Sem Assinatura">S/A</span>
          )}
        </div>
      )
    }
  ];

  const comprasClienteDeliveryColumns = [
    {
      id: 'data',
      header: 'Data',
      defaultWidth: 140,
      cell: (del: any) => <span className="text-slate-505 font-mono">{del.date && typeof del.date === 'string' && del.date.includes('T') ? new Date(del.date).toLocaleString('pt-BR') : (del.date || '-')}</span>
    },
    {
      id: 'venda',
      header: 'Nº Venda',
      defaultWidth: 80,
      cell: (del: any) => <span className="font-bold text-slate-900 font-mono">{del.saleNumber}</span>
    },
    {
      id: 'controle_viagem',
      header: 'Controle Viagem',
      defaultWidth: 100,
      cell: (del: any) => <span className="font-bold text-slate-400 text-[10px] font-mono">{del.tripControlNumber}</span>
    },
    {
      id: 'motorista',
      header: 'Quem Entregou (Motorista)',
      defaultWidth: 150,
      cell: (del: any) => (
        <div className="font-sans text-slate-800 uppercase font-bold flex items-center gap-1.5">
          <User size={12} className="text-slate-450" />
          {del.driverName}
        </div>
      )
    },
    {
      id: 'veiculo',
      header: 'Veículo',
      defaultWidth: 100,
      cell: (del: any) => <span className="text-slate-500 font-bold font-mono uppercase">{del.plate}</span>
    },
    {
      id: 'item_produto',
      header: 'Item / Produto',
      defaultWidth: 140,
      cell: (del: any) => <span className="text-slate-800 font-sans font-bold text-xs uppercase">{del.item}</span>
    },
    {
      id: 'qtd',
      header: 'Qtd',
      defaultWidth: 80,
      cell: (del: any) => <span className="font-bold text-slate-900 font-mono">{del.qty} un</span>
    },
    {
      id: 'unitario',
      header: 'Unitário',
      defaultWidth: 90,
      cell: (del: any) => <span className="text-slate-400 font-mono">R$ {del.value.toFixed(2)}</span>
    },
    {
      id: 'total',
      header: 'Total',
      defaultWidth: 100,
      cell: (del: any) => <span className="font-black text-emerald-700 font-mono">R$ {(del.qty * del.value).toFixed(2)}</span>
    },
    {
      id: 'forma_pagto',
      header: 'Forma Pagto',
      defaultWidth: 140,
      cell: (del: any) => (
        <div className="flex flex-col gap-1 font-sans leading-normal">
          {(del.payments || []).map((p: any, pIdx: number) => (
            <div key={pIdx} className="flex items-center gap-1 whitespace-nowrap">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                p.method === 'pix' ? 'bg-blue-100 text-blue-800 font-black' :
                p.method === 'dinheiro' ? 'bg-amber-100 text-amber-805 font-black' :
                p.method === 'boleto' ? 'bg-purple-100 text-purple-800 font-black' :
                'bg-slate-100 text-slate-800'
              }`}>
                {p.method}
              </span>
              <span className="font-mono text-[9px] text-slate-600 font-semibold">R$ {p.amount.toFixed(2)}</span>
            </div>
          ))}
          {(!del.payments || del.payments.length === 0) && (
            <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-center">
              Logística / Grátis
            </span>
          )}
        </div>
      )
    },
    {
      id: 'assinatura',
      header: 'Assinatura do Cliente',
      defaultWidth: 100,
      cell: (del: any) => (
        <div className="flex items-center justify-center">
          {del.signature ? (
            <button
              onClick={() => setViewingSignature(del.signature || null)}
              className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
              title="Ver Assinatura do Cliente"
            >
              <PenTool size={13} />
            </button>
          ) : (
            <span className="text-[9px] text-slate-300 font-extrabold uppercase bg-slate-50 border border-slate-200 px-1 py-0.5 rounded select-none" title="Sem Assinatura">S/A</span>
          )}
        </div>
      )
    }
  ];

  const cidadesConsolidatedColumns = [
    {
      id: 'cidade',
      header: 'Cidade',
      defaultWidth: 160,
      cell: (item: any) => <span className="font-black text-slate-900 uppercase text-xs">{item.cidade}</span>
    },
    {
      id: 'viagens',
      header: 'Viagens',
      defaultWidth: 100,
      cell: (item: any) => <span className="font-mono font-bold text-indigo-750 text-xs bg-slate-100 px-2 py-0.5 rounded">{item.tripsCount}</span>
    },
    {
      id: 'aguas_vendidas',
      header: 'Águas Vendidas',
      defaultWidth: 130,
      cell: (item: any) => <span className="font-mono font-bold text-slate-800">{(item?.waterSoldQty ?? 0).toLocaleString('pt-BR')} un</span>
    },
    {
      id: 'faturamento',
      header: 'Faturamento',
      defaultWidth: 140,
      cell: (item: any) => <span className="font-mono font-black text-emerald-700">R$ {(item?.totalSalesVal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    },
    {
      id: 'acoes',
      header: 'Ações',
      defaultWidth: 120,
      cell: (item: any) => {
        const isSelected = selectedCity === item.cidade;
        return (
          <button
            type="button"
            onClick={() => setSelectedCity(isSelected ? null : item.cidade)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
              isSelected 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-705'
            }`}
          >
            <Eye size={11} />
            <span>{isSelected ? 'Ocultar' : 'Detalhes'}</span>
          </button>
        );
      }
    }
  ];

  const avariasTypeColumns = [
    {
      id: 'tipo',
      header: 'Tipo de Avaria / Vasilhame',
      defaultWidth: 200,
      cell: (t: any) => <span className="font-bold text-slate-800 uppercase">{t.type}</span>
    },
    {
      id: 'descarregamento',
      header: 'Descarregamento',
      defaultWidth: 130,
      cell: (t: any) => {
        return t.descQty > 0 ? (
          <span className="text-amber-700 font-bold font-mono">{t.descQty}</span>
        ) : (
          <span className="text-slate-300 font-mono">0</span>
        );
      }
    },
    {
      id: 'carregamento',
      header: 'Carregamento',
      defaultWidth: 130,
      cell: (t: any) => {
        return t.carregQty > 0 ? (
          <span className="text-blue-700 font-bold font-mono">{t.carregQty}</span>
        ) : (
          <span className="text-slate-300 font-mono">0</span>
        );
      }
    },
    {
      id: 'ocorrencias',
      header: 'Ocorrências',
      defaultWidth: 110,
      cell: (t: any) => <span className="font-mono text-slate-500">{t.occurrences}</span>
    },
    {
      id: 'quantidade_total',
      header: 'Quantidade Total',
      defaultWidth: 150,
      cell: (t: any) => <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{t.totalQty} un</span>
    }
  ];

  const avariasClientColumns = [
    {
      id: 'cliente',
      header: 'Cliente',
      defaultWidth: 200,
      cell: (c: any) => <span className="font-bold text-slate-800 uppercase">{c.client}</span>
    },
    {
      id: 'tipos',
      header: 'Tipos de Avaria / Quantidades',
      defaultWidth: 400,
      cell: (c: any) => (
        <div className="flex flex-wrap gap-1.5 leading-normal">
          {Object.entries(c.types).map(([type, qty]) => (
            <span key={type} className="inline-flex items-center bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold px-2 py-0.5 text-slate-700 uppercase">
              {type}: <strong className="ml-1 text-red-650 font-black">{qty as any}</strong>
            </span>
          ))}
        </div>
      )
    },
    {
      id: 'total_geral',
      header: 'Total Geral',
      defaultWidth: 120,
      cell: (c: any) => <span className="font-mono font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded">{c.totalQty} un</span>
    }
  ];

  const avariasDriverColumns = [
    {
      id: 'motorista',
      header: 'Motorista',
      defaultWidth: 200,
      cell: (d: any) => <span className="font-bold text-slate-800 uppercase">{d.driver}</span>
    },
    {
      id: 'tipos',
      header: 'Tipos de Avaria / Quantidades',
      defaultWidth: 400,
      cell: (d: any) => (
        <div className="flex flex-wrap gap-1.5 leading-normal">
          {Object.entries(d.types).map(([type, qty]) => (
            <span key={type} className="inline-flex items-center bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold px-2 py-0.5 text-slate-700 uppercase">
              {type}: <strong className="ml-1 text-red-650 font-black">{qty as any}</strong>
            </span>
          ))}
        </div>
      )
    },
    {
      id: 'total_geral',
      header: 'Total Geral',
      defaultWidth: 120,
      cell: (d: any) => <span className="font-mono font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded">{d.totalQty} un</span>
    }
  ];

  return (
    <div className="flex flex-col gap-5 w-full relative pb-8">
      
      {/* State-driven Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex justify-between items-center animate-in fade-in duration-205 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-500" />
            <span className="font-bold uppercase tracking-tight">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Submodulo Header e Titulo do Relatorio Ativo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 shrink-0 pb-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg shrink-0">
            <FileBarChart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Módulo Relatórios
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
              {SUBTAB_LABELS[activeSubTab] || 'Relatório'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download size={14} />
              <span className="uppercase tracking-wider hidden sm:inline">Exportar Planilha</span>
              <span className="uppercase tracking-wider sm:hidden">Exportar</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              <span className="uppercase tracking-wider hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros de Pesquisa Compartilhados */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs print:hidden space-y-3">
        <div className={`flex items-center justify-between ${showFilters ? 'pb-2 border-b border-slate-100' : ''}`}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer focus:outline-none"
          >
            <ListFilter size={15} className="text-slate-500" />
            <span>Filtros do Relatório</span>
            <span className="text-[10px] font-medium text-slate-400 font-sans tracking-normal lowercase hidden sm:inline">
              ({showFilters ? 'clique para recolher' : 'clique para expandir'})
            </span>
          </button>
          
          <div className="flex items-center gap-3">
            {(filterStartDate || filterEndDate || filterPlate || filterDriver || filterClient || filterType !== 'all' || filterOwner !== 'all' || filterNfStatus !== 'all' || filterNfQtyDiff !== 'all' || filterBoletoStatus !== 'all') && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
              title={showFilters ? "Recolher Filtros" : "Expandir Filtros"}
            >
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        
        {showFilters && (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${activeSubTab === 'vendas' ? 'xl:grid-cols-5' : 'xl:grid-cols-7'} gap-3`}>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar size={12} /> Data Inicial
            </label>
            <input 
              type="date" 
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-medium"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar size={12} /> Data Final
            </label>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-medium"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Truck size={12} /> Veículo (Placa)
            </label>
            <input 
              type="text" 
              placeholder="Ex: ABC1234"
              value={filterPlate}
              onChange={e => setFilterPlate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold placeholder:font-normal uppercase"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <User size={12} /> Motorista
            </label>
            <input 
              type="text" 
              placeholder="Ex: Carlos"
              value={filterDriver}
              onChange={e => setFilterDriver(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-medium"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <User size={12} /> Cliente
            </label>
            <input 
              type="text" 
              placeholder="Ex: Ambev"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-medium"
            />
          </div>

          {(activeSubTab === 'vendas' || activeSubTab === 'cidades') && (
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Package size={12} /> Tipo de Produto
              </label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
              >
                <option value="all">TODOS OS ITENS</option>
                <option value="agua">ÁGUA 20L</option>
                <option value="vasilhame">VASILHAME</option>
                <option value="bonificacao">BONIFICAÇÃO</option>
                <option value="comodato">COMODATO</option>
                <option value="troca">TROCA DE VASILHAMES</option>
              </select>
            </div>
          )}

          {activeSubTab === 'abastecimentos' ? (
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Fuel size={12} /> Tipo de Fluido
              </label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
              >
                <option value="all">TODOS OS ITENS</option>
                <option value="diesel">DIESEL S10/S500</option>
                <option value="arla">ARLA 32</option>
                <option value="lubrificacao">LUBRIFICAÇÃO</option>
                <option value="calibracao">CALIBRAGEM</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Search size={12} /> Cód. Produção
              </label>
              <input 
                type="text" 
                placeholder="Ex: PRD-2026..."
                value={filterProductionCode}
                onChange={e => setFilterProductionCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-mono font-bold uppercase placeholder:font-normal"
              />
            </div>
          )}

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Truck size={12} /> Propriedade
            </label>
            <select
              value={filterOwner}
              onChange={e => setFilterOwner(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
            >
              <option value="all">TODOS (PROPRIO/TERC.)</option>
              <option value="proprio">PRÓPRIO (FROTA)</option>
              <option value="terceiro">TERCEIRO / VISITANTE</option>
            </select>
          </div>

          {activeSubTab === 'vendas' && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  📄 Status da NF
                </label>
                <select
                  value={filterNfStatus}
                  onChange={e => setFilterNfStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
                >
                  <option value="all">TODAS AS NOTAS</option>
                  <option value="sem_nf">🔴 SEM NOTA (PENDENTES)</option>
                  <option value="com_nf">🟢 COM NOTA (EMITIDAS)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1" title="Linha descartável só é expedida após emissão prévia de NF">
                  ⚖️ Divergência Qtd (Água 20L vs NF)
                </label>
                <select
                  value={filterNfQtyDiff}
                  onChange={e => setFilterNfQtyDiff(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
                >
                  <option value="all">TODAS</option>
                  <option value="divergente">⚠️ APENAS DIVERGENTES</option>
                  <option value="sem_divergencia">✅ APENAS CORRETAS</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  🎫 Status do Boleto
                </label>
                <select
                  value={filterBoletoStatus}
                  onChange={e => setFilterBoletoStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
                >
                  <option value="all">TODOS OS BOLETOS</option>
                  <option value="pendente">❌ BOLETO PENDENTE (NÃO EMITIDO)</option>
                  <option value="emitido">✅ BOLETO EMITIDO</option>
                </select>
              </div>
            </>
          )}

          {(activeSubTab === 'vendas' || activeSubTab === 'presales') && (
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                📋 Status da Pré-Venda
              </label>
              <select
                value={filterPreSaleStatus}
                onChange={e => setFilterPreSaleStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
              >
                <option value="todas">TODAS AS PRÉ-VENDAS</option>
                <option value="pendentes">⏳ PENDENTES DE EXPEDIÇÃO</option>
                <option value="expedidas">🚚 EXPEDIDAS / CONCLUÍDAS</option>
                <option value="excluidas">🗑️ EXCLUÍDAS</option>
              </select>
            </div>
          )}
        </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded p-2.5">
              <p className="text-[10px] text-slate-600 flex gap-1.5 items-start font-medium leading-relaxed">
                <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Dica de PDF & Impressão:</strong> Se o navegador bloquear a impressão por restrições de iframe do AI Studio, abra o sistema em <strong>Nova Aba</strong> (no topo direito da tela) e imprima diretamente de lá para salvar como PDF ou imprimir perfeitamente!
                </span>
              </p>
            </div>
          </>
        )}
      </div>


      {activeSubTab === 'descartavel' && (
        <div className="space-y-5 font-sans animate-in fade-in duration-150">
          <LinhaDescartavel isReportView={true} />
        </div>
      )}

      {activeSubTab === 'viagens' && (
        <div className="space-y-5 font-sans animate-in fade-in duration-150">
          {/* Quick Metrics display info */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total de Viagens</span>
                <span className="text-xl font-black text-slate-800 font-mono tracking-tight">{filteredViagens.length}</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Filtradas no período</span>
              </div>
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shadow-2xs">
                <Truck size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-500 tracking-wider block mb-0.5">Em Andamento</span>
                <span className="text-xl font-black text-blue-800 font-mono tracking-tight">
                  {filteredViagens.filter(v => !getReturnMovement(v)).length}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Veículos em rota ou na planta</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-2xs">
                <Clock size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wider block mb-0.5">Concluídas</span>
                <span className="text-xl font-black text-emerald-800 font-mono tracking-tight">
                  {filteredViagens.filter(v => !!getReturnMovement(v)).length}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Viagens retornadas</span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shadow-2xs">
                <Check size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider block mb-0.5">Méd. Consumo Diesel</span>
                <span className="text-xl font-black text-indigo-800 font-mono tracking-tight">
                  {(() => {
                    const dieselSupplies = filteredViagens
                      .flatMap(v => {
                        const retMov = getReturnMovement(v);
                        if (!retMov) return [];
                        return supplies.filter(s => s.movementId === retMov.id && s.type === 'diesel');
                      })
                      .map(s => getConsumptionForSupply(s))
                      .filter((c): c is number => c !== null && c > 0);
                    const avg = dieselSupplies.length > 0 
                      ? dieselSupplies.reduce((sum, c) => sum + c, 0) / dieselSupplies.length 
                      : 0;
                    return avg > 0 ? `${avg.toFixed(2)}` : '-';
                  })()}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">KM/L média geral</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-2xs">
                <Fuel size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center col-span-2 md:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider block mb-0.5">Faturamento Acertos</span>
                <span className="text-xl font-black text-amber-800 font-mono tracking-tight">
                  {(() => {
                    const totalSalesVal = filteredViagens
                      .map(v => {
                        return driverSettlements.find(ds => 
                          ds.movementId === v.id || ds.movementId === `settled-${v.id}`
                        );
                      })
                      .filter((ds): ds is any => ds !== undefined)
                      .reduce((sum, ds) => sum + (ds.totalSales || 0), 0);
                    return `R$ ${Math.round(totalSalesVal).toLocaleString('pt-BR')}`;
                  })()}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Líquido das vendas</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shadow-2xs">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
              <h2 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Truck size={14} className="text-slate-400" /> Dossiê Consolidado de Viagem (Visão Integrada)
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredViagens.length} viagem(ns)</span>
            </div>

            <div className="p-4 space-y-4">
              {filteredViagens.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <Truck size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs uppercase font-extrabold tracking-wider">Nenhuma viagem encontrada</p>
                  <p className="text-[10px] text-slate-400 mt-1">Utilize os filtros superiores para refinar sua busca.</p>
                </div>
              ) : (
                filteredViagens.map(v => {
                  const prodCode = getProductionCode(v);
                  const isExpanded = expandedViagemId === v.id;
                  const retMov = getReturnMovement(v);
                  const vSettlement = driverSettlements.find(ds => 
                    ds.movementId === v.id || ds.movementId === `settled-${v.id}`
                  );
                  const vSupplies = retMov ? supplies.filter(s => s.movementId === retMov.id && s.type === 'diesel') : [];
                  
                  // Consumo médio km/l
                  const supplyConsumptions = vSupplies.map(s => getConsumptionForSupply(s)).filter((c): c is number => c !== null && c > 0);
                  const avgCons = supplyConsumptions.length > 0 ? (supplyConsumptions.reduce((sum, c) => sum + c, 0) / supplyConsumptions.length).toFixed(2) : null;
                  const descarregadoQty = retMov ? (retMov.productionControl?.descarregadoQty || 0) : 0;
                  const retornoVasilhameCheio = retMov ? (retMov.productionControl?.retornoVasilhameCheio || 0) : 0;
                  const avariasDescarregamento = retMov ? (retMov.productionControl?.avariasDescarregamento || []) : [];
                  
                  const effectiveExitTimestamp = v.exitTimestamp || (v.isInitialTrip ? (v.entryTimestamp || v.timestamp) : undefined);

                  // Duração formatada da viagem
                  const tripDurationFormatted = (() => {
                    if (v.isInitialTrip) return 'N/A (Viagem Inicial)';
                    if (!effectiveExitTimestamp) return 'Ainda na Planta';
                    const startMs = new Date(effectiveExitTimestamp).getTime();
                    const endMs = retMov ? new Date(retMov.entryTimestamp || retMov.timestamp).getTime() : Date.now();
                    const diffMs = endMs - startMs;
                    return formatVoyageDuration(diffMs);
                  })();

                  // Quilometragem Inicial e Final da Viagem
                  const matchedSupplies = retMov ? supplies.filter(s => s.movementId === retMov.id) : [];

                  let kmInicial: number | undefined = v.odometer;
                  if (kmInicial === undefined || kmInicial === null || kmInicial === 0) {
                    const depTime = new Date(effectiveExitTimestamp || v.timestamp).getTime();
                    const prevSupplies = supplies.filter(s => 
                      (s.plate || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (v.plate || '').toLowerCase().replace(/[^a-z0-9]/g, '') &&
                      new Date(s.timestamp).getTime() < depTime &&
                      s.odometer !== undefined && s.odometer !== null && s.odometer > 0
                    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    
                    if (prevSupplies.length > 0) {
                      kmInicial = prevSupplies[0].odometer;
                    }
                  }

                  let kmFinal: number | undefined = retMov?.odometer;
                  if (kmFinal === undefined || kmFinal === null || kmFinal === 0) {
                    const supplyWithOdo = matchedSupplies.find(s => s.odometer !== undefined && s.odometer !== null && s.odometer > 0);
                    if (supplyWithOdo) {
                      kmFinal = supplyWithOdo.odometer;
                    }
                  }

                  const kmPercorrida = (kmInicial !== undefined && kmFinal !== undefined && kmFinal >= kmInicial)
                    ? (kmFinal - kmInicial)
                    : undefined;

                  // Border color depending on trip and settlement state
                  let statusBorderClass = "border-l-4 border-l-blue-500";
                  let statusBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                  let statusText = "Ainda na Planta";

                  if (effectiveExitTimestamp) {
                    if (!retMov) {
                      statusBorderClass = "border-l-4 border-l-indigo-500";
                      statusBadgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                      statusText = "Em Rota";
                    } else if (vSettlement) {
                      if (vSettlement.isReconciled || (vSettlement.reconciledPixTransactionIds && vSettlement.reconciledPixTransactionIds.length > 0) || vSettlement.reconciledPixTransactionId || (vSettlement.payments?.pix || 0) === 0) {
                        statusBorderClass = "border-l-4 border-l-emerald-500";
                        statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        statusText = "Concluída & Conciliada";
                      } else {
                        statusBorderClass = "border-l-4 border-l-teal-500";
                        statusBadgeColor = "bg-teal-50 text-teal-700 border-teal-200";
                        statusText = "Concluída (Acerto Pendente)";
                      }
                    } else {
                      statusBorderClass = "border-l-4 border-l-amber-500";
                      statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                      statusText = "Concluída (Sem Acerto)";
                    }
                  }

                  return (
                    <div 
                      key={v.id} 
                      className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${statusBorderClass}`}
                    >
                      {/* Compact Header Summary Row */}
                      <div 
                        onClick={() => setExpandedViagemId(isExpanded ? null : v.id)}
                        className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-indigo-700 font-bold text-[10px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {prodCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusBadgeColor}`}>
                              {statusText}
                            </span>
                            <span className="font-bold text-slate-800 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {v.plate}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({v.ownerType === 'proprio' ? 'Próprio' : 'Terceiro'})
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User size={13} className="text-slate-400" />
                              {v.driver}
                            </span>
                            {vSettlement?.cidade && (
                              <span className="text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase flex items-center gap-1">
                                <MapPin size={11} className="text-indigo-600" />
                                {vSettlement.cidade}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mid Row stats summary */}
                        <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-slate-500">
                          <div className="bg-white p-2 rounded border border-slate-100 flex items-center gap-1.5 shadow-3xs">
                            <Clock size={12} className="text-slate-400" />
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Duração</span>
                              <span className="text-slate-800 font-bold font-mono">
                                {tripDurationFormatted}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white p-2 rounded border border-slate-100 flex items-center gap-1.5 shadow-3xs">
                            <Fuel size={12} className="text-slate-400" />
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Diesel</span>
                              <span className="text-slate-800 font-bold">
                                {vSupplies.length > 0 
                                  ? `${vSupplies.reduce((sum, s) => sum + (s.amount || 0), 0)}L`
                                  : '-'
                                }
                                {avgCons && ` (${avgCons} km/L)`}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white p-2 rounded border border-slate-100 flex items-center gap-1.5 shadow-3xs">
                            <Truck size={12} className="text-indigo-400" />
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Produção</span>
                              <span className="text-slate-800 font-bold">
                                Desc: {descarregadoQty} / Carr: {(v.productionControl?.totalCarregado || 0) + (v.productionControl?.retornoVasilhameCheio || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white p-2 rounded border border-slate-100 flex items-center gap-1.5 shadow-3xs">
                            <TrendingUp size={12} className="text-emerald-400" />
                            <div>
                              <span className="text-slate-400 block text-[8px] uppercase font-bold">Comissão Líq.</span>
                              <span className="text-slate-800 font-bold">
                                {vSettlement ? `R$ ${vSettlement.finalCommission.toFixed(2)}` : 'Pendente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedViagemId(isExpanded ? null : v.id);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer self-stretch lg:self-auto justify-center"
                        >
                          <Eye size={12} /> {isExpanded ? "Ocultar" : "Expandir Dossiê"}
                        </button>
                      </div>

                      {/* Expanded Details Bento Grid */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                          
                          {/* Pilar 1: Portaria e Checklists */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs">
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                              <Clock size={14} className="text-slate-400" /> 1. Portaria & Inspeção
                            </h3>
                            <div className="space-y-2 text-xs font-medium text-slate-700">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Início da Viagem (Saída):</span>
                                <span>{effectiveExitTimestamp ? new Date(effectiveExitTimestamp).toLocaleString('pt-BR') : 'Ainda na Planta'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Final da Viagem (Retorno):</span>
                                <span>{retMov ? new Date(retMov.entryTimestamp || retMov.timestamp).toLocaleString('pt-BR') : (effectiveExitTimestamp ? 'Em Rota' : 'Ainda na Planta')}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Duração Total:</span>
                                <span className="font-mono font-bold text-slate-800">{tripDurationFormatted} {!retMov && effectiveExitTimestamp ? '(Em Rota)' : ''}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Vistoriador:</span>
                                <span>{v.checklistEvaluator || 'Não informado'}</span>
                              </div>
                              <div className="pt-1.5 border-t border-slate-100">
                                <span className="text-[9px] text-slate-400 uppercase block mb-1">Checklist Vistoria:</span>
                                <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                                  <div className="flex items-center gap-1">
                                    <span className={v.checklist?.brakes ? 'text-emerald-600' : 'text-rose-600'}>●</span> Freios: {v.checklist?.brakes ? 'OK' : 'Falha'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={v.checklist?.tires ? 'text-emerald-600' : 'text-rose-600'}>●</span> Pneus: {v.checklist?.tires ? 'OK' : 'Falha'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={v.checklist?.lights ? 'text-emerald-600' : 'text-rose-600'}>●</span> Luzes: {v.checklist?.lights ? 'OK' : 'Falha'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={v.checklist?.leaks ? 'text-rose-600' : 'text-emerald-600'}>●</span> Vazamento: {v.checklist?.leaks ? 'COM' : 'SEM'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pilar 2: Abastecimentos & Quilometragem */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <Fuel size={14} className="text-blue-500" /> 2. Abastecimentos
                                </h3>
                                {kmPercorrida !== undefined && (
                                  <span className="text-[9px] font-bold text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                    {kmPercorrida.toLocaleString('pt-BR')} km rodados
                                  </span>
                                )}
                              </div>

                              {/* KM Inicial e KM Final da Viagem */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px]">
                                <div>
                                  <span className="text-[8px] text-slate-400 uppercase font-bold block">KM Inicial (Saída)</span>
                                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                                    {kmInicial !== undefined ? `${kmInicial.toLocaleString('pt-BR')} km` : 'Não informada'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 uppercase font-bold block">KM Final (Retorno)</span>
                                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                                    {kmFinal !== undefined ? `${kmFinal.toLocaleString('pt-BR')} km` : (retMov ? 'Não informada' : 'Em Rota')}
                                  </span>
                                </div>
                              </div>

                              {matchedSupplies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-lg border border-amber-100 text-center">
                                  <p className="text-[10px] font-bold text-amber-800">
                                    {v.ownerType === 'proprio' ? "Abastecimento Pendente" : "Nenhum abastecimento registrado"}
                                  </p>
                                  <p className="text-[9px] text-amber-600 mt-0.5 font-medium">
                                    Aguardando registro de abastecimento para esta viagem.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                                  {matchedSupplies.map(s => {
                                    const label = s.type === 'diesel' ? 'Diesel' : s.type === 'arla' ? 'Arla 32' : s.type === 'lubrificacao' ? 'Lubrificação' : 'Calibragem';
                                    const cons = getConsumptionForSupply(s);
                                    return (
                                      <div key={s.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-medium leading-tight">
                                        <div className="flex justify-between font-bold text-slate-800">
                                          <span>{label}</span>
                                          <span>{s.amount ? `${s.amount}L` : '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 mt-1 items-center">
                                          <span>Km Abastecimento: <strong className="text-slate-700 font-mono">{s.odometer ? `${s.odometer.toLocaleString('pt-BR')} km` : '-'}</strong></span>
                                          {cons && <span className="text-blue-600 font-bold font-mono bg-blue-50 px-1 py-0.5 rounded border border-blue-100">{cons.toFixed(2)} km/L</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pilar 3: Produção & Carga */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-3">
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                <Truck size={14} className="text-indigo-500" /> 3. Controle de Produção
                              </h3>
                              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                                <div className="bg-slate-50 p-2 rounded">
                                  <span className="block text-[8px] text-slate-400 uppercase">Descarregado</span>
                                  <span className="font-bold text-slate-800">{descarregadoQty} un</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded">
                                  <span className="block text-[8px] text-slate-400 uppercase">Carga Total</span>
                                  <span className="font-bold text-slate-800">{(v.productionControl?.totalCarregado || 0) + (v.productionControl?.retornoVasilhameCheio || 0)} un</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded col-span-2">
                                  <span className="block text-[8px] text-slate-400 uppercase">Retorno Cheios / Avarias</span>
                                  <span className="font-bold text-slate-800 font-mono text-[11px]">
                                    {(() => {
                                      const avReal = avariasDescarregamento.filter(item => !isPurchaseType(item.type) && !item.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + (item.qty || 0), 0) + 
                                        (v.productionControl?.avariasCarregamento || []).filter(item => !isPurchaseType(item.type) && !item.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + (item.qty || 0), 0);
                                      const avTroca = avariasDescarregamento.filter(item => item.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + (item.qty || 0), 0) + 
                                        (v.productionControl?.avariasCarregamento || []).filter(item => item.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + (item.qty || 0), 0);
                                      const adicoes = avariasDescarregamento.filter(item => isPurchaseType(item.type)).reduce((sum, item) => sum + (item.qty || 0), 0) + 
                                        (v.productionControl?.avariasCarregamento || []).filter(item => isPurchaseType(item.type)).reduce((sum, item) => sum + (item.qty || 0), 0);
                                      return (
                                        <>
                                          Cheios: {retornoVasilhameCheio} u | Avarias Reais: {avReal} u | Trocas: {avTroca} u{adicoes > 0 ? ` | Adições: ${adicoes} u` : ''}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const mergedMovementForTicket = retMov ? {
                                  ...v,
                                  productionControl: {
                                    ...v.productionControl,
                                    descarregadoQty: retMov.productionControl?.descarregadoQty ?? v.productionControl?.descarregadoQty ?? 0,
                                    retornoVasilhameCheio: retMov.productionControl?.retornoVasilhameCheio ?? v.productionControl?.retornoVasilhameCheio ?? 0,
                                    avariasDescarregamento: retMov.productionControl?.avariasDescarregamento ?? v.productionControl?.avariasDescarregamento ?? [],
                                    descarregadoFormula: retMov.productionControl?.descarregadoFormula ?? v.productionControl?.descarregadoFormula,
                                    avariasDescarregamentoPhoto: retMov.productionControl?.avariasDescarregamentoPhoto ?? v.productionControl?.avariasDescarregamentoPhoto,
                                    observacoes: retMov.productionControl?.observacoes ?? v.productionControl?.observacoes,
                                  }
                                } : v;
                                setViewingProductionMovement(mergedMovementForTicket);
                              }}
                              className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye size={12} /> Ver Ticket de Produção
                            </button>
                          </div>

                          {/* Pilar 4: Prestação de Contas (Acerto) */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-3">
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-500" /> 4. Prestação de Contas
                              </h3>
                              {vSettlement ? (
                                <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                                  <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span className="text-slate-400">Cidade da Viagem:</span>
                                    <span className="text-indigo-600 font-extrabold uppercase">{vSettlement.cidade || 'Não informada'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Total Vendas:</span>
                                    <span>R$ {vSettlement.totalSales.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-rose-600">
                                    <span className="text-slate-400">Despesas:</span>
                                    <span>R$ {vSettlement.totalExpenses.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1">
                                    <span>Comissão Líq:</span>
                                    <span>R$ {vSettlement.finalCommission.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] border-t border-slate-100 pt-1 font-bold">
                                    <span className="text-slate-400">Status Caixa:</span>
                                    <span className={(vSettlement.isReconciled || (vSettlement.reconciledPixTransactionIds && vSettlement.reconciledPixTransactionIds.length > 0) || vSettlement.reconciledPixTransactionId || (vSettlement.payments?.pix || 0) === 0) ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                                      {(vSettlement.isReconciled || (vSettlement.reconciledPixTransactionIds && vSettlement.reconciledPixTransactionIds.length > 0) || vSettlement.reconciledPixTransactionId || (vSettlement.payments?.pix || 0) === 0) ? "Reconciliado" : "Pendente"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-slate-400 italic">
                                    Nenhum acerto de contas digitado para esta viagem.
                                  </p>
                                </div>
                              )}
                            </div>

                            {vSettlement ? (
                              <button
                                type="button"
                                onClick={() => setViewingSettlement(vSettlement)}
                                className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <FileText size={12} /> Abrir Acerto de Contas
                              </button>
                            ) : !retMov ? (
                              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-600 font-bold text-center uppercase tracking-wider">
                                {effectiveExitTimestamp ? "Em Rota" : "Ainda na Planta"}
                              </div>
                            ) : (
                              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[9px] text-amber-800 font-bold text-center uppercase tracking-wider">
                                Acerto Pendente
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'producao' && (
        <div className="space-y-6 font-sans animate-in fade-in duration-150">
          {/* Sub-navegação interna entre Volume Envasado vs Paradas e Ociosidade */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => changeSubTab('producao')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Droplets size={14} /> Volume Envasado por Máquina
            </button>
            <button
              type="button"
              onClick={() => changeSubTab('paradas_maquina')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wrench size={14} className="text-amber-600" /> Paradas & Ociosidade de Máquinas
            </button>
          </div>
          
          {/* Painel Estratégico: Água Envasada no Dia / Período */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 rounded-2xl p-5 text-white shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-750 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl shadow-inner">
                  <Droplets size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                      Relatório de Água Envasada & Produção por Máquina e Expediente
                    </h3>
                    <span className="bg-blue-500/30 text-blue-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-blue-400/30 font-mono">
                      Oficial
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Visão consolidada de envase: total do dia, divisão por turno (Manhã/Tarde) e produtividade por máquina/linha.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download size={14} /> Exportar CSV Completo
                </button>
              </div>
            </div>

            {/* 5 KPI Cards Principais de Água Envasada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Total Geral Envasado */}
              <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-blue-300 tracking-wider">Total Envasado</span>
                  <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Droplets size={15} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {envasamentoAnalytics.totalGeral.toLocaleString('pt-BR')} <span className="text-xs font-bold text-blue-400 font-sans">u</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                    <span>{envasamentoAnalytics.totalVeiculos} cargas/veículos</span>
                    <span className="text-blue-300 font-bold">100% volume</span>
                  </div>
                </div>
              </div>

              {/* Expediente Manhã */}
              <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-amber-300 tracking-wider">☀️ Manhã (07h-12h)</span>
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Sun size={15} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {envasamentoAnalytics.totalManha.toLocaleString('pt-BR')} <span className="text-xs font-bold text-amber-400 font-sans">u</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                    <span>{envasamentoAnalytics.veiculosManha} cargas</span>
                    <span className="text-amber-300 font-bold">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.totalManha / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expediente Tarde */}
              <div className="bg-slate-800/80 border border-indigo-400/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-indigo-300 tracking-wider">⛅ Tarde (12h-18h+)</span>
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Sunset size={15} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {envasamentoAnalytics.totalTarde.toLocaleString('pt-BR')} <span className="text-xs font-bold text-indigo-300 font-sans">u</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                    <span>{envasamentoAnalytics.veiculosTarde} cargas</span>
                    <span className="text-indigo-300 font-bold">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.totalTarde / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linha Pesada (Máquina 1) */}
              <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-cyan-300 tracking-wider">🏭 Máquina 1 (Pesada)</span>
                  <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                    <Truck size={15} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {envasamentoAnalytics.m1Total.toLocaleString('pt-BR')} <span className="text-xs font-bold text-cyan-300 font-sans">u</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                    <span>{envasamentoAnalytics.m1VeiculosTotal} Carreta/Truck</span>
                    <span className="text-cyan-300 font-bold">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.m1Total / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linha Média (Máquina 2) */}
              <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-emerald-300 tracking-wider">🚚 Máquina 2 (Média)</span>
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Gauge size={15} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {envasamentoAnalytics.m2Total.toLocaleString('pt-BR')} <span className="text-xs font-bold text-emerald-300 font-sans">u</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                    <span>{envasamentoAnalytics.m2VeiculosTotal} Toco/3/4/Van</span>
                    <span className="text-emerald-300 font-bold">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.m2Total / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matriz Cruzada: Água Envasada por Máquina e Expediente (Visual Grid) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Matriz de Envasamento: Quantidade por Linha/Máquina e Expediente
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Período Filtrado ({filteredProductionMovements.length} atendimentos)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Linha / Equipamento</th>
                    <th className="py-2.5 px-4 text-center">Tipo de Veículos</th>
                    <th className="py-2.5 px-4 text-right bg-amber-50/60 text-amber-900 border-x border-amber-100">
                      ☀️ Manhã (07h-12h)
                    </th>
                    <th className="py-2.5 px-4 text-right bg-indigo-50/60 text-indigo-900 border-r border-indigo-100">
                      ⛅ Tarde (12h-18h+)
                    </th>
                    <th className="py-2.5 px-4 text-right font-black text-slate-900">Total Envasado</th>
                    <th className="py-2.5 px-4 text-right">Participação (%)</th>
                    <th className="py-2.5 px-4 text-center">Cargas Realizadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Máquina 1 - Linha Pesada */}
                  <tr className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs">Máquina 1 (Linha Pesada)</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Envasamento Contínuo</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-100/70 text-blue-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                        Carreta / Bitrem / Truck
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-900 bg-amber-50/30 border-x border-amber-100">
                      <div>{envasamentoAnalytics.m1Manha.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.m1VeiculosManha} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30 border-r border-indigo-100">
                      <div>{envasamentoAnalytics.m1Tarde.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.m1VeiculosTarde} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                      {envasamentoAnalytics.m1Total.toLocaleString('pt-BR')} u
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.m1Total / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {envasamentoAnalytics.m1VeiculosTotal}
                    </td>
                  </tr>

                  {/* Máquina 2 - Linha Média */}
                  <tr className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs">Máquina 2 (Linha Média)</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Envasamento Médio / Rápido</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-100/70 text-emerald-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                        Toco / 3/4 / Van / Outros
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-900 bg-amber-50/30 border-x border-amber-100">
                      <div>{envasamentoAnalytics.m2Manha.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.m2VeiculosManha} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30 border-r border-indigo-100">
                      <div>{envasamentoAnalytics.m2Tarde.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.m2VeiculosTarde} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-900 text-sm">
                      {envasamentoAnalytics.m2Total.toLocaleString('pt-BR')} u
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.m2Total / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {envasamentoAnalytics.m2VeiculosTotal}
                    </td>
                  </tr>

                  {/* Linha Filial (se houver dados) */}
                  {envasamentoAnalytics.filialTotal > 0 && (
                    <tr className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                          <div>
                            <span className="font-extrabold text-slate-900 block text-xs">Máquina Filial</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Unidade Filial</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-purple-100/70 text-purple-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                          Todos os Portes
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-900 bg-amber-50/30 border-x border-amber-100">
                        <div>{envasamentoAnalytics.filialManha.toLocaleString('pt-BR')} u</div>
                        <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.filialVeiculosManha} cargas</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30 border-r border-indigo-100">
                        <div>{envasamentoAnalytics.filialTarde.toLocaleString('pt-BR')} u</div>
                        <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.filialVeiculosTarde} cargas</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-purple-900 text-sm">
                        {envasamentoAnalytics.filialTotal.toLocaleString('pt-BR')} u
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">
                        {envasamentoAnalytics.totalGeral > 0 ? `${((envasamentoAnalytics.filialTotal / envasamentoAnalytics.totalGeral) * 100).toFixed(1)}%` : '0%'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {envasamentoAnalytics.filialVeiculosTotal}
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Linha de Totalização Consolidada */}
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                  <tr>
                    <td className="py-3 px-4 uppercase text-[11px] font-black" colSpan={2}>
                      💧 TOTAL GERAL DO PERÍODO
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-300 text-xs bg-slate-850 border-x border-slate-700">
                      <div>{envasamentoAnalytics.totalManha.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.veiculosManha} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-indigo-300 text-xs bg-slate-850 border-r border-slate-700">
                      <div>{envasamentoAnalytics.totalTarde.toLocaleString('pt-BR')} u</div>
                      <div className="text-[8px] text-slate-400 font-sans font-medium">{envasamentoAnalytics.veiculosTarde} cargas</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-300 text-sm">
                      {envasamentoAnalytics.totalGeral.toLocaleString('pt-BR')} u
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-300">
                      100.0%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-white text-xs">
                      {envasamentoAnalytics.totalVeiculos} cargas
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Histórico Diário Detalhado: Água Envasada por Máquina e Expediente */}
          {envasamentoAnalytics.dailyList.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Histórico Diário: Quantidade Envasada por Máquina & Expediente (Dia a Dia)
                  </h3>
                </div>
                <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {envasamentoAnalytics.dailyList.length} dias registrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase text-[9px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3 text-right text-blue-900 bg-blue-50/50">Máq. 1 (Manhã)</th>
                      <th className="py-2.5 px-3 text-right text-blue-900 bg-blue-50/50">Máq. 1 (Tarde)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-blue-950 bg-blue-100/60 border-r border-blue-200">Total Máq. 1</th>
                      <th className="py-2.5 px-3 text-right text-emerald-900 bg-emerald-50/50">Máq. 2 (Manhã)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-900 bg-emerald-50/50">Máq. 2 (Tarde)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-emerald-950 bg-emerald-100/60 border-r border-emerald-200">Total Máq. 2</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-900 bg-amber-50/60">Total Manhã</th>
                      <th className="py-2.5 px-3 text-right font-bold text-indigo-900 bg-indigo-50/60">Total Tarde</th>
                      <th className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-200/50">Total do Dia</th>
                      <th className="py-2.5 px-3 text-center">Cargas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {envasamentoAnalytics.dailyList.map(d => {
                      const dParts = d.date.split('-');
                      const formattedDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : d.date;
                      return (
                        <tr key={d.date} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-blue-50/20">
                            {d.m1Manha > 0 ? `${d.m1Manha} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-blue-50/20">
                            {d.m1Tarde > 0 ? `${d.m1Tarde} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/60 border-r border-blue-100">
                            {d.m1Total > 0 ? `${d.m1Total} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-emerald-50/20">
                            {d.m2Manha > 0 ? `${d.m2Manha} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 bg-emerald-50/20">
                            {d.m2Tarde > 0 ? `${d.m2Tarde} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/60 border-r border-emerald-100">
                            {d.m2Total > 0 ? `${d.m2Total} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/40">
                            {d.manhaTotal > 0 ? `${d.manhaTotal} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/40">
                            {d.tardeTotal > 0 ? `${d.tardeTotal} u` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-100/70 text-xs">
                            {d.totalDia.toLocaleString('pt-BR')} u
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            {d.veiculosTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Secondary Metrics display info */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Descarregado</span>
                <span className="text-xl font-black text-emerald-800 font-mono tracking-tight">{(totalDischarged ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Vasilhames recebidos</span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shadow-2xs">
                <Check size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider block mb-0.5">Vendidos / Entregues</span>
                <span className="text-xl font-black text-indigo-800 font-mono tracking-tight">{(totalVendido ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Baixas justificadas</span>
              </div>
              <div className="p-2 bg-indigo-50/50 text-indigo-600 rounded-lg shadow-2xs">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-500 tracking-wider block mb-0.5">Adicionados / Sobra</span>
                <span className="text-xl font-black text-blue-800 font-mono tracking-tight">{(totalAdicionado ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium font-bold uppercase">Sobras registadas</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-2xs">
                <Sparkles size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider block mb-0.5">Faltas não justificadas</span>
                <span className="text-xl font-black text-rose-700 font-mono tracking-tight">{(totalFaltas ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-rose-400 block mt-0.5 font-medium">Divergência de frota</span>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shadow-2xs">
                <AlertCircle size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total Carregado</span>
                <span className="text-xl font-black text-[#0c2a5c] font-mono tracking-tight">{(totalLoaded ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Cargas envasadas</span>
              </div>
              <div className="p-2 bg-slate-50 text-[#0c2a5c] rounded-lg shadow-2xs">
                <Truck size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total Avarias</span>
                <span className="text-xl font-black text-rose-800 font-mono tracking-tight">{(totalProductionAvarias ?? 0).toLocaleString('pt-BR')} u</span>
                <span className="text-[8px] text-rose-500 block mt-0.5 font-medium font-bold uppercase">Danos em carga</span>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shadow-2xs">
                <AlertTriangle size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center sm:col-span-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Tempo Ativo</span>
                <span className="text-xl font-black text-amber-800 font-mono tracking-tight whitespace-nowrap">{formatDurationStatus(avgActiveTime)}</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Média do ciclo</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shadow-2xs">
                <Bot size={16} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 shrink-0">
            {/* Daily Total Loads Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-blue-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Quantidade Carregada por Dia</h3>
                </div>
                <span className="bg-blue-100/70 text-blue-800 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono font-bold">
                  {dailyProductionData.length} dias
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans border-0">
                  <thead className="bg-slate-100/50">
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-4 font-bold border-b border-slate-200">Data</th>
                      <th className="py-2 px-4 font-bold border-b border-slate-200 text-right">Carregado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyProductionData.map((d: any) => (
                      <tr key={d.date} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">{d.date}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">{d.loaded} u</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Quantidade Descarregada por Dia</h3>
                </div>
                <span className="bg-emerald-100/70 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono font-bold">
                  {dailyProductionData.length} dias
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans border-0">
                  <thead className="bg-slate-100/50">
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="py-2 px-4 font-bold border-b border-slate-200">Data</th>
                      <th className="py-2 px-4 font-bold border-b border-slate-200 text-right">Descarregado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyProductionData.map((d: any) => (
                      <tr key={d.date} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">{d.date}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{d.discharged} u</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-slate-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Histórico Detalhado & Tempos Precisos</h3>
              </div>
              <span className="bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                {filteredProductionMovements.length} Atendimentos
              </span>
            </div>
            <DynamicTable id="relatorio-producao" data={filteredProductionMovements} columns={productionColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
          </div>
        </div>
      )}

      {activeSubTab === 'paradas_maquina' && (
        <div className="space-y-6 font-sans animate-in fade-in duration-150">
          {/* Sub-navegação interna entre Volume Envasado vs Paradas e Ociosidade */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => changeSubTab('producao')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Droplets size={14} className="text-blue-600" /> Volume Envasado por Máquina
            </button>
            <button
              type="button"
              onClick={() => changeSubTab('paradas_maquina')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={14} /> Paradas & Ociosidade de Máquinas
            </button>
          </div>

          <MachineStopsReportView />
        </div>
      )}

      {activeSubTab === 'logs' && (
        // Existing View (Logs + IA)
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center bg-white px-4 py-3 rounded-lg shadow-sm border border-slate-200 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Log & Inteligência Operacional</h2>
            </div>
            <button 
              onClick={handleAnalyze} 
              disabled={loading || movements.length === 0}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors tracking-widest uppercase"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              <span>Diagnóstico de IA</span>
            </button>
          </div>

          {analysis && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-lg shrink-0">
              <div className="flex items-center space-x-3 mb-3 text-blue-400 border-b border-slate-700 pb-3">
                <Bot size={18} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Diagnóstico Gemini</h3>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="bg-white border text-xs border-slate-200 rounded-lg shadow-sm flex flex-col">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base de Dados Histórica</h2>
            </div>
            <div className="overflow-x-auto bg-white">
              <DynamicTable id="relatorio-logs" data={filteredMovements} columns={logsColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'inspecoes' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics display info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center animate-in date-in">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total de Vistorias</span>
                <span className="text-lg font-black text-slate-800 font-mono tracking-tight">{filteredInspections.length} realizadas</span>
              </div>
              <div className="p-2 bg-slate-100 text-slate-600 rounded">
                <FileText size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center animate-in date-in">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wider block">Veículos Aprovados</span>
                <span className="text-lg font-black text-emerald-600 font-mono tracking-tight">
                  {filteredInspections.filter(i => i.checklist?.passed).length} viagens autorizadas
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <Check size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center animate-in date-in">
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider block">Veículos Reprovados</span>
                <span className="text-lg font-black text-rose-600 font-mono tracking-tight">
                  {filteredInspections.length - filteredInspections.filter(i => i.checklist?.passed).length} impedidos / manutenção
                </span>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded">
                <AlertTriangle size={16} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 flex-wrap">
                <FileText size={14} className="text-slate-500" /> Histórico de Laudos & Vistorias de Segurança
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-250 px-2.5 py-1 rounded-full">
                {filteredInspections.length} Registradas
              </span>
            </div>

            <div className="overflow-x-auto">
              <DynamicTable id="relatorio-inspecoes" data={filteredInspections} columns={inspecoesColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'abastecimentos' && (
        // Fueling Report View
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics display info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Diesel Consumido</span>
                <span className="text-lg font-black text-slate-800 font-mono tracking-tight">{(totalDieselVolume ?? 0).toLocaleString('pt-BR')} L</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded">
                <Fuel size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">ARLA Consumido</span>
                <span className="text-lg font-black text-indigo-705 font-mono tracking-tight">{(totalArlaVolume ?? 0).toLocaleString('pt-BR')} L</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                <Bot size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Média de Consumo da Frota</span>
                <span className="text-lg font-black text-emerald-800 font-mono tracking-tight">
                  {averageConsumption > 0 
                    ? `${averageConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L` 
                    : '-'
                  }
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* Main Printable Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col" id="printable-fuel-report">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={14} className="text-slate-400" /> Relatório Detalhado de Serviços e Abastecimentos
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filteredSupplies.length} registro(s)</span>
            </div>

            <div className="overflow-x-auto bg-white">
              <DynamicTable id="relatorio-abastecimentos" data={filteredSupplies} columns={abastecimentosColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
            </div>

            {/* Quick print helper legend info */}
            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
              <Info size={14} className="text-slate-400 mt-0.5" />
              <span>O consumo médio é calculated pela diferença de KM rodados entre abastecimentos de Diesel, dividido pelo volume inserido no abastecimento atual.</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'vendas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics display info */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Faturamento Total</span>
                <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                  R$ {(filteredSalesForReport.reduce((sum, s) => sum + ((s.qty || 0) * (s.value || 0)), 0) ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Águas Vendidas</span>
                <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                  {(filteredSalesForReport.filter(s => {
                    const itemLower = (s.item || '').toLowerCase();
                    return ((itemLower.includes('água') || itemLower.includes('agua')) && !itemLower.includes('copo') && !itemLower.includes('200ml') && !itemLower.includes('510ml') && !itemLower.includes('1,5'));
                  }).reduce((sum, s) => sum + (s.qty || 0), 0) ?? 0).toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="p-2 bg-slate-50 text-slate-600 rounded">
                <FileText size={16} />
              </div>
            </div>

            {(() => {
              const totalsByMethod = filteredSalesForReport.reduce((acc, s) => {
                const itemLower = (s.item || '').toLowerCase();
                const isZeroVal = s.productType === 'bonificacao' || s.productType === 'comodato' || s.productType === 'retorno' || s.productType === 'troca' || itemLower.includes('bonifica') || itemLower.includes('comodato') || itemLower.includes('retorno') || itemLower.includes('troca');
                if (!isZeroVal) {
                  const bd = getPaymentsBreakdown(s);
                  Object.entries(bd).forEach(([method, amt]) => {
                    const m = method.toLowerCase().trim();
                    acc[m] = (acc[m] || 0) + amt;
                  });
                }
                return acc;
              }, { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 } as Record<string, number>);

              const boletosAndOthers = (totalsByMethod?.boleto || 0) + (totalsByMethod?.cheque || 0) + (totalsByMethod?.outros || 0);

              return (
                <>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">PIX Recebido</span>
                      <span className="text-base font-black text-blue-700 font-mono tracking-tight">
                        R$ {(totalsByMethod?.pix ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                      <Sparkles size={16} />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Dinheiro</span>
                      <span className="text-base font-black text-amber-700 font-mono tracking-tight">
                        R$ {(totalsByMethod?.dinheiro ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded">
                      <TrendingUp size={16} />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center col-span-2 md:col-span-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Boletos/Outros</span>
                      <span className="text-base font-black text-purple-700 font-mono tracking-tight">
                        R$ {(boletosAndOthers ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded">
                      <Info size={16} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Main Printable Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col animate-in fade-in-50" id="printable-sales-report">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-2">
              <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} className="text-slate-400" />
                {salesViewMode === 'detailed' 
                  ? 'Relatório Detalhado de Vendas Geradas' 
                  : salesViewMode === 'pre_sales' 
                    ? 'Gerenciamento de Pré-Vendas Pendentes' 
                    : 'Relatório Consolidado de Vendas por Produto'}
              </h2>
              <div className="flex items-center gap-2 print:hidden">
                <div className="bg-slate-200/60 p-0.5 rounded-lg flex border border-slate-300/40">
                  <button
                    onClick={() => setSalesViewMode('detailed')}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                      salesViewMode === 'detailed'
                        ? 'bg-white shadow-xs text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Detalhado
                  </button>
                  <button
                    onClick={() => setSalesViewMode('pre_sales')}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                      salesViewMode === 'pre_sales'
                        ? 'bg-white shadow-xs text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pré-Vendas Pendentes
                  </button>
                  <button
                    onClick={() => setSalesViewMode('consolidated')}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                      salesViewMode === 'consolidated'
                        ? 'bg-white shadow-xs text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Por Produto
                  </button>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {salesViewMode === 'detailed' 
                    ? `${filteredSalesForReport.length} venda(s) encontrada(s)` 
                    : salesViewMode === 'pre_sales'
                      ? `${filteredPreSales.length} pré-venda(s) pendente(s)`
                      : `${productSummary.length} produto(s) encontrado(s)`
                  }
                </span>
              </div>
              <div className="hidden print:block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {salesViewMode === 'detailed' 
                  ? `${filteredSalesForReport.length} venda(s) totalizada(s)` 
                  : salesViewMode === 'pre_sales'
                    ? `${filteredPreSales.length} pré-venda(s) listada(s)`
                    : `${productSummary.length} produto(s) consolidado(s)`
                }
              </div>
            </div>

            <div className="overflow-x-auto bg-white">
              {salesViewMode === 'consolidated' ? (
                <DynamicTable id="relatorio-vendas-consolidated" data={productSummary} columns={vendasConsolidatedColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
              ) : salesViewMode === 'pre_sales' ? (
                <DynamicTable id="relatorio-vendas-presales" data={filteredPreSales} columns={vendasPreSalesColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
              ) : (
                <DynamicTable id="relatorio-vendas-detailed" data={filteredSalesForReportGrouped} columns={vendasDetailedColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
              )}
            </div>

            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
              <Info size={14} className="text-slate-400 mt-0.5" />
              <span>Este relatório consolida as vendas realizadas pelos motoristas no aplicativo em tempo real, integradas com as prestações de contas homologadas pela gerência.</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'compras_cliente' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Local filter and search bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center shrink-0 print:hidden">
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Filtrar por nome do cliente..."
                value={searchClientQuery}
                onChange={e => setSearchClientQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs pl-8 pr-3 py-1.5 outline-none focus:border-slate-400 focus:bg-white text-slate-700 font-bold"
              />
              {searchClientQuery && (
                <button
                  onClick={() => setSearchClientQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline-block">
                *Use os filtros de data no topo da página para alterar o período
              </span>

              <div className="bg-slate-200/60 p-0.5 rounded-lg flex border border-slate-300/40 shrink-0">
                <button
                  onClick={() => setComprasViewMode('detailed')}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                    comprasViewMode === 'detailed'
                      ? 'bg-white shadow-xs text-slate-800'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Lista Detalhada
                </button>
                <button
                  onClick={() => setComprasViewMode('consolidated')}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                    comprasViewMode === 'consolidated'
                      ? 'bg-white shadow-xs text-slate-800'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Agrupar por Cliente
                </button>
              </div>
            </div>
          </div>

          {/* Table / Card Container */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col animate-in fade-in-50" id="printable-client-purchases-report">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} className="text-slate-400" />
                {comprasViewMode === 'detailed' ? 'Relatório Detalhado de Compras por Cliente' : 'Resumo Consolidado de Compras por Cliente'}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {comprasViewMode === 'detailed'
                  ? `${purchasesByClientFilteredGrouped.length} compra(s) encontrada(s)`
                  : `${consolidatedPurchasesByClient.length} cliente(s) ativo(s)`
                }
              </span>
            </div>

            <div className="overflow-x-auto bg-white">
              {comprasViewMode === 'detailed' ? (
                <DynamicTable id="relatorio-compras-detailed" data={purchasesByClientFilteredGrouped} columns={comprasClienteDetailedColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {consolidatedPurchasesByClient.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 uppercase font-bold tracking-wider text-xs">
                      Nenhum cliente com compras registradas no período
                    </div>
                  ) : (
                    consolidatedPurchasesByClient.map((clientData, idx) => {
                      const isExpanded = !!expandedClients[clientData.clientName];
                      return (
                        <div key={idx} className="bg-white">
                          {/* Client Accordion Header */}
                          <div
                            onClick={() => setExpandedClients(prev => ({ ...prev, [clientData.clientName]: !isExpanded }))}
                            className="px-4 py-3.5 hover:bg-slate-50/50 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all"
                          >
                            <div>
                              <h3 className="font-sans font-black text-slate-900 uppercase tracking-tight text-sm">
                                {clientData.clientName}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                Última entrega em: {clientData.lastPurchaseDate && typeof clientData.lastPurchaseDate === 'string' && clientData.lastPurchaseDate.includes('T') ? new Date(clientData.lastPurchaseDate).toLocaleString('pt-BR') : (clientData.lastPurchaseDate || '-')}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end">
                              <div className="flex items-center gap-3">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold uppercase">
                                  {clientData.purchasesCount || 0} pedido(s)
                                </span>
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-[10px] font-bold uppercase">
                                  {clientData.totalQty || 0} unidades
                                </span>
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded text-xs font-black font-mono">
                                  R$ {(clientData?.totalValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <span className="text-slate-400">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </span>
                            </div>
                          </div>

                          {/* Nested Deliveries Table */}
                          {isExpanded && (
                            <div className="bg-slate-50/50 border-t border-b border-slate-100 px-4 py-3 animate-in slide-in-from-top-1 duration-100">
                              <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-xs">
                                <DynamicTable id={`relatorio-compras-client-deliveries-${idx}`} data={clientData.deliveries} columns={comprasClienteDeliveryColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
              <Info size={14} className="text-slate-400 mt-0.5" />
              <span>Esse painel consolida as vendas realizadas por cliente e vincula ao motorista que realizou a entrega, bem como o comprovante de assinatura digital colhido no ato da entrega.</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'cidades' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Cidades Atendidas</span>
                <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                  {cityReportData.filter(c => c.cidade.toLowerCase() !== 'não informada').length}
                </span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                <MapPin size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total de Viagens</span>
                <span className="text-base font-black text-indigo-700 font-mono tracking-tight">
                  {cityReportData.reduce((sum, c) => sum + c.tripsCount, 0)}
                </span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                <Truck size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total de Águas Vendidas</span>
                <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                  {(cityReportData.reduce((sum, c) => sum + (c.waterSoldQty || 0), 0) ?? 0).toLocaleString('pt-BR')} <span className="text-[10px] font-normal text-slate-400">un</span>
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Faturado</span>
                <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                  R$ {(cityReportData.reduce((sum, c) => sum + (c.totalSalesVal || 0), 0) ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <DollarSign size={16} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Cities Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-indigo-600" />
                  Consolidado por Cidade
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {cityReportData.length} cidade(s)
                </span>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg">
                <DynamicTable id="relatorio-cidades-consolidated" data={cityReportData} columns={cidadesConsolidatedColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
              </div>
            </div>

            {/* Selected City Details */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-indigo-600" />
                  {selectedCity ? `Viagens para ${selectedCity}` : 'Selecione uma cidade'}
                </h3>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {selectedCity ? (() => {
                  const cityGroup = cityReportData.find(c => c.cidade === selectedCity);
                  if (!cityGroup) return null;

                  return (
                    <div className="space-y-4">
                      {cityGroup.settlements.map((ds) => {
                        const tripWaterQty = (ds.sales || []).filter((s: any) => {
                          const itemLower = (s.item || '').toLowerCase();
                          return s.productType === 'agua' || 
                            s.productType === 'troca' || 
                            itemLower.includes('água') || 
                            (itemLower.includes('agua') && !itemLower.includes('copo') && !itemLower.includes('200ml') && !itemLower.includes('510ml') && !itemLower.includes('1,5'));
                        }).reduce((sum: number, s: any) => sum + (s.qty || 0), 0);

                        const displayDate = ds.dateSettlement || ds.dateArrival || '';

                        return (
                          <div 
                            key={ds.id} 
                            className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 hover:border-slate-300 transition-colors space-y-2 text-xs"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Motorista</span>
                                <span className="font-bold text-slate-800 uppercase flex items-center gap-1">
                                  <User size={12} className="text-slate-400" />
                                  {ds.driverName}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Data do Acerto</span>
                                <span className="font-mono text-slate-600 font-semibold">
                                  {displayDate && typeof displayDate === 'string' && displayDate.includes('T') ? new Date(displayDate).toLocaleDateString('pt-BR') : displayDate}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[8px] text-slate-400 font-bold block uppercase">Placa</span>
                                <span className="font-mono font-bold text-slate-700">{ds.plate}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 font-bold block uppercase">Águas</span>
                                <span className="font-mono font-bold text-slate-900 block">
                                  {(tripWaterQty ?? 0).toLocaleString('pt-BR')} un
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] text-slate-400 font-bold block uppercase">Faturamento</span>
                                <span className="font-mono font-bold text-emerald-700 font-extrabold block">
                                  R$ {(ds.totalSales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                    <MapPin size={24} className="text-slate-300" />
                    <span className="text-[10px] uppercase font-black tracking-wider">Nenhuma Cidade Selecionada</span>
                    <p className="text-slate-400 text-xs">
                      Clique no botão "Detalhes" de alguma cidade na tabela ao lado para visualizar a lista detalhada de viagens de frota própria.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legend helper */}
          <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
            <Info size={14} className="text-slate-400 mt-0.5" />
            <span>Este relatório consolida as viagens de frota própria e suas respectivas vendas por cidade de destino informada no momento do acerto.</span>
          </div>
        </div>
      )}

      {activeSubTab === 'avarias' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total de Avarias</span>
                <span className="text-lg font-black text-red-600 font-mono tracking-tight">
                  {(avariasData?.totalDamagesCount ?? 0).toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="p-2.5 bg-red-50 text-red-600 rounded">
                <AlertTriangle size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Tipos Detectados</span>
                <span className="text-lg font-black text-amber-600 font-mono tracking-tight">
                  {avariasData.uniqueTypesCount} tipos
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded">
                <Layers size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Viagens com Avaria</span>
                <span className="text-lg font-black text-indigo-700 font-mono tracking-tight">
                  {avariasData.affectedMovementsCount} viagens
                </span>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded">
                <Truck size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Média por Ocorrência</span>
                <span className="text-lg font-black text-slate-700 font-mono tracking-tight">
                  {avariasData.affectedMovementsCount > 0 
                    ? (avariasData.totalDamagesCount / avariasData.affectedMovementsCount).toFixed(1) 
                    : '0.0'} un
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 text-slate-500 rounded">
                <Info size={18} />
              </div>
            </div>
          </div>

          {/* Local Filters / View Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            {/* Subtab selection */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setAvariasViewTab('geral')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  avariasViewTab === 'geral' 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Tipo (Ranking)
              </button>
              <button
                type="button"
                onClick={() => setAvariasViewTab('periodo')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  avariasViewTab === 'periodo' 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Período
              </button>
              <button
                type="button"
                onClick={() => setAvariasViewTab('cliente')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  avariasViewTab === 'cliente' 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Cliente
              </button>
              <button
                type="button"
                onClick={() => setAvariasViewTab('motorista')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  avariasViewTab === 'motorista' 
                    ? 'bg-white text-slate-900 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Motorista
              </button>
            </div>

            {/* excludePurchasesAvarias Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludePurchasesAvarias}
                  onChange={e => setExcludePurchasesAvarias(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                Ocultar Compras / Adições de Vasilhame (Apenas Avarias)
              </label>
            </div>
          </div>

          {/* Main reports grid/content */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto">
            {avariasViewTab === 'geral' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                    Ranking de Quantidade de Avaria por Tipo de Avaria
                  </h4>
                  <span className="text-[10px] bg-red-50 text-red-600 font-bold uppercase px-2.5 py-1 rounded">
                    Total: {avariasData.totalDamagesCount} unidades
                  </span>
                </div>

                {avariasData.byType.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhuma avaria ou perda registrada para o período/filtros atuais.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Table View */}
                    <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                      <DynamicTable id="relatorio-avarias-by-type" data={avariasData.byType} columns={avariasTypeColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
                    </div>

                    {/* Progress visual comparison */}
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        Distribuição Visual da Perda / Avaria
                      </h5>
                      <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-lg">
                        {avariasData.byType.map((t) => {
                          const percentage = avariasData.totalDamagesCount > 0 
                            ? (t.totalQty / avariasData.totalDamagesCount) * 100 
                            : 0;
                          return (
                            <div key={t.type} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                                <span>{t.type}</span>
                                <span className="font-mono text-red-600">
                                  {t.totalQty} un ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-red-500 h-full rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {avariasViewTab === 'periodo' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                    Tipos de Avaria por Período / Histórico Diário
                  </h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold uppercase px-2.5 py-1 rounded">
                    {avariasData.byDate.length} dias com ocorrências
                  </span>
                </div>

                {avariasData.byDate.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhuma avaria registrada no período.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {avariasData.byDate.map((day) => {
                      const dateObj = new Date(day.date + 'T12:00:00');
                      const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                      
                      return (
                        <div key={day.date} className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/30">
                          <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-150">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              {formattedDate}
                            </span>
                            <span className="text-xs font-mono font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              {day.totalQty} avarias
                            </span>
                          </div>
                          
                          <div className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(day.types).map(([type, qty]) => (
                                <div key={type} className="bg-white border border-slate-200 rounded px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-2xs">
                                  <span className="text-slate-600 uppercase font-bold">{type}:</span>
                                  <span className="font-mono font-black text-red-600">{qty} un</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {avariasViewTab === 'cliente' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                    Ocorrências de Avaria por Cliente
                  </h4>
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-bold uppercase px-2.5 py-1 rounded">
                    {avariasData.byClient.length} clientes afetados
                  </span>
                </div>

                {avariasData.byClient.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhum cliente registrado com avarias no período selecionado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                      <DynamicTable id="relatorio-avarias-by-client" data={avariasData.byClient} columns={avariasClientColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {avariasViewTab === 'motorista' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                    Ocorrências de Avaria por Motorista
                  </h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold uppercase px-2.5 py-1 rounded">
                    {avariasData.byDriver.length} motoristas com ocorrências
                  </span>
                </div>

                {avariasData.byDriver.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Nenhum motorista registrado com avarias no período selecionado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                      <DynamicTable id="relatorio-avarias-by-driver" data={avariasData.byDriver} columns={avariasDriverColumns} className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend helper */}
          <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
            <Info size={14} className="text-slate-400 mt-0.5" />
            <span>Este relatório compila de forma reativa os dados de avarias registradas durante o carregamento e descarregamento das viagens no período filtrado.</span>
          </div>
        </div>
      )}

      {activeSubTab === 'acertos' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Quick Metrics display info */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Comissão Total</span>
                <span className="text-base font-black text-indigo-700 font-mono tracking-tight">
                  R$ {(totalCommOverall ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Água Vendida</span>
                <span className="text-base font-black text-emerald-800 font-mono tracking-tight">
                  {(totalWaterOverall ?? 0).toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                <Check size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Valor Total Vendas</span>
                <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                  R$ {(totalSalesOverall ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded">
                <ExternalLink size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Comodato</span>
                <span className="text-base font-black text-amber-800 font-mono tracking-tight">
                  {(totalComodatoOverall ?? 0).toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded">
                <Truck size={16} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Bonificação</span>
                <span className="text-base font-black text-purple-800 font-mono tracking-tight">
                  {(totalBonifOverall ?? 0).toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded">
                <Bot size={16} />
              </div>
            </div>
          </div>

          {/* Main Printable Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col" id="printable-acertos-report">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} className="text-slate-400" /> Relatório Consolidado de Acerto por Motorista
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{driverGroupsList.length} motorista(s)</span>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg">
              <DynamicTable
                id="relatorio-acertos-consolidated"
                data={driverGroupsList}
                columns={acertosDriverGroupsColumns}
                className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none"
                onRowClick={(row) => {
                  setExpandedDriver(expandedDriver === row.driverName ? null : row.driverName);
                }}
                renderExpandedRow={(row, idx) => {
                  const isExpanded = expandedDriver === row.driverName;
                  if (!isExpanded) return null;
                  const driverSettlements = filteredSettlements.filter(ds => ds.driverName === row.driverName);
                  return (
                    <tr key={`expanded-${row.driverName || idx}`}>
                      <td colSpan={acertosDriverGroupsColumns.length} className="p-4 bg-slate-50/50">
                        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                          <div className="bg-slate-900 text-white p-2.5 text-[9px] font-bold uppercase tracking-wider flex justify-between items-center">
                            <span>Lista Detalhada de Acertos - {row.driverName}</span>
                            <span className="text-[8px] text-slate-400 font-semibold font-sans normal-case">Clique em qualquer acerto para abrir a prestação de contas</span>
                          </div>
                          <DynamicTable
                            id={`relatorio-acertos-detailed-${idx}`}
                            data={driverSettlements}
                            columns={acertosDetailedColumns}
                            className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </div>

            {/* Quick print helper legend info */}
            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-[10px] text-slate-500 uppercase font-bold flex gap-1.5 items-center">
              <Info size={14} className="text-slate-400 mt-0.5" />
              <span>Este relatório consolida os acertos de contas de motoristas ocorridos no período selecionado. A comissão exibida é a comissão total (básica), sem descontos de avarias ou falta de dinheiro.</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'auditoria' && (
        <div className="space-y-5 font-sans animate-in fade-in duration-150">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total de Eventos</span>
                <span className="text-xl font-black text-slate-800 font-mono tracking-tight">{filteredAuditLogs.length}</span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Registros na auditoria</span>
              </div>
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shadow-2xs">
                <History size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider block mb-0.5">Exclusões</span>
                <span className="text-xl font-black text-red-700 font-mono tracking-tight">
                  {filteredAuditLogs.filter((l: any) => l.actionType === 'exclusao').length}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Itens/registros apagados</span>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg shadow-2xs">
                <Trash2 size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider block mb-0.5">Alterações / Modificações</span>
                <span className="text-xl font-black text-amber-700 font-mono tracking-tight">
                  {filteredAuditLogs.filter((l: any) => l.actionType === 'alteracao' || l.actionType === 'estorno').length}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Edições e estornos</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shadow-2xs">
                <FileText size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-purple-500 tracking-wider block mb-0.5">Ajustes de Estoque</span>
                <span className="text-xl font-black text-purple-700 font-mono tracking-tight">
                  {filteredAuditLogs.filter((l: any) => l.actionType === 'ajuste_estoque').length}
                </span>
                <span className="text-[8px] text-slate-500 block mt-0.5 font-medium">Ajustes manuais no saldo</span>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shadow-2xs">
                <Boxes size={18} />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Table Control Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-100 tracking-wide">
                    Relatório Unificado de Auditoria & Modificações do Sistema
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Histórico completo de exclusões, edições, estornos e ajustes manuais com operador, data e justificativa.
                  </p>
                </div>
              </div>

              {/* Sub-filters for Auditoria */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative shrink-0 w-full md:w-48">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar motivo, operador..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none border border-slate-700 focus:border-slate-500"
                  />
                  {auditSearchQuery && (
                    <button onClick={() => setAuditSearchQuery('')} className="absolute right-2 top-2 text-slate-400 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={filterAuditActionType}
                  onChange={(e) => setFilterAuditActionType(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-slate-500 cursor-pointer"
                >
                  <option value="all">TODOS OS TIPOS DE AÇÃO</option>
                  <option value="exclusao">🔴 APENAS EXCLUSÕES</option>
                  <option value="alteracao">🟠 APENAS ALTERAÇÕES</option>
                  <option value="ajuste_estoque">🟣 APENAS AJUSTES DE ESTOQUE</option>
                  <option value="estorno">🟡 APENAS ESTORNOS</option>
                </select>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase font-black text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Ação / Módulo</th>
                    <th className="py-2.5 px-3">O Que Foi Feito</th>
                    <th className="py-2.5 px-3">Por Quem (Operador)</th>
                    <th className="py-2.5 px-3">Motivo / Justificativa</th>
                    <th className="py-2.5 px-3">Identificador / Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <History size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-bold uppercase tracking-wider text-xs">Nenhum registro de auditoria encontrado</p>
                        <p className="text-[10px] text-slate-400 mt-1">Nenhuma movimentação, exclusão ou ajuste corresponde aos filtros selecionados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log: any, idx: number) => {
                      const isExclusao = log.actionType === 'exclusao';
                      const isAjuste = log.actionType === 'ajuste_estoque';
                      const isEstorno = log.actionType === 'estorno';

                      return (
                        <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Timestamp */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                          </td>

                          {/* Action & Entity Type */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                isExclusao ? 'bg-red-50 text-red-700 border-red-200' :
                                isAjuste ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                isEstorno ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {isExclusao ? 'EXCLUSÃO' : isAjuste ? 'AJUSTE ESTOQUE' : isEstorno ? 'ESTORNO' : 'ALTERAÇÃO'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                {log.entityType || 'Geral'}
                              </span>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800 leading-snug">{log.description}</p>
                          </td>

                          {/* Operator */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                              <User size={12} className="text-slate-500" />
                              {log.operator || 'Sistema'}
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="py-3 px-3">
                            <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-2 text-[11px] text-amber-950 font-medium">
                              <span className="font-bold uppercase text-[9px] text-amber-700 block mb-0.5">Motivo Registrado:</span>
                              {log.reason || 'Não informado'}
                            </div>
                          </td>

                          {/* Details / Plate / Driver */}
                          <td className="py-3 px-3 whitespace-nowrap text-[10px] text-slate-500 font-mono font-medium">
                            {log.plate && (
                              <div className="font-bold text-slate-800 uppercase tracking-tight">
                                🚗 {log.plate}
                              </div>
                            )}
                            {log.driver && (
                              <div className="text-slate-600">
                                👤 {log.driver}
                              </div>
                            )}
                            {!log.plate && !log.driver && (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewingSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <PenTool className="text-blue-500" size={14} /> Assinatura do Cliente
              </span>
              <button 
                onClick={() => setViewingSignature(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100">
              <img src={viewingSignature || undefined} alt="Assinatura" className="max-h-48 rounded border border-slate-300 bg-white shadow-xs w-full object-contain" />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingSignature(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold uppercase rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Estorno Modal */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Edit className="text-blue-500" size={14} /> Editar Registro ({editingMovement.plate})
              </span>
              <button 
                onClick={() => setEditingMovement(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              {saveSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] py-2 px-3 rounded-md font-bold flex items-center gap-2 animate-in fade-in">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {isAdminAlert && (
                <div className="bg-red-50 border border-red-100 text-red-900 text-[11px] py-2 px-3 rounded-md font-medium flex items-start gap-2 animate-in pulse">
                  <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-red-850">Acesso Restrito</span>
                    A liberação de estorno de saídas concluídas só pode ser aprovada por usuários com perfil operacional **Administrador**.
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Motorista / Condutor</label>
                <input
                  type="text"
                  required
                  value={editDriver}
                  onChange={(e) => setEditDriver(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Nome do motorista"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Data/Hora de Entrada</label>
                <input
                  type="datetime-local"
                  required
                  value={editEntryTime}
                  onChange={(e) => setEditEntryTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              {showExitTimeField && (
                <div className="space-y-1 animate-in slide-in-from-top-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Data/Hora de Saída</label>
                  <input
                    type="datetime-local"
                    required
                    value={editExitTime}
                    onChange={(e) => setEditExitTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              )}

              {editingMovement.status === 'saida' && (
                <div className="space-y-1">
                  <OrderPhotoSelector 
                    onPhotoSelected={setEditOrderPhoto} 
                    selectedPhoto={editOrderPhoto} 
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Motivo do Ajuste / Estorno *</label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none focus:border-blue-400"
                  placeholder="Informe o motivo real desta ação..."
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingMovement(null)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded text-[10px] uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-[10px] uppercase shadow-sm"
                  >
                    Salvar
                  </button>
                </div>

                {editingMovement.status === 'saida' && (
                  <div className="pt-2 border-t border-slate-100 mt-1 space-y-2">
                    {validationError && (
                      <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 text-center">
                        {validationError}
                      </p>
                    )}

                    {!showRevertConfirm ? (
                      <button
                        type="button"
                        onClick={handleEstornar}
                        className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-bold px-3 py-2 rounded text-[10px] uppercase flex items-center justify-center gap-1 transition-colors"
                      >
                        <Undo2 size={12} /> Estornar Saída do Veículo
                      </button>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg space-y-2">
                        <p className="text-[10px] text-amber-800 font-bold text-center">
                          Confirmar estorno? O veículo retornará ao pátio operacional no estado 'Concluído'.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRevertConfirm(false)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-1.5 rounded text-[9px] uppercase"
                          >
                            Não, Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmEstorno}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded text-[9px] uppercase shadow-sm"
                          >
                            Sim, Estornar!
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="block text-[8px] text-slate-400 text-center mt-1">
                      (Retorna o veículo ao pátio operacional no estado 'Concluído')
                    </span>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showPrintGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="text-blue-400" size={18} />
                <h3 className="font-bold text-xs uppercase tracking-wider">Como Gerar PDF / Imprimir</h3>
              </div>
              <button 
                onClick={() => setShowPrintGuide(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs text-slate-650 leading-relaxed">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-800 flex gap-2.5 items-start">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="font-semibold text-[11px]">
                  Por segurança, os navegadores modernos bloqueiam o comando de impressão (PDF) quando o aplicativo está sendo executado em caixas protegidas (iframe) como a pré-visualização do editor.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Passos Simples para Gerar o PDF:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium text-slate-600">
                  <li>Clique no botão azul <strong className="text-slate-800">"Abrir em Nova Aba"</strong> abaixo.</li>
                  <li>O sistema será carregado com segurança diretamente em uma aba exclusiva do seu navegador.</li>
                  <li>O diálogo de impressão/salvamento em PDF abrirá automaticamente! Caso não abra, basta clicar no mesmo botão <strong className="text-slate-800">"Imprimir"</strong> lá.</li>
                </ol>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrintGuide(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-wider rounded transition-colors"
                >
                  Fechar
                </button>
                <a
                  href={`${window.location.origin}${window.location.pathname}?tab=relatorios&autoPrint=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowPrintGuide(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-wider rounded flex items-center gap-1.5 shadow-md shadow-blue-100 transition-colors"
                >
                  <ExternalLink size={14} /> Abrir em Nova Aba
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingProductionMovement && (() => {
        const m = viewingProductionMovement;
        const deduplicate = (list: AvariaEntry[]) => {
          const seen = new Set<string>();
          const res: AvariaEntry[] = [];
          for (const item of list) {
            const typeStr = item?.type || '';
            const key = typeStr.toLowerCase().trim();
            if (!key) continue;
            if (!seen.has(key)) {
              seen.add(key);
              res.push({ ...item, type: typeStr.trim() });
            } else {
              const existing = res.find(r => (r?.type || '').toLowerCase().trim() === key);
              if (existing) {
                existing.qty += (item.qty || 0);
              }
            }
          }
          return res;
        };
        const avariasDesc = deduplicate(m.productionControl?.avariasDescarregamento || []);
        const avariasCarreg = deduplicate(m.productionControl?.avariasCarregamento || []);
        
        const quebraNaMaquinaQty = [...avariasDesc, ...avariasCarreg]
          .filter(x => (cleanOccurrenceTypeName(x?.type) || '').toLowerCase().trim() === 'quebra na maquina')
          .reduce((sum, item) => sum + (item.qty || 0), 0);

        const descLosses = avariasDesc
          .filter(a => !isPurchaseType(a?.type) && !isRewashType(a?.type, customAvariaTypes) && !(a?.type || '').toLowerCase().includes('troca'))
          .reduce((sum, item) => sum + (item.qty || 0), 0);
        const carregLosses = avariasCarreg
          .filter(c => !isPurchaseType(c?.type) && !isRewashType(c?.type, customAvariaTypes) && !(c?.type || '').toLowerCase().includes('troca'))
          .reduce((sum, item) => sum + (item.qty || 0), 0);

        const descTrocas = avariasDesc
          .filter(a => (a?.type || '').toLowerCase().includes('troca'))
          .reduce((sum, item) => sum + (item.qty || 0), 0);
        const carregTrocas = avariasCarreg
          .filter(c => (c?.type || '').toLowerCase().includes('troca'))
          .reduce((sum, item) => sum + (item.qty || 0), 0);

        const descPurchases = avariasDesc
          .filter(a => isPurchaseType(a.type))
          .reduce((sum, item) => sum + item.qty, 0);
        const carregPurchases = avariasCarreg
          .filter(c => isPurchaseType(c.type))
          .reduce((sum, item) => sum + item.qty, 0);

        const normalAvariasQty = Math.max(0, (descLosses + carregLosses) - quebraNaMaquinaQty);

        const additionsList = [...avariasDesc, ...avariasCarreg].filter(x => isPurchaseType(x.type));
        const additionsByProduct: Record<string, number> = {};
        additionsList.forEach(item => {
          const name = cleanOccurrenceTypeName(item.type);
          additionsByProduct[name] = (additionsByProduct[name] || 0) + item.qty;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-production-ficha-area, #print-production-ficha-area *,
                #print-production-ticket-area, #print-production-ticket-area * {
                  visibility: hidden !important;
                }
                ${activeProductionTab === 'details' ? `
                  #print-production-ficha-area, #print-production-ficha-area * {
                    visibility: visible !important;
                  }
                  #print-production-ficha-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: black !important;
                  }
                ` : `
                  #print-production-ticket-area, #print-production-ticket-area * {
                    visibility: visible !important;
                  }
                  #print-production-ticket-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: black !important;
                  }
                `}
              }
            `}</style>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
              {/* Header */}
              <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <FileText className="text-indigo-400 fill-indigo-400/20" size={18} />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">Histórico de Produção do Atendimento</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Placa: <span className="text-white font-mono tracking-wider">{m.plate.toUpperCase()}</span> | Motorista: <span className="text-white">{m.driver}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingProductionMovement(null)} 
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-Tabs: Ficha vs Ticket */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex gap-2 bg-slate-200/60 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveProductionTab('details')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${
                      activeProductionTab === 'details'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ficha Técnica Completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProductionTab('ticket')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all cursor-pointer ${
                      activeProductionTab === 'ticket'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Recibo Térmico (Ticket)
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wide py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Printer size={13} />
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingProductionMovement(null)}
                    className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-black text-[10px] uppercase tracking-wide py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Scrollable Main Area */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                {activeProductionTab === 'details' ? (
                  /* DETAILED REPORT AND IMAGES SHEET */
                  <div className="space-y-6">
                    <div className="hidden lg:flex items-center gap-2.5 bg-indigo-50 border border-indigo-150 rounded-xl p-3.5 text-indigo-900 text-xs font-medium">
                      <Info size={16} className="text-indigo-600 shrink-0" />
                      <span>Esta visualização exibe a ficha completa de produção com o registro fotográfico. Pressione <strong>Imprimir</strong> acima para gerar a versão A4 de auditoria.</span>
                    </div>

                    <div 
                      id="print-production-ficha-area"
                      className="bg-white border border-slate-250 rounded-xl shadow-md p-6 lg:p-8 space-y-6"
                    >
                      {/* A4 Document Header */}
                      <div className="border-b border-slate-250 pb-5 flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {companyLogo ? (
                              <img src={companyLogo || undefined} alt="" className="h-9 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-[#0c2a5c] font-black tracking-widest text-lg">CRISTAL SUL</span>
                            )}
                          </div>
                          <h1 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">FICHA DE AUDITORIA DE PRODUÇÃO</h1>
                          <p className="text-[10px] text-slate-400 font-bold font-mono uppercase">ID ATENDIMENTO: #{m.id?.substring(0, 8).toUpperCase() || 'S/N'}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-slate-100 text-slate-700 font-mono text-[9.5px] font-extrabold px-2 py-1 rounded">
                            DATA: {formatDateTime(m.entryTimestamp || m.timestamp)}
                          </span>
                          {m.exitTimestamp && (
                            <p className="text-[9px] text-slate-400 font-bold mt-1.5 font-mono">SAÍDA: {formatDateTime(m.exitTimestamp)}</p>
                          )}
                        </div>
                      </div>

                      {/* Summary Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px]">Placa</span>
                          <span className="font-mono font-black text-slate-800 text-sm tracking-wider">{m.plate.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px]">Condutor</span>
                          <span className="font-extrabold text-slate-800 block truncate">{m.driver}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px]">Tipo Frota</span>
                          <span className={`inline-block text-[9px] font-black uppercase px-1 rounded-sm mt-0.5 ${m.ownerType === 'proprio' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                            {m.ownerType === 'proprio' ? 'FROTA PRÓPRIA' : 'CLIENTE/TERCEIRO'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase text-[8px]">Unidade</span>
                          <span className="font-extrabold text-slate-800 uppercase font-mono tracking-wider">{m.unit || 'matriz'}</span>
                        </div>
                      </div>

                      {/* Timeline Grid */}
                      <div className="space-y-3.5">
                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                          <Clock size={14} className="text-indigo-600" />
                          Estágios & Tempos da Operação
                        </h3>
                        <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-4 text-xs">
                          {/* Event 1: Entrada */}
                          <div className="relative">
                            <span className="absolute -left-[25px] top-0.5 bg-blue-650 w-2 h-2 rounded-full ring-4 ring-white"></span>
                            <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono">{formatDateTime(m.entryTimestamp || m.timestamp)}</span>
                            <span className="font-bold text-slate-800">Início de Atendimento / Entrada Portaria</span>
                          </div>

                          {/* Event 2: Descarregamento */}
                          {m.kanbanTimings?.['descarregamento'] && (
                            <div className="relative">
                              <span className="absolute -left-[25px] top-0.5 bg-indigo-605 w-2 h-2 rounded-full ring-4 ring-white"></span>
                              <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono">{formatDateTime(m.kanbanTimings['descarregamento'])}</span>
                              <div className="flex font-bold text-slate-800 justify-between items-center mr-4">
                                <span>Iniciado Descarregamento de Vasilhames</span>
                                {getStageActiveTime(m, 'descarregamento') !== null && (
                                  <span className="text-[10px] text-slate-500 font-mono">Duração Ativa: {formatDurationStatus(getStageActiveTime(m, 'descarregamento') || 0)}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Event 3: Aguardando Carregamento */}
                          {(m.kanbanTimings?.['aguardando_carregamento'] || m.kanbanTimings?.['carregamento']) && (
                            <div className="relative">
                              <span className="absolute -left-[25px] top-0.5 bg-amber-500 w-2 h-2 rounded-full ring-4 ring-white"></span>
                              <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono">{formatDateTime(m.kanbanTimings['aguardando_carregamento'] || m.kanbanTimings['carregamento'])}</span>
                              <span className="font-bold text-slate-800">Descarrego Concluído e Enfileirado para Envase</span>
                            </div>
                          )}

                          {/* Event 4: Carregamento */}
                          {m.kanbanTimings?.['carregamento'] && (
                            <div className="relative">
                              <span className="absolute -left-[25px] top-0.5 bg-emerald-650 w-2 h-2 rounded-full ring-4 ring-white"></span>
                              <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono">{formatDateTime(m.kanbanTimings['carregamento'])}</span>
                              <div className="flex font-bold text-slate-800 justify-between items-center mr-4">
                                <span>Iniciado Carregamento & Envase de Vasilhames</span>
                                {getStageActiveTime(m, 'carregamento') !== null && (
                                  <span className="text-[10px] text-slate-500 font-mono">Duração Ativa: {formatDurationStatus(getStageActiveTime(m, 'carregamento') || 0)}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Event 5: Conclusao */}
                          {(m.kanbanTimings?.['concluido'] || m.exitTimestamp) && (
                            <div className="relative">
                              <span className="absolute -left-[25px] top-0.5 bg-slate-900 w-2 h-2 rounded-full ring-4 ring-white"></span>
                              <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono">{formatDateTime(m.kanbanTimings?.['concluido'] || m.exitTimestamp)}</span>
                              <div className="flex font-extrabold text-slate-900 justify-between items-center mr-4 uppercase tracking-wider text-[10px]">
                                <span>Atendimento de Produção Concluído</span>
                                {getMovementDurations(m) && (
                                  <span className="text-[10px] text-[#0c2a5c] font-black font-mono bg-[#0c2a5c]/5 px-2 py-0.5 rounded border border-[#0c2a5c]/10">Duração Total Ativa: {formatDurationStatus(getMovementDurations(m)?.activeMs || 0)}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pausas e Saídas Temporárias (Almoço / Oficina) */}
                      {m.kanbanPauseHistory && m.kanbanPauseHistory.length > 0 && (
                        <div className="border-t border-slate-200 pt-5 space-y-3 pb-2 text-xs">
                          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                            ⏸️ Registro de Pausas & Saídas Temporárias (Almoço / Oficina)
                          </h3>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden font-sans">
                            <table className="w-full text-left text-xs bg-white">
                              <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                                  <th className="py-2.5 px-4">Motivo / Tipo de Saída</th>
                                  <th className="py-2.5 px-4">Etapa da Produção</th>
                                  <th className="py-2.5 px-4">Horário de Saída</th>
                                  <th className="py-2.5 px-4">Horário de Retorno</th>
                                  <th className="py-2.5 px-3 text-right">Duração da Pausa</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {m.kanbanPauseHistory.map((p, pIdx) => {
                                  const reasonLabel = 
                                    p.reason === 'almoco' ? '🍽️ Almoço (Saída Temporária)' :
                                    p.reason === 'oficina' ? '🔧 Oficina (Saída Reparos/Oficina)' :
                                    p.reason === 'pausa_interna' ? '⏸️ Pausa Interna Comum' :
                                    '⏸️ Outra Saída';
                                  const stepLabel = 
                                    p.step === 'aguardando_descarregamento' ? 'Aguardando Descarrego' :
                                    p.step === 'descarregamento' ? 'Descarregamento' :
                                    p.step === 'aguardando_carregamento' ? 'Aguardando Envase' :
                                    p.step === 'carregamento' ? 'Carregamento / Envase' :
                                    p.step;

                                  return (
                                    <tr key={p.id || pIdx} className="hover:bg-slate-50/50">
                                      <td className="py-2.5 px-4 font-extrabold text-slate-700">{reasonLabel}</td>
                                      <td className="py-2.5 px-4 font-semibold text-slate-500 uppercase text-[9.5px]">{stepLabel}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{new Date(p.pausedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600">
                                        {p.resumedAt ? new Date(p.resumedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : <span className="text-amber-600 uppercase text-[9px] font-black">Ativo (Ausente)</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-700">
                                        {p.durationMs ? formatDurationStatus(p.durationMs) : <span className="text-amber-600 font-bold">Em Aberto</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Trânsito Temporário de Portaria (Almoço / Oficina) */}
                      {m.gateTemporaryExits && m.gateTemporaryExits.length > 0 && (
                        <div className="border-t border-slate-200 pt-5 space-y-3 pb-2 text-xs">
                          <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                            🚪 Histórico de Saídas Temporárias pela Portaria
                          </h3>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden font-sans">
                            <table className="w-full text-left text-xs bg-white">
                              <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                                  <th className="py-2.5 px-4">Motivo / Destino</th>
                                  <th className="py-2.5 px-4">Horário de Saída</th>
                                  <th className="py-2.5 px-4">Autorizado por (Saída)</th>
                                  <th className="py-2.5 px-4">Horário de Retorno</th>
                                  <th className="py-2.5 px-4">Confirmado por (Retorno)</th>
                                  <th className="py-2.5 px-3 text-right">Tempo de Ausência</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {m.gateTemporaryExits.map((e, eIdx) => {
                                  const typeLabel = 
                                    e.type === 'almoco' ? '🍽️ Saída p/ Almoço' :
                                    e.type === 'oficina' ? '🔧 Saída p/ Oficina' :
                                    '🚪 Saída Temporária';

                                  return (
                                    <tr key={e.id || eIdx} className="hover:bg-slate-50/50">
                                      <td className="py-2.5 px-4 font-extrabold text-slate-700">{typeLabel}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600">
                                        {new Date(e.exitedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </td>
                                      <td className="py-2.5 px-4 text-slate-500 font-medium">{e.exitedBy || '-'}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-slate-600">
                                        {e.returnedAt ? new Date(e.returnedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : <span className="text-amber-600 uppercase text-[9px] font-black">Fora da Empresa</span>}
                                      </td>
                                      <td className="py-2.5 px-4 text-slate-500 font-medium">{e.returnedBy || '-'}</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-700">
                                        {e.durationMs ? formatDurationStatus(e.durationMs) : <span className="text-amber-600 font-bold">Ausente</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Production Inventory detailed balance */}
                      <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Left: Input values & Avarias */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-250 rounded-xl p-4 space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Descarregamento & Entrada</h4>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700">Total Vasilhames Entrada:</span>
                              <span className="font-extrabold text-indigo-700 text-sm font-mono">{m.productionControl?.descarregadoQty || 0} u</span>
                            </div>
                            {m.ownerType === 'proprio' && m.productionControl?.retiradaVasilhameCarga ? (
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700">Retirada Vasilhame Rota:</span>
                                <span className="font-extrabold text-indigo-700 text-sm font-mono">-{m.productionControl.retiradaVasilhameCarga} u</span>
                              </div>
                            ) : null}
                            {m.productionControl?.descarregadoFormula && (
                              <div className="text-[10px] text-slate-500 font-semibold bg-white p-2 border border-slate-200 rounded-lg flex justify-between">
                                <span>Composição informada:</span>
                                <span className="font-mono">{m.productionControl.descarregadoFormula}</span>
                              </div>
                            )}

                            {m.productionControl?.cleanCargo && (
                              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide mb-2">
                                ✨ Carga Limpa (Dará desconto no caixa)
                              </div>
                            )}

                            {/* Avarias Descarregamento */}
                            {avariasDesc.some(a => !isPurchaseType(a?.type) && !(a?.type || '').toLowerCase().includes('troca') && a.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1.5">
                                <span className="text-[9px] font-black text-red-655 uppercase tracking-widest block font-sans">Avarias Identificadas (Perdas)</span>
                                {avariasDesc.filter(a => !isPurchaseType(a?.type) && !(a?.type || '').toLowerCase().includes('troca') && a.qty > 0).map((a, idx) => (
                                  <div key={`${a.type}-${idx}`} className="flex justify-between text-[10px] text-slate-650 capitalize font-medium">
                                    <span>- {a.type}:</span>
                                    <span className="font-mono font-bold text-rose-650">{a.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Trocas Descarregamento */}
                            {avariasDesc.some(a => (a?.type || '').toLowerCase().includes('troca') && a.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1.5">
                                <span className="text-[9px] font-black text-amber-705 uppercase tracking-widest block font-sans">Avarias de Troca (Cliente)</span>
                                {avariasDesc.filter(a => (a?.type || '').toLowerCase().includes('troca') && a.qty > 0).map((a, idx) => (
                                  <div key={`${a.type}-${idx}`} className="flex justify-between text-[10px] text-slate-650 capitalize font-medium">
                                    <span>- {a.type}:</span>
                                    <span className="font-mono font-bold text-amber-600">{a.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Compras Descarregamento */}
                            {avariasDesc.some(a => isPurchaseType(a.type) && a.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                                <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block">Compras Adquiridas</span>
                                {avariasDesc.filter(a => isPurchaseType(a.type) && a.qty > 0).map((a, idx) => (
                                  <div key={`${a.type}-${idx}`} className="flex justify-between text-[10px] text-slate-600 font-medium capitalize">
                                    <span>- {a.type}:</span>
                                    <span className="font-mono font-bold text-emerald-700">+{a.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Output values & Avarias */}
                        <div className="space-y-4">
                          <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Envase & Saída</h4>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-500">Produção / Carga Nova:</span>
                              <span className="font-bold text-slate-800">{m.productionControl?.totalCarregado || 0} u</span>
                            </div>
                            {m.ownerType === 'proprio' && (() => {
                              const matching = (driverTripLoads || []).filter(t => t.gateMovementId === m.id || (!t.gateMovementId && t.driverName?.toLowerCase() === m.driver?.toLowerCase() && t.vehiclePlate?.toLowerCase() === m.plate?.toLowerCase() && new Date(t.timestamp).getTime() >= new Date(m.timestamp).getTime() - 120000 && new Date(t.timestamp).getTime() <= new Date(m.timestamp).getTime() + 86400000));
                              const grouped = matching.reduce((acc, load) => {
                                const cleanName = load.productName.split('(')[0].trim();
                                const key = load.productId || cleanName.toLowerCase();
                                if (!acc[key]) acc[key] = { id: key, productName: cleanName, initialQty: 0 };
                                acc[key].initialQty += (load.initialQty || 0);
                                return acc;
                              }, {} as Record<string, { id: string; productName: string; initialQty: number }>);
                              return Object.values(grouped).map(load => (
                                <div key={load.id} className="flex justify-between items-center text-xs text-indigo-700">
                                  <span className="font-semibold">(+) {load.productName}:</span>
                                  <span className="font-bold">+{load.initialQty} u</span>
                                </div>
                              ));
                            })()}
                            {m.productionControl?.retornoVasilhameCheio ? (
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-500">(+) Retorno Cheio no Veículo:</span>
                                <span className="font-bold text-emerald-600">+{m.productionControl.retornoVasilhameCheio} u</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-emerald-150">
                              <span className="font-extrabold text-slate-800">Total Saída do Veículo:</span>
                              <span className="font-black text-emerald-700 text-base font-mono bg-white px-2.5 py-0.5 rounded border border-emerald-200">{(m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0)} u</span>
                            </div>

                            {/* Avarias Carregamento */}
                            {avariasCarreg.some(c => !isPurchaseType(c.type) && !isRewashType(c.type, customAvariaTypes) && !c.type.toLowerCase().includes('troca') && c.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-emerald-150 space-y-1.5">
                                <span className="text-[9px] font-black text-amber-705 uppercase tracking-widest block font-sans">Avarias de Envase (Carregamento)</span>
                                {avariasCarreg.filter(c => !isPurchaseType(c.type) && !isRewashType(c.type, customAvariaTypes) && !c.type.toLowerCase().includes('troca') && c.qty > 0).map((c, idx) => (
                                  <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-600 capitalize font-medium">
                                    <span>- {c.type}:</span>
                                    <span className="font-mono font-bold text-amber-700">{c.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Retorno Lavagem Carregamento */}
                            {avariasCarreg.some(c => isRewashType(c.type, customAvariaTypes) && c.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-emerald-150 space-y-1.5">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block font-sans">Retorno p/ Lavagem (Não Desconta Carga)</span>
                                {avariasCarreg.filter(c => isRewashType(c.type, customAvariaTypes) && c.qty > 0).map((c, idx) => (
                                  <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-600 capitalize font-medium">
                                    <span>- {c.type}:</span>
                                    <span className="font-mono font-bold text-blue-700">{c.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Trocas Carregamento */}
                            {avariasCarreg.some(c => c.type.toLowerCase().includes('troca') && c.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-emerald-150 space-y-1.5">
                                <span className="text-[9px] font-black text-amber-705 uppercase tracking-widest block font-sans">Avarias de Troca (Carregamento)</span>
                                {avariasCarreg.filter(c => c.type.toLowerCase().includes('troca') && c.qty > 0).map((c, idx) => (
                                  <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-600 capitalize font-medium">
                                    <span>- {c.type}:</span>
                                    <span className="font-mono font-bold text-amber-600">{c.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Compras Carregamento */}
                            {avariasCarreg.some(c => isPurchaseType(c.type) && c.qty > 0) && (
                              <div className="mt-2.5 pt-2.5 border-t border-emerald-150">
                                <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block">Compras Adicionais</span>
                                {avariasCarreg.filter(c => isPurchaseType(c.type) && c.qty > 0).map((c, idx) => (
                                  <div key={`${c.type}-${idx}`} className="flex justify-between text-[10px] text-slate-600 font-medium font-sans capitalize">
                                    <span>- {c.type}:</span>
                                    <span className="font-mono font-bold text-emerald-700">+{c.qty} un</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conciliacao Frota Propria (If proprio) */}
                      {m.ownerType === 'proprio' && m.productionControl && (
                        <div className="border-t border-slate-200 pt-6">
                          <div className="bg-indigo-50 border border-indigo-105 rounded-xl p-4 space-y-3 text-xs leading-relaxed">
                            <div className="font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                              📊 CONCILIAÇÃO COMPLETA DE FROTA PRÓPRIA
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2 border-b border-indigo-100/50">
                              <div>
                                <span className="text-indigo-600 font-bold block text-[8px] uppercase">Deveria Descarregar</span>
                                <span className="font-black text-slate-900 font-mono text-xs">
                                  {m.productionControl.expectedDischargeQty !== undefined ? `${m.productionControl.expectedDischargeQty} un` : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-indigo-600 font-bold block text-[8px] uppercase">Descarregado Efetivo</span>
                                <span className="font-black text-[#0d5930] font-mono text-xs">
                                  {m.productionControl.descarregadoQty} un
                                </span>
                              </div>
                              <div>
                                <span className="text-indigo-600 font-bold block text-[8px] uppercase">Diferença Analisada</span>
                                {(() => {
                                  const expected = m.productionControl.expectedDischargeQty || 0;
                                  const diff = m.productionControl.differenceQty !== undefined ? m.productionControl.differenceQty : (expected - m.productionControl.descarregadoQty);
                                  if (diff > 0) {
                                    return <span className="font-black text-rose-800 font-mono text-xs">Falta: {diff} un</span>;
                                  } else if (diff < 0) {
                                    return <span className="font-black text-emerald-700 font-mono text-xs">Sobra: {Math.abs(diff)} un</span>;
                                  }
                                  return <span className="font-black text-emerald-850 font-mono text-[9px] uppercase tracking-wider">✓ Sem Falta</span>;
                                })()}
                              </div>
                              <div>
                                <span className="text-indigo-600 font-bold block text-[8px] uppercase">Motivo / Justificativa</span>
                                <span className="font-black text-indigo-950 capitalize-none block">
                                  {m.productionControl.differenceReasonsBreakdown && m.productionControl.differenceReasonsBreakdown.some(b => b.qty > 0) ? (
                                    <span className="flex flex-col gap-0.5 mt-0.5 font-semibold text-slate-700 text-[10px]">
                                      {m.productionControl.differenceReasonsBreakdown
                                        .filter(b => b.qty > 0)
                                        .map((b, idx) => (
                                          <span key={idx} className="block">
                                            • {b.qty} un: {
                                              b.reason === 'venda' ? 'Venda de Vasilhame' :
                                              b.reason === 'falta' ? 'Extravio/Perda' :
                                              b.reason === 'vasilhame_cliente' ? 'Trouxe Vasilhame de Cliente' :
                                              b.reason === 'comodato' ? 'Retorno de Comodato' :
                                              b.reason === 'troca_avarias' ? 'Troca Avarias/Água' :
                                              'Diferença Autorizada'
                                            }
                                          </span>
                                        ))}
                                    </span>
                                  ) : (
                                    m.productionControl.differenceReason ? (
                                      m.productionControl.differenceReason === 'venda' ? 'Venda de Vasilhame' :
                                      m.productionControl.differenceReason === 'falta' ? 'Extravio/Perda' :
                                      m.productionControl.differenceReason === 'vasilhame_cliente' ? 'Trouxe Vasilhame de Cliente' :
                                      m.productionControl.differenceReason === 'comodato' ? 'Retorno de Comodato' :
                                      m.productionControl.differenceReason === 'troca_avarias' ? 'Troca Avarias/Água' :
                                      'Diferença Autorizada'
                                    ) : 'Sem divergências'
                                  )}
                                </span>
                              </div>
                            </div>
                            {m.productionControl.differenceExplanation && (
                              <p className="text-slate-600 italic text-[10.5px]">
                                <strong>Explicação:</strong> "{m.productionControl.differenceExplanation}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Integrated Photo Registrations */}
                      <MovementAuditPhotos movement={m} setActiveLightboxPhoto={setActiveLightboxPhoto} />

                      {/* Footer Signature */}
                      <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400">
                        <div>CRISTAL SUL - INDÚSTRIA E DISTRIBUIÇÃO</div>
                        <div className="text-right">FICHA DE PRODUÇÃO PARA CONSULTA INTEGRADA</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* THERMAL TICKET RECEIPT FOR LOADING AND PRODUCTION */
                  <div className="max-w-md mx-auto space-y-4 font-mono">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl p-3.5 text-xs font-semibold font-sans">
                      🖨️ O recibo térmico abaixo é formatado para impressão em bobinas de automação. Clique em <strong>Imprimir</strong> acima para iniciar.
                    </div>

                    <div 
                      id="print-production-ticket-area" 
                      className="bg-white border border-slate-350 rounded-xl p-6 font-mono text-xs text-slate-800 shadow-md space-y-4"
                    >
                      <div className="text-center border-b border-dashed border-slate-300 pb-4">
                        {companyLogo ? (
                          <img 
                            src={companyLogo || undefined} 
                            alt="Logo" 
                            className="max-h-12 max-w-[150px] object-contain mb-2 mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="font-sans font-black tracking-widest text-[#0c2a5c] text-lg uppercase mb-1">
                            CRISTAL SUL
                          </div>
                        )}
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Controle de Produção e Carga
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 font-bold">
                          Data/Hora: {formatDateTime(m.entryTimestamp || m.timestamp)}
                        </div>
                      </div>

                      <div className="space-y-3.5 w-full">
                        <div>
                          <div className="text-[9.5px] uppercase font-black text-slate-400 mb-0.5">Identificação do Veículo</div>
                          <div className="flex justify-between">
                            <span>Placa:</span>
                            <span className="font-extrabold text-slate-900">{m.plate.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span>Motorista:</span>
                            <span className="font-extrabold text-slate-900 truncate max-w-[180px]">{m.driver}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span>Tipo:</span>
                            <span className="font-extrabold text-slate-900 uppercase">
                              {m.ownerType === 'proprio' ? 'Frota Própria' : 'Cliente/Terceiro'}
                            </span>
                          </div>
                          {m.client && (
                            <div className="flex justify-between mt-0.5">
                              <span>Cliente:</span>
                              <span className="font-extrabold text-slate-900 truncate max-w-[180px]">{m.client}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-3">
                          <div className="text-[9.5px] uppercase font-black text-slate-400 mb-1">1. Registro de Entrada</div>
                          <div className="flex justify-between font-bold">
                            <span>Descarregado:</span>
                            <span className="text-indigo-700">{m.productionControl?.descarregadoQty || 0} un</span>
                          </div>
                          {m.productionControl?.descarregadoFormula && (
                            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                              <span>Composição:</span>
                              <span>({m.productionControl.descarregadoFormula})</span>
                            </div>
                          )}
                          
                          {m.productionControl?.cleanCargo && (
                            <div className="text-[10px] font-black text-emerald-700 uppercase mt-2 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/60 font-sans tracking-wide">
                              ✨ CARGA LIMPA (DESCONTO NO CAIXA)
                            </div>
                          )}
                          
                          {avariasDesc.some(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca') && a.qty > 0) && (
                            <div className="mt-1.5 pl-2 border-l-2 border-red-250">
                              <div className="text-[9.5px] font-bold text-red-650">Avarias no Descarrego:</div>
                              {avariasDesc.filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca') && a.qty > 0).map((a, idx) => (
                                <div key={`${a.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {a.type}:</span>
                                  <span>{a.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {avariasDesc.some(a => a.type.toLowerCase().includes('troca') && a.qty > 0) && (
                            <div className="mt-1.5 pl-2 border-l-2 border-amber-250">
                              <div className="text-[9.5px] font-bold text-amber-600">Avarias de Troca:</div>
                              {avariasDesc.filter(a => a.type.toLowerCase().includes('troca') && a.qty > 0).map((a, idx) => (
                                <div key={`${a.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {a.type}:</span>
                                  <span>{a.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {avariasDesc.some(a => isPurchaseType(a.type) && a.qty > 0) && (
                            <div className="mt-1.5 pl-2 border-l-2 border-emerald-250">
                              <div className="text-[9.5px] font-bold text-emerald-650">Compras no Descarrego:</div>
                              {avariasDesc.filter(a => isPurchaseType(a.type) && a.qty > 0).map((a, idx) => (
                                <div key={`${a.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {a.type}:</span>
                                  <span>+{a.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-3">
                          <div className="text-[9.5px] uppercase font-black text-slate-400 mb-1">2. Registro de Saída / Envase</div>
                          {avariasCarreg.some(c => !isPurchaseType(c.type) && !isRewashType(c.type, customAvariaTypes) && !c.type.toLowerCase().includes('troca') && c.qty > 0) && (
                            <div className="mb-2 pl-2 border-l-2 border-amber-200">
                              <div className="text-[9.5px] font-bold text-amber-650">Avarias Carregamento / Envase:</div>
                              {avariasCarreg.filter(c => !isPurchaseType(c.type) && !isRewashType(c.type, customAvariaTypes) && !c.type.toLowerCase().includes('troca') && c.qty > 0).map((c, idx) => (
                                <div key={`${c.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {c.type}:</span>
                                  <span>{c.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {avariasCarreg.some(c => isRewashType(c.type, customAvariaTypes) && c.qty > 0) && (
                            <div className="mb-2 pl-2 border-l-2 border-blue-200">
                              <div className="text-[9.5px] font-bold text-blue-600">Retorno para Lavagem / Vistoria (Não Desconta):</div>
                              {avariasCarreg.filter(c => isRewashType(c.type, customAvariaTypes) && c.qty > 0).map((c, idx) => (
                                <div key={`${c.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {c.type}:</span>
                                  <span>{c.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {avariasCarreg.some(c => c.type.toLowerCase().includes('troca') && c.qty > 0) && (
                            <div className="mb-2 pl-2 border-l-2 border-amber-200">
                              <div className="text-[9.5px] font-bold text-amber-600">Avarias de Troca no Envase:</div>
                              {avariasCarreg.filter(c => c.type.toLowerCase().includes('troca') && c.qty > 0).map((c, idx) => (
                                <div key={`${c.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {c.type}:</span>
                                  <span>{c.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {avariasCarreg.some(c => isPurchaseType(c.type) && c.qty > 0) && (
                            <div className="mb-2 pl-2 border-l-2 border-emerald-200">
                              <div className="text-[9.5px] font-bold text-emerald-650">Compras no Carregamento:</div>
                              {avariasCarreg.filter(c => isPurchaseType(c.type) && c.qty > 0).map((c, idx) => (
                                <div key={`${c.type}-${idx}`} className="flex justify-between text-[9.5px] text-slate-500 capitalize">
                                  <span>- {c.type}:</span>
                                  <span>+{c.qty} un</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-250 pt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-250">
                          <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Resumo do Carregamento</div>
                          <div className="flex justify-between text-xs mt-0.5">
                            <span>Entrada de Produção:</span>
                            <span className="font-bold">{m.productionControl?.descarregadoQty || 0} un</span>
                          </div>
                          
                          <div className="flex justify-between text-xs mt-0.5 text-amber-750">
                            <span>(-) Avarias:</span>
                            <span className="font-bold">-{normalAvariasQty} un</span>
                          </div>

                          {m.ownerType === 'proprio' && (m.productionControl?.retiradaVasilhameCarga || 0) > 0 && (
                            <div className="flex justify-between text-xs mt-0.5 text-indigo-700">
                              <span>(-) Retirada Vasilhame Rota:</span>
                              <span className="font-bold">-{m.productionControl.retiradaVasilhameCarga} un</span>
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

                          <div className="flex justify-between text-xs pt-1.5 font-bold text-slate-700 mt-1 uppercase">
                            <span>Produção / Carga Nova:</span>
                            <span className="text-indigo-600 font-extrabold text-xs">{m.productionControl?.totalCarregado || 0} un</span>
                          </div>
                          {m.ownerType === 'proprio' && (() => {
                            const matching = (driverTripLoads || []).filter(t => t.gateMovementId === m.id || (!t.gateMovementId && t.driverName?.toLowerCase() === m.driver?.toLowerCase() && t.vehiclePlate?.toLowerCase() === m.plate?.toLowerCase() && new Date(t.timestamp).getTime() >= new Date(m.timestamp).getTime() - 120000 && new Date(t.timestamp).getTime() <= new Date(m.timestamp).getTime() + 86400000));
                            const grouped = matching.reduce((acc, load) => {
                              const cleanName = load.productName.split('(')[0].trim();
                              const key = load.productId || cleanName.toLowerCase();
                              if (!acc[key]) acc[key] = { id: key, productName: cleanName, initialQty: 0 };
                              acc[key].initialQty += (load.initialQty || 0);
                              return acc;
                            }, {} as Record<string, { id: string; productName: string; initialQty: number }>);
                            return Object.values(grouped).map(load => (
                              <div key={load.id} className="flex justify-between text-xs font-bold text-indigo-700 mt-0.5 uppercase">
                                <span>(+) {load.productName}:</span>
                                <span className="font-extrabold text-xs">+{load.initialQty} un</span>
                              </div>
                            ));
                          })()}
                          {m.productionControl?.retornoVasilhameCheio ? (
                            <div className="flex justify-between text-xs font-bold text-slate-700 mt-0.5 uppercase">
                              <span>(+) Retorno Cheio (no veículo):</span>
                              <span className="text-emerald-600 font-extrabold text-xs">+{m.productionControl.retornoVasilhameCheio} un</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between text-sm pt-2 border-t border-slate-350 font-extrabold text-slate-900 mt-1.5 uppercase">
                            <span>Total Saída do Veículo:</span>
                            <span className="text-emerald-700 font-extrabold text-sm">{(m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0)} un</span>
                          </div>
                        </div>

                        {m.kanbanPauseHistory && m.kanbanPauseHistory.length > 0 && (
                          <div className="border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-500 leading-normal">
                            <span className="font-bold uppercase block text-slate-400 mb-1">Registro de Pausas</span>
                            {m.kanbanPauseHistory.map((p, pIdx) => {
                              const reasonStr = p.reason === 'almoco' ? 'Almoço' : p.reason === 'oficina' ? 'Oficina' : 'Pausa Interna';
                              const durationStr = p.durationMs ? formatDurationStatus(p.durationMs) : 'Em aberto';
                              return (
                                <div key={p.id || pIdx} className="flex justify-between text-[9px] text-slate-500 font-mono">
                                  <span>{pIdx + 1}. {reasonStr}:</span>
                                  <span>{durationStr}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {m.gateTemporaryExits && m.gateTemporaryExits.length > 0 && (
                          <div className="border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-500 leading-normal">
                            <span className="font-bold uppercase block text-slate-400 mb-1">Ausências de Portaria</span>
                            {m.gateTemporaryExits.map((e, eIdx) => {
                              const typeStr = e.type === 'almoco' ? 'Almoço' : 'Oficina';
                              const durationStr = e.durationMs ? formatDurationStatus(e.durationMs) : 'Fora';
                              return (
                                <div key={e.id || eIdx} className="flex justify-between text-[9px] text-slate-500 font-mono">
                                  <span>{eIdx + 1}. Saída {typeStr}:</span>
                                  <span>{durationStr}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {m.productionControl?.observacoes && (
                          <div className="border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-500 leading-normal font-sans">
                            <span className="font-bold uppercase block text-slate-400 mb-0.5">Observações:</span>
                            {m.productionControl.observacoes}
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
                        <div className="font-bold mb-8 uppercase text-[9px]">Assinatura Responsável</div>
                        <div className="border-t border-slate-305 w-32 mx-auto pt-1 font-bold">PRODUÇÃO</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox for large photo viewing */}
      {activeLightboxPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out print:hidden"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img 
              src={activeLightboxPhoto || undefined} 
              alt="Auditoria de Vasilhame" 
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <button 
              type="button"
              onClick={() => setActiveLightboxPhoto(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white hover:text-white p-2 rounded-full cursor-pointer border border-white/10 transition-all font-sans font-bold flex items-center justify-center"
              title="Fechar Imagem"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      {viewerPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="text-amber-600" size={16} /> {viewerPhoto.title}
              </span>
              <button onClick={() => setViewerPhoto(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex justify-center items-center">
              <img 
                src={viewerPhoto.url || undefined} 
                alt="Pedido" 
                className="max-h-[70vh] object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setViewerPhoto(null)} 
                className="bg-slate-900 hover:bg-slate-850 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingSettlement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 text-left">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Detalhes do Acerto - {viewingSettlement.driverName}</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">ID: {viewingSettlement.id}</p>
              </div>
              <button
                onClick={() => setViewingSettlement(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-700">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Veículo / Placa:</span>
                  <span className="text-slate-800 font-bold">{viewingSettlement.plate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Data do Fechamento:</span>
                  <span className="text-slate-800 font-bold">{new Date(viewingSettlement.dateArrival || viewingSettlement.dateSettlement).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Produtos Vendidos</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center">Quantidade</th>
                        <th className="p-2.5 text-right">Unitário</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {viewingSettlement.sales?.map((s: any) => (
                        <tr key={s.id}>
                          <td className="p-2.5 text-slate-900">{s.item}</td>
                          <td className="p-2.5 text-center">{s.qty}</td>
                          <td className="p-2.5 text-right">R$ {(s.value ?? 0).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">R$ {((s.qty ?? 0) * (s.value ?? 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!viewingSettlement.sales || viewingSettlement.sales.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 text-[10px] uppercase">Nenhuma venda informada</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="p-2.5 text-right uppercase">Total Vendas:</td>
                        <td className="p-2.5 text-right">R$ {(viewingSettlement.totalSales ?? 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Despesas Informadas</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {viewingSettlement.expenses?.map((e: any) => (
                        <tr key={e.id}>
                          <td className="p-2.5 text-slate-900">{e.item}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">R$ {(e.value ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!viewingSettlement.expenses || viewingSettlement.expenses.length === 0) && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-slate-400 text-[10px] uppercase">Nenhuma despesa de viagem registrada</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold">
                        <td className="p-2.5 text-right uppercase">Total Despesas:</td>
                        <td className="p-2.5 text-right">R$ {(viewingSettlement.totalExpenses ?? 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conferência de Vasilhames */}
              {(viewingSettlement.missingBottlesQty !== undefined || viewingSettlement.vendaVasilhameQty !== undefined) && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Conferência de Vasilhames</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
                    <div className="bg-slate-50 p-3 rounded">
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">Faltaram no Descarrego:</span>
                      <span>{viewingSettlement.missingBottlesQty ?? 0} un</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">Vendas de Vasilhame:</span>
                      <span>{viewingSettlement.vendaVasilhameQty ?? 0} un</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">Comodatos de Vasilhame:</span>
                      <span>{viewingSettlement.comodatoVasilhameQty ?? 0} un</span>
                    </div>
                    <div className={`p-3 rounded ${((viewingSettlement.finalUnaccountedShortage ?? 0) > 0) ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                      <span className="block text-[9px] uppercase font-semibold">Falta Real na Carga:</span>
                      <span>{viewingSettlement.finalUnaccountedShortage ?? 0} un</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Returns and Discrepancies */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Conferência de Caixa</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
                  <div className="bg-slate-50 p-3 rounded">
                    <span className="block text-[9px] text-slate-400 uppercase font-semibold">Esperado Líquido:</span>
                    <span>R$ {(viewingSettlement.totalToReceive ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded">
                    <span className="block text-[9px] text-slate-400 uppercase font-semibold">Total Entregue:</span>
                    <span>R$ {(viewingSettlement.totalDelivered ?? 0).toFixed(2)}</span>
                  </div>
                  <div className={`p-3 rounded ${(viewingSettlement.difference ?? 0) < 0 ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
                    <span className="block text-[9px] uppercase font-semibold">Diferença:</span>
                    <span>R$ {(viewingSettlement.difference ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded col-span-2 md:col-span-1">
                    <span className="block text-[9px] text-slate-400 uppercase font-semibold">Status PIX:</span>
                    <span className="uppercase text-[10px]">{(viewingSettlement.isReconciled || (viewingSettlement.reconciledPixTransactionIds && viewingSettlement.reconciledPixTransactionIds.length > 0) || viewingSettlement.reconciledPixTransactionId) ? 'Reconciliado' : 'Não Conciliado'}</span>
                  </div>
                </div>
              </div>

              {/* Commission Closing Panel */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-semibold text-xs">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">Resumo da Comissão a Pagar</h4>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Comissão de Viagem ({viewingSettlement.commissionPercent}%):</span>
                  <span>R$ {(viewingSettlement.basicCommission ?? 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-rose-400">
                  <span>Descontos de Avarias / Perdas:</span>
                  <span>- R$ {(viewingSettlement.avariaDeduction ?? 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-rose-400">
                  <span>Descontos por Falta de Caixa:</span>
                  <span>- R$ {(viewingSettlement.shortageDeduction ?? 0).toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm">
                  <span className="text-emerald-400">Comissão Líquida Final:</span>
                  <span className="text-emerald-400 text-base">R$ {(viewingSettlement.finalCommission ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {viewingSettlement.observation && (
                <div className="p-3 bg-slate-50 text-slate-600 rounded text-xs leading-relaxed font-medium">
                  <p className="font-bold uppercase text-[9px] text-slate-400 tracking-wider mb-1">Observações do Acerto:</p>
                  {viewingSettlement.observation}
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                onClick={() => handlePrintSettlement(viewingSettlement)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={14} />
                Imprimir Recibo
              </button>
              <button
                onClick={() => handlePrintCaixa(viewingSettlement)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                <FileText size={14} />
                Recibo de Caixa (Motorista)
              </button>
              <button
                onClick={() => setViewingSettlement(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT ORDER MODAL */}
      {lastSaleForPrint && (() => {
        const groupedPrintSale = groupSales(lastSaleForPrint.sales)[0];
        const clientClean = groupedPrintSale?.clientName || 'Consumidor';
        const driverName = lastSaleForPrint.sales[0]?.driverName || 'Motorista';
        const totalAmount = groupedPrintSale?.totalValue || 0;
        const hasSignature = !!groupedPrintSale?.signature;
        const isSaleSettled = lastSaleForPrint.sales[0]?.source === 'Acertado';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:my-0 print:mx-auto">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center print:hidden">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Printer size={13} />
                  Pedido de Venda
                </span>
                <button 
                  onClick={() => setLastSaleForPrint(null)} 
                  className="text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
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
                  <div className="text-xs text-slate-500 mt-1 print:text-black">
                    {lastSaleForPrint.sales[0]?.date 
                      ? (lastSaleForPrint.sales[0].date.includes('T') ? new Date(lastSaleForPrint.sales[0].date).toLocaleString('pt-BR') : lastSaleForPrint.sales[0].date)
                      : new Date().toLocaleString('pt-BR')
                    }
                  </div>
                  <div className="text-xs font-bold mt-1">PEDIDO Nº: {lastSaleForPrint.saleNumber}</div>
                </div>

                {/* Client Info */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3 space-y-1 text-xs print:border-black">
                  <div className="flex justify-between">
                    <span className="font-bold">CLIENTE:</span>
                    <span className="text-right max-w-[200px] uppercase font-sans font-bold">{clientClean}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">MOTORISTA:</span>
                    <span className="text-right uppercase font-sans">{driverName}</span>
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
                        <span className="flex-1 pr-2 truncate uppercase font-sans">{p.itemDisplayName}</span>
                        <span className="w-8 text-center font-bold">{Math.round(p.qty)}</span>
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
                      <span className="text-[9px] uppercase mt-1 text-slate-500">Assinatura do Cliente</span>
                      {!isSaleSettled && currentUser?.role !== 'supervisor' && currentUser?.role !== 'visualizador' && (
                        <button
                          type="button"
                          onClick={() => handleSaveSignatureForSaleInReport(lastSaleForPrint.saleNumber, null)}
                          className="text-[9px] text-red-500 hover:underline mt-1 print:hidden block mx-auto font-bold cursor-pointer"
                        >
                          Limpar/Refazer Assinatura
                        </button>
                      )}
                    </div>
                  ) : (
                    !isSaleSettled && currentUser?.role !== 'supervisor' && currentUser?.role !== 'visualizador' ? (
                      <div className="flex flex-col items-center mt-2 print:hidden">
                        <div className="w-full max-w-[280px] border border-dashed border-slate-300 rounded p-1.5 bg-slate-50">
                          <SignaturePad 
                            onSign={(sig) => {
                              if (sig) {
                                handleSaveSignatureForSaleInReport(lastSaleForPrint.saleNumber, sig);
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
                          : 'Assinatura indisponível (Acerto Finalizado)'}
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer size={13} />
                  Abrir em Nova Guia (Imprimir / PDF)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => printElementDirectly('print-order-content', `Pedido_${lastSaleForPrint.saleNumber}`)}
                    className="bg-slate-900 hover:bg-slate-800 text-white py-2 rounded text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer size={13} />
                    Imprimir Direto
                  </button>
                  <button
                    onClick={() => setLastSaleForPrint(null)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-black uppercase tracking-widest cursor-pointer"
                  >
                    Fechar
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

const valorPorExtenso = (valor: number): string => {
  if (valor <= 0) return 'zero reais';
  
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const dezoito = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  const converterMenorQueMil = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    
    let result = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (c > 0) {
      result += centenas[c];
    }
    
    if (d > 0 || u > 0) {
      if (result !== '') result += ' e ';
      if (d === 1) {
        result += dezoito[u];
      } else {
        if (d > 1) {
          result += dezenas[d];
          if (u > 0) result += ' e ' + unidades[u];
        } else if (u > 0) {
          result += unidades[u];
        }
      }
    }
    return result;
  };

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  
  let textoReais = '';
  if (inteiro > 0) {
    if (inteiro < 1000) {
      textoReais = converterMenorQueMil(inteiro);
    } else {
      const mil = Math.floor(inteiro / 1000);
      const resto = inteiro % 1000;
      
      const textoMil = mil === 1 ? 'mil' : converterMenorQueMil(mil) + ' mil';
      const textoResto = converterMenorQueMil(resto);
      
      textoReais = textoMil + (textoResto !== '' ? ' e ' + textoResto : '');
    }
    textoReais += inteiro === 1 ? ' real' : ' reais';
  }
  
  let textoCentavos = '';
  if (centavos > 0) {
    if (centavos < 10) {
      textoCentavos = unidades[centavos];
    } else if (centavos < 20) {
      textoCentavos = dezoito[centavos - 10];
    } else {
      const d = Math.floor(centavos / 10);
      const u = centavos % 10;
      textoCentavos = dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
    }
    textoCentavos += centavos === 1 ? ' centavo' : ' centavos';
  }
  
  if (textoReais !== '' && textoCentavos !== '') {
    return textoReais + ' e ' + textoCentavos;
  }
  return textoReais || textoCentavos || 'zero reais';
};

const renderSalesRows = (sales: any[]) => {
  if (!sales || sales.length === 0) return '<tr><td colspan="4">Nenhuma venda informada</td></tr>';
  return sales.map(s => `
    <tr>
      <td style="font-weight: 600;">${s.item}</td>
      <td style="font-weight: 700; font-family: monospace;">${s.qty}</td>
      <td style="font-family: monospace;">R$ ${s.value.toFixed(2)}</td>
      <td style="font-weight: 700; font-family: monospace;">R$ ${(s.qty * s.value).toFixed(2)}</td>
    </tr>
  `).join('');
};

const renderExpensesRows = (expenses: any[]) => {
  if (!expenses || expenses.length === 0) return '<tr><td colspan="2" style="color: #64748b; font-style: italic;">Nenhuma despesa informada</td></tr>';
  return expenses.map(e => `
    <tr>
      <td style="font-weight: 500;">${e.item}</td>
      <td style="font-weight: 700; font-family: monospace;">R$ ${e.value.toFixed(2)}</td>
    </tr>
  `).join('');
};
