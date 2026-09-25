import React, { useState } from 'react';
import { useStore, cleanOccurrenceTypeName } from '../store';
import { LogOut, Truck, LayoutDashboard, Route, Droplet, FileBarChart, Bot, Users, ClipboardList, Settings, Boxes, Receipt, Menu, PackageCheck, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { FirebirdAuditModal } from './FirebirdAuditModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const store = useStore();
  const { 
    currentUser, 
    logout, 
    companyLogo, 
    updateSystemUser,
    hasPendingSync,
    triggerManualSync
  } = store;

  const [isFirebirdModalOpen, setIsFirebirdModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const [isRelatoriosDropdownOpen, setIsRelatoriosDropdownOpen] = useState(false);
  const [currentRelatorioSubtab, setCurrentRelatorioSubtab] = useState(() => {
    return localStorage.getItem('relatorio_subtab') || 'viagens';
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const handleSubtabChange = (e: any) => {
      if (e.detail) {
        setCurrentRelatorioSubtab(e.detail);
      }
    };
    window.addEventListener('relatorio_subtab_change', handleSubtabChange);
    return () => window.removeEventListener('relatorio_subtab_change', handleSubtabChange);
  }, []);

  const relatorioSubItems = [
    { id: 'viagens', label: 'Dossiê da Viagem (Unificado)' },
    { id: 'producao', label: 'Produção Retornável (20L)' },
    { id: 'paradas_maquina', label: 'Paradas & Ociosidade de Máquinas' },
    { id: 'descartavel', label: 'Linha Descartável & Expedição' },
    { id: 'vendas', label: 'Relatório Geral de Vendas' },
    { id: 'acertos', label: 'Acerto de Contas (Motoristas)' },
    { id: 'logs', label: 'Logs de Portaria' },
    { id: 'abastecimentos', label: 'Abastecimentos & Média' },
    { id: 'compras_cliente', label: 'Compras por Cliente' },
    { id: 'cidades', label: 'Vendas por Cidade' },
    { id: 'avarias', label: 'Avarias & Perdas' },
    { id: 'inspecoes', label: 'Inspeção e Vistorias' },
  ];



  const rawNavItems = [
    { id: 'minha-viagem', label: 'Minha Viagem', icon: Route, motoristaOnly: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portaria', label: 'Portaria', icon: Truck },
    { id: 'fila', label: 'Fila Produção', icon: Route },
    { id: 'estoque', label: 'Estoque Produtos', icon: Boxes },
    { id: 'linha-descartavel', label: 'Linha Descartável', icon: PackageCheck },
    { id: 'abastecimento', label: 'Serviços/Base', icon: Droplet },
    { id: 'prestacao-contas', label: 'Prestação de Contas', icon: Receipt },
    { id: 'relatorios', label: 'Relatórios', icon: FileBarChart },
    { id: 'cadastros', label: 'Pré-Cadastros', icon: ClipboardList },
    { id: 'usuarios', label: 'Controle de Acessos', icon: Users, adminOnly: true },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  const navItems = rawNavItems.filter((item) => {
    if (currentUser?.role === 'motorista') {
      return item.id === 'minha-viagem';
    }

    if (item.motoristaOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'operador' && currentUser?.role !== 'supervisor') {
      return false;
    }

    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    
    if ((currentUser?.role === 'operador' || currentUser?.role === 'visualizador' || currentUser?.role === 'supervisor') && item.id !== 'dashboard') {
      if (currentUser?.role === 'supervisor') {
        return true;
      }
      const userModules = (currentUser as any).modules || {};
      if (item.id === 'minha-viagem') {
        return true;
      }
      if (item.id === 'cadastros') {
        return !!userModules.cadastros;
      }
      if (item.id === 'prestacao-contas') {
        return !!userModules.prestacao_contas || !!userModules.relatorios;
      }
      if (item.id === 'linha-descartavel') {
        return !!userModules.linha_descartavel;
      }
      return !!userModules[item.id];
    }

    return true;
  });

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`
        ${isSidebarCollapsed ? 'w-0 border-r-0 opacity-0 overflow-hidden' : 'w-16 md:w-56'}
        flex flex-col bg-slate-900 items-center md:items-start py-4 shrink-0 border-r border-slate-800 transition-all duration-300 ease-in-out print:hidden
      `}>
        <div className="px-0 md:px-4 w-full flex justify-center md:justify-start items-center space-x-3 mb-6 whitespace-nowrap overflow-hidden">
          {companyLogo ? (
            <img 
              src={companyLogo || undefined} 
              alt="Logo" 
              className="w-8 h-8 object-contain rounded bg-white p-0.5 shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 font-bold text-xs bg-blue-600 rounded flex items-center justify-center text-white shrink-0">LOG</div>
          )}
          <h1 className="hidden md:block text-sm font-bold tracking-tight text-white uppercase truncate">Terrasul</h1>
        </div>

        <nav className="flex-1 w-full px-2 flex flex-col gap-1 items-center md:items-stretch overflow-x-hidden overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.id === 'relatorios') {
              const isRelatorioOpen = isRelatoriosDropdownOpen || isActive;
              return (
                <div key={item.id} className="w-full flex flex-col">
                  <button
                    onClick={() => {
                      if (activeTab !== 'relatorios') {
                        setActiveTab('relatorios');
                      }
                      setIsRelatoriosDropdownOpen(!isRelatoriosDropdownOpen);
                    }}
                    title={item.label}
                    className={`w-full flex items-center justify-between p-2 md:px-3 rounded transition-colors text-sm relative whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-blue-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon size={20} className="shrink-0" />
                      <span className="hidden md:inline text-left truncate">{item.label}</span>
                    </div>
                    <div className="hidden md:flex items-center text-slate-400 hover:text-slate-200 p-0.5">
                      {isRelatorioOpen ? (
                        <ChevronUp size={16} className="shrink-0 transition-transform" />
                      ) : (
                        <ChevronDown size={16} className="shrink-0 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Submodulo com todos os relatorios do sistema */}
                  {isRelatorioOpen && (
                    <div className="hidden md:flex flex-col gap-0.5 mt-1 mb-1 pl-4 pr-1 border-l-2 border-slate-700/60 ml-3">
                      {relatorioSubItems.map((sub) => {
                        const isSubActive = isActive && currentRelatorioSubtab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab(`relatorios:${sub.id}`);
                              setCurrentRelatorioSubtab(sub.id);
                            }}
                            className={`w-full text-left py-1 px-2 rounded text-[11px] font-medium transition-all flex items-center justify-between cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600/20 text-blue-300 font-bold border-l-2 border-blue-400 pl-2.5'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                            {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-center md:justify-start space-x-3 p-2 md:px-3 rounded transition-colors text-sm relative whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="hidden md:inline flex-1 text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-2 md:px-4 w-full mt-auto overflow-hidden">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 bg-slate-800 p-2 rounded text-slate-300 whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="hidden md:block flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-tight">
                  {currentUser?.role === 'supervisor' ? 'Supervisor Vendas' : currentUser?.role}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wide px-1 py-0.2 rounded-sm ${
                  currentUser?.unit === 'filial' 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {currentUser?.unit === 'filial' ? 'Filial' : 'Matriz'}
                </span>
              </div>
            </div>
            <button onClick={logout} title="Sair" className="hover:text-white p-1 cursor-pointer shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                const newValue = !isSidebarCollapsed;
                setIsSidebarCollapsed(newValue);
                localStorage.setItem('sidebar_collapsed', String(newValue));
              }}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Mostrar menu lateral" : "Esconder menu lateral"}
            >
              <Menu size={20} />
            </button>
            {companyLogo && (
              <img 
                src={companyLogo || undefined} 
                alt="Logo Empresa" 
                className="h-8 max-w-[125px] object-contain rounded border border-slate-200 p-0.5" 
                referrerPolicy="no-referrer"
              />
            )}
            <h2 className="text-[13px] md:text-sm font-bold text-slate-800 uppercase tracking-tight truncate mr-4">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex gap-2 sm:gap-4 items-center shrink-0">
            {/* Sync status indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {!isOnline ? (
                <div 
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold shadow-sm border border-red-700 animate-pulse"
                  title="Sem conexão de internet. Os lançamentos estão salvos localmente no navegador e serão sincronizados automaticamente assim que a conexão retornar."
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="hidden sm:inline">Modo Offline</span>
                  <span className="sm:hidden">Offline</span>
                </div>
              ) : (
                <>
                  {/* Connected Indicator - Always green when online */}
                  <div 
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-bold border border-emerald-700 shadow-sm"
                    title="Dispositivo conectado à internet e à nuvem!"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span className="hidden sm:inline">Conectado</span>
                  </div>

                  {/* Manual Sync Action Button - Simple with name "Sincronizar" */}
                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        await triggerManualSync();
                      } catch (err) {
                        console.error("Sync error:", err);
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-bold shadow-sm border transition-all cursor-pointer bg-white hover:bg-slate-50 border-slate-200 text-slate-700 disabled:opacity-75"
                    title="Sincronizar e atualizar dados imediatos com a nuvem."
                  >
                    {isSyncing ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="hidden sm:inline text-[11px]">Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                        </svg>
                        <span className="hidden sm:inline text-[11px]">Sincronizar</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Botão Servidor & Firebird 5.0 */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor') && (
              <button
                id="btn-firebird-audit-modal"
                onClick={() => setIsFirebirdModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 shadow-sm transition cursor-pointer"
                title="Visualizar todos os lançamentos salvos no servidor e banco de dados Firebird 5.0"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Servidor & Firebird</span>
                <span className="sm:hidden">Firebird</span>
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:border-r border-slate-200 sm:pr-4">
                <span className="hidden sm:inline text-slate-500 uppercase font-black text-[9px] tracking-wider">Alt. Unidade:</span>
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                  <button
                    onClick={() => updateSystemUser(currentUser.id, { unit: 'matriz' })}
                    className={`px-1.5 sm:px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-all rounded cursor-pointer ${
                      currentUser.unit !== 'filial'
                        ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="hidden sm:inline">Matriz</span>
                    <span className="sm:hidden">Mtz</span>
                  </button>
                  <button
                    onClick={() => updateSystemUser(currentUser.id, { unit: 'filial' })}
                    className={`px-1.5 sm:px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-all rounded cursor-pointer ${
                      currentUser.unit === 'filial'
                        ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="hidden sm:inline">Filial</span>
                    <span className="sm:hidden">Fil</span>
                  </button>
                </div>
              </div>
            )}
            <div className="hidden sm:flex gap-2 items-center text-[11px] border-r border-slate-200 pr-4">
              <span className="text-slate-500 uppercase font-semibold">Status do Pátio:</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">OPERACIONAL</span>
            </div>
            <div className="hidden md:block text-[11px] text-slate-600 font-medium whitespace-nowrap">
              {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* Body Content */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-full min-h-full flex flex-col">
          {children}
          </div>
        </div>
      </main>

      {/* Modal de Auditoria do Servidor & Firebird 5.0 */}
      <FirebirdAuditModal
        isOpen={isFirebirdModalOpen}
        onClose={() => setIsFirebirdModalOpen(false)}
        appState={store}
      />
    </div>
  );
};
