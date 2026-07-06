import React from 'react';
import { useStore, cleanOccurrenceTypeName } from '../store';
import { LogOut, Truck, LayoutDashboard, Route, Droplet, FileBarChart, Bot, Users, ClipboardList, Settings, Boxes, Receipt } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { 
    currentUser, 
    logout, 
    companyLogo, 
    updateSystemUser
  } = useStore();

  const rawNavItems = [
    { id: 'minha-viagem', label: 'Minha Viagem', icon: Route, motoristaOnly: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portaria', label: 'Portaria', icon: Truck },
    { id: 'fila', label: 'Fila Produção', icon: Route },
    { id: 'estoque', label: 'Estoque Produtos', icon: Boxes },
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

    if (item.motoristaOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'operador') {
      return false;
    }

    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    
    if ((currentUser?.role === 'operador' || currentUser?.role === 'visualizador') && item.id !== 'dashboard') {
      const userModules = (currentUser as any).modules || {};
      if (item.id === 'cadastros') {
        return !!userModules.cadastros;
      }
      if (item.id === 'prestacao-contas') {
        return !!userModules.prestacao_contas || !!userModules.relatorios;
      }
      return !!userModules[item.id];
    }

    return true;
  });

  return (
    <div className="flex h-full w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-56 flex flex-col bg-slate-900 items-center md:items-start py-4 shrink-0 border-r border-slate-800 print:hidden">
        <div className="px-0 md:px-4 w-full flex justify-center md:justify-start items-center space-x-3 mb-6">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Logo" 
              className="w-8 h-8 object-contain rounded bg-white p-0.5 shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 font-bold text-xs bg-blue-600 rounded flex items-center justify-center text-white shrink-0">LOG</div>
          )}
          <h1 className="hidden md:block text-sm font-bold tracking-tight text-white uppercase">Terrasul</h1>
        </div>

        <nav className="flex-1 w-full px-2 flex flex-col gap-1 items-center md:items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-center md:justify-start space-x-3 p-2 md:px-3 rounded transition-colors text-sm relative ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="hidden md:inline flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-2 md:px-4 w-full mt-auto">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 bg-slate-800 p-2 rounded text-slate-300">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="hidden md:block flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-tight">{currentUser?.role}</span>
                <span className={`text-[8px] font-black uppercase tracking-wide px-1 py-0.2 rounded-sm ${
                  currentUser?.unit === 'filial' 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {currentUser?.unit === 'filial' ? 'Filial' : 'Matriz'}
                </span>
              </div>
            </div>
            <button onClick={logout} title="Sair" className="hover:text-white p-1">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            {companyLogo && (
              <img 
                src={companyLogo} 
                alt="Logo Empresa" 
                className="h-8 max-w-[125px] object-contain rounded border border-slate-200 p-0.5" 
                referrerPolicy="no-referrer"
              />
            )}
            <h2 className="text-[13px] md:text-sm font-bold text-slate-800 uppercase tracking-tight truncate mr-4">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex gap-4 items-center shrink-0">
            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-1.5 text-[11px] border-r border-slate-200 pr-4">
                <span className="text-slate-500 uppercase font-black text-[9px] tracking-wider">Alt. Unidade:</span>
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                  <button
                    onClick={() => updateSystemUser(currentUser.id, { unit: 'matriz' })}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-all rounded cursor-pointer ${
                      currentUser.unit !== 'filial'
                        ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Matriz
                  </button>
                  <button
                    onClick={() => updateSystemUser(currentUser.id, { unit: 'filial' })}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider transition-all rounded cursor-pointer ${
                      currentUser.unit === 'filial'
                        ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Filial
                  </button>
                </div>
              </div>
            )}
            <div className="hidden sm:flex gap-2 items-center text-[11px] border-r border-slate-200 pr-4">
              <span className="text-slate-500 uppercase font-semibold">Status do Pátio:</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded">OPERACIONAL</span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
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
    </div>
  );
};
