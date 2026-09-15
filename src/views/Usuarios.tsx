import React, { useState } from 'react';
import { useStore } from '../store';
import { SystemUser, Role, RegisteredDriver } from '../types';
import { Plus, Trash2, ShieldAlert, Key, ToggleLeft, ToggleRight, Check, X, Shield, Users, Lock, AlertCircle } from 'lucide-react';

export const Usuarios: React.FC = () => {
  const { 
    systemUsers = [], 
    addSystemUser, 
    removeSystemUser, 
    updateSystemUserPermissions,
    updateSystemUser,
    currentUser,
    registeredDrivers = [],
    addRegisteredDriver,
    registeredSupervisors = [],
    addRegisteredSupervisor
  } = useStore();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('operador');
  const [unit, setUnit] = useState<'matriz' | 'filial'>('matriz');
  const [modules, setModules] = useState({
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
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password alteration states
  const [editingUserPassword, setEditingUserPassword] = useState<{ id: string, name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim().toLowerCase();
    if (!name.trim() || !cleanUsername) {
      setErrorMsg('Preencha o nome e o usuário corretamente.');
      return;
    }

    const exUser = systemUsers.find(u => u.username.toLowerCase() === cleanUsername);
    if (exUser) {
      setErrorMsg('Este nome de usuário já está cadastrado no sistema.');
      return;
    }

    const newUser: SystemUser = {
      id: 'usr-' + Date.now().toString(36),
      name: name.trim(),
      username: cleanUsername,
      password: password.trim() || '123456',
      role: role,
      unit: unit,
      modules: (role === 'admin' || role === 'supervisor') ? {
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
      } : { ...modules }
    };

    addSystemUser(newUser);

    // Auto-register driver in pre-registration list if role is 'motorista'
    if (newUser.role === 'motorista') {
      const existsInPreRegistration = (registeredDrivers || []).some(
        d => d.name.toLowerCase() === newUser.name.toLowerCase()
      );
      if (!existsInPreRegistration) {
        addRegisteredDriver({
          id: 'drv-' + Date.now().toString(36),
          name: newUser.name,
          driverType: 'interno', // Proprio / CLT
          commissionPercent: 8,
          damageToleranceQty: 0
        });
      }
    }

    // Auto-register sales supervisor if role is 'supervisor'
    if (newUser.role === 'supervisor') {
      const existsInSupervisors = (registeredSupervisors || []).some(
        s => s.name.toLowerCase() === newUser.name.toLowerCase()
      );
      if (!existsInSupervisors) {
        addRegisteredSupervisor({
          id: 'sup-' + Date.now().toString(36),
          name: newUser.name,
          active: true
        });
      }
    }

    setName('');
    setUsername('');
    setPassword('');
    setRole('operador');
    setUnit('matriz');
    setModules({
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
    });
    setSuccessMsg('Usuário cadastrado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleModule = (userId: string, moduleKey: keyof SystemUser['modules']) => {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin') return; // Admin has automatic complete access
    
    const updatedModules = {
      ...user.modules,
      [moduleKey]: !user.modules[moduleKey]
    };
    updateSystemUserPermissions(userId, updatedModules);
  };

  const handleDeleteUser = (userId: string) => {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) return;
    if (currentUser && currentUser.name === user.name) {
      alert('Você não pode remover seu próprio usuário ativo!');
      return;
    }
    if (user.username === 'admin') {
      alert('O usuário administrador raiz do sistema não pode ser removido.');
      return;
    }
    removeSystemUser(userId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={24} /> Controle de Acessos & Permissões
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Cadastre novos usuários e controle quais módulos eles podem ler ou editar no sistema operacional.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Column */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Plus size={16} className="text-blue-600" /> Cadastrar Usuário
          </h3>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs py-2 px-3 rounded-lg font-bold mb-3">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs py-2 px-3 rounded-lg font-bold mb-3">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nome de Exibição / Colaborador</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Usuário (Identificador de Login)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: joao.silva"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Senha de Acesso (Opcional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha padrão: 123456"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Perfil de Acesso</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setRole(newRole);
                  if (newRole === 'supervisor' || newRole === 'admin') {
                    setModules({
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
                    });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
              >
                <option value="operador">Operador (Restrito/Personalizado)</option>
                <option value="supervisor">Supervisor de Vendas (Visualizador + Lançamento de Pré-Venda)</option>
                <option value="visualizador">Apenas Visualização (Acesso Leitura)</option>
                <option value="motorista">Motorista (Acesso App Viagem)</option>
                <option value="admin">Administrador (Acesso Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Unidade de Operação</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
              >
                <option value="matriz">Empresa Matriz</option>
                <option value="filial">Empresa Filial</option>
              </select>
            </div>

            {(role === 'operador' || role === 'visualizador' || role === 'supervisor') && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Módulos Permitidos</span>
                
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Portaria (Entradas/Saídas)</span>
                  <input
                    type="checkbox"
                    checked={modules.portaria}
                    onChange={(e) => setModules({ ...modules, portaria: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Fila de Produção</span>
                  <input
                    type="checkbox"
                    checked={modules.fila}
                    onChange={(e) => setModules({ ...modules, fila: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Posto Interno / Serviços</span>
                  <input
                    type="checkbox"
                    checked={modules.abastecimento}
                    onChange={(e) => setModules({ ...modules, abastecimento: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Relatórios Operacionais</span>
                  <input
                    type="checkbox"
                    checked={modules.relatorios}
                    onChange={(e) => setModules({ ...modules, relatorios: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Pré-Cadastros de Apoio</span>
                  <input
                    type="checkbox"
                    checked={modules.cadastros}
                    onChange={(e) => setModules({ ...modules, cadastros: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Prestação de Contas</span>
                  <input
                    type="checkbox"
                    checked={modules.prestacao_contas}
                    onChange={(e) => setModules({ ...modules, prestacao_contas: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Estoque de Produtos</span>
                  <input
                    type="checkbox"
                    checked={modules.estoque}
                    onChange={(e) => setModules({ ...modules, estoque: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Linha Descartável</span>
                  <input
                    type="checkbox"
                    checked={modules.linha_descartavel}
                    onChange={(e) => setModules({ ...modules, linha_descartavel: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Configurações do Sistema</span>
                  <input
                    type="checkbox"
                    checked={modules.config}
                    onChange={(e) => setModules({ ...modules, config: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {role === 'admin' && (
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-[11px] text-blue-800 font-medium flex items-start gap-2">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>Administradores possuem permissão irrestrita de leitura, escrita e modificação em todos os módulos e visualizadores.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black py-2.5 rounded-lg transition-colors uppercase tracking-wider"
            >
              Confirmar Cadastro
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield size={16} className="text-slate-700" /> Usuários Cadastrados
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white rounded-lg overflow-hidden border border-slate-100">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black tracking-wider">
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Nome Usuário</th>
                  <th className="py-2.5 px-3">Perfil</th>
                  <th className="py-2.5 px-3 text-center">Unidade</th>
                  <th className="py-2.5 px-3 text-center">Permissões de Módulo (Clique para alternar)</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {systemUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{user.name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">@{user.username}</span>
                    </td>
                    <td className="py-3 px-3">
                      {user.role === 'admin' ? (
                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Administrador
                        </span>
                      ) : user.role === 'supervisor' ? (
                        <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-200">
                          Supervisor
                        </span>
                      ) : user.role === 'visualizador' ? (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                          Visualizador
                        </span>
                      ) : user.role === 'motorista' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                          Motorista
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                          Operador
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          const newUnit = user.unit === 'filial' ? 'matriz' : 'filial';
                          updateSystemUser(user.id, { unit: newUnit });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                          user.unit === 'filial' 
                            ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 hover:text-amber-900' 
                            : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:text-blue-900'
                        }`}
                        title="Clique para alternar a unidade"
                      >
                        {user.unit === 'filial' ? 'Filial' : 'Matriz'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex justify-center items-center gap-1">
                        {user.role === 'admin' ? (
                          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check size={14} /> Permissão Integral
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            {[
                              { label: 'Portaria', key: 'portaria' as const },
                              { label: 'Fila', key: 'fila' as const },
                              { label: 'Posto', key: 'abastecimento' as const },
                              { label: 'Relatórios', key: 'relatorios' as const },
                              { label: 'Cadastros', key: 'cadastros' as const },
                              { label: 'Acerto', key: 'prestacao_contas' as const },
                              { label: 'Estoque', key: 'estoque' as const },
                              { label: 'Descartável', key: 'linha_descartavel' as const },
                              { label: 'Config', key: 'config' as const },
                            ].map((m) => {
                              const isPerm = user.modules[m.key];
                              return (
                                <button
                                  key={m.key}
                                  onClick={() => handleToggleModule(user.id, m.key)}
                                  title={`Toggle ${m.label}`}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider transition-colors uppercase cursor-pointer ${
                                    isPerm 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                      : 'bg-red-50 text-red-500 border border-red-100 line-through'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserPassword({ id: user.id, name: user.name });
                            setNewPassword('');
                          }}
                          className="text-amber-600 hover:text-amber-800 p-1.5 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Alterar Senha do usuário"
                        >
                          <Key size={13} />
                        </button>
                        {currentUser && currentUser.name !== user.name && user.username !== 'admin' ? (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Remover Usuário"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Fixo</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Alteração de Senha */}
      {editingUserPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg border border-amber-100 shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Alterar Senha</h4>
                <p className="text-slate-500 text-[11px] mt-1">
                  Defina uma nova senha de acesso para o colaborador: <strong className="text-slate-700">{editingUserPassword.name}</strong>.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nova Senha de Acesso</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha do colaborador"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-amber-500 outline-none font-bold placeholder:font-normal"
                autoFocus
                required
              />
            </div>

            <div className="flex justify-end gap-2 text-[10px] font-black uppercase tracking-wider pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUserPassword(null)}
                className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanedPass = newPassword.trim();
                  if (!cleanedPass) {
                    alert('Insira uma senha válida!');
                    return;
                  }
                  updateSystemUser(editingUserPassword.id, { password: cleanedPass });
                  setEditingUserPassword(null);
                  setSuccessMsg(`Senha do colaborador ${editingUserPassword.name} alterada com sucesso!`);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg transition-colors cursor-pointer"
              >
                Confirmar Alt.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
