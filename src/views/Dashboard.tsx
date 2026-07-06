import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Truck, Activity, CheckCircle, Droplet, Calendar, Filter, Users, 
  TrendingUp, Clock, BarChart3, PieChart as PieIcon, RefreshCw, Layers, 
  Building, ShieldAlert, Award, ChevronRight, FileText, ArrowRightLeft,
  Search, Eye, HelpCircle, Download, CheckSquare, Sparkles, FilterX
} from 'lucide-react';

// Color Palette for Dashboard
const COLORS_THEME = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const FUEL_COLORS: Record<string, string> = {
  'diesel': '#0284c7',       // Sky blue
  'arla': '#10b981',         // Emerald
  'lubrificacao': '#f59e0b', // Amber
  'calibracao': '#8b5cf6'    // Purple
};

type ViewMode = 'monitor' | 'bi';
type PeriodOption = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | 'ano_atual' | 'total' | 'personalizado';
type GroupOption = 'hora' | 'dia' | 'semana' | 'mes' | 'ano';

interface DashboardGateEvent {
  id: string;
  movementId: string;
  plate: string;
  driver: string;
  ownerType: 'proprio' | 'terceiro';
  vehicleType: string;
  client?: string;
  type: 'entrada' | 'saida' | 'saida_temporaria' | 'entrada_temporaria';
  tempType?: 'almoco' | 'oficina';
  timestamp: string;
  by?: string;
  purpose?: string;
  earlyExitReason?: string;
  kanbanStep?: string;
  bypassProduction?: boolean;
}

export const Dashboard: React.FC = () => {
  const { movements, supplies, registeredClients = [], registeredVehicles = [], currentUser } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>('monitor');
  
  // TODAY String Helper
  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // --- TAB 1 STATE: MONITOR DIÁRIO ---
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isSelectedToday = selectedDate === todayStr;

  const userUnit = currentUser?.unit || 'matriz';

  const dayMovements = useMemo(() => {
    return movements.filter(m => {
      if ((m.unit || 'matriz') !== userUnit) return false;
      const d = new Date(m.timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${yyyy}-${mm}-${dd}`;
      const utcDateStr = (m.timestamp || '').split('T')[0];
      return localDateStr === selectedDate || utcDateStr === selectedDate;
    });
  }, [movements, selectedDate, userUnit]);

  const dayEvents = useMemo(() => {
    const list: DashboardGateEvent[] = [];
    
    movements
      .filter(m => (m.unit || 'matriz') === userUnit)
      .forEach(m => {
      // 1. Core entry
      const entryTime = m.entryTimestamp || m.timestamp;
      list.push({
        id: `${m.id}-entry`,
        movementId: m.id,
        plate: m.plate,
        driver: m.driver,
        ownerType: m.ownerType,
        vehicleType: m.vehicleType,
        client: m.client,
        type: 'entrada',
        timestamp: entryTime,
        by: m.createdBy || 'Sistema',
        purpose: m.purpose,
        kanbanStep: m.kanbanStep,
        bypassProduction: m.bypassProduction,
      });

      // 2. Temporary exits & returns
      if (m.gateTemporaryExits) {
        m.gateTemporaryExits.forEach((e, idx) => {
          list.push({
            id: `${m.id}-tempexit-${e.id || idx}`,
            movementId: m.id,
            plate: m.plate,
            driver: m.driver,
            ownerType: m.ownerType,
            vehicleType: m.vehicleType,
            client: m.client,
            type: 'saida_temporaria',
            tempType: e.type,
            timestamp: e.exitedAt,
            by: e.exitedBy || 'Sistema',
            earlyExitReason: e.type === 'almoco' ? 'Saída para Almoço' : 'Saída para Oficina',
            bypassProduction: m.bypassProduction,
          });

          if (e.returnedAt) {
            list.push({
              id: `${m.id}-tempreturn-${e.id || idx}`,
              movementId: m.id,
              plate: m.plate,
              driver: m.driver,
              ownerType: m.ownerType,
              vehicleType: m.vehicleType,
              client: m.client,
              type: 'entrada_temporaria',
              tempType: e.type,
              timestamp: e.returnedAt,
              by: e.returnedBy || 'Sistema',
              purpose: e.type === 'almoco' ? 'Retorno Almoço' : 'Retorno Oficina',
              kanbanStep: m.kanbanStep,
              bypassProduction: m.bypassProduction,
            });
          }
        });
      }

      // 3. Definitive exit
      if (m.status === 'saida' && m.exitTimestamp) {
        list.push({
          id: `${m.id}-exit`,
          movementId: m.id,
          plate: m.plate,
          driver: m.driver,
          ownerType: m.ownerType,
          vehicleType: m.vehicleType,
          client: m.client,
          type: 'saida',
          timestamp: m.exitTimestamp,
          by: m.exitedBy || 'Sistema',
          earlyExitReason: m.earlyExitReason || 'Saída Concluída',
          bypassProduction: m.bypassProduction,
        });
      }
    });

    // Filter by selected day and sort chronologically (newest first)
    return list.filter(ev => {
      const d = new Date(ev.timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${yyyy}-${mm}-${dd}`;
      const utcDateStr = (ev.timestamp || '').split('T')[0];
      return localDateStr === selectedDate || utcDateStr === selectedDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, selectedDate, userUnit]);

  const daySupplies = useMemo(() => {
    return supplies.filter(s => {
      if ((s.unit || 'matriz') !== userUnit) return false;
      const d = new Date(s.timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${yyyy}-${mm}-${dd}`;
      const utcDateStr = (s.timestamp || '').split('T')[0];
      return localDateStr === selectedDate || utcDateStr === selectedDate;
    });
  }, [supplies, selectedDate, userUnit]);

  // Operational metrics for chosen day
  const opsActiveYard = useMemo(() => {
    if (isSelectedToday) {
      return movements.filter(m => m.status !== 'saida' && (m.unit || 'matriz') === userUnit).length;
    }
    return dayMovements.filter(m => m.status !== 'saida').length;
  }, [movements, dayMovements, isSelectedToday, userUnit]);

  const opsActiveQueue = useMemo(() => {
    if (isSelectedToday) {
      return movements.filter(m => m.status === 'na_fila' && (m.unit || 'matriz') === userUnit).length;
    }
    return dayMovements.filter(m => m.status === 'na_fila').length;
  }, [movements, dayMovements, isSelectedToday, userUnit]);

  const opsCompleted = useMemo(() => {
    return dayMovements.filter(m => m.status === 'concluido' || m.status === 'saida').length;
  }, [dayMovements]);

  const opsTotalLiters = useMemo(() => {
    return daySupplies.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [daySupplies]);


  // --- TAB 2 STATE: ANALISE GERENCIAL (BI) ---
  const [period, setPeriod] = useState<PeriodOption>('7dias');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  
  const [groupBy, setGroupBy] = useState<GroupOption>('dia');
  const [filterUnit, setFilterUnit] = useState<'tudo' | 'matriz' | 'filial'>(currentUser?.unit || 'matriz');
  const [filterOwner, setFilterOwner] = useState<'tudo' | 'proprio' | 'terceiro'>('tudo');
  const [filterVehClass, setFilterVehClass] = useState<string>('tudo');
  const [filterClientBI, setFilterClientBI] = useState<string>('tudo');

  // Reset grouping recommendation when period changes
  const handlePeriodChange = (opt: PeriodOption) => {
    setPeriod(opt);
    if (opt === 'hoje' || opt === 'ontem') {
      setGroupBy('hora');
    } else if (opt === '7dias' || opt === '30dias' || opt === 'mes_atual') {
      setGroupBy('dia');
    } else if (opt === 'ano_atual') {
      setGroupBy('mes');
    } else {
      setGroupBy('mes');
    }
  };

  // Pre-calculated ranges based on prescription date picker
  const activeDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === 'hoje') {
      // today
    } else if (period === 'ontem') {
      start.setDate(start.getDate() - 1);
      const yesterdayEnd = new Date(start.getTime());
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { start, end: yesterdayEnd };
    } else if (period === '7dias') {
      start.setDate(start.getDate() - 6);
    } else if (period === '30dias') {
      start.setDate(start.getDate() - 29);
    } else if (period === 'mes_atual') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
    } else if (period === 'ano_atual') {
      start = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
    } else if (period === 'total') {
      start = new Date(2025, 0, 1, 0, 0, 0); // System birth threshold
    } else if (period === 'personalizado') {
      const pStart = new Date(customStart + 'T00:00:00');
      const pEnd = new Date(customEnd + 'T23:59:59');
      return { start: pStart, end: pEnd };
    }

    return { start, end: today };
  }, [period, customStart, customEnd, todayStr]);

  // Filter BI source lists
  const biMovements = useMemo(() => {
    const { start, end } = activeDateRange;
    return movements.filter(m => {
      const stamp = new Date(m.timestamp);
      if (stamp < start || stamp > end) return false;

      // Unit filter
      if (filterUnit !== 'tudo' && m.unit !== filterUnit) return false;

      // Ownership filter
      if (filterOwner !== 'tudo' && m.ownerType !== filterOwner) return false;

      // Vehicle type filter
      if (filterVehClass !== 'tudo' && m.vehicleType !== filterVehClass) return false;

      // Client filter
      if (filterClientBI !== 'tudo') {
        const clientName = (m.client || '').trim().toLowerCase();
        if (!clientName.includes(filterClientBI.toLowerCase())) return false;
      }

      return true;
    });
  }, [movements, activeDateRange, filterUnit, filterOwner, filterVehClass, filterClientBI]);

  const biSupplies = useMemo(() => {
    const { start, end } = activeDateRange;
    return supplies.filter(s => {
      const stamp = new Date(s.timestamp);
      if (stamp < start || stamp > end) return false;

      // Unit filter (Supplies have unit)
      if (filterUnit !== 'tudo' && s.unit !== filterUnit) return false;

      return true;
    });
  }, [supplies, activeDateRange, filterUnit]);


  // --- DYNAMIC BI METRICS COMPUTATIONS ---
  const biKPIs = useMemo(() => {
    const totalMovs = biMovements.length;
    const entriesList = biMovements.filter(m => m.type === 'entrada');
    const exitsList = biMovements.filter(m => m.type === 'saida');

    // Calculate stay times for completed visits in minutes
    let totalStayMinutes = 0;
    let completedStaysCount = 0;
    let maxStayMinutes = 0;

    // A vehicle has a completed stay if status === 'saida' or we have explicit exitTimestamp
    biMovements.forEach(m => {
      const startStamp = m.entryTimestamp || m.timestamp;
      const endStamp = m.exitTimestamp;
      if (startStamp && endStamp) {
        const start = new Date(startStamp).getTime();
        const end = new Date(endStamp).getTime();
        const delta = end - start;
        if (delta > 0) {
          const minutes = delta / 60000;
          totalStayMinutes += minutes;
          completedStaysCount++;
          if (minutes > maxStayMinutes) {
            maxStayMinutes = minutes;
          }
        }
      }
    });

    const averageStayTime = completedStaysCount > 0 
      ? Math.round(totalStayMinutes / completedStaysCount) 
      : 0;

    // Fuel metrics
    const totalLitersDispensed = biSupplies.reduce((sum, s) => sum + (s.amount || 0), 0);
    const supplyCount = biSupplies.length;
    const avgLitersPerRefuel = supplyCount > 0 ? Math.round(totalLitersDispensed / supplyCount) : 0;

    // Fleet operational share (own / third)
    const ownFleetCount = entriesList.filter(m => m.ownerType === 'proprio').length;
    const thirdFleetCount = entriesList.filter(m => m.ownerType === 'terceiro').length;
    const ownFleetPerc = entriesList.length > 0 ? Math.round((ownFleetCount / entriesList.length) * 100) : 0;

    // Unique plates
    const uniquePlates = new Set(biMovements.map(m => m.plate)).size;

    return {
      totalMovs,
      entriesCount: entriesList.length,
      exitsCount: exitsList.length,
      averageStayTime,
      completedStaysCount,
      maxStayTime: Math.round(maxStayMinutes),
      totalLitersDispensed,
      refuelsCount: supplyCount,
      avgLitersPerRefuel,
      ownFleetPerc,
      uniquePlates,
      thirdFleetCount
    };
  }, [biMovements, biSupplies]);


  // Helper to extract bucket keys for groupings
  const getBucketKey = (date: Date, mode: GroupOption) => {
    if (mode === 'hora') {
      const hh = String(date.getHours()).padStart(2, '0');
      return `${hh}:00`;
    }
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    if (mode === 'dia') {
      return `${dd}/${mm}`;
    }
    
    if (mode === 'semana') {
      const tempDate = new Date(date.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `Sem ${weekNo}/${String(yyyy).slice(-2)}`;
    }

    if (mode === 'mes') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[date.getMonth()]}/${String(yyyy).slice(-2)}`;
    }

    return `${yyyy}`;
  };


  // --- CHART 1: FLUXO DE PORTARIA ---
  const chartTimelineData = useMemo(() => {
    const bucketMap: Record<string, { key: string; entradas: number; saidas: number; total: number }> = {};
    const { start, end } = activeDateRange;
    const temp = new Date(start.getTime());

    if (groupBy === 'hora') {
      for (let i = 0; i < 24; i++) {
        const key = `${String(i).padStart(2, '0')}:00`;
        bucketMap[key] = { key, entradas: 0, saidas: 0, total: 0 };
      }
    } else if (groupBy === 'dia') {
      const daysCount = Math.min(60, Math.ceil((end.getTime() - start.getTime()) / 86400000));
      for (let i = 0; i <= daysCount; i++) {
        const key = getBucketKey(temp, 'dia');
        bucketMap[key] = { key, entradas: 0, saidas: 0, total: 0 };
        temp.setDate(temp.getDate() + 1);
      }
    } else if (groupBy === 'mes' && period !== 'hoje' && period !== 'ontem') {
      const monthsLimit = 12;
      const yr = start.getFullYear();
      let initM = start.getMonth();
      for (let i = 0; i < monthsLimit; i++) {
        const dummyDate = new Date(yr, initM + i, 1);
        if (dummyDate > end) break;
        const key = getBucketKey(dummyDate, 'mes');
        bucketMap[key] = { key, entradas: 0, saidas: 0, total: 0 };
      }
    }

    biMovements.forEach(m => {
      const stamp = new Date(m.timestamp);
      const key = getBucketKey(stamp, groupBy);
      
      if (!bucketMap[key]) {
        bucketMap[key] = { key, entradas: 0, saidas: 0, total: 0 };
      }

      if (m.type === 'entrada') {
        bucketMap[key].entradas++;
      } else {
        bucketMap[key].saidas++;
      }
      bucketMap[key].total++;
    });

    return Object.values(bucketMap);
  }, [biMovements, groupBy, activeDateRange, period]);


  // --- CHART 2: CONSUMO DE COMBUSTÍVEL ---
  const chartFuelData = useMemo(() => {
    const bucketMap: Record<string, { key: string; diesel: number; arla: number; lubrificacao: number; calibracao: number; total: number }> = {};

    biSupplies.forEach(s => {
      const stamp = new Date(s.timestamp);
      const key = getBucketKey(stamp, groupBy);

      if (!bucketMap[key]) {
        bucketMap[key] = { key, diesel: 0, arla: 0, lubrificacao: 0, calibracao: 0, total: 0 };
      }

      const fType = s.type || 'diesel';
      const amt = s.amount || 0;

      if (fType === 'diesel') bucketMap[key].diesel += amt;
      else if (fType === 'arla') bucketMap[key].arla += amt;
      else if (fType === 'lubrificacao') bucketMap[key].lubrificacao += amt;
      else if (fType === 'calibracao') bucketMap[key].calibracao += amt;
      
      bucketMap[key].total += amt;
    });

    return Object.values(bucketMap);
  }, [biSupplies, groupBy]);


  // --- CHART 3: TIPO DE VEÍCULO (PEÇA PIE) ---
  const chartVehicleClassData = useMemo(() => {
    const counts: Record<string, number> = {};
    biMovements.filter(m => m.type === 'entrada').forEach(m => {
      const typeLabel = m.vehicleType || 'Não informado';
      counts[typeLabel] = (counts[typeLabel] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    })).sort((a, b) => b.value - a.value);
  }, [biMovements]);


  // --- CHART 4: PROPRIEDADE DA FROTA ---
  const chartOwnershipData = useMemo(() => {
    let own = 0;
    let third = 0;
    biMovements.filter(m => m.type === 'entrada').forEach(m => {
      if (m.ownerType === 'proprio') own++;
      else third++;
    });

    return [
      { name: 'Própria', value: own },
      { name: 'Terceiros', value: third }
    ].filter(i => i.value > 0);
  }, [biMovements]);


  // --- CHART 5: TOP CLIENTS ---
  const chartTopClientsData = useMemo(() => {
    const counts: Record<string, number> = {};
    biMovements.forEach(m => {
      if (m.client) {
        const normalized = m.client.trim().toUpperCase();
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [biMovements]);


  // --- CHART 6: KANBAN TIMINGS (FLUXOGRAMA STAY) ---
  const chartKanbanTimingsData = useMemo(() => {
    const stages = [
      { id: 'aguardando_descarregamento', label: 'Fila Desg.' },
      { id: 'descarregamento', label: 'Oper. Desg.' },
      { id: 'aguardando_carregamento', label: 'Fila Carr.' },
      { id: 'carregamento', label: 'Oper. Carr.' },
      { id: 'concluido', label: 'Saída/Pátio' }
    ];

    return stages.map(stage => {
      let totalMinutes = 0;
      let count = 0;

      biMovements.forEach(m => {
        const timings = m.kanbanTimings;
        if (!timings) return;

        const currentStart = timings[stage.id];
        if (!currentStart) return;

        let currentEnd: string | undefined = undefined;

        const nextStagesOrder = {
          'aguardando_descarregamento': ['descarregamento', 'aguardando_carregamento', 'carregamento', 'concluido'],
          'descarregamento': ['aguardando_carregamento', 'carregamento', 'concluido'],
          'aguardando_carregamento': ['carregamento', 'concluido'],
          'carregamento': ['concluido'],
          'concluido': []
        }[stage.id] || [];

        for (const nextId of nextStagesOrder) {
          if (timings[nextId]) {
            currentEnd = timings[nextId];
            break;
          }
        }

        if (!currentEnd && m.exitTimestamp) {
          currentEnd = m.exitTimestamp;
        }

        if (currentStart && currentEnd) {
          const delta = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
          if (delta > 0) {
            let pausesMs = 0;
            if (m.kanbanTotalPause && m.kanbanTotalPause[stage.id]) {
              pausesMs = m.kanbanTotalPause[stage.id];
            }
            const activeMins = (delta - pausesMs) / 60000;
            if (activeMins > 0) {
              totalMinutes += activeMins;
              count++;
            }
          }
        }
      });

      return {
        name: stage.label,
        'Tempo Médio (Minutos)': count > 0 ? Math.round(totalMinutes / count) : 0,
        count
      };
    });
  }, [biMovements]);

  const resetBIFilters = () => {
    setFilterUnit('tudo');
    setFilterOwner('tudo');
    setFilterVehClass('tudo');
    setFilterClientBI('tudo');
  };

  return (
    <div className="space-y-5 flex flex-col w-full h-full min-h-screen">
      
      {/* 2-Tier Mode Switcher Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm">
            <TrendingUp size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight font-sans">
              Painel de Desempenho e BI
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
              Mapeamento de tempos, fluxos de pátio e consumo de combustível
            </p>
          </div>
        </div>

        {/* View Selection Toggle */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('monitor')}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'monitor'
                ? 'bg-slate-800 text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Clock size={14} /> Monitor Diário
          </button>
          <button
            onClick={() => setViewMode('bi')}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'bi'
                ? 'bg-slate-800 text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <BarChart3 size={14} /> Estatísticas BI
          </button>
        </div>
      </div>

      {/* =========================================
          MODE 1: MONITOR DIÁRIO (OPERATIONAL TRACK) 
          ========================================= */}
      {viewMode === 'monitor' && (
        <div className="space-y-4 animate-in fade-in-40 duration-200">
          
          {/* Operational Toolbar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Histórico de Movimentos do Dia:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer shadow-2xs hover:border-slate-400"
              />
              {!isSelectedToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded font-black uppercase transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className="animate-spin duration-1000" /> Ver Hoje
                </button>
              )}
            </div>
            
            <div className="text-[10px] text-slate-500 font-bold uppercase block sm:inline">
              Filtro ativo: <span className="text-slate-800 font-extrabold">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</span>
            </div>
          </div>

          {/* Core Daily Operational KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 transition">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 mr-3">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pátio total hoje</p>
                <p className="text-xl font-black text-slate-900">{opsActiveYard}</p>
              </div>
            </div>
            <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 transition">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 mr-3 animate-pulse">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Veículos em fila</p>
                <p className="text-xl font-black text-rose-700">{opsActiveQueue}</p>
              </div>
            </div>
            <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 transition">
              <div className="p-2.5 rounded-lg bg-green-50 text-green-600 mr-3">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Concluídos/Saídos</p>
                <p className="text-xl font-black text-slate-900">{opsCompleted}</p>
              </div>
            </div>
            <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 transition">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 mr-3">
                <Droplet size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Combustíveis Base</p>
                <p className="text-xl font-black text-slate-900">{opsTotalLiters.toLocaleString()} <span className="text-xs font-normal text-slate-500 uppercase">L</span></p>
              </div>
            </div>
          </div>

          {/* Operational Log Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
            <div className="bg-slate-50/70 border-b border-slate-150 px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Layers size={14} className="text-slate-500" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
                  Registro de Todas as Gate-actions de {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full font-mono">
                {dayEvents.length} EVENTOS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {dayEvents.map(ev => {
                    const isEntrada = ev.type === 'entrada' || ev.type === 'entrada_temporaria';
                    
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors font-medium text-xs">
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            ev.type === 'entrada'
                              ? 'bg-teal-50 text-teal-700 border-teal-200' 
                              : ev.type === 'entrada_temporaria'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : ev.type === 'saida_temporaria'
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {ev.type === 'entrada' ? 'ENTRADA' :
                             ev.type === 'entrada_temporaria' ? 'RETORNO' :
                             ev.type === 'saida_temporaria' ? 'SAÍDA TEMP.' : 'SAÍDA'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-900 font-mono text-xs">{ev.plate}</span>
                          <span className="text-[10px] ml-1.5 text-slate-400 font-medium uppercase px-1 py-0.2 bg-slate-100 rounded">
                            {ev.vehicleType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 uppercase text-slate-800">{ev.driver}</td>
                        <td className="py-2.5 px-4 font-normal text-slate-550">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                            ev.ownerType === 'proprio' 
                              ? 'bg-blue-100/50 text-blue-700' 
                              : 'bg-amber-100/50 text-amber-700'
                          }`}>
                            {ev.ownerType === 'proprio' ? 'PROP.' : 'TERC.'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 uppercase">
                          {ev.client ? (
                            <span className="font-bold text-slate-900">{ev.client}</span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10px]">Carga interna/Outros</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {(() => {
                            if (ev.type === 'saida_temporaria') {
                              return (
                                <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  {ev.earlyExitReason === 'Saída para Almoço' ? '🍽️ Almoço' : '🔧 Oficina'}
                                </span>
                              );
                            }
                            if (ev.type === 'entrada_temporaria') {
                              return (
                                <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {ev.purpose === 'Retorno Almoço' ? '🍽️ Retor. Almoço' : '🔧 Retor. Oficina'}
                                </span>
                              );
                            }
                            if (ev.type === 'saida') {
                              return <span className="text-[10px] font-extrabold uppercase text-slate-400">Pátio liberado</span>;
                            }
                            if (ev.bypassProduction) {
                              return <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Visitante (Excl.)</span>;
                            }
                            if (ev.kanbanStep) {
                              const mapping: Record<string, string> = {
                                'aguardando_descarregamento': 'Fila p/ Descarr.',
                                'descarregamento': 'Oper. Descarreg.',
                                'aguardando_carregamento': 'Fila p/ Carreg.',
                                'carregamento': 'Oper. Carreg.',
                                'concluido': 'Operação Concluída'
                              };
                              return (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50/80 border border-blue-100 px-2 py-0.5 rounded uppercase">
                                  {mapping[ev.kanbanStep] || ev.kanbanStep}
                                </span>
                              );
                            }
                            return <span className="text-xs text-slate-600 uppercase font-bold">Na Fila</span>;
                          })()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono tracking-tight tabular-nums">
                          {new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 uppercase tracking-widest text-[10px] font-bold font-sans">
                        Nenhuma movimentação de veículo registrada nesta data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Quick Notice Card */}
          <div className="bg-slate-805 text-slate-800 p-4 rounded-xl shadow-xs bg-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans border border-slate-200">
            <div className="flex items-center space-x-3.5">
              <div className="bg-white p-2.5 rounded-lg text-indigo-600 shadow-2xs">
                <Sparkles size={20} className="animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Gestão de Informações</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Para analisar KPIs integrados de outros períodos (Mês, Ano, Períodos Customizados) e mix de frota, utilize a aba <span className="font-bold text-indigo-700 uppercase">Estatísticas BI</span> no topo.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}


      {/* =========================================
          MODE 2: ANALISE GERENCIAL (BI / GRÁFICOS) 
          ========================================= */}
      {viewMode === 'bi' && (
        <div className="space-y-5 animate-in fade-in-40 duration-200">
          
          {/* BI Control Panel (Filters and presets) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
            
            {/* 1. Predefined Period Selection Rows */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mr-2">Selecione o Período:</span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: '30dias', label: 'Últimos 30 dias' },
                { id: 'mes_atual', label: 'Mês Atual' },
                { id: 'ano_atual', label: 'Este Ano' },
                { id: 'total', label: 'Histórico Total' },
                { id: 'personalizado', label: 'Customizado' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handlePeriodChange(opt.id as PeriodOption)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer shadow-2xs ${
                    period === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-700 font-extrabold'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Dates Fields */}
            {period === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in slide-in-from-top-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Início</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Término</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold outline-none text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* 2. Grouping & Extra Multi-dimensional Filters Row */}
            <div className="pt-3 border-t border-slate-150 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              
              {/* Group selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agrupamento Temporal</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupOption)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                >
                  <option value="hora">Agrupar por Hora (24h)</option>
                  <option value="dia">Agrupar por Dia</option>
                  <option value="semana">Agrupar por Semana</option>
                  <option value="mes">Agrupar por Mês</option>
                  <option value="ano">Agrupar por Ano</option>
                </select>
              </div>

              {/* Unit selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar Unidade</label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                >
                  <option value="tudo">Todas Unidades (Geral)</option>
                  <option value="matriz">Unidade Matriz</option>
                  <option value="filial">Unidade Filial</option>
                </select>
              </div>

              {/* Owner selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo Frota</label>
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                >
                  <option value="tudo">Ambos (Proprio e Terceiro)</option>
                  <option value="proprio">Apenas Frota Própria</option>
                  <option value="terceiro">Apenas Terceirizada</option>
                </select>
              </div>

              {/* Vehicle class selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria Veículo</label>
                <select
                  value={filterVehClass}
                  onChange={(e) => setFilterVehClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                >
                  <option value="tudo">Todas Categorias</option>
                  <option value="carreta">Carreta</option>
                  <option value="truck">Truck</option>
                  <option value="toco">Toco</option>
                  <option value="3/4">Carro Flex / 3-4</option>
                  <option value="utilitario">Utilitário</option>
                  <option value="passeio">Passeio</option>
                  <option value="moto">Moto</option>
                </select>
              </div>

              {/* Client selection search */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Destinatário/Cliente</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={filterClientBI === 'tudo' ? '' : filterClientBI}
                    onChange={(e) => setFilterClientBI(e.target.value || 'tudo')}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 pr-6 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 placeholder-slate-400"
                  />
                  {filterClientBI !== 'tudo' && (
                    <button
                      type="button"
                      onClick={() => setFilterClientBI('tudo')}
                      className="absolute right-1.5 top-2 hover:text-rose-500 text-slate-400"
                      title="Limpar filtro de cliente"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Filter Clear Feedback */}
            {(filterUnit !== 'tudo' || filterOwner !== 'tudo' || filterVehClass !== 'tudo' || filterClientBI !== 'tudo') && (
              <div className="flex items-center justify-between bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-xs animate-in slide-in-from-top-1 text-slate-650 font-medium">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-tight text-[10px] text-indigo-700">
                  <Filter size={12} /> Filtros multidimensionais de BI ativos!
                </div>
                <button
                  type="button"
                  onClick={resetBIFilters}
                  className="text-indigo-700 font-extrabold uppercase text-[10px] border border-indigo-200 hover:bg-white rounded px-2 py-0.5 shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <FilterX size={11} /> Remover Filtros
                </button>
              </div>
            )}

          </div>


          {/* 3. BI ADVANCED STATS KPI CARDS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            
            {/* KPI 1 */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Volume Total</span>
                <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                  <ArrowRightLeft size={14} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">{biKPIs.totalMovs}</p>
              <div className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-wide mt-1.5">
                <span className="text-teal-600">↑ {biKPIs.entriesCount} Ent</span>
                <span>•</span>
                <span className="text-rose-600">↓ {biKPIs.exitsCount} Saí</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Média de Permanência</span>
                <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                  <Clock size={14} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">
                {biKPIs.averageStayTime} <span className="text-[11px] font-bold text-slate-400 uppercase">Min</span>
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-normal mt-1">
                Máximo: <span className="font-extrabold text-slate-700">{biKPIs.maxStayTime}m</span>
              </p>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Combustíveis / Servs</span>
                <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                  <Droplet size={14} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">
                {biKPIs.totalLitersDispensed.toLocaleString()} <span className="text-[11px] font-bold text-slate-400 uppercase">Ltrs</span>
              </p>
              <p className="text-[9px] font-bold mt-1 text-slate-505">
                Serviços: <span className="font-extrabold text-slate-700">{biKPIs.refuelsCount} ({biKPIs.avgLitersPerRefuel}L Médio)</span>
              </p>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Giro de Veículos Únicos</span>
                <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                  <Truck size={14} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">
                {biKPIs.uniquePlates} <span className="text-[11px] font-black text-slate-400 uppercase">Placas</span>
              </p>
              <p className="text-[9px] font-bold mt-1 text-slate-450 uppercase">
                Ciclo operacional contínuo
              </p>
            </div>

            {/* KPI 5 */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Atend. Frota Própria</span>
                <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                  <Award size={14} />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">
                {biKPIs.ownFleetPerc}% <span className="text-[11px] font-bold text-slate-400 uppercase">FROTA</span>
              </p>
              <p className="text-[9px] font-bold mt-1 text-slate-500 uppercase">
                Terceiros: <span className="font-extrabold text-slate-700">{biKPIs.thirdFleetCount} viagens</span>
              </p>
            </div>

          </div>


          {/* 4. CHARTS SECTION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Chart 1: Volumetric Temporal Flow */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <TrendingUp size={16} className="text-indigo-600 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Volumetria de Portaria</h4>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400">Fluxos por {groupBy}</span>
              </div>

              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="key" stroke="#94a3b8" fontSize={9} fontStyle="bold" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', paddingTop: 10 }} />
                    <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntradas)" />
                    <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaidas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Supply diesel fuel timeline */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <Droplet size={16} className="text-teal-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Serviços Base / Combustível</h4>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Litros por {groupBy}</span>
              </div>

              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartFuelData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="key" stroke="#94a3b8" fontSize={9} fontStyle="bold" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8, borderColor: '#e2e8f0' }} formatter={(value: number) => [`${value} Unidades/Litros`]} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', paddingTop: 10 }} />
                    <Bar dataKey="diesel" name="Diesel" fill={FUEL_COLORS.diesel} radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="arla" name="Arla 32" fill={FUEL_COLORS.arla} radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="lubrificacao" name="Lubrificação" fill={FUEL_COLORS.lubrificacao} radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="calibracao" name="Calibração" fill={FUEL_COLORS.calibracao} radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Kanban Timings stay bottleneck */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <Clock size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Tempo Médio de Permanência por Etapa (Kanban)</h4>
                </div>
                <span className="text-[9px] uppercase font-bold text-rose-500 animate-pulse font-sans">Análise de Gargalos</span>
              </div>

              <div className="h-72 w-full mt-2">
                {chartKanbanTimingsData.some(i => i['Tempo Médio (Minutos)'] > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartKanbanTimingsData} layout="vertical" margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontStyle="bold" label={{ value: 'Minutos', position: 'insideBottom', offset: -5, fontSize: 9, fontWeight: 'bold' }} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} fontStyle="bold" width={80} />
                      <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} formatter={(v: number) => [`${v} minutos`]} />
                      <Bar dataKey="Tempo Médio (Minutos)" fill="#4f46e5" radius={[0, 4, 4, 0]}>
                        {chartKanbanTimingsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_THEME[index % COLORS_THEME.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 font-medium font-sans text-xs">Sem dados de tempos ativos em fila no Kanban neste período.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 5: Top clients horizontal bars */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <Award size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Top 10 Clientes Frequentes</h4>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono font-bold">Total Portões</span>
              </div>

              <div className="h-72 w-full mt-2">
                {chartTopClientsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTopClientsData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={8} fontStyle="black" width={110} />
                      <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} />
                      <Bar dataKey="value" name="Atendimentos" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                        {chartTopClientsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_THEME[(index + 2) % COLORS_THEME.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 font-medium font-sans text-xs flex items-center justify-center gap-1">Pátio limpo: Nenhum cliente com entregas no período.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 3: Donut Vehicle Types */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <PieIcon size={16} className="text-purple-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Mix de Veículos</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center flex-1">
                <div className="h-44 w-full">
                  {chartVehicleClassData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartVehicleClassData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartVehicleClassData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_THEME[index % COLORS_THEME.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-405 text-xs">Sem registros.</div>
                  )}
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {chartVehicleClassData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS_THEME[idx % COLORS_THEME.length] }}></div>
                        <span className="text-slate-650 uppercase font-bold text-[10px]">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-black">{item.value} viags</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Fleet Mix share proprio vs terceiro */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <div className="flex items-center space-x-1.5 text-slate-800">
                  <Users size={16} className="text-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Divisão de Propriedade</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center flex-1">
                <div className="h-44 w-full">
                  {chartOwnershipData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartOwnershipData}
                          innerRadius={0}
                          outerRadius={70}
                          paddingAngle={0}
                          dataKey="value"
                        >
                          {chartOwnershipData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#f59e0b'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">Sem registros.</div>
                  )}
                </div>

                <div className="space-y-3">
                  {chartOwnershipData.map((item, idx) => (
                    <div key={item.name} className="bg-slate-50 p-2 border border-slate-150 rounded-lg">
                      <div className="flex items-center space-x-2 text-xs font-bold uppercase mb-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: idx === 0 ? '#3b82f6' : '#f59e0b' }}></div>
                        <span className="text-slate-800 text-[10px]">{item.name}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-lg font-black text-slate-900 leading-none">{item.value}</p>
                        <p className="text-[10px] font-bold text-slate-450 uppercase leading-none">
                          {biKPIs.totalMovs > 0 ? `${Math.round((item.value / biKPIs.totalMovs) * 105) > 100 ? 100 : Math.round((item.value / biKPIs.totalMovs) * 100)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>


          {/* 5. Consolidado Tabular - Excel or Reference Review */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
            <div className="bg-slate-50/70 border-b border-slate-150 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText size={14} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-850 font-sans">
                  Resumo Consolidado de BI por Intervalo ({chartTimelineData.length} Pontos)
                </h4>
              </div>
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-450">Referencial Executivo</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Ponto / Intervalo</th>
                    <th className="py-2.5 px-4 text-center font-bold">Entradas Registradas</th>
                    <th className="py-2.5 px-4 text-center font-bold">Saídas Registradas</th>
                    <th className="py-2.5 px-4 text-center font-bold">Total Movimentação</th>
                    <th className="py-2.5 px-4 text-right font-bold">Diesel / Abastecimentos (Aprox)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                  {chartTimelineData.map((data) => {
                    const fuelItem = chartFuelData.find(f => f.key === data.key);
                    const fuelSum = fuelItem ? Math.round(fuelItem.total) : 0;

                    return (
                      <tr key={data.key} className="hover:bg-slate-50 font-medium">
                        <td className="py-2 px-4 uppercase font-bold text-slate-900">{data.key}</td>
                        <td className="py-2 px-4 text-center text-teal-800 font-bold">{data.entradas}</td>
                        <td className="py-2 px-4 text-center text-rose-800 font-bold">{data.saidas}</td>
                        <td className="py-2 px-4 text-center font-bold text-slate-800">{data.total}</td>
                        <td className="py-2 px-4 text-right text-indigo-750 font-extrabold tabular-nums">
                          {fuelSum > 0 ? `${fuelSum.toLocaleString()} L` : '0 L'}
                        </td>
                      </tr>
                    );
                  })}
                  {chartTimelineData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-450 font-sans font-medium uppercase tracking-wider text-[10px]">
                        Nenhum dado agregado encontrado para a amostragem configurada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
