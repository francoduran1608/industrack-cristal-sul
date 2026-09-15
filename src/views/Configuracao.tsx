import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateRealAverages } from '../utils/productionAverage';
import { 
  Trash2, 
  Settings2, 
  Sliders, 
  Database, 
  UserCog, 
  Save, 
  KeyRound, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2,
  Clock
} from 'lucide-react';

export const Configuracao: React.FC = () => {
  const { 
    initialDieselStock, 
    initialArlaStock, 
    dieselTankCapacity = 15000,
    arlaTankCapacity = 3000,
    updateInitialDieselStock, 
    updateInitialArlaStock, 
    updateDieselTankCapacity,
    updateArlaTankCapacity,
    clearDatabase, 
    systemUsers, 
    updateSystemUser, 
    currentUser,
    avgTimeDischarging = 30,
    avgTimeLoading = 45,
    updateAvgTimeDischarging,
    updateAvgTimeLoading,
    movements = []
  } = useStore();

  const isReadOnly = currentUser?.role === 'visualizador' || currentUser?.role === 'supervisor';

  const realAverages = calculateRealAverages(movements, currentUser?.unit);

  // Stock Override states
  const [dieselVal, setDieselVal] = useState(initialDieselStock.toString());
  const [arlaVal, setArlaVal] = useState(initialArlaStock.toString());
  const [dieselCapVal, setDieselCapVal] = useState(dieselTankCapacity.toString());
  const [arlaCapVal, setArlaCapVal] = useState(arlaTankCapacity.toString());
  const [stockSuccess, setStockSuccess] = useState('');

  // Clear Database states
  const [confirmInput, setConfirmInput] = useState('');
  const [clearSuccess, setClearSuccess] = useState('');
  const [clearError, setClearError] = useState('');

  // Admin Profile states
  const adminUser = systemUsers?.find(u => u.id === 'user-admin') || systemUsers?.[0];
  const [adminName, setAdminName] = useState(adminUser?.name || 'Administrador Geral');
  const [adminUsername, setAdminUsername] = useState(adminUser?.username || 'admin');
  const [adminPassword, setAdminPassword] = useState(adminUser?.password || '123456');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Production Timing Parameter states
  const [avgDiscVal, setAvgDiscVal] = useState(avgTimeDischarging.toString());
  const [avgLoadVal, setAvgLoadVal] = useState(avgTimeLoading.toString());
  const [paramSuccess, setParamSuccess] = useState('');

  const handleApplyRealAverages = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (realAverages.avgDischarging !== null) {
      setAvgDiscVal(Math.round(realAverages.avgDischarging).toString());
    }
    if (realAverages.avgLoading !== null) {
      setAvgLoadVal(Math.round(realAverages.avgLoading).toString());
    }
    setParamSuccess('As médias reais calculadas dos lançamentos de produção foram copiadas para os campos! Clique em Salvar para gravar.');
    setTimeout(() => setParamSuccess(''), 6000);
  };

  const handleUpdateParams = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const discSecs = parseInt(avgDiscVal);
    const loadSecs = parseInt(avgLoadVal);

    if (isNaN(discSecs) || discSecs < 0 || isNaN(loadSecs) || loadSecs < 0) {
      alert('Por favor, informe valores numéricos válidos (>= 0).');
      return;
    }

    updateAvgTimeDischarging(discSecs);
    updateAvgTimeLoading(loadSecs);
    setParamSuccess('Parâmetros de tempos de vasilhames salvos com sucesso!');
    setTimeout(() => setParamSuccess(''), 4000);
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const dNum = parseFloat(dieselVal);
    const aNum = parseFloat(arlaVal);
    const dCapNum = parseFloat(dieselCapVal);
    const aCapNum = parseFloat(arlaCapVal);

    if (isNaN(dNum) || dNum < 0 || isNaN(aNum) || aNum < 0 || isNaN(dCapNum) || dCapNum <= 0 || isNaN(aCapNum) || aCapNum <= 0) {
      alert('Por favor, informe valores numéricos válidos (estoques >= 0, capacidades > 0).');
      return;
    }

    updateInitialDieselStock(dNum);
    updateInitialArlaStock(aNum);
    updateDieselTankCapacity(dCapNum);
    updateArlaTankCapacity(aCapNum);
    setStockSuccess('Estoque e Capacidades ajustados com sucesso!');
    setTimeout(() => setStockSuccess(''), 4000);
  };

  const handleClearAllData = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setClearError('');
    setClearSuccess('');

    if (confirmInput.trim().toUpperCase() !== 'EXCLUIR') {
      setClearError('Por favor digite "EXCLUIR" para confirmar a exclusão dos dados.');
      return;
    }

    // Process general clear
    clearDatabase();
    setConfirmInput('');
    setClearSuccess('Todos os registros, cadastros de veículos/motoristas/clientes e usuários do sistema foram excluídos com sucesso!');
    setTimeout(() => setClearSuccess(''), 6000);
  };

  const handleUpdateAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setProfileError('');
    setProfileSuccess('');

    const cleanUsername = adminUsername.trim().toLowerCase();
    if (!adminName.trim() || !cleanUsername || !adminPassword.trim()) {
      setProfileError('Preencha todos os campos do perfil corretamente.');
      return;
    }

    // Check username conflict with others
    const conflict = systemUsers?.find(u => u.id !== (adminUser?.id || 'user-admin') && u.username.toLowerCase() === cleanUsername);
    if (conflict) {
      setProfileError('Este nome de usuário já está sendo utilizado por outro colaborador.');
      return;
    }

    if (adminUser) {
      updateSystemUser(adminUser.id, {
        name: adminName.trim(),
        username: cleanUsername,
        password: adminPassword.trim()
      });
      setProfileSuccess('Perfil do Administrador Geral atualizado com sucesso!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } else {
      setProfileError('Usuário administrador não encontrado no sistema.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 relative rounded-xl text-xs font-semibold flex items-center gap-2 select-none mb-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span><strong>Módulos de Leitura:</strong> Você está conectado com um perfil de visualização e não possui permissões para alterar estoques, perﬁs de acesso, ou apagar dados.</span>
        </div>
      )}

      {/* Dynamic Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <Settings2 className="text-blue-600" size={22} /> Painel de Configurações
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustes técnicos de estoque, integridade operacional e administração do sistema
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Acesso Restrito: {currentUser?.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Adjust Stocks */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
              <Fuel size={14} className="text-blue-500" /> Estoque de Combustível e Insumos
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sobreponha ou inicialize os volumes de estoque físico de Diesel e Arla no sistema. Os cálculos de consumo serão feitos a partir destes valores ajustados.
            </p>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Estoque Inicial de Diesel (Litros)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={dieselVal}
                    onChange={(e) => setDieselVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors mb-4"
                    placeholder="Ex: 5000"
                  />
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Capacidade Tanque Diesel (Litros)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={dieselCapVal}
                    onChange={(e) => setDieselCapVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors"
                    placeholder="Ex: 10000"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Estoque Inicial de Arla (Litros)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={arlaVal}
                    onChange={(e) => setArlaVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors mb-4"
                    placeholder="Ex: 1000"
                  />
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Capacidade Tanque Arla (Litros)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={arlaCapVal}
                    onChange={(e) => setArlaCapVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors"
                    placeholder="Ex: 3000"
                  />
                </div>
              </div>

              {stockSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 text-[11px] font-medium leading-tight">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>{stockSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isReadOnly}
                className={`w-full text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors ${
                  isReadOnly ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                <Save size={14} /> Salvar Ajustes de Estoque
              </button>
            </form>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">Estoque de Entrada Ativo</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">
              Diesel: {initialDieselStock} L / Arla: {initialArlaStock} L | Cap: {dieselTankCapacity} L / {arlaTankCapacity} L
            </span>
          </div>
        </div>

        {/* Card: Parâmetros de Tempo de Produção */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
              <Clock size={14} className="text-amber-500" /> Parâmetros de Tempo (Vasilhames / Minuto)
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Defina a quantidade de vasilhames processados por minuto no carregamento e descarregamento. Esses parâmetros são usados para calcular o tempo previsto para o processo do veículo.
            </p>

            <form onSubmit={handleUpdateParams} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Velocidade Descarregamento (Vasilhames/Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={avgDiscVal}
                    onChange={(e) => setAvgDiscVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors"
                    placeholder="Ex: 30"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Estimativa de vasilhames retirados por minuto</span>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Velocidade Carregamento (Vasilhames/Min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={avgLoadVal}
                    onChange={(e) => setAvgLoadVal(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-medium transition-colors"
                    placeholder="Ex: 45"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Estimativa de vasilhames colocados por minuto</span>
                </div>
              </div>

              {paramSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 text-[11px] font-medium leading-tight">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>{paramSuccess}</span>
                </div>
              )}

              {/* Estudo de Tempos Reais */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    📊 Análise Real de Lançamentos
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Estudo de Tempos</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-[11px] leading-tight">
                  <div className="bg-white p-2 border border-slate-100 rounded-md">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Média Descarregamento</span>
                    {realAverages.avgDischarging !== null ? (
                      <div>
                        <span className="font-bold text-slate-800 font-mono text-xs">{realAverages.avgDischarging} un/min</span>
                        <span className="text-[8px] text-slate-400 block mt-0.5">Em {realAverages.totalDischargingSampleCount} viagens ({realAverages.totalDischargedQty} un)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sem registros concluídos</span>
                    )}
                  </div>

                  <div className="bg-white p-2 border border-slate-100 rounded-md">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Média Carregamento</span>
                    {realAverages.avgLoading !== null ? (
                      <div>
                        <span className="font-bold text-slate-800 font-mono text-xs">{realAverages.avgLoading} un/min</span>
                        <span className="text-[8px] text-slate-400 block mt-0.5">Em {realAverages.totalLoadingSampleCount} viagens ({realAverages.totalLoadedQty} un)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sem registros concluídos</span>
                    )}
                  </div>
                </div>

                {!isReadOnly && (realAverages.avgDischarging !== null || realAverages.avgLoading !== null) && (
                  <button
                    onClick={handleApplyRealAverages}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-2 bg-blue-55 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    ⚡ Aplicar Médias Reais nos Parâmetros
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className={`w-full text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors ${
                  isReadOnly ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                <Save size={14} /> Salvar Parâmetros de Tempo
              </button>
            </form>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">Parâmetros Ativos</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">
              Desc: {avgTimeDischarging} un/min | Carreg: {avgTimeLoading} un/min
            </span>
          </div>
        </div>

        {/* Card 2: Update Admin Profile */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
              <UserCog size={14} className="text-indigo-500" /> Perfil do Administrador Geral
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Personalize o nome da pessoa responsável (colaborador), o nome de usuário (login) e a senha do perfil com permissão completa no sistema.
            </p>

            <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Nome do Responsável (Colaborador)
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-bold transition-colors"
                  placeholder="Ex: Carlos Silva Admin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nome de Usuário (Login)
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-mono transition-colors"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Senha de Segurança
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border text-xs border-slate-200 focus:border-blue-500 outline-none rounded-lg pl-8 pr-3 py-2 text-slate-700 font-mono font-bold transition-colors"
                      placeholder="Min 4 dígitos"
                    />
                    <KeyRound size={12} className="absolute left-2.5 top-[11px] text-slate-400" />
                  </div>
                </div>
              </div>

              {profileError && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-700 text-[11px] font-medium leading-tight">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 text-[11px] font-medium leading-tight">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isReadOnly}
                className={`w-full text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors ${
                  isReadOnly ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                }`}
              >
                <Save size={14} /> Atualizar Perfil Administrador
              </button>
            </form>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">Usuário do Admin ATIVO</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold leading-none">
              {adminUser?.username || 'admin'} ({adminUser?.password})
            </span>
          </div>
        </div>

        {/* Card 3: System Clears & Deletes */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5">
            <h3 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-1.5 mb-2">
              <Database size={14} /> Exclusão Total e Restauração de Banco de Dados
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Ação irreversível de desinfecção lógica! Exclui todos os movimentos de pátio, portarias, checklist operacional, relatórios, filas de produção, registros de serviço de abastecimento, além de esvaziar os pré-cadastros de veículos, motoristas e finalidades adicionadas. <strong className="text-slate-800">Apenas a tabela de categorias e portes de veículos permanecerá intocada.</strong>
            </p>

            <form onSubmit={handleClearAllData} className="bg-red-50/50 border border-red-100 p-4 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black uppercase text-red-800">ATENÇÃO: Operação Altamente Destrutiva</h4>
                  <p className="text-[10px] text-red-600 leading-relaxed">
                    Nenhuma informação operacional excluída poderá ser resgatada futuramente. As conexões em tempo real atualizarão os computadores de toda a empresa.
                  </p>
                </div>
              </div>

              <div className="max-w-md">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Digite <strong className="text-red-600">EXCLUIR</strong> para autorizar a restauração
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    className="flex-1 bg-white border text-xs border-slate-200 focus:border-red-500 outline-none rounded-lg px-3 py-2 text-slate-700 font-mono font-bold uppercase transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder="EXCLUIR"
                  />
                  <button
                    type="submit"
                    disabled={isReadOnly}
                    className={`text-white font-bold text-xs py-2 px-5 rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-colors ${
                      isReadOnly ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 cursor-pointer'
                    }`}
                  >
                    <Trash2 size={13} /> Limpar o Sistema
                  </button>
                </div>
              </div>

              {clearError && (
                <div className="p-2.5 bg-red-100 border border-red-200 rounded-lg text-red-800 text-[11px] font-black leading-tight">
                  {clearError}
                </div>
              )}

              {clearSuccess && (
                <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 p-3 rounded-lg text-emerald-800 text-xs font-bold leading-tight">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{clearSuccess}</span>
                </div>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
