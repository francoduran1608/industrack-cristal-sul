import React, { useState } from 'react';
import { useStore } from '../store';
import { AlertCircle, LogIn, Key, Users } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, systemUsers = [] } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (un: string, pass: string) => {
    setErrorMsg('');
    const matchedUser = systemUsers.find(
      (u) => u.username.toLowerCase().trim() === un.toLowerCase().trim()
    );

    if (matchedUser) {
      if (matchedUser.password && matchedUser.password !== pass) {
        setErrorMsg('Senha incorreta para este usuário!');
        return;
      }
      login({
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        unit: matchedUser.unit,
        modules: matchedUser.modules,
      });
    } else {
      setErrorMsg('Usuário não cadastrado no sistema!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Preencha os campos de usuário e senha!');
      return;
    }
    handleLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-950 p-8 text-center relative border-b border-slate-800">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-black mb-3">L</div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Terrasul</h1>
          <p className="text-slate-400 text-xs mt-1">Acesso ao Controle de Pátio Integrado</p>
        </div>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-2.5 px-3 rounded-lg font-bold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Users size={12} /> Usuário do Sistema
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin, portaria, posto..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Key size={12} /> Senha do Sistema
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso (Ex: 123456)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 font-mono font-bold"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={15} /> Acessar Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
