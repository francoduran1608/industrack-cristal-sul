export interface WorkScheduleStatus {
  isWithinWorkHours: boolean;
  isScheduledPause: boolean;
  isOvertime: boolean;
  currentPeriodName: string;
  expectedNextState: string;
  formattedCurrentTime: string;
  dayName: string;
}

/**
 * Regras de Expediente:
 * - Segunda a Sexta:
 *   - 07:00 às 11:00: Expediente Normal
 *   - 11:00 às 13:00: Intervalo / Pausa Programada (Almoço)
 *   - 13:00 às 17:00: Expediente Normal
 *   - Antes das 07:00 ou após 17:00: Hora Extra
 * - Sábado:
 *   - 07:00 às 11:00: Expediente de Sábado
 *   - Após 11:00: Hora Extra
 * - Domingo:
 *   - Fora do horário padrão (Hora Extra / Plantão)
 */
export function getWorkScheduleStatus(date: Date = new Date()): WorkScheduleStatus {
  const day = date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const t7h = 7 * 60;   // 07:00 -> 420 min
  const t11h = 11 * 60; // 11:00 -> 660 min
  const t13h = 13 * 60; // 13:00 -> 780 min
  const t17h = 17 * 60; // 17:00 -> 1020 min

  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayName = dayNames[day];
  const formattedCurrentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Segunda a Sexta (1 a 5)
  if (day >= 1 && day <= 5) {
    if (timeInMinutes >= t7h && timeInMinutes < t11h) {
      return {
        isWithinWorkHours: true,
        isScheduledPause: false,
        isOvertime: false,
        currentPeriodName: 'Expediente Manhã (07:00 às 11:00)',
        expectedNextState: 'Pausa programada de almoço às 11:00',
        formattedCurrentTime,
        dayName,
      };
    } else if (timeInMinutes >= t11h && timeInMinutes < t13h) {
      return {
        isWithinWorkHours: false,
        isScheduledPause: true,
        isOvertime: false,
        currentPeriodName: 'Intervalo de Almoço Programado (11:00 às 13:00)',
        expectedNextState: 'Retorno do expediente às 13:00',
        formattedCurrentTime,
        dayName,
      };
    } else if (timeInMinutes >= t13h && timeInMinutes < t17h) {
      return {
        isWithinWorkHours: true,
        isScheduledPause: false,
        isOvertime: false,
        currentPeriodName: 'Expediente Tarde (13:00 às 17:00)',
        expectedNextState: 'Encerramento do expediente às 17:00 (ou Hora Extra)',
        formattedCurrentTime,
        dayName,
      };
    } else {
      const isBefore = timeInMinutes < t7h;
      return {
        isWithinWorkHours: false,
        isScheduledPause: false,
        isOvertime: true,
        currentPeriodName: isBefore 
          ? 'Antes do Expediente (07:00) - Hora Extra' 
          : 'Após o Expediente (17:00) - Hora Extra',
        expectedNextState: isBefore ? 'Início do expediente às 07:00' : 'Fim do turno regular',
        formattedCurrentTime,
        dayName,
      };
    }
  }

  // Sábado (6)
  if (day === 6) {
    if (timeInMinutes >= t7h && timeInMinutes < t11h) {
      return {
        isWithinWorkHours: true,
        isScheduledPause: false,
        isOvertime: false,
        currentPeriodName: 'Expediente de Sábado (07:00 às 11:00)',
        expectedNextState: 'Encerramento às 11:00 (ou Hora Extra)',
        formattedCurrentTime,
        dayName,
      };
    } else {
      return {
        isWithinWorkHours: false,
        isScheduledPause: false,
        isOvertime: true,
        currentPeriodName: 'Sábado fora do horário normal (Hora Extra)',
        expectedNextState: 'Expediente regular encerrado',
        formattedCurrentTime,
        dayName,
      };
    }
  }

  // Domingo (0)
  return {
    isWithinWorkHours: false,
    isScheduledPause: false,
    isOvertime: true,
    currentPeriodName: 'Domingo (Plantão / Hora Extra)',
    expectedNextState: 'Início do expediente na Segunda às 07:00',
    formattedCurrentTime,
    dayName,
  };
}

export const STOP_REASONS_CATALOG = [
  { id: 'almoco_programado', label: '🍽️ Pausa Programada de Almoço (11h às 13h)', defaultScheduled: true },
  { id: 'quebra_maquina', label: '⚙️ Quebra de Máquina / Manutenção Corretiva', isMachineIssue: true },
  { id: 'falta_vasilhame', label: '📦 Falta de Vasilhames / Garrafões / Insumos' },
  { id: 'falta_energia_agua', label: '⚡ Falta de Energia Elétrica / Abastecimento de Água' },
  { id: 'reuniao_treinamento', label: '👥 Reunião de Equipe / Treinamento / DDS' },
  { id: 'fim_expediente', label: '🛑 Encerramento do Expediente (Fim do Turno)' },
  { id: 'pausa_extraordinaria', label: '☕ Pausa / Intervalo Extraordinário' },
  { id: 'condicoes_climaticas', label: '🌧️ Condições Climáticas Adversas / Força Maior' },
  { id: 'outros', label: '✏️ Outro Motivo (Especificar)', isCustom: true },
] as const;
