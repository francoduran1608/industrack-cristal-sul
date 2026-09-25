import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, CheckCircle2, XCircle, Search, Filter, Eye, AlertTriangle, X, ShieldAlert, Cpu, Key, Globe, Send, Copy, ExternalLink, Code } from 'lucide-react';

interface FirebirdLancamento {
  ID: number;
  UUID: string;
  CODIGO_PRODUCAO?: string;
  PLACA: string;
  MOTORISTA: string;
  TIPO_PROPRIETARIO: string;
  TIPO_VEICULO: string;
  ODOMETRO: number;
  TIPO_FLUXO: string;
  STATUS_MOVIMENTO: string;
  FINALIDADE?: string;
  UNIDADE: string;
  DATA_ENTRADA: string;
  DATA_SAIDA?: string;
  OPERADOR_ENTRADA?: string;
  OPERADOR_SAIDA?: string;
  ETAPA_KANBAN?: string;
  PRODUCAO_ID?: number;
  OPERADOR_PRODUCAO?: string;
  DESCARREGADO_TOTAL: number;
  CARREGADO_TOTAL: number;
  CORPO_ESTRANHO_TOTAL: number;
  MAL_LAVADO_TOTAL: number;
  VASILHAMES_RETORNADOS_LAVAR: number;
  TAMPAS_UTILIZADAS: number;
  LACRES_UTILIZADOS: number;
  RETIRADA_VASILHAME_CARGA: number;
  PRODUCAO_CONCLUIDA?: string;
}

interface FirebirdAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: any;
}

export const FirebirdAuditModal: React.FC<FirebirdAuditModalProps> = ({
  isOpen,
  onClose,
  appState
}) => {
  const [status, setStatus] = useState<{
    online: boolean;
    config?: any;
    mensagem?: string;
    timestamp?: string;
  } | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lancamentos, setLancamentos] = useState<FirebirdLancamento[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [filtroPlaca, setFiltroPlaca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [selectedLancamento, setSelectedLancamento] = useState<any | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'integracao_api'>('lancamentos');

  // Estados da API de Integração
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookAtivo, setWebhookAtivo] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      carregarLancamentos();
      carregarConfigWebhook();
    }
  }, [isOpen]);

  const carregarConfigWebhook = async () => {
    try {
      const res = await fetch('/api/v1/integracao/webhooks/config', {
        headers: { 'x-api-key': 'chave_integracao_padrao_logistica_2026' }
      });
      const data = await res.json();
      if (data.sucesso && data.webhook) {
        setWebhookUrl(data.webhook.url || '');
        setWebhookAtivo(!!data.webhook.ativo);
      }
    } catch (e) {}
  };

  const handleSalvarWebhook = async () => {
    setSavingWebhook(true);
    try {
      const res = await fetch('/api/v1/integracao/webhooks/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'chave_integracao_padrao_logistica_2026'
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret: webhookSecret,
          active: webhookAtivo
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        alert('Configuração de integração Webhook salva com sucesso!');
      } else {
        alert('Erro ao salvar: ' + (data.erro || 'Falha'));
      }
    } catch (err: any) {
      alert('Erro na requisição: ' + err.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestarWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/integracao/webhooks/teste', {
        method: 'POST',
        headers: { 'x-api-key': 'chave_integracao_padrao_logistica_2026' }
      });
      const data = await res.json();
      if (data.sucesso) {
        setTestResult('✅ ' + data.mensagem);
      } else {
        setTestResult('❌ ' + data.erro);
      }
    } catch (err: any) {
      setTestResult('❌ Falha ao disparar teste: ' + err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  const checkStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/firebird/status');
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setStatus({
        online: false,
        mensagem: 'Backend não acessível ou sem resposta: ' + err.message
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const carregarLancamentos = async () => {
    setLoadingLancamentos(true);
    try {
      let url = '/api/firebird/lancamentos?limite=300';
      if (filtroPlaca) url += `&placa=${encodeURIComponent(filtroPlaca)}`;
      if (filtroStatus !== 'todos') url += `&status=${encodeURIComponent(filtroStatus)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.dados)) {
        setLancamentos(data.dados);
      } else {
        // Fallback: se o banco Firebird ainda não estiver conectado no preview, mostrar dados do estado local
        const mapped = (appState.movements || []).map((m: any, idx: number) => ({
          ID: idx + 1,
          UUID: m.id,
          CODIGO_PRODUCAO: m.productionCode || `P-${m.plate}`,
          PLACA: m.plate || 'S/ PLACA',
          MOTORISTA: m.driver || 'Não Informado',
          TIPO_PROPRIETARIO: m.ownerType || 'proprio',
          TIPO_VEICULO: m.vehicleType || 'Truck',
          ODOMETRO: m.odometer || 0,
          TIPO_FLUXO: m.type || 'entrada',
          STATUS_MOVIMENTO: m.status || 'na_fila',
          FINALIDADE: m.purpose || 'producao',
          UNIDADE: m.unit || 'matriz',
          DATA_ENTRADA: m.entryTimestamp || m.timestamp || new Date().toISOString(),
          DATA_SAIDA: m.exitTimestamp || undefined,
          OPERADOR_ENTRADA: m.createdBy || 'Sistema',
          OPERADOR_SAIDA: m.exitOperator || undefined,
          ETAPA_KANBAN: m.kanbanStage || 'aguardando_descarregamento',
          DESCARREGADO_TOTAL: m.productionControl?.vasilhamesDescarregados || 0,
          CARREGADO_TOTAL: m.productionControl?.vasilhamesCarregados || 0,
          CORPO_ESTRANHO_TOTAL: 0,
          MAL_LAVADO_TOTAL: 0,
          VASILHAMES_RETORNADOS_LAVAR: m.productionControl?.vasilhamesRetornadosLavagem || 0,
          TAMPAS_UTILIZADAS: m.productionControl?.tampasUtilizadas || 0,
          LACRES_UTILIZADOS: m.productionControl?.lacresUtilizados || 0,
          RETIRADA_VASILHAME_CARGA: m.productionControl?.retiradaVasilhameCarga || 0,
          PRODUCAO_CONCLUIDA: m.productionControl?.isCompleted ? 'S' : 'N'
        }));
        setLancamentos(mapped);
      }
    } catch (err) {
      console.warn("Erro ao buscar lançamentos do Firebird, exibindo lançamentos da memória:", err);
    } finally {
      setLoadingLancamentos(false);
    }
  };

  const handleForcarSincronizacao = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/firebird/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sincronização concluída com sucesso! Registros processados: ${data.resultado?.totalProcessado || 0}`);
        await carregarLancamentos();
      } else {
        alert('Aviso na sincronização: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      alert('Falha ao comunicar com o backend do Firebird: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleVerDetalhes = async (id: number) => {
    setLoadingDetalhes(true);
    try {
      const res = await fetch(`/api/firebird/lancamentos/${id}`);
      const data = await res.json();
      if (data.success && data.dados) {
        setSelectedLancamento(data.dados);
      } else {
        const item = lancamentos.find(l => l.ID === id);
        setSelectedLancamento(item || null);
      }
    } catch (err) {
      const item = lancamentos.find(l => l.ID === id);
      setSelectedLancamento(item || null);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="firebird-audit-modal-backdrop" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div id="firebird-audit-modal-container" className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div id="firebird-audit-header" className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Servidor, Banco Firebird & API de Integração</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  On-Premise / ERP Integration
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lançamentos relacionais e API aberta para recepção de dados em outros sistemas (ERP, Fiscal e Estoque)
              </p>
            </div>
          </div>
          <button
            id="firebird-audit-close-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Lançamentos vs API de Integração) */}
        <div className="px-6 bg-slate-900 border-b border-slate-800 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`py-2.5 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'lancamentos'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            Lançamentos Salvos no Servidor (Firebird 5.0)
          </button>

          <button
            onClick={() => setActiveTab('integracao_api')}
            className={`py-2.5 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'integracao_api'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            API para o Outro Sistema (ERP, Estoque & Despesas)
          </button>
        </div>

        {/* Status Bar */}
        <div id="firebird-status-bar" className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-slate-500">Status do Banco:</span>
              {loadingStatus ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verificando...
                </span>
              ) : status?.online ? (
                <span className="text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Firebird 5.0 Conectado
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" title={status?.mensagem}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Aguardando Conexão Firebird ({status?.config?.host || '127.0.0.1'}:{status?.config?.port || '3050'})
                </span>
              )}
            </div>

            {status?.config && (
              <div className="hidden sm:flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span>FDB: {status.config.database}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="firebird-check-status-btn"
              onClick={checkStatus}
              disabled={loadingStatus}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white flex items-center gap-1.5 font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              Testar Conexão
            </button>

            <button
              id="firebird-force-sync-btn"
              onClick={handleForcarSincronizacao}
              disabled={syncing}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold shadow-xs transition"
            >
              <Cpu className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Todos os Lançamentos'}
            </button>

            <a
              id="firebird-export-csv-btn"
              href="/api/firebird/exportar/csv"
              download
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV / Excel
            </a>
          </div>
        </div>

        {activeTab === 'lancamentos' ? (
          <>
            {/* Filters */}
            <div id="firebird-filters" className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="firebird-filter-placa-input"
                    type="text"
                    placeholder="Filtrar por placa ou motorista..."
                    value={filtroPlaca}
                    onChange={(e) => setFiltroPlaca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && carregarLancamentos()}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Status:</span>
                  <select
                    id="firebird-filter-status-select"
                    value={filtroStatus}
                    onChange={(e) => {
                      setFiltroStatus(e.target.value);
                      setTimeout(carregarLancamentos, 50);
                    }}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="todos">Todos</option>
                    <option value="na_fila">Na Fila</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="concluido">Concluídos</option>
                    <option value="saida">Liberados (Saída)</option>
                  </select>
                </div>

                <button
                  id="firebird-refresh-table-btn"
                  onClick={carregarLancamentos}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600"
                  title="Recarregar lançamentos"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLancamentos ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table of Movements */}
            <div id="firebird-table-wrapper" className="flex-1 overflow-auto p-6 bg-slate-50">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3">Cód. Produção</th>
                      <th className="py-2.5 px-3">Placa / Veículo</th>
                      <th className="py-2.5 px-3">Motorista</th>
                      <th className="py-2.5 px-3">Entrada / Saída</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Desc.</th>
                      <th className="py-2.5 px-3 text-right">Carreg.</th>
                      <th className="py-2.5 px-3 text-right">Ret. Lavar</th>
                      <th className="py-2.5 px-3 text-right">Tampas</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {loadingLancamentos ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                          Carregando lançamentos do Firebird 5.0...
                        </td>
                      </tr>
                    ) : lancamentos.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          Nenhum lançamento encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      lancamentos.map((l) => (
                        <tr key={l.ID || l.UUID} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {l.CODIGO_PRODUCAO || `MOV-${l.ID}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{l.PLACA}</div>
                            <div className="text-[10px] text-slate-400">{l.TIPO_VEICULO} • {l.TIPO_PROPRIETARIO}</div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[150px] truncate" title={l.MOTORISTA}>
                            {l.MOTORISTA}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            <div>Ent: {new Date(l.DATA_ENTRADA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                            {l.DATA_SAIDA && (
                              <div className="text-emerald-700">Saí: {new Date(l.DATA_SAIDA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.STATUS_MOVIMENTO === 'concluido' || l.STATUS_MOVIMENTO === 'saida'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : l.STATUS_MOVIMENTO === 'em_atendimento'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {l.STATUS_MOVIMENTO === 'saida' ? 'LIBERADO' : l.STATUS_MOVIMENTO.toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {l.DESCARREGADO_TOTAL}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {l.CARREGADO_TOTAL}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                            {l.VASILHAMES_RETORNADOS_LAVAR}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {l.TAMPAS_UTILIZADAS}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              id={`firebird-view-btn-${l.ID}`}
                              onClick={() => handleVerDetalhes(l.ID)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 rounded-md transition"
                              title="Ver detalhes completos do lançamento"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Aba: API de Integração para Outros Sistemas (ERP / Estoque / Despesas) */
          <div id="firebird-api-integration-panel" className="flex-1 overflow-auto p-6 bg-slate-50 space-y-6 text-xs">
            {/* Bloco de Chave de Acesso */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Autenticação da API para o Outro Sistema</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Ativa
                </span>
              </div>
              <p className="text-slate-600">
                O outro sistema (ERP, TOTVS, SAP, Fiscal ou Estoque) deve enviar a chave abaixo no cabeçalho HTTP:
                <code className="ml-1 font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">x-api-key: SUA_CHAVE</code> ou <code className="ml-1 font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Authorization: Bearer SUA_CHAVE</code>.
              </p>
              
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  readOnly
                  value="chave_integracao_padrao_logistica_2026"
                  className="flex-1 font-mono text-xs bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('chave_integracao_padrao_logistica_2026');
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey ? 'Copiada!' : 'Copiar Chave'}
                </button>
              </div>
            </div>

            {/* Endpoints de Recepção de Dados */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Endpoints REST Disponíveis para o Outro Sistema Consumir</h3>
              </div>

              <div className="space-y-3">
                {/* Carregamento */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      GET /api/v1/integracao/carregamentos
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Cargas, Vistorias & Avarias</span>
                  </div>
                  <p className="text-slate-600">
                    Retorna os caminhões expedidos com vasilhames descarregados, carregados, itens retornados para lavagem (corpo estranho/mal lavado) e tampas. Suporta <code className="text-slate-800 font-mono">?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD&placa=ABC1234</code>.
                  </p>
                </div>

                {/* Estoque */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      GET /api/v1/integracao/estoque
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Saldos & Movimentações de Estoque</span>
                  </div>
                  <p className="text-slate-600">
                    Retorna saldos acumulados de vasilhames cheios, vazios, descarte de sucata, tampas e requisições de estoque.
                  </p>
                </div>

                {/* Despesas */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      GET /api/v1/integracao/despesas
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Abastecimentos & Custos Operacionais</span>
                  </div>
                  <p className="text-slate-600">
                    Consolida abastecimentos de frotas (litros, odômetro, custo), compras de diesel/Arla a granel com nota fiscal e acertos de viagem de motoristas.
                  </p>
                </div>
              </div>
            </div>

            {/* Configuração de Webhook de Envio Ativo */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Notificação Automática via Webhook (Envio Instantâneo)</h3>
              </div>
              <p className="text-slate-600">
                Se preferir que nosso sistema avise o seu ERP automaticamente assim que um caminhão terminar o carregamento ou uma despesa for registrada, informe o endereço de webhook do outro sistema:
              </p>

              <div className="space-y-3 max-w-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    URL do Webhook Receptor (no seu outro sistema):
                  </label>
                  <input
                    type="url"
                    placeholder="https://seu-erp.com.br/api/receber-logistica"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={webhookAtivo}
                      onChange={(e) => setWebhookAtivo(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Ativar envio automático de Webhooks
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSalvarWebhook}
                    disabled={savingWebhook}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                  >
                    {savingWebhook ? 'Salvando...' : 'Salvar Configuração'}
                  </button>

                  <button
                    onClick={handleTestarWebhook}
                    disabled={testingWebhook || !webhookUrl}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 transition"
                  >
                    {testingWebhook ? 'Testando...' : 'Disparar Teste'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${
                    testResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Lançamento */}
        {selectedLancamento && (
          <div id="firebird-details-overlay" className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div id="firebird-details-card" className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Detalhes do Lançamento Firebird: {selectedLancamento.CODIGO_PRODUCAO || selectedLancamento.PLACA}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLancamento(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Placa:</span>
                    <strong className="text-slate-800 text-sm font-bold">{selectedLancamento.PLACA}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Motorista:</span>
                    <strong className="text-slate-800 font-semibold">{selectedLancamento.MOTORISTA}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <strong className="text-blue-700 font-semibold">{selectedLancamento.STATUS_MOVIMENTO}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Unidade:</span>
                    <strong className="text-slate-800 font-semibold">{selectedLancamento.UNIDADE}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2.5 bg-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Descarregado</span>
                    <span className="text-base font-bold text-slate-800">{selectedLancamento.DESCARREGADO_TOTAL || 0}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">Carregado</span>
                    <span className="text-base font-bold text-emerald-800">{selectedLancamento.CARREGADO_TOTAL || 0}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">Ret. Lavar</span>
                    <span className="text-base font-bold text-blue-800">{selectedLancamento.VASILHAMES_RETORNADOS_LAVAR || 0}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-700 uppercase font-bold block">Tampas</span>
                    <span className="text-base font-bold text-amber-800">{selectedLancamento.TAMPAS_UTILIZADAS || 0}</span>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-[10px] text-purple-700 uppercase font-bold block">Lacres</span>
                    <span className="text-base font-bold text-purple-800">{selectedLancamento.LACRES_UTILIZADOS || 0}</span>
                  </div>
                </div>

                {selectedLancamento.avarias && selectedLancamento.avarias.length > 0 ? (
                  <div>
                    <h4 className="font-bold text-slate-700 mb-2">Itens de Avaria e Vistoria Registrados no Firebird:</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                          <tr>
                            <th className="p-2">Fase</th>
                            <th className="p-2">Tipo de Ocorrência</th>
                            <th className="p-2">Categoria</th>
                            <th className="p-2 text-right">Qtd</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedLancamento.avarias.map((av: any) => (
                            <tr key={av.ID || av.TIPO_AVARIA}>
                              <td className="p-2 font-semibold capitalize">{av.FASE}</td>
                              <td className="p-2 font-bold text-slate-800">{av.TIPO_AVARIA}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  av.CATEGORIA === 'retorno_lavagem'
                                    ? 'bg-blue-100 text-blue-800'
                                    : av.CATEGORIA === 'compra'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {av.CATEGORIA}
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800">{av.QUANTIDADE}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center py-2">
                    Nenhuma avaria específica lançada para este movimento.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedLancamento(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
