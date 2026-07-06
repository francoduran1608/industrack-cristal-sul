import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Portaria } from './views/Portaria';
import { FilaProducao } from './views/FilaProducao';
import { Abastecimento } from './views/Abastecimento';
import { Relatorio } from './views/Relatorio';
import { Usuarios } from './views/Usuarios';
import { Cadastros } from './views/Cadastros';
import { Configuracao } from './views/Configuracao';
import { Estoque } from './views/Estoque';
import { PrestacaoContas } from './views/PrestacaoContas';
import { MinhaViagem } from './views/MinhaViagem';
import { PrintSale } from './views/PrintSale';

const MainApp: React.FC = () => {
  const { currentUser } = useStore();
  const [activeTab, setActiveTabState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) return tabParam;
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'number') {
        activeEl.blur();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const params = new URLSearchParams(window.location.search);
  const printSaleNum = params.get('printSale');

  if (printSaleNum) {
    return <PrintSale saleNumber={printSaleNum} />;
  }

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  };

  if (!currentUser) return <Login />;

  const currentTab = currentUser.role === 'motorista' && activeTab !== 'minha-viagem' ? 'minha-viagem' : activeTab;

  return (
    <Layout activeTab={currentTab} setActiveTab={setActiveTab}>
      {currentTab === 'minha-viagem' && <MinhaViagem />}
      {currentTab === 'dashboard' && <Dashboard />}
      {currentTab === 'portaria' && <Portaria />}
      {currentTab === 'fila' && <FilaProducao />}
      {currentTab === 'estoque' && <Estoque />}
      {currentTab === 'abastecimento' && <Abastecimento />}
      {currentTab === 'prestacao-contas' && <PrestacaoContas />}
      {currentTab === 'cadastros' && <Cadastros />}
      {currentTab === 'relatorios' && <Relatorio />}
      {currentTab === 'usuarios' && <Usuarios />}
      {currentTab === 'config' && <Configuracao />}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}

