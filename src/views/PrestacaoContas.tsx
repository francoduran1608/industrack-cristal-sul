import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Receipt, Plus, Trash2, Check, X, AlertCircle, TrendingUp, Coins, 
  Upload, Calendar, DollarSign, Search, CheckCircle2, Info, ArrowRight,
  ShieldAlert, Landmark, FileSpreadsheet, Eye, Printer, Filter, Lock, FileText,
  AlertTriangle, Smartphone, Truck, Edit
} from 'lucide-react';
import { DriverSettlement, SettlementSale, SettlementExpense, SettlementSuprimento, BankTransaction, Movement, ProductionControl } from '../types';

const cleanItemDisplay = (itemStr: string, clientStr: string) => {
  let prodDisplayName = itemStr;
  if (clientStr && itemStr.startsWith(clientStr + ' - ')) {
    prodDisplayName = itemStr.substring(clientStr.length + 3);
  } else if (itemStr.includes(' - ')) {
    prodDisplayName = itemStr.split(' - ').slice(1).join(' - ');
  }
  return prodDisplayName;
};

const isPurchaseType = (typeId: string, customTypes: any[]) => {
  const norm = typeId.toLowerCase();
  const matched = customTypes.find(c => c.id === typeId || c.type.toLowerCase() === norm);
  if (matched) return matched.category === 'compra' || matched.category === 'vasilhame_rota';
  return norm.includes('compra') || norm.includes('rota') || norm.includes('adicion') || norm.includes('aquisi');
};

const isDriverDeductibleAvaria = (typeId: any, customTypes: any[] = []) => {
  if (!typeId || typeof typeId !== 'string') return false;
  const norm = typeId.toLowerCase().trim();
  
  // Explicitly ignore those that returned sealed or are non-driver deductible
  if (norm.includes('troca')) return false;
  if (norm === 'microfuro' || norm.includes('microfuro')) return false;
  if (norm.includes('vencido (cheio)') || norm.includes('vencido cheio')) return false;
  if (norm.includes('quebrado lacrado') || norm.includes('quebradolac')) return false;
  if (
    norm.includes('vencido do mês (seco)') || 
    norm.includes('vencido do mes (seco)') || 
    norm.includes('vencido do mês seco') || 
    norm.includes('vencido do mes seco')
  ) return false;
  
  const matched = (customTypes || []).find(c => c.id === typeId || (c?.type || '').toLowerCase().trim() === norm);
  
  if (matched) {
    if (matched.category === 'compra') return false;
    if (matched.origin === 'cliente') return false;
    
    const mType = (matched.type || '').toLowerCase().trim();
    if (
      mType.includes('vencido do mês (seco)') || 
      mType.includes('vencido do mes (seco)') || 
      mType.includes('vencido do mês seco') || 
      mType.includes('vencido do mes seco')
    ) {
      return false;
    }
    
    // Only the specified default avarias are discounted from the driver by default
    if (mType === 'vencido' || mType === 'cheiro' || mType === 'lodo' || mType === 'quebrado') {
      return true;
    }
    
    return matched.descontarMotorista !== false;
  }
  
  const isPurchase = norm.includes('compra') || norm.includes('adicion') || norm.includes('aquisi');
  if (isPurchase) return false;
  
  // Default fallback to only count specified ones (excluding vencido do mês seco due to early check)
  return norm.includes('vencido') || norm.includes('cheiro') || norm.includes('lodo') || norm.includes('quebrado');
};

export const isDisposableProduct = (itemStr: string) => {
  const l = (itemStr || '').toLowerCase();
  return l.includes('copo') || l.includes('200ml') || l.includes('cx c/ 48') || l.includes('510ml') || l.includes('1,5') || l.includes('1.5');
};

// Robust helper to parse Brazilian date formats
const parseDateString = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  let clean = dateStr.replace(/["']/g, '').trim();
  
  // If it has space or T (which means time component), take the first part
  if (clean.includes(' ')) {
    clean = clean.split(' ')[0];
  } else if (clean.includes('T')) {
    clean = clean.split('T')[0];
  }
  
  clean = clean.trim();
  
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  
  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  
  // Format DD/MM/YY or DD-MM-YY
  const dmyShortMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyShortMatch) {
    const d = dmyShortMatch[1].padStart(2, '0');
    const m = dmyShortMatch[2].padStart(2, '0');
    const y = '20' + dmyShortMatch[3];
    return `${y}-${m}-${d}`;
  }
  
  // Format DD.MM.YYYY
  const dmyDotMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyDotMatch) {
    const d = dmyDotMatch[1].padStart(2, '0');
    const m = dmyDotMatch[2].padStart(2, '0');
    const y = dmyDotMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback: if we have 8 digits, try YYYYMMDD or DDMMYYYY
  if (/^\d{8}$/.test(clean)) {
    const first4 = parseInt(clean.substring(0, 4));
    if (first4 >= 2020 && first4 <= 2035) {
      return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
    } else {
      return `${clean.substring(4, 8)}-${clean.substring(2, 4)}-${clean.substring(0, 2)}`;
    }
  }

  return new Date().toISOString().split('T')[0];
};

const formatDateStringBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const calculateSalesPaymentBreakdown = (salesList: SettlementSale[]) => {
  const totals = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
  salesList.forEach(s => {
    if (s.paymentsBreakdown) {
      totals.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
      totals.pix += Number(s.paymentsBreakdown.pix) || 0;
      totals.boleto += Number(s.paymentsBreakdown.boleto) || 0;
      totals.cheque += Number(s.paymentsBreakdown.cheque) || 0;
      totals.outros += Number(s.paymentsBreakdown.outros) || 0;
    } else {
      const lineTotal = s.qty * s.value;
      const method = s.paymentMethod || 'dinheiro';
      if (method === 'dinheiro') totals.dinheiro += lineTotal;
      else if (method === 'pix') totals.pix += lineTotal;
      else if (method === 'boleto') totals.boleto += lineTotal;
      else if (method === 'cheque') totals.cheque += lineTotal;
      else totals.outros += lineTotal;
    }
  });

  // Clean up floating point precision issues
  totals.dinheiro = Number(totals.dinheiro.toFixed(2));
  totals.pix = Number(totals.pix.toFixed(2));
  totals.boleto = Number(totals.boleto.toFixed(2));
  totals.cheque = Number(totals.cheque.toFixed(2));
  totals.outros = Number(totals.outros.toFixed(2));
  
  return totals;
};

const calculateSalesProductTotals = (salesList: SettlementSale[]) => {
  const totals: Record<string, number> = {};
  salesList.forEach(s => {
    const name = s.item;
    totals[name] = (totals[name] || 0) + s.qty;
  });
  return totals;
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

// Robust helper to parse Brazilian currency and number formats
const parseAmountString = (amountStr: string): number => {
  if (!amountStr) return 0;
  
  let clean = amountStr.replace(/[R$\s]/g, '').trim();
  
  // Check if it has both dots and commas (e.g. 1.234,56 or 1,234.56)
  if (clean.includes('.') && clean.includes(',')) {
    const dotIdx = clean.indexOf('.');
    const commaIdx = clean.indexOf(',');
    if (dotIdx < commaIdx) {
      // Brazilian format: 1.234,56
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // Only comma (e.g. 1234,56)
    clean = clean.replace(',', '.');
  }
  
  // Check for trailing or leading '-' or 'D' (debt) / 'C' (credit)
  let isNegative = false;
  if (clean.startsWith('-') || clean.endsWith('-')) {
    isNegative = true;
    clean = clean.replace('-', '');
  }
  if (clean.toUpperCase().endsWith('D')) {
    isNegative = true;
    clean = clean.substring(0, clean.length - 1).trim();
  }
  if (clean.toUpperCase().endsWith('C')) {
    isNegative = false;
    clean = clean.substring(0, clean.length - 1).trim();
  }
  
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  return isNegative ? -Math.abs(val) : val;
};

// OFX Statement Parser
const parseOFX = (text: string, userUnit: string): BankTransaction[] => {
  const transactions: BankTransaction[] = [];
  const stmttrnParts = text.split(/<STMTTRN>/i);
  
  for (let i = 1; i < stmttrnParts.length; i++) {
    const part = stmttrnParts[i].split(/<\/STMTTRN>/i)[0];
    
    const getTagValue = (tagName: string): string => {
      const regex = new RegExp(`<${tagName}>([^<\r\n]+)`, 'i');
      const match = part.match(regex);
      return match ? match[1].trim() : '';
    };

    const trntype = getTagValue('TRNTYPE');
    const dtposted = getTagValue('DTPOSTED');
    const trnamtStr = getTagValue('TRNAMT');
    const fitid = getTagValue('FITID') || getTagValue('CHECKNUM') || getTagValue('REFNUM');
    let memo = getTagValue('MEMO') || getTagValue('NAME');
    
    if (!memo) {
      memo = "RECEBIMENTO";
    }

    const amount = parseAmountString(trnamtStr);
    
    let dateStr = new Date().toISOString().split('T')[0];
    if (dtposted && dtposted.trim().length >= 8) {
      const cleanDt = dtposted.trim();
      const y = cleanDt.substring(0, 4);
      const m = cleanDt.substring(4, 6);
      const d = cleanDt.substring(6, 8);
      dateStr = `${y}-${m}-${d}`;
    }

    const isCredit = trntype.toUpperCase() === 'CREDIT' || amount > 0;
    const uppercaseMemo = memo.toUpperCase();
    const isPixDevolucao = 
      uppercaseMemo.includes('DEVOLU') || 
      uppercaseMemo.includes('ESTORNO') || 
      uppercaseMemo.includes('REEMBOLSO') ||
      uppercaseMemo.includes('DEVOLUÇÃO') ||
      uppercaseMemo.includes('DEVOLUCAO') ||
      uppercaseMemo.includes('DEVOLVIDO');
    
    if (isCredit || (amount < 0 && isPixDevolucao)) {
      const absAmount = Math.abs(amount);
      if (absAmount > 0) {
        const isPixOrTransf = 
          uppercaseMemo.includes('PIX') ||
          uppercaseMemo.includes('TRANSF') ||
          uppercaseMemo.includes('TRANSFER') ||
          uppercaseMemo.includes('TRF') ||
          uppercaseMemo.includes('TED') ||
          uppercaseMemo.includes('DOC') ||
          uppercaseMemo.includes('TEF') ||
          uppercaseMemo.includes('CRED') ||
          uppercaseMemo.includes('RECEB') ||
          uppercaseMemo.includes('ENTRADA') ||
          uppercaseMemo.includes('DEP') ||
          uppercaseMemo.includes('PAG') ||
          uppercaseMemo.includes('BOLETO') ||
          uppercaseMemo.includes('COB') ||
          uppercaseMemo.includes('DINHEIRO') ||
          uppercaseMemo.includes('RECONCIL') ||
          isPixDevolucao ||
          (!uppercaseMemo.includes('TARIFA') && 
           !uppercaseMemo.includes('SAQUE') && 
           !uppercaseMemo.includes('APLIC') && 
           !uppercaseMemo.includes('JUROS') && 
           !uppercaseMemo.includes('IOF'));

        if (isPixOrTransf) {
          transactions.push({
            id: 'tx-' + Math.random().toString(36).substr(2, 9),
            date: dateStr,
            description: memo,
            amount: amount < 0 ? amount : absAmount,
            documentRef: fitid || `OFX-${Math.floor(Math.random() * 1000000)}`,
            isReconciled: false,
            importedAt: new Date().toISOString(),
            unit: (userUnit as 'matriz' | 'filial') || 'matriz',
            isRefund: amount < 0 && isPixDevolucao
          });
        }
      }
    }
  }
  return transactions;
};

// CSV or TXT Parser
const parseCSVOrTXT = (text: string, userUnit: string): BankTransaction[] => {
  const transactions: BankTransaction[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // 1. Detect delimiter
  let delimiter = ';';
  let semicolonCount = 0;
  let tabCount = 0;
  let commaCount = 0;
  
  lines.slice(0, 10).forEach(line => {
    semicolonCount += (line.match(/;/g) || []).length;
    tabCount += (line.match(/\t/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  });
  
  if (tabCount > semicolonCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (commaCount > semicolonCount && commaCount > tabCount) {
    if (semicolonCount > 0) {
      delimiter = ';';
    } else {
      delimiter = ',';
    }
  } else {
    delimiter = ';';
  }

  if (semicolonCount === 0 && tabCount === 0 && commaCount === 0) {
    delimiter = ' ';
  }

  const splitLine = (line: string, delim: string): string[] => {
    let cols: string[] = [];
    if (delim === '\t') {
      cols = line.split('\t');
    } else if (delim === ';') {
      cols = line.split(';');
    } else if (delim === ',') {
      cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    } else {
      cols = line.split(/\s{2,}|\t/);
    }
    return cols.map(c => c.replace(/^["']|["']$/g, '').trim());
  };

  // 2. Identify Column Indices
  let dateColIndex = -1;
  let descColIndex = -1;
  let amountColIndex = -1;
  let refColIndex = -1;
  let headerIndex = -1;

  const headerTermsDate = ['DATA', 'DATE', 'DT', 'MOVIMENTACAO', 'MOVIMENTAÇÃO', 'DIA'];
  const headerTermsDesc = ['DESC', 'HIST', 'MEMO', 'DETALHE', 'OPERACAO', 'OPERAÇÃO', 'TRANSACAO', 'TRANSAÇÃO', 'DESCRICAO', 'DESCRIÇÃO'];
  const headerTermsAmount = ['VALOR', 'AMOUNT', 'VAL', 'LANCAMENTO', 'LANÇAMENTO', 'CREDITO', 'CRÉDITO', 'ENTRADA', 'RECEBIDO', 'SALDO'];
  const headerTermsRef = ['REF', 'DOC', 'FITID', 'CONTROLE', 'NÚMERO', 'NUMERO', 'ID', 'CONCILIAÇÃO'];

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cols = splitLine(lines[i], delimiter);
    let foundDate = -1;
    let foundDesc = -1;
    let foundAmount = -1;
    let foundRef = -1;

    cols.forEach((col, idx) => {
      const uc = col.toUpperCase();
      if (headerTermsDate.some(term => uc === term || uc.includes(term))) foundDate = idx;
      if (headerTermsDesc.some(term => uc === term || uc.includes(term))) foundDesc = idx;
      if (headerTermsAmount.some(term => uc === term || uc.includes(term))) {
        if (uc !== 'SALDO') {
          foundAmount = idx;
        } else if (foundAmount === -1) {
          foundAmount = idx;
        }
      }
      if (headerTermsRef.some(term => uc === term || uc.includes(term))) foundRef = idx;
    });

    if (foundDate !== -1 && foundAmount !== -1) {
      headerIndex = i;
      dateColIndex = foundDate;
      amountColIndex = foundAmount;
      if (foundDesc !== -1) {
        descColIndex = foundDesc;
      } else {
        descColIndex = cols.findIndex((_, idx) => idx !== foundDate && idx !== foundAmount);
      }
      refColIndex = foundRef !== -1 ? foundRef : cols.findIndex((_, idx) => idx !== foundDate && idx !== foundAmount && idx !== descColIndex);
      break;
    }
  }

  // 3. Guess Column Indices if No Header found
  if (headerIndex === -1) {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const cols = splitLine(lines[i], delimiter);
      if (cols.length >= 2) {
        let dateIdx = -1;
        let amountIdx = -1;

        cols.forEach((col, idx) => {
          if (/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(col) || /^\d{4}-\d{2}-\d{2}$/.test(col)) {
            dateIdx = idx;
          }
          const cleanVal = col.replace(/[R$\s]/g, '').replace(',', '.');
          const p = parseFloat(cleanVal);
          if (!isNaN(p) && p !== 0 && !/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(col)) {
            amountIdx = idx;
          }
        });

        if (dateIdx !== -1 && amountIdx !== -1) {
          dateColIndex = dateIdx;
          amountColIndex = amountIdx;
          descColIndex = cols.findIndex((col, idx) => idx !== dateIdx && idx !== amountIdx && /[a-zA-Z]/.test(col));
          if (descColIndex === -1) {
            descColIndex = cols.findIndex((_, idx) => idx !== dateIdx && idx !== amountIdx);
          }
          refColIndex = cols.findIndex((_, idx) => idx !== dateIdx && idx !== amountIdx && idx !== descColIndex);
          headerIndex = i - 1;
          break;
        }
      }
    }
  }

  if (dateColIndex === -1) dateColIndex = 0;
  if (descColIndex === -1) descColIndex = 1;
  if (amountColIndex === -1) amountColIndex = 2;
  if (refColIndex === -1) refColIndex = 3;

  const startRowIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
  for (let i = startRowIndex; i < lines.length; i++) {
    const line = lines[i];
    const cols = splitLine(line, delimiter);
    if (cols.length <= Math.max(dateColIndex, amountColIndex)) continue;

    const rawDate = cols[dateColIndex];
    const rawDesc = cols[descColIndex] || "RECEBIMENTO";
    const rawAmount = cols[amountColIndex];
    const rawRef = cols[refColIndex] || '';

    if (!rawDate || (!/\d{2}[\/\-]\d{2}/.test(rawDate) && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate))) {
      continue;
    }

    const dateStr = parseDateString(rawDate);
    const amount = parseAmountString(rawAmount);
    const ref = rawRef.trim() || `DOC-${Math.floor(Math.random() * 1000000)}`;

    if (amount > 0) {
      const uppercaseDesc = rawDesc.toUpperCase();
      const isPixOrTransf = 
        uppercaseDesc.includes('PIX') ||
        uppercaseDesc.includes('TRANSF') ||
        uppercaseDesc.includes('TRANSFER') ||
        uppercaseDesc.includes('TRF') ||
        uppercaseDesc.includes('TED') ||
        uppercaseDesc.includes('DOC') ||
        uppercaseDesc.includes('TEF') ||
        uppercaseDesc.includes('CRED') ||
        uppercaseDesc.includes('RECEB') ||
        uppercaseDesc.includes('ENTRADA') ||
        uppercaseDesc.includes('DEP') ||
        uppercaseDesc.includes('PAG') ||
        uppercaseDesc.includes('BOLETO') ||
        uppercaseDesc.includes('COB') ||
        uppercaseDesc.includes('DINHEIRO') ||
        uppercaseDesc.includes('RECONCIL') ||
        (!uppercaseDesc.includes('TARIFA') && 
         !uppercaseDesc.includes('SAQUE') && 
         !uppercaseDesc.includes('APLIC') && 
         !uppercaseDesc.includes('JUROS') && 
         !uppercaseDesc.includes('IOF'));

      if (isPixOrTransf) {
        transactions.push({
          id: 'tx-' + Math.random().toString(36).substr(2, 9),
          date: dateStr,
          description: rawDesc,
          amount: amount,
          documentRef: ref,
          isReconciled: false,
          importedAt: new Date().toISOString(),
          unit: (userUnit as 'matriz' | 'filial') || 'matriz'
        });
      }
    }
  }

  return transactions;
};

const formatBRLWithoutSymbol = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  const fixed = val.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInteger},${decimalPart}`;
};

const parseBRLCurrency = (inputStr: string): number => {
  const digits = inputStr.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

export const PrestacaoContas: React.FC = () => {
  const { 
    movements, 
    registeredDrivers, 
    registeredVehicles,
    registeredClients = [],
    driverSettlements = [],
    bankTransactions = [],
    addDriverSettlement,
    updateDriverSettlement,
    deleteDriverSettlement,
    importBankTransactions,
    reconcileDriverSettlementWithPix,
    unreconcileDriverSettlement,
    removeBankTransaction,
    deleteImportedFile,
    manuallyReconcileBankTransaction,
    undoManualReconciliation,
    voidBankTransaction,
    undoVoidBankTransaction,
    currentUser,
    updateMovementDetails,
    customAvariaTypes = [],
    registeredCities = [],
    driverTripLoads = [],
    updateDriverTripLoad
  } = useStore();

  const [txToDelete, setTxToDelete] = useState<BankTransaction | null>(null);
  const [refundTxToLink, setRefundTxToLink] = useState<BankTransaction | null>(null);
  const [selectedEntryTxId, setSelectedEntryTxId] = useState<string>('');
  const [searchInutilizarQuery, setSearchInutilizarQuery] = useState<string>('');

  const isReadOnly = currentUser?.role === 'visualizador' || currentUser?.role === 'supervisor';

  const getMatchingRefund = (tx: BankTransaction) => {
    if (tx.isRefund || tx.isVoided || tx.amount <= 0) return null;
    return (bankTransactions || []).find(refund => 
      refund.isRefund && 
      !refund.isReconciled && 
      Math.abs(refund.amount) === tx.amount
    );
  };

  const hasMatchingRefund = (tx: BankTransaction) => {
    return getMatchingRefund(tx) !== null;
  };

  const [activeSubTab, setActiveSubTab] = useState<'pending_movements' | 'history' | 'bank_reconciliation'>('pending_movements');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // Cash Advance State
  const [cashAdvanceModalOpen, setCashAdvanceModalOpen] = useState(false);
  const [cashAdvanceMovement, setCashAdvanceMovement] = useState<Movement | null>(null);
  const [cashAdvanceValue, setCashAdvanceValue] = useState<string>('');
  const [cashAdvanceReason, setCashAdvanceReason] = useState<string>('');
  const [cashAdvanceReceipt, setCashAdvanceReceipt] = useState<any | null>(null);
  
  // Settlement Form State
  const [sales, setSales] = useState<SettlementSale[]>([]);
  const [detailedSales, setDetailedSales] = useState<SettlementSale[]>([]);
  const [expenses, setExpenses] = useState<SettlementExpense[]>([]);
  const [suprimentos, setSuprimentos] = useState<SettlementSuprimento[]>([]);
  const [newSuprimentoItem, setNewSuprimentoItem] = useState('');
  const [newSuprimentoValue, setNewSuprimentoValue] = useState(0);
  const [payments, setPayments] = useState({
    dinheiro: 0,
    pix: 0,
    boleto: 0,
    cheque: 0,
    outros: 0
  });
  const [avariaQty, setAvariaQty] = useState(0);
  const [avariaUnitValue, setAvariaUnitValue] = useState(0);
  const [dateArrival, setDateArrival] = useState('');
  const [observation, setObservation] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(8);
  const [cidade, setCidade] = useState('');
  const [formError, setFormError] = useState('');
  const [suggestedWaterQty, setSuggestedWaterQty] = useState(0);
  const [suggestedVasilhameQty, setSuggestedVasilhameQty] = useState(0);
  const [vendaVasilhameQty, setVendaVasilhameQty] = useState(0);
  const [comodatoVasilhameQty, setComodatoVasilhameQty] = useState(0);

  // Sync venda de vasilhame and comodato de vasilhame whenever sales change to deduct from shortage
  useEffect(() => {
    const vasilhameSalesQty = sales
      .filter(s => s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('comodato') && !s.item.toLowerCase().includes('retorno'))
      .reduce((sum, s) => sum + s.qty, 0);
    
    setVendaVasilhameQty(vasilhameSalesQty);

    const comodatoSalesQty = sales
      .filter(s => s.item.toLowerCase().includes('comodato'))
      .reduce((sum, s) => sum + s.qty, 0);

    setComodatoVasilhameQty(comodatoSalesQty);
  }, [sales]);

  const [isEditingMobileData, setIsEditingMobileData] = useState(false);
  const [editingMobileTab, setEditingMobileTab] = useState<'sales' | 'expenses'>('sales');

  const handleSyncMobileData = (updatedSales: SettlementSale[], updatedExpenses: SettlementExpense[]) => {
    if (!selectedMovement) return;

    // 1. Calculate autoPayments
    const autoPayments = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
    updatedSales.forEach(s => {
      if (s.paymentsBreakdown) {
        autoPayments.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
        autoPayments.pix += Number(s.paymentsBreakdown.pix) || 0;
        autoPayments.boleto += Number(s.paymentsBreakdown.boleto) || 0;
        autoPayments.cheque += Number(s.paymentsBreakdown.cheque) || 0;
        autoPayments.outros += Number(s.paymentsBreakdown.outros) || 0;
      } else {
        const method = s.paymentMethod || 'dinheiro';
        const lineTotal = (s.qty || 0) * (s.value || 0);
        if (method === 'dinheiro') autoPayments.dinheiro += lineTotal;
        else if (method === 'pix') autoPayments.pix += lineTotal;
        else if (method === 'boleto') autoPayments.boleto += lineTotal;
        else if (method === 'cheque') autoPayments.cheque += lineTotal;
        else autoPayments.outros += lineTotal;
      }
    });

    autoPayments.dinheiro = Number(autoPayments.dinheiro.toFixed(2));
    autoPayments.pix = Number(autoPayments.pix.toFixed(2));
    autoPayments.boleto = Number(autoPayments.boleto.toFixed(2));
    autoPayments.cheque = Number(autoPayments.cheque.toFixed(2));
    autoPayments.outros = Number(autoPayments.outros.toFixed(2));

    // 2. Group the sales by product type/price and strip client names
    const groupedSalesMap = new Map<string, SettlementSale>();
    updatedSales.forEach(s => {
      let cleanItem = s.item;
      if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
        cleanItem = s.item.substring(s.clientName.length + 3);
      } else {
        const itemParts = s.item.split(' - ');
        cleanItem = itemParts.length > 1 ? itemParts.slice(1).join(' - ') : s.item;
      }
      if (!isDisposableProduct(cleanItem) && (cleanItem.toLowerCase().includes("água") || cleanItem.toLowerCase().includes("agua"))) cleanItem = "Água 20 Lts";
      if (cleanItem.toLowerCase() === 'vasilhame') cleanItem = 'Vasilhame';
      if (cleanItem.toLowerCase().includes('bonifica')) cleanItem = 'Bonificação';
      if (cleanItem.toLowerCase().includes('comodato')) cleanItem = 'Comodato (Vasilhame)';
      if (cleanItem.toLowerCase().includes('retorno')) cleanItem = 'Retorno Comodato (Vasilhame)';

      const key = `${cleanItem}_${(s.value || 0).toFixed(2)}`;
      
      if (groupedSalesMap.has(key)) {
        const existing = groupedSalesMap.get(key)!;
        existing.qty += s.qty;
        existing.qty = Math.round(existing.qty); 
        if (s.paymentsBreakdown) {
          if (!existing.paymentsBreakdown) {
            existing.paymentsBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
          }
          existing.paymentsBreakdown.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
          existing.paymentsBreakdown.pix += Number(s.paymentsBreakdown.pix) || 0;
          existing.paymentsBreakdown.boleto += Number(s.paymentsBreakdown.boleto) || 0;
          existing.paymentsBreakdown.cheque += Number(s.paymentsBreakdown.cheque) || 0;
          existing.paymentsBreakdown.outros += Number(s.paymentsBreakdown.outros) || 0;
        } else {
          if (!existing.paymentsBreakdown) {
            existing.paymentsBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
          }
          const sMethod = s.paymentMethod || 'dinheiro';
          const sTotal = s.qty * s.value;
          if (sMethod === 'dinheiro') existing.paymentsBreakdown.dinheiro += sTotal;
          else if (sMethod === 'pix') existing.paymentsBreakdown.pix += sTotal;
          else if (sMethod === 'boleto') existing.paymentsBreakdown.boleto += sTotal;
          else if (sMethod === 'cheque') existing.paymentsBreakdown.cheque += sTotal;
          else existing.paymentsBreakdown.outros += sTotal;
        }
      } else {
        const initBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
        if (s.paymentsBreakdown) {
          initBreakdown.dinheiro = Number(s.paymentsBreakdown.dinheiro) || 0;
          initBreakdown.pix = Number(s.paymentsBreakdown.pix) || 0;
          initBreakdown.boleto = Number(s.paymentsBreakdown.boleto) || 0;
          initBreakdown.cheque = Number(s.paymentsBreakdown.cheque) || 0;
          initBreakdown.outros = Number(s.paymentsBreakdown.outros) || 0;
        } else {
          const sMethod = s.paymentMethod || 'dinheiro';
          const sTotal = s.qty * s.value;
          if (sMethod === 'dinheiro') initBreakdown.dinheiro = sTotal;
          else if (sMethod === 'pix') initBreakdown.pix = sTotal;
          else if (sMethod === 'boleto') initBreakdown.boleto = sTotal;
          else if (sMethod === 'cheque') initBreakdown.cheque = sTotal;
          else initBreakdown.outros = sTotal;
        }

        groupedSalesMap.set(key, {
          id: 'grp-' + Math.random().toString(36).substring(2, 9),
          saleNumber: 'consolidado',
          item: cleanItem,
          qty: Math.round(s.qty),
          value: s.value,
          paymentMethod: 'consolidado',
          productType: s.productType,
          paymentsBreakdown: initBreakdown
        });
      }
    });

    const initialSales = Array.from(groupedSalesMap.values());
    setSales(initialSales);

    // 3. Set expenses
    let initialExpenses = updatedExpenses;
    if (initialExpenses.length === 0) {
      initialExpenses = [
        {
          id: 'exp-almoco-' + Date.now().toString(36) + '1',
          item: 'Almoço',
          value: 0
        },
        {
          id: 'exp-ajudante-' + Date.now().toString(36) + '2',
          item: 'Ajudante',
          value: 0
        }
      ];
    }
    setExpenses(initialExpenses);

    // 4. Update payments (cash registry)
    const totalExpenses = initialExpenses.reduce((sum, e) => sum + e.value, 0);
    const totalSuprimentos = suprimentos.reduce((sum, s) => sum + s.value, 0);
    setPayments({
      dinheiro: Number(Math.max(0, autoPayments.dinheiro - totalExpenses + totalSuprimentos).toFixed(2)),
      pix: autoPayments.pix,
      boleto: autoPayments.boleto,
      cheque: autoPayments.cheque,
      outros: autoPayments.outros
    });

    // 5. Update movement details in store
    updateMovementDetails(selectedMovement.id, {
      productionControl: {
        ...selectedMovement.productionControl,
        mobileSales: updatedSales,
        mobileExpenses: updatedExpenses
      }
    });

    // 6. Force reactive update of local selectedMovement state
    setSelectedMovement(prev => {
      if (!prev) return null;
      return {
        ...prev,
        productionControl: {
          ...prev.productionControl,
          mobileSales: updatedSales,
          mobileExpenses: updatedExpenses
        }
      };
    });
  };

  const [selectedPixTxIds, setSelectedPixTxIds] = useState<string[]>([]);

  // Manual sale entry states (similar to driver's cart workflow)
  const [manualSaleClientName, setManualSaleClientName] = useState('');
  const [showManualSaleClientDropdown, setShowManualSaleClientDropdown] = useState(false);
  const [manualSaleProductType, setManualSaleProductType] = useState<'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca'>('agua');
  const [manualSaleQty, setManualSaleQty] = useState<number | ''>('');
  const [manualSaleUnitPrice, setManualSaleUnitPrice] = useState<number | ''>('');
  const [manualExchangeRatio, setManualExchangeRatio] = useState<number>(4);
  const [manualExchangeAvariasQty, setManualExchangeAvariasQty] = useState<number | ''>('');
  const [manualSaleCart, setManualSaleCart] = useState<Array<{ productType: 'agua' | 'agua_copo' | 'garrafa510' | 'garrafa15l' | 'vasilhame' | 'bonificacao' | 'comodato' | 'retorno' | 'troca'; qty: number; unitPrice: number; exchangeAvariasQty?: number; exchangeRatio?: number }>>([]);
  const [manualPayDinheiro, setManualPayDinheiro] = useState<string>('');
  const [manualPayPix, setManualPayPix] = useState<string>('');
  const [manualPayBoleto, setManualPayBoleto] = useState<string>('');
  const [manualPayCheque, setManualPayCheque] = useState<string>('');
  const [manualPayOutros, setManualPayOutros] = useState<string>('');
  const [manualPayOutrosNote, setManualPayOutrosNote] = useState<string>('');

  const getManualProductDisplayName = (type: string) => {
    switch (type) {
      case 'agua': return 'Água 20 Lts';
      case 'agua_copo': return 'Água Copo 200ml (Cx c/ 48un)';
      case 'garrafa510': return 'Água Garrafa 510ml (Fd c/ 12un)';
      case 'garrafa15l': return 'Água Garrafa 1,5L (Fd c/ 6un)';
      case 'vasilhame': return 'Vasilhame';
      case 'bonificacao': return 'Bonificação de Água';
      case 'comodato': return 'Comodato de Vasilhame';
      case 'retorno': return 'Retorno Comodato (Vasilhame)';
      case 'troca': return 'Troca Vasilhame/Água';
      default: return type;
    }
  };

  useEffect(() => {
    if (manualSaleProductType === 'troca' && typeof manualSaleQty === 'number' && manualSaleQty > 0) {
      setManualExchangeAvariasQty(manualSaleQty * manualExchangeRatio);
    } else {
      setManualExchangeAvariasQty('');
    }
  }, [manualSaleQty, manualExchangeRatio, manualSaleProductType]);

  // Bank Reconciliation States
  const [txToManualReconcile, setTxToManualReconcile] = useState<BankTransaction | null>(null);
  const [manualReconcileReason, setManualReconcileReason] = useState('');
  const [selectedBankTxIds, setSelectedBankTxIds] = useState<string[]>([]);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [bulkManualReconcileReason, setBulkManualReconcileReason] = useState('');
  const [showBulkReconcileModal, setShowBulkReconcileModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedImportInstitution, setSelectedImportInstitution] = useState<string>('auto');
  const [customImportInstitution, setCustomImportInstitution] = useState<string>('');

  // Expense inputs state
  const [newExpenseItem, setNewExpenseItem] = useState('');
  const [newExpenseValue, setNewExpenseValue] = useState(0);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState('');

  // Viewing detail Modal state
  const [viewingSettlement, setViewingSettlement] = useState<DriverSettlement | null>(null);

  // Reconciling Modal state
  const [reconcilingSettlement, setReconcilingSettlement] = useState<DriverSettlement | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [searchPixQuery, setSearchPixQuery] = useState('');
  const [searchPixInActiveSettlementQuery, setSearchPixInActiveSettlementQuery] = useState('');
  const [showQtyWarningModal, setShowQtyWarningModal] = useState(false);

  // Filters for completed settlements
  const [searchSettlementQuery, setSearchSettlementQuery] = useState('');
  const [filterReconciliation, setFilterReconciliation] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [filterSettlementStartDate, setFilterSettlementStartDate] = useState('');
  const [filterSettlementEndDate, setFilterSettlementEndDate] = useState('');
  const [filterSettlementDriver, setFilterSettlementDriver] = useState('');
  const [filterSettlementVehicle, setFilterSettlementVehicle] = useState('');

  // Search query for bank transactions tab
  const [searchBankQuery, setSearchBankQuery] = useState('');
  const [filterBankReconciliation, setFilterBankReconciliation] = useState<'all' | 'reconciled' | 'pending' | 'refunds'>('all');
  const [filterBankInstitution, setFilterBankInstitution] = useState<string>('all');

  // Filter completed settlements
  const filteredCompletedSettlements = React.useMemo(() => {
    return driverSettlements.filter(ds => {
      if (ds.status !== 'completed') return false;

      // Filter by specific driver if selected
      if (filterSettlementDriver && ds.driverName !== filterSettlementDriver) {
        return false;
      }

      // Filter by specific vehicle if selected
      if (filterSettlementVehicle && ds.plate !== filterSettlementVehicle) {
        return false;
      }

      // Filter by start and end date if selected
      const checkDate = ds.dateSettlement || (ds.dateArrival ? ds.dateArrival.split('T')[0] : '');
      if (filterSettlementStartDate && checkDate < filterSettlementStartDate) {
        return false;
      }
      if (filterSettlementEndDate && checkDate > filterSettlementEndDate) {
        return false;
      }

      const query = searchSettlementQuery.toLowerCase().trim();
      if (!query) {
        if (filterReconciliation === 'reconciled') {
          return ds.isReconciled || (ds.payments?.pix || 0) === 0;
        } else if (filterReconciliation === 'pending') {
          return !ds.isReconciled && (ds.payments?.pix || 0) > 0;
        }
        return true;
      }

      const matchesName = ds.driverName.toLowerCase().includes(query);
      const matchesPlate = ds.plate.toLowerCase().includes(query);
      const matchesId = ds.id.toLowerCase().includes(query);
      
      // Search by values (e.g. commission, total to receive, PIX payment)
      const matchesValue = 
        ds.totalToReceive.toString().includes(query) ||
        ds.totalToReceive.toFixed(2).includes(query) ||
        ds.totalToReceive.toFixed(2).replace('.', ',').includes(query) ||
        ds.finalCommission.toString().includes(query) ||
        ds.finalCommission.toFixed(2).includes(query) ||
        ds.finalCommission.toFixed(2).replace('.', ',').includes(query) ||
        (ds.payments && (
          (ds.payments.dinheiro || 0).toString().includes(query) ||
          (ds.payments.dinheiro || 0).toFixed(2).includes(query) ||
          (ds.payments.dinheiro || 0).toFixed(2).replace('.', ',').includes(query) ||
          (ds.payments.pix || 0).toString().includes(query) ||
          (ds.payments.pix || 0).toFixed(2).includes(query) ||
          (ds.payments.pix || 0).toFixed(2).replace('.', ',').includes(query)
        ));

      // Search by dates
      const matchesDate = 
        ds.dateArrival.includes(query) || 
        ds.dateSettlement.includes(query) || (() => {
          const [y, m, d] = ds.dateArrival.split('T')[0].split('-');
          if (y && m && d) {
            const brDate = `${d}/${m}/${y}`;
            const brDateShort = `${d}/${m}`;
            return brDate.includes(query) || brDateShort.includes(query);
          }
          return false;
        })() || (() => {
          const [y, m, d] = ds.dateSettlement.split('-');
          if (y && m && d) {
            const brDate = `${d}/${m}/${y}`;
            const brDateShort = `${d}/${m}`;
            return brDate.includes(query) || brDateShort.includes(query);
          }
          return false;
        })();

      const matchesSearch = matchesName || matchesPlate || matchesId || matchesValue || matchesDate;
      
      if (filterReconciliation === 'reconciled') {
        return matchesSearch && (ds.isReconciled || (ds.payments?.pix || 0) === 0);
      } else if (filterReconciliation === 'pending') {
        return matchesSearch && (!ds.isReconciled && (ds.payments?.pix || 0) > 0);
      }
      return matchesSearch;
    });
  }, [driverSettlements, searchSettlementQuery, filterReconciliation, filterSettlementStartDate, filterSettlementEndDate, filterSettlementDriver, filterSettlementVehicle]);

  const uniqueDriversForHistory = React.useMemo(() => {
    const completed = driverSettlements.filter(ds => ds.status === 'completed');
    const names = completed.map(ds => ds.driverName);
    return Array.from(new Set(names)).sort();
  }, [driverSettlements]);

  const uniqueVehiclesForHistory = React.useMemo(() => {
    const completed = driverSettlements.filter(ds => ds.status === 'completed');
    const plates = completed.map(ds => ds.plate);
    return Array.from(new Set(plates)).sort();
  }, [driverSettlements]);

  const cashierSummary = React.useMemo(() => {
    // Only completed settlements
    const completed = filteredCompletedSettlements;
    
    let totalSalesDinheiro = 0;
    let totalSalesPix = 0;
    let totalSalesBoleto = 0;
    let totalSalesCheque = 0;
    let totalSalesOutros = 0;
    
    let totalExpenses = 0;
    let totalSuprimentos = 0;
    let totalBasicCommissions = 0;
    let totalAvariaDeductions = 0;
    let totalShortageDeductions = 0;
    let totalFinalCommissions = 0;
    let totalSobraCaixa = 0;

    completed.forEach(ds => {
      const p = ds.payments || { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
      
      totalSalesPix += p.pix || 0;
      totalSalesBoleto += p.boleto || 0;
      totalSalesCheque += p.cheque || 0;
      totalSalesOutros += p.outros || 0;

      // Sum expenses (which are in cash/dinheiro)
      let dsExpenses = 0;
      (ds.expenses || []).forEach(e => {
        dsExpenses += e.value;
      });
      totalExpenses += dsExpenses;

      // Sum suprimentos (which are in cash/dinheiro)
      let dsSuprimentos = 0;
      (ds.suprimentos || []).forEach(s => {
        dsSuprimentos += s.value;
      });
      totalSuprimentos += dsSuprimentos;
      
      // Sum commissions and deductions
      totalBasicCommissions += ds.basicCommission || 0;
      totalAvariaDeductions += ds.avariaDeduction || 0;
      totalShortageDeductions += ds.shortageDeduction || 0;
      totalFinalCommissions += ds.finalCommission || 0;

      // Sum sobra de caixa (positive differences)
      if (ds.difference && ds.difference > 0) {
        totalSobraCaixa += ds.difference;
      }
      
      // Since ds.payments.dinheiro is the net cash delivered,
      // The gross cash sales = delivered cash + expenses paid in cash + shortage difference (if any)
      // Actually, if we just want totalSalesDinheiro to balance out:
      // totalSales = totalToReceive + dsExpenses
      // totalSales is also totalSalesDinheiro + totalSalesPix + ...
      // So totalSalesDinheiro = totalSales - totalSalesPix - ...
      const totalSales = (ds.sales || []).reduce((acc, curr) => acc + (curr.qty * curr.value), 0);
      const otherSales = (p.pix || 0) + (p.boleto || 0) + (p.cheque || 0) + (p.outros || 0);
      
      // Calculate cash sales by subtracting other payment methods from total sales
      // This is mathematically perfect and ignores line-item payment methods
      totalSalesDinheiro += Math.max(0, totalSales - otherSales);
    });

    const netDinheiro = totalSalesDinheiro - totalExpenses + totalSuprimentos - totalFinalCommissions - totalShortageDeductions + totalSobraCaixa;
    const totalCaixaGeral = netDinheiro + totalSalesPix + totalSalesBoleto + totalSalesCheque + totalSalesOutros;

    return {
      totalSalesDinheiro,
      totalSalesPix,
      totalSalesBoleto,
      totalSalesCheque,
      totalSalesOutros,
      totalExpenses,
      totalSuprimentos,
      totalBasicCommissions,
      totalAvariaDeductions,
      totalShortageDeductions,
      totalFinalCommissions,
      totalSobraCaixa,
      netDinheiro,
      totalCaixaGeral,
      completedCount: completed.length
    };
  }, [filteredCompletedSettlements]);

  // Lookup maps and sets for ultra-fast calculations
  const registeredVehiclesByCleanPlate = React.useMemo(() => {
    const map = new Map<string, any>();
    (registeredVehicles || []).forEach(v => {
      const cp = (v?.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (cp) map.set(cp, v);
    });
    return map;
  }, [registeredVehicles]);

  const registeredDriversByCleanName = React.useMemo(() => {
    const map = new Map<string, any>();
    (registeredDrivers || []).forEach(d => {
      const cn = (d?.name || '').toLowerCase().trim();
      if (cn) map.set(cn, d);
    });
    return map;
  }, [registeredDrivers]);

  const movementsByPlateMap = React.useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const m of movements) {
      const cp = (m.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (!map.has(cp)) map.set(cp, []);
      map.get(cp)!.push(m);
    }
    return map;
  }, [movements]);

  const completedSettledMovementIdsSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const ds of driverSettlements) {
      if (ds.status === 'completed' && ds.movementId) {
        set.add(ds.movementId);
        if (ds.movementId.startsWith('settled-')) {
          set.add(ds.movementId.replace('settled-', ''));
        } else {
          set.add(`settled-${ds.movementId}`);
        }
      }
    }
    return set;
  }, [driverSettlements]);

  // 1. FILTER MOVEMENTS PENDING SETTLEMENT

  // Find return entry movement for a given departure (saida) movement
  const getReturnMovement = React.useCallback((mov: Movement) => {
    if (mov.type === 'entrada') return mov; // If it's already an entrada, it is its own return!
    
    // Find subsequent movements of the same vehicle that started after this departure
    const refTime = new Date(mov.exitTimestamp || mov.timestamp).getTime();
    const cleanPlate = mov.plate.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const plateMovements = movementsByPlateMap.get(cleanPlate) || [];

    const returns = plateMovements.filter(m => 
      m.id !== mov.id &&
      new Date(m.entryTimestamp || m.timestamp).getTime() > refTime
    );
    
    if (returns.length === 0) return null;
    returns.sort((a, b) => new Date(a.entryTimestamp || a.timestamp).getTime() - new Date(b.entryTimestamp || b.timestamp).getTime());
    
    const candidate = returns[0];
    const candidateTime = new Date(candidate.entryTimestamp || candidate.timestamp).getTime();
    
    // Check if there is another 'saida' movement of the same vehicle between mov and candidate
    const hasIntermediateSaida = plateMovements.some(m => 
      m.type === 'saida' &&
      m.id !== mov.id &&
      m.id !== candidate.id &&
      (() => {
        const t = new Date(m.exitTimestamp || m.timestamp).getTime();
        return t > refTime && t < candidateTime;
      })()
    );
    
    if (hasIntermediateSaida) return null;
    
    return candidate;
  }, [movementsByPlateMap]);

  // Find departure (saida) movement for a given return (entrada) movement
  const getDepartureMovement = React.useCallback((entrada: Movement) => {
    if (entrada.type === 'saida') return entrada; // If it's already a departure, it is its own departure!
    
    // Find prior movements of the same vehicle that started before this arrival
    const refTime = new Date(entrada.entryTimestamp || entrada.timestamp).getTime();
    const cleanPlate = entrada.plate.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const plateMovements = movementsByPlateMap.get(cleanPlate) || [];

    const departures = plateMovements.filter(m => 
      m.type === 'saida' &&
      m.id !== entrada.id &&
      new Date(m.exitTimestamp || m.timestamp).getTime() < refTime
    );
    
    if (departures.length === 0) return null;
    departures.sort((a, b) => new Date(b.exitTimestamp || b.timestamp).getTime() - new Date(a.exitTimestamp || a.timestamp).getTime());
    
    const candidate = departures[0];
    const candidateTime = new Date(candidate.exitTimestamp || candidate.timestamp).getTime();
    
    // Check if there is another 'entrada' movement of the same vehicle between candidate and entrada
    const hasIntermediateEntrada = plateMovements.some(m => 
      m.type === 'entrada' &&
      m.id !== entrada.id &&
      m.id !== candidate.id &&
      (() => {
        const t = new Date(m.entryTimestamp || m.timestamp).getTime();
        return t > candidateTime && t < refTime;
      })()
    );
    
    if (hasIntermediateEntrada) return null;
    
    return candidate; // Return the latest departure before this entry
  }, [movementsByPlateMap]);

  const isProprioMovement = React.useCallback((m: Movement) => {
    if (m.ownerType === 'proprio') return true;
    const cleanPlate = (m.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const matchedVeh = registeredVehiclesByCleanPlate.get(cleanPlate);
    if (matchedVeh && matchedVeh.ownerType === 'proprio') return true;
    const driverName = (m.driver || '').toLowerCase().trim();
    if (driverName) {
      const matchedDrv = registeredDriversByCleanName.get(driverName);
      if (matchedDrv && matchedDrv.driverType === 'interno') return true;
    }
    return false;
  }, [registeredVehiclesByCleanPlate, registeredDriversByCleanName]);

  const movementsPendingSettlement = React.useMemo(() => {
    // Find all 'saida' movements (only proprio trips need settlement)
    const ownSaidas = movements.filter(m => m.type === 'saida' && isProprioMovement(m));
    
    const pending: Movement[] = [];
    
    ownSaidas.forEach(saida => {
      // 1. Check if this saida is already settled (checking both raw and prefixed IDs)
      const isSettled = completedSettledMovementIdsSet.has(saida.id);
      if (isSettled) return;

      // 2. Check if there is a subsequent return movement for this plate
      getReturnMovement(saida);

      // Add to pending
      pending.push(saida);
    });

    // Return them in reverse chronological order (newest first)
    return pending.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, completedSettledMovementIdsSet, getReturnMovement, isProprioMovement]);

  const activeTripsOnRoad = React.useMemo(() => {
    // Find all 'saida' movements OR 'entrada' movements that have completed loading (only proprio)
    const eligible = movements.filter(m => 
      (m.type === 'saida' || 
      (m.type === 'entrada' && m.kanbanStep === 'concluido')) &&
      isProprioMovement(m)
    );
    
    return eligible.filter(mov => {
      // 1. Filter out if this trip is already settled (checking both raw and prefixed IDs)
      const isSettled = completedSettledMovementIdsSet.has(mov.id);
      if (isSettled) return false;

      // 2. Check if it has returned (only applicable for 'saida' movements)
      if (mov.type === 'saida') {
        const cleanPlate = mov.plate.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const plateMovements = movementsByPlateMap.get(cleanPlate) || [];
        const movTime = new Date(mov.exitTimestamp || mov.timestamp).getTime();

        const hasReturned = plateMovements.some(m => {
          if (m.id === mov.id) return false;
          const isSubsequent = new Date(m.timestamp).getTime() > movTime;
          if (!isSubsequent) return false;
          return m.type === 'entrada' || m.type === 'saida';
        });

        if (hasReturned) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, completedSettledMovementIdsSet, isProprioMovement, movementsByPlateMap]);

  const selectedReturnMovement = React.useMemo(() => {
    if (!selectedMovement) return null;
    return getReturnMovement(selectedMovement);
  }, [selectedMovement, movements]);

  const resolvedProductionControl = React.useMemo(() => {
    if (!selectedMovement) return null;
    const baseControl = selectedMovement.productionControl || {} as ProductionControl;
    const returnControl = selectedReturnMovement?.productionControl || {} as ProductionControl;
    return {
      ...baseControl,
      expectedDischargeQty: returnControl.expectedDischargeQty ?? baseControl.totalCarregado ?? 0,
      descarregadoQty: returnControl.descarregadoQty ?? baseControl.descarregadoQty ?? 0,
      retornoVasilhameCheio: returnControl.retornoVasilhameCheio ?? baseControl.retornoVasilhameCheio ?? 0,
      totalCarregado: baseControl.totalCarregado ?? returnControl.totalCarregado ?? 0,
      avariasDescarregamento: returnControl.avariasDescarregamento || baseControl.avariasDescarregamento || [],
      differenceReasonsBreakdown: returnControl.differenceReasonsBreakdown || baseControl.differenceReasonsBreakdown || [],
      differenceQty: returnControl.differenceQty ?? baseControl.differenceQty ?? 0,
    } as ProductionControl;
  }, [selectedMovement, selectedReturnMovement]);

  const groupedMobileSales = React.useMemo(() => {
    if (!resolvedProductionControl?.mobileSales) return [];
    
    const groups: Record<string, {
      saleNumber: string;
      clientName: string;
      timestamp?: string;
      products: {
        item: string;
        productType?: string;
        qty: number;
        unitPrice: number;
        totalPrice: number;
      }[];
      payments: {
        dinheiro: number;
        pix: number;
        boleto: number;
        cheque: number;
        outros: number;
      };
      paymentMethodNote?: string;
      totalValue: number;
    }> = {};

    resolvedProductionControl.mobileSales.forEach(s => {
      const key = s.saleNumber || `${s.clientName || 'Cliente'}_${s.timestamp || ''}`;
      
      if (!groups[key]) {
        let cleanClient = s.clientName || 'Cliente';
        if (!s.clientName && s.item.includes(' - ')) {
          cleanClient = s.item.split(' - ')[0];
        }

        groups[key] = {
          saleNumber: s.saleNumber || 'N/A',
          clientName: cleanClient,
          timestamp: s.timestamp,
          products: [],
          payments: { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 },
          totalValue: 0,
        };
      }

      const group = groups[key];
      
      let prodDisplayName = s.item;
      if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
        prodDisplayName = s.item.substring(s.clientName.length + 3);
      } else if (s.item.includes(' - ')) {
        prodDisplayName = s.item.split(' - ').slice(1).join(' - ');
      }

      const existingProd = group.products.find(p => p.item === prodDisplayName && p.unitPrice === s.value);
      const lineQty = s.qty || 0;
      const lineTotalValue = lineQty * (s.value || 0);

      if (existingProd) {
        existingProd.qty += lineQty;
        existingProd.totalPrice += lineTotalValue;
      } else {
        group.products.push({
          item: prodDisplayName,
          productType: s.productType,
          qty: lineQty,
          unitPrice: s.value || 0,
          totalPrice: lineTotalValue,
        });
      }

      group.totalValue += lineTotalValue;

      // Aggregate payments
      if (s.paymentsBreakdown) {
        group.payments.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
        group.payments.pix += Number(s.paymentsBreakdown.pix) || 0;
        group.payments.boleto += Number(s.paymentsBreakdown.boleto) || 0;
        group.payments.cheque += Number(s.paymentsBreakdown.cheque) || 0;
        group.payments.outros += Number(s.paymentsBreakdown.outros) || 0;
      } else {
        const method = s.paymentMethod || 'dinheiro';
        const amt = lineTotalValue;
        if (method === 'dinheiro') group.payments.dinheiro += amt;
        else if (method === 'pix') group.payments.pix += amt;
        else if (method === 'boleto') group.payments.boleto += amt;
        else if (method === 'cheque') group.payments.cheque += amt;
        else group.payments.outros += amt;
      }

      // Aggregate notes
      if (s.paymentMethodNote) {
        if (group.paymentMethodNote) {
          if (!group.paymentMethodNote.includes(s.paymentMethodNote)) {
            const existingNotes = group.paymentMethodNote.split(' | ');
            const newNotes = s.paymentMethodNote.split(' | ');
            const combined = Array.from(new Set([...existingNotes, ...newNotes])).join(' | ');
            group.paymentMethodNote = combined;
          }
        } else {
          group.paymentMethodNote = s.paymentMethodNote;
        }
      }
    });

    return Object.values(groups).map(g => {
      g.payments.dinheiro = Number(g.payments.dinheiro.toFixed(2));
      g.payments.pix = Number(g.payments.pix.toFixed(2));
      g.payments.boleto = Number(g.payments.boleto.toFixed(2));
      g.payments.cheque = Number(g.payments.cheque.toFixed(2));
      g.payments.outros = Number(g.payments.outros.toFixed(2));
      g.totalValue = Number(g.totalValue.toFixed(2));
      return g;
    });
  }, [resolvedProductionControl?.mobileSales]);

  // Calculate cargo totals
  const totalSalesAmount = sales.reduce((acc, curr) => acc + (curr.qty * curr.value), 0);
  const totalExpensesAmount = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalSuprimentosAmount = suprimentos.reduce((acc, curr) => acc + curr.value, 0);
  // Prevent double-counting of cash advances if they are already pre-populated or added in suprimentos (starting with 'Adiantamento:')
  const hasImportedAdvances = suprimentos.some(s => s.item.toLowerCase().startsWith('adiantamento:'));
  const totalCashAdvances = hasImportedAdvances 
    ? 0 
    : (selectedMovement?.cashAdvances?.reduce((acc, adv) => acc + adv.value, 0) || 0);
  const totalToReceive = totalSalesAmount - totalExpensesAmount + totalCashAdvances + totalSuprimentosAmount;
  const totalDelivered = payments.dinheiro + payments.pix + payments.boleto + payments.cheque + payments.outros;
  const difference = totalDelivered - totalToReceive;

  // Commission Calculations
  // Galão 20L water sales generate commission defined by commissionPercent (%)
  // Disposable Copo 200ml (caixas de copo) generates 1.5% commission
  const isCopoItem = (itemStr: string) => {
    const l = (itemStr || '').toLowerCase();
    return l.includes('copo') || l.includes('200ml') || l.includes('cx c/ 48');
  };

  const copoSalesAmount = sales
    .filter(s => isCopoItem(s.item))
    .reduce((acc, curr) => acc + (curr.qty * curr.value), 0);

  const galaoWaterSalesAmount = sales
      .filter(s => (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua') || s.item.toLowerCase().includes('bonifica')) && !isDisposableProduct(s.item))
    .reduce((acc, curr) => acc + (curr.qty * curr.value), 0);

  const copoCommission = copoSalesAmount * 0.015;
  const galaoCommission = galaoWaterSalesAmount * (commissionPercent / 100);
  const basicCommission = galaoCommission + copoCommission;
  
  const getCalculatedMissingBottles = () => {
    if (!selectedMovement || !resolvedProductionControl) return 0;
    const isProprio = isProprioMovement(selectedMovement);
    if (!isProprio) return 0;

    const expected = resolvedProductionControl.expectedDischargeQty || 0;
    if (expected <= 0) return 0;

    const dry = resolvedProductionControl.descarregadoQty || 0;
    const full = resolvedProductionControl.retornoVasilhameCheio || 0;
    const totalUnloaded = dry + full;
    
    const diff = Math.max(0, expected - totalUnloaded);
    const clientVasilhames = resolvedProductionControl.differenceReasonsBreakdown?.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
    const comodatoVasilhames = resolvedProductionControl.differenceReasonsBreakdown?.find(b => b.reason === 'comodato')?.qty || 0;
    
    return diff + clientVasilhames + comodatoVasilhames;
  };

  const missingBottlesQty = selectedMovement && resolvedProductionControl
    ? (resolvedProductionControl.differenceReasonsBreakdown?.find(b => b.reason === 'falta')?.qty || getCalculatedMissingBottles()) 
    : 0;

  const currentTargetVasilhameQty = missingBottlesQty;
  
  // Get driver tolerance from the selected movement's driver
  const currentMatchingDriver = selectedMovement
    ? registeredDrivers?.find(d => d.name.toLowerCase() === selectedMovement.driver.toLowerCase())
    : null;
  const currentDamageToleranceQty = currentMatchingDriver?.damageToleranceQty || 0;

  const totalAvariasDescarrego = selectedMovement && resolvedProductionControl?.avariasDescarregamento
    ? resolvedProductionControl.avariasDescarregamento
        .filter(a => isDriverDeductibleAvaria(a.type, customAvariaTypes || []))
        .reduce((sum, item) => sum + item.qty, 0)
    : 0;

  const avariasACobrarCalculado = Math.max(0, totalAvariasDescarrego - currentDamageToleranceQty);
  const exceededAvariaQty = avariaQty;

  const avariaDeduction = exceededAvariaQty * avariaUnitValue;
  // If driver delivered less than expected, shortage is deducted from their commission
  const shortageDeduction = difference < 0 ? Math.abs(difference) : 0;
  const finalCommission = basicCommission - avariaDeduction - shortageDeduction;

  const handleStartSettlement = (mov: Movement) => {
    let baseMov = mov;
    if (mov.type === 'entrada') {
      const departure = getDepartureMovement(mov);
      if (departure) {
        baseMov = departure;
      }
    }
    const retMov = getReturnMovement(baseMov);
    setSelectedMovement(baseMov);
    
    const baseControl = baseMov.productionControl;
    const returnControl = retMov?.productionControl;
    const mergedControl = {
      expectedDischargeQty: returnControl?.expectedDischargeQty ?? baseControl?.expectedDischargeQty ?? 0,
      descarregadoQty: returnControl?.descarregadoQty ?? baseControl?.descarregadoQty ?? 0,
      retornoVasilhameCheio: returnControl?.retornoVasilhameCheio ?? baseControl?.retornoVasilhameCheio ?? 0,
      totalCarregado: baseControl?.totalCarregado ?? returnControl?.totalCarregado ?? 0,
      avariasDescarregamento: returnControl?.avariasDescarregamento || baseControl?.avariasDescarregamento || [],
      differenceReasonsBreakdown: returnControl?.differenceReasonsBreakdown || baseControl?.differenceReasonsBreakdown || [],
      differenceQty: returnControl?.differenceQty ?? baseControl?.differenceQty ?? 0,
    };

    // Calculations for suggestions based on vasilhame differential
    const expectedOut = mergedControl.totalCarregado || mergedControl.expectedDischargeQty || 0;
    const returnedDry = mergedControl.descarregadoQty || 0;
    const returnedFull = mergedControl.retornoVasilhameCheio || 0;

    const unloadAvarias = mergedControl.avariasDescarregamento || [];
    const vencidoCheioQty = unloadAvarias
      .filter(a => {
        const t = (a?.type || '').toLowerCase().trim();
        return t.includes('vencido (cheio)') || t.includes('vencido cheio');
      })
      .reduce((sum, item) => sum + (item.qty || 0), 0);

    const quebradoLacradoQty = unloadAvarias
      .filter(a => {
        const t = (a?.type || '').toLowerCase().trim();
        return t.includes('quebrado lacrado');
      })
      .reduce((sum, item) => sum + (item.qty || 0), 0);

    const microfuroQty = unloadAvarias
      .filter(a => {
        const t = (a?.type || '').toLowerCase().trim();
        return t === 'microfuro' || t.includes('microfuro');
      })
      .reduce((sum, item) => sum + (item.qty || 0), 0);

    const calcMissingBottlesQty = mergedControl.differenceReasonsBreakdown?.find(b => b.reason === 'falta')?.qty || (() => {
      const isProprio = isProprioMovement(baseMov);
      if (!isProprio) return 0;
      const expected = mergedControl.expectedDischargeQty || 0;
      if (expected <= 0) return 0;
      const dry = mergedControl.descarregadoQty || 0;
      const full = mergedControl.retornoVasilhameCheio || 0;
      const totalUnloaded = dry + full;
      const diff = Math.max(0, expected - totalUnloaded);
      const clientVasilhames = mergedControl.differenceReasonsBreakdown?.find(b => b.reason === 'vasilhame_cliente')?.qty || 0;
      const comodatoVasilhames = mergedControl.differenceReasonsBreakdown?.find(b => b.reason === 'comodato')?.qty || 0;
      return diff + clientVasilhames + comodatoVasilhames;
    })();

    const sugeridoAgua = Math.max(0, expectedOut - returnedFull - vencidoCheioQty - quebradoLacradoQty - microfuroQty);
    const sugeridoVasilhame = calcMissingBottlesQty;

    setSuggestedWaterQty(sugeridoAgua);
    setSuggestedVasilhameQty(sugeridoVasilhame);

    const nowStr = new Date().toISOString().slice(0, 16);

    const matchingDriver = registeredDrivers?.find(d => d.name.toLowerCase() === baseMov.driver.toLowerCase());
    const tolerance = matchingDriver?.damageToleranceQty || 0;

    // Check for an existing pending draft
    const existingDraft = driverSettlements.find(ds => 
      ds.status === 'pending' && (ds.movementId === baseMov.id || ds.movementId === `settled-${baseMov.id}`)
    );

    if (existingDraft) {
      setSales(existingDraft.sales || []);
      setDetailedSales(existingDraft.detailedSales || existingDraft.sales || []);
      setExpenses(existingDraft.expenses || []);
      setSuprimentos(existingDraft.suprimentos || []);
      setPayments(existingDraft.payments || { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 });
      setSelectedPixTxIds(existingDraft.reconciledPixTransactionIds || (existingDraft.reconciledPixTransactionId ? [existingDraft.reconciledPixTransactionId] : []));
      setAvariaQty(existingDraft.avarias?.qty || 0);
      setAvariaUnitValue(existingDraft.avarias?.value || 0);
      setVendaVasilhameQty(existingDraft.vendaVasilhameQty || 0);
      setComodatoVasilhameQty(existingDraft.comodatoVasilhameQty || 0);
      setObservation(existingDraft.observation || '');
      setCidade(existingDraft.cidade || '');
      setDateArrival(existingDraft.dateArrival || nowStr);
      setCommissionPercent(existingDraft.commissionPercent || 8);
      setManualSaleClientName('');
      setManualSaleQty('');
      setManualSaleUnitPrice('');
      setManualSaleCart([]);
      setManualPayDinheiro('');
      setManualPayPix('');
      setManualPayBoleto('');
      setManualPayCheque('');
      setManualPayOutros('');
      setManualPayOutrosNote('');
      setNewExpenseItem('');
      setNewExpenseValue(0);
      setNewSuprimentoItem('');
      setNewSuprimentoValue(0);
      setFormError('');
      setSearchPixInActiveSettlementQuery('');
    } else {
      // Pre-register items from mobile app or defaults
      const rawMobileSales = baseMov.productionControl?.mobileSales || [];
      
      // We must calculate autoPayments BEFORE we strip the paymentMethod
      const autoPayments = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
      rawMobileSales.forEach(s => {
        if (s.paymentsBreakdown) {
          autoPayments.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
          autoPayments.pix += Number(s.paymentsBreakdown.pix) || 0;
          autoPayments.boleto += Number(s.paymentsBreakdown.boleto) || 0;
          autoPayments.cheque += Number(s.paymentsBreakdown.cheque) || 0;
          autoPayments.outros += Number(s.paymentsBreakdown.outros) || 0;
        } else {
          const method = s.paymentMethod || 'dinheiro';
          const lineTotal = s.qty * s.value;
          if (method === 'dinheiro') {
            autoPayments.dinheiro += lineTotal;
          } else if (method === 'pix') {
            autoPayments.pix += lineTotal;
          } else if (method === 'boleto') {
            autoPayments.boleto += lineTotal;
          } else if (method === 'cheque') {
            autoPayments.cheque += lineTotal;
          } else {
            autoPayments.outros += lineTotal;
          }
        }
      });
      
      autoPayments.dinheiro = Number(autoPayments.dinheiro.toFixed(2));
      autoPayments.pix = Number(autoPayments.pix.toFixed(2));
      autoPayments.boleto = Number(autoPayments.boleto.toFixed(2));
      autoPayments.cheque = Number(autoPayments.cheque.toFixed(2));
      autoPayments.outros = Number(autoPayments.outros.toFixed(2));
      
      // Group the sales by product type/price and strip client names
      // So the cashier sees clean integer quantities like "Água 20 Lts", "Bonificação"
      const groupedSalesMap = new Map<string, SettlementSale>();
      
      rawMobileSales.forEach(s => {
        // Remove client name prefix (e.g. "João - Água 20L" -> "Água 20L")
        let cleanItem = s.item;
        if (s.clientName && s.item.startsWith(s.clientName + ' - ')) {
          cleanItem = s.item.substring(s.clientName.length + 3);
        } else {
          const itemParts = s.item.split(' - ');
          cleanItem = itemParts.length > 1 ? itemParts.slice(1).join(' - ') : s.item;
        }
        
        // Map common names
        if (!isDisposableProduct(cleanItem) && (cleanItem.toLowerCase().includes('água') || cleanItem.toLowerCase().includes('agua'))) cleanItem = 'Água 20 Lts';
        if (cleanItem.toLowerCase() === 'vasilhame') cleanItem = 'Vasilhame';
        if (cleanItem.toLowerCase().includes('bonifica')) cleanItem = 'Bonificação';
        if (cleanItem.toLowerCase().includes('comodato')) cleanItem = 'Comodato (Vasilhame)';
        if (cleanItem.toLowerCase().includes('retorno')) cleanItem = 'Retorno Comodato (Vasilhame)';

        const key = `${cleanItem}_${s.value.toFixed(2)}`;
        
        if (groupedSalesMap.has(key)) {
          const existing = groupedSalesMap.get(key)!;
          existing.qty += s.qty;
          // Clean up floating point precision issues from splits (force integer)
          existing.qty = Math.round(existing.qty); 
          if (s.paymentsBreakdown) {
            if (!existing.paymentsBreakdown) {
              existing.paymentsBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
            }
            existing.paymentsBreakdown.dinheiro += Number(s.paymentsBreakdown.dinheiro) || 0;
            existing.paymentsBreakdown.pix += Number(s.paymentsBreakdown.pix) || 0;
            existing.paymentsBreakdown.boleto += Number(s.paymentsBreakdown.boleto) || 0;
            existing.paymentsBreakdown.cheque += Number(s.paymentsBreakdown.cheque) || 0;
            existing.paymentsBreakdown.outros += Number(s.paymentsBreakdown.outros) || 0;
          } else {
            if (!existing.paymentsBreakdown) {
              existing.paymentsBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
            }
            const sMethod = s.paymentMethod || 'dinheiro';
            const sTotal = s.qty * s.value;
            if (sMethod === 'dinheiro') existing.paymentsBreakdown.dinheiro += sTotal;
            else if (sMethod === 'pix') existing.paymentsBreakdown.pix += sTotal;
            else if (sMethod === 'boleto') existing.paymentsBreakdown.boleto += sTotal;
            else if (sMethod === 'cheque') existing.paymentsBreakdown.cheque += sTotal;
            else existing.paymentsBreakdown.outros += sTotal;
          }
        } else {
          const initBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
          if (s.paymentsBreakdown) {
            initBreakdown.dinheiro = Number(s.paymentsBreakdown.dinheiro) || 0;
            initBreakdown.pix = Number(s.paymentsBreakdown.pix) || 0;
            initBreakdown.boleto = Number(s.paymentsBreakdown.boleto) || 0;
            initBreakdown.cheque = Number(s.paymentsBreakdown.cheque) || 0;
            initBreakdown.outros = Number(s.paymentsBreakdown.outros) || 0;
          } else {
            const sMethod = s.paymentMethod || 'dinheiro';
            const sTotal = s.qty * s.value;
            if (sMethod === 'dinheiro') initBreakdown.dinheiro = sTotal;
            else if (sMethod === 'pix') initBreakdown.pix = sTotal;
            else if (sMethod === 'boleto') initBreakdown.boleto = sTotal;
            else if (sMethod === 'cheque') initBreakdown.cheque = sTotal;
            else initBreakdown.outros = sTotal;
          }

          groupedSalesMap.set(key, {
            id: 'grp-' + Math.random().toString(36).substring(2, 9),
            saleNumber: 'consolidado',
            item: cleanItem,
            qty: Math.round(s.qty), // force integer
            value: s.value,
            paymentMethod: 'consolidado', // we no longer care about item-level payment methods
            productType: s.productType,
            paymentsBreakdown: initBreakdown
          });
        }
      });

      const initialSales: SettlementSale[] = Array.from(groupedSalesMap.values());

      let initialExpenses: SettlementExpense[] = baseMov.productionControl?.mobileExpenses || [];
      if (initialExpenses.length === 0) {
        initialExpenses = [
          {
            id: 'exp-almoco-' + Date.now().toString(36) + '1',
            item: 'Almoço',
            value: 0
          },
          {
            id: 'exp-ajudante-' + Date.now().toString(36) + '2',
            item: 'Ajudante',
            value: 0
          }
        ];
      }

      setComodatoVasilhameQty(baseMov.productionControl?.mobileComodato || 0);

      const descarregamentoAvariasQty = unloadAvarias
        .filter(a => isDriverDeductibleAvaria(a.type, customAvariaTypes || []))
        .reduce((sum, item) => sum + item.qty, 0);

      const rawMissingQty = mergedControl.differenceReasonsBreakdown?.find(b => b.reason === 'falta')?.qty || 0;

      const initialSuprimentos: SettlementSuprimento[] = (baseMov.cashAdvances || []).map(adv => ({
        id: 'sup-adv-' + Math.random().toString(36).substring(2, 9),
        item: `Adiantamento: ${adv.reason || 'Adiantamento de Viagem'}`,
        value: adv.value
      }));

      const totalExpenses = initialExpenses.reduce((sum, e) => sum + e.value, 0);
      const totalSuprimentos = initialSuprimentos.reduce((sum, s) => sum + s.value, 0);
      const adjustedPayments = {
        ...autoPayments,
        dinheiro: Number(Math.max(0, autoPayments.dinheiro - totalExpenses + totalSuprimentos).toFixed(2))
      };

      setSales(initialSales);
      setDetailedSales(rawMobileSales);
      setExpenses(initialExpenses);
      setSuprimentos(initialSuprimentos);
      
      setPayments(adjustedPayments);
      setSelectedPixTxIds([]);
      setAvariaQty(Math.max(0, descarregamentoAvariasQty - tolerance));
      setAvariaUnitValue(0);
      setVendaVasilhameQty(rawMissingQty);
      setComodatoVasilhameQty(baseMov.productionControl?.mobileComodato || 0);
      setManualSaleClientName('');
      setManualSaleQty('');
      setManualSaleUnitPrice('');
      setManualSaleCart([]);
      setManualPayDinheiro('');
      setManualPayPix('');
      setManualPayBoleto('');
      setManualPayCheque('');
      setManualPayOutros('');
      setManualPayOutrosNote('');
      setNewExpenseItem('');
      setNewExpenseValue(0);
      setNewSuprimentoItem('');
      setNewSuprimentoValue(0);
      setObservation('');
      setCidade('');
      setFormError('');
      setDateArrival(nowStr);
      setSearchPixInActiveSettlementQuery('');

      // Resolve driver commission percent
      if (matchingDriver?.commissionPercent !== undefined) {
        setCommissionPercent(matchingDriver.commissionPercent);
      } else {
        setCommissionPercent(8); // company default
      }
    }
  };

  const handleAddToManualCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSaleQty || Number(manualSaleQty) <= 0) {
      alert("Por favor, preencha uma quantidade válida.");
      return;
    }
    const isZeroVal = manualSaleProductType === 'bonificacao' || manualSaleProductType === 'comodato' || manualSaleProductType === 'retorno' || manualSaleProductType === 'troca';
    const unitPrice = isZeroVal ? 0 : (manualSaleUnitPrice === '' ? 0 : Number(manualSaleUnitPrice));
    
    if (!isZeroVal && unitPrice <= 0) {
      alert("Por favor, informe o preço unitário do produto.");
      return;
    }

    setManualSaleCart([
      ...manualSaleCart,
      {
        productType: manualSaleProductType,
        qty: Number(manualSaleQty),
        unitPrice: unitPrice,
        exchangeAvariasQty: manualSaleProductType === 'troca' ? (Number(manualExchangeAvariasQty) || 0) : undefined,
        exchangeRatio: manualSaleProductType === 'troca' ? (Number(manualExchangeRatio) || 4) : undefined
      }
    ]);

    // Clear product inputs (but keep client name selected!)
    setManualSaleQty('');
    setManualSaleUnitPrice('');
    setManualExchangeRatio(4);
    setManualExchangeAvariasQty('');
  };

  const handleRemoveFromManualCart = (index: number) => {
    setManualSaleCart(manualSaleCart.filter((_, idx) => idx !== index));
  };

  const handleAutoFillManualPayment = (method: 'dinheiro' | 'pix' | 'boleto' | 'cheque' | 'outros') => {
    const total = manualSaleCart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    setManualPayDinheiro(method === 'dinheiro' ? total.toFixed(2) : '');
    setManualPayPix(method === 'pix' ? total.toFixed(2) : '');
    setManualPayBoleto(method === 'boleto' ? total.toFixed(2) : '');
    setManualPayCheque(method === 'cheque' ? total.toFixed(2) : '');
    setManualPayOutros(method === 'outros' ? total.toFixed(2) : '');
  };

  const handleFinalizeManualSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSaleClientName.trim()) {
      alert("Por favor, informe o cliente.");
      return;
    }
    if (manualSaleCart.length === 0) {
      alert("O carrinho está vazio. Adicione pelo menos um produto.");
      return;
    }

    const cartTotal = manualSaleCart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const valDinheiro = parseFloat(manualPayDinheiro) || 0;
    const valPix = parseFloat(manualPayPix) || 0;
    const valBoleto = parseFloat(manualPayBoleto) || 0;
    const valCheque = parseFloat(manualPayCheque) || 0;
    const valOutros = parseFloat(manualPayOutros) || 0;
    const totalPaid = valDinheiro + valPix + valBoleto + valCheque + valOutros;

    if (cartTotal > 0 && Math.abs(totalPaid - cartTotal) > 0.01) {
      alert(`O total das formas de pagamento (R$ ${totalPaid.toFixed(2)}) deve ser igual ao total dos produtos (R$ ${cartTotal.toFixed(2)}).`);
      return;
    }

    const generatedSaleNumber = 'VD-AC-' + Date.now().toString().slice(-4) + '-' + Math.floor(100 + Math.random() * 900);
    const saleTimestamp = new Date().toISOString();
    const finalSalesToAdd: SettlementSale[] = [];

    const paidItems = manualSaleCart.filter(item => item.unitPrice > 0);
    const freeItems = manualSaleCart.filter(item => item.unitPrice === 0);

    // 1. Process free items directly
    freeItems.forEach(item => {
      finalSalesToAdd.push({
        id: 'sale-' + Math.random().toString(36).substring(2, 9),
        saleNumber: generatedSaleNumber,
        item: getManualProductDisplayName(item.productType),
        qty: Math.round(item.qty),
        value: 0,
        paymentMethod: 'dinheiro',
        productType: item.productType,
        clientName: manualSaleClientName.trim(),
        timestamp: saleTimestamp,
        paymentsBreakdown: { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 },
        exchangeAvariasQty: item.exchangeAvariasQty,
        exchangeRatio: item.exchangeRatio
      });
    });

    // 2. Process paid items and distribute payments proportionally
    if (paidItems.length > 0) {
      let allocatedDinheiro = 0;
      let allocatedPix = 0;
      let allocatedBoleto = 0;
      let allocatedCheque = 0;
      let allocatedOutros = 0;

      paidItems.forEach((item, index) => {
        const isLast = index === paidItems.length - 1;
        const itemTotal = item.qty * item.unitPrice;
        const ratio = itemTotal / cartTotal;

        const itemDinheiro = isLast ? (valDinheiro - allocatedDinheiro) : Number((valDinheiro * ratio).toFixed(2));
        const itemPix = isLast ? (valPix - allocatedPix) : Number((valPix * ratio).toFixed(2));
        const itemBoleto = isLast ? (valBoleto - allocatedBoleto) : Number((valBoleto * ratio).toFixed(2));
        const itemCheque = isLast ? (valCheque - allocatedCheque) : Number((valCheque * ratio).toFixed(2));
        const itemOutros = isLast ? (valOutros - allocatedOutros) : Number((valOutros * ratio).toFixed(2));

        allocatedDinheiro += itemDinheiro;
        allocatedPix += itemPix;
        allocatedBoleto += itemBoleto;
        allocatedCheque += itemCheque;
        allocatedOutros += itemOutros;

        // Build payment method display string
        const methods: string[] = [];
        if (itemDinheiro > 0) methods.push('dinheiro');
        if (itemPix > 0) methods.push('pix');
        if (itemBoleto > 0) methods.push('boleto');
        if (itemCheque > 0) methods.push('cheque');
        if (itemOutros > 0) methods.push('outros');

        const primaryMethod = methods.length === 1 ? methods[0] : (methods.length > 1 ? 'misto' : 'dinheiro');

        // Build payment method note
        const noteParts: string[] = [];
        if (itemDinheiro > 0) noteParts.push(`Dinheiro: R$ ${itemDinheiro.toFixed(2)}`);
        if (itemPix > 0) noteParts.push(`PIX: R$ ${itemPix.toFixed(2)}`);
        if (itemBoleto > 0) noteParts.push(`Boleto: R$ ${itemBoleto.toFixed(2)}`);
        if (itemCheque > 0) noteParts.push(`Cheque: R$ ${itemCheque.toFixed(2)}`);
        if (itemOutros > 0) noteParts.push(`A Prazo: R$ ${itemOutros.toFixed(2)}`);
        const generatedNote = noteParts.join(' | ') || undefined;

        finalSalesToAdd.push({
          id: 'sale-' + Math.random().toString(36).substring(2, 9),
          saleNumber: generatedSaleNumber,
          item: getManualProductDisplayName(item.productType),
          qty: Math.round(item.qty), // Keep as integer!
          value: item.unitPrice,
          paymentMethod: primaryMethod,
          paymentMethodNote: generatedNote || manualPayOutrosNote.trim() || undefined,
          productType: item.productType,
          clientName: manualSaleClientName.trim(),
          timestamp: saleTimestamp,
          paymentsBreakdown: {
            dinheiro: itemDinheiro,
            pix: itemPix,
            boleto: itemBoleto,
            cheque: itemCheque,
            outros: itemOutros
          }
        });
      });
    }

    setSales([...sales, ...finalSalesToAdd]);
    setDetailedSales([...detailedSales, ...finalSalesToAdd]);

    // Also increase the cash register payments
    setPayments(prev => ({
      dinheiro: Number((prev.dinheiro + valDinheiro).toFixed(2)),
      pix: Number((prev.pix + valPix).toFixed(2)),
      boleto: Number((prev.boleto + valBoleto).toFixed(2)),
      cheque: Number((prev.cheque + valCheque).toFixed(2)),
      outros: Number((prev.outros + valOutros).toFixed(2))
    }));

    setManualSaleCart([]);
    setManualSaleClientName('');
    setManualPayDinheiro('');
    setManualPayPix('');
    setManualPayBoleto('');
    setManualPayCheque('');
    setManualPayOutros('');
    setManualPayOutrosNote('');
    alert("Venda manual adicionada e processada!");
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseItem.trim()) return;
    const newExpense: SettlementExpense = {
      id: 'exp-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      item: newExpenseItem.trim(),
      value: newExpenseValue
    };
    setExpenses([...expenses, newExpense]);
    setPayments(prev => ({
      ...prev,
      dinheiro: Number(Math.max(0, prev.dinheiro - newExpenseValue).toFixed(2))
    }));
    setNewExpenseItem('');
    setNewExpenseValue(0);
  };

  const handleAddSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuprimentoItem.trim()) return;
    const newSuprimento: SettlementSuprimento = {
      id: 'sup-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      item: newSuprimentoItem.trim(),
      value: newSuprimentoValue
    };
    setSuprimentos([...suprimentos, newSuprimento]);
    setPayments(prev => ({
      ...prev,
      dinheiro: Number((prev.dinheiro + newSuprimentoValue).toFixed(2))
    }));
    setNewSuprimentoItem('');
    setNewSuprimentoValue(0);
  };

  const handleRemoveSuprimento = (id: string) => {
    const suprimentoToRemove = suprimentos.find(s => s.id === id);
    if (suprimentoToRemove) {
      setPayments(prev => ({
        ...prev,
        dinheiro: Number(Math.max(0, prev.dinheiro - suprimentoToRemove.value).toFixed(2))
      }));
    }
    setSuprimentos(suprimentos.filter(s => s.id !== id));
  };

  const handleUpdateSuprimentoValue = (id: string, value: number) => {
    const targetSuprimento = suprimentos.find(s => s.id === id);
    if (targetSuprimento) {
      const diff = value - targetSuprimento.value;
      setPayments(prev => ({
        ...prev,
        dinheiro: Number(Math.max(0, prev.dinheiro + diff).toFixed(2))
      }));
    }
    setSuprimentos(suprimentos.map(s => s.id === id ? { ...s, value: Math.max(0, value) } : s));
  };

  const handleRemoveSale = (id: string) => {
    const saleToRemove = sales.find(s => s.id === id);
    if (saleToRemove) {
      const isZeroVal = saleToRemove.item.toLowerCase().includes('bonifica') || saleToRemove.item.toLowerCase().includes('comodato');
      const lineTotal = saleToRemove.qty * (isZeroVal ? 0 : saleToRemove.value);
      if (lineTotal > 0) {
        if (saleToRemove.paymentsBreakdown) {
          const bd = saleToRemove.paymentsBreakdown;
          setPayments(prev => ({
            dinheiro: Math.max(0, prev.dinheiro - (bd.dinheiro || 0)),
            pix: Math.max(0, prev.pix - (bd.pix || 0)),
            boleto: Math.max(0, prev.boleto - (bd.boleto || 0)),
            cheque: Math.max(0, prev.cheque - (bd.cheque || 0)),
            outros: Math.max(0, prev.outros - (bd.outros || 0))
          }));
        } else {
          const method = saleToRemove.paymentMethod || 'dinheiro';
          if (method === 'dinheiro') {
            setPayments(prev => ({ ...prev, dinheiro: Math.max(0, prev.dinheiro - lineTotal) }));
          } else if (method === 'pix') {
            setPayments(prev => ({ ...prev, pix: Math.max(0, prev.pix - lineTotal) }));
          } else if (method === 'boleto') {
            setPayments(prev => ({ ...prev, boleto: Math.max(0, prev.boleto - lineTotal) }));
          } else if (method === 'cheque') {
            setPayments(prev => ({ ...prev, cheque: Math.max(0, prev.cheque - lineTotal) }));
          } else {
            setPayments(prev => ({ ...prev, outros: Math.max(0, prev.outros - lineTotal) }));
          }
        }
      }
    }
    setSales(sales.filter(s => s.id !== id));
  };

  const handleRemoveExpense = (id: string) => {
    const expenseToRemove = expenses.find(e => e.id === id);
    if (expenseToRemove) {
      setPayments(prev => ({
        ...prev,
        dinheiro: Number((prev.dinheiro + expenseToRemove.value).toFixed(2))
      }));
    }
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleUpdateSaleQty = (id: string, qty: number) => {
    setSales(sales.map(s => {
      if (s.id !== id) return s;
      const oldQty = s.qty || 1;
      const newQty = Math.max(0, qty);
      const ratio = oldQty > 0 ? (newQty / oldQty) : 0;
      const bd = s.paymentsBreakdown;
      const newBd = bd ? {
        dinheiro: Number((bd.dinheiro * ratio).toFixed(2)),
        pix: Number((bd.pix * ratio).toFixed(2)),
        boleto: Number((bd.boleto * ratio).toFixed(2)),
        cheque: Number((bd.cheque * ratio).toFixed(2)),
        outros: Number((bd.outros * ratio).toFixed(2))
      } : undefined;
      return { ...s, qty: newQty, paymentsBreakdown: newBd };
    }));
  };

  const handleUpdateSaleValue = (id: string, value: number) => {
    setSales(sales.map(s => {
      if (s.id !== id) return s;
      const oldValue = s.value || 1;
      const newValue = Math.max(0, value);
      const ratio = oldValue > 0 ? (newValue / oldValue) : 0;
      const bd = s.paymentsBreakdown;
      const newBd = bd ? {
        dinheiro: Number((bd.dinheiro * ratio).toFixed(2)),
        pix: Number((bd.pix * ratio).toFixed(2)),
        boleto: Number((bd.boleto * ratio).toFixed(2)),
        cheque: Number((bd.cheque * ratio).toFixed(2)),
        outros: Number((bd.outros * ratio).toFixed(2))
      } : undefined;
      return { ...s, value: newValue, paymentsBreakdown: newBd };
    }));
  };

  const handleUpdateExpenseValue = (id: string, value: number) => {
    const targetExpense = expenses.find(e => e.id === id);
    if (targetExpense) {
      const diff = value - targetExpense.value;
      setPayments(prev => ({
        ...prev,
        dinheiro: Number(Math.max(0, prev.dinheiro - diff).toFixed(2))
      }));
    }
    setExpenses(expenses.map(e => e.id === id ? { ...e, value: Math.max(0, value) } : e));
  };

  const handleAutoFillSuggestions = () => {
    const list: SettlementSale[] = [];
    if (suggestedWaterQty > 0) {
      list.push({
        id: 'sale-agua-' + Date.now().toString(36) + '1',
        item: 'Água 20 Lts',
        qty: suggestedWaterQty,
        value: 10.00
      });
    }
    if (currentTargetVasilhameQty > 0) {
      list.push({
        id: 'sale-vasilhame-' + Date.now().toString(36) + '2',
        item: 'Vasilhame',
        qty: currentTargetVasilhameQty,
        value: 50.00
      });
    }
    setSales(list);
  };

  const handleSaveSettlement = (isDraft: boolean = false, bypassQtyCheck: boolean = false) => {
    if (isReadOnly) return;
    if (!selectedMovement) return;
    if (!isDraft && !dateArrival) {
      setFormError('A data de chegada do motorista é obrigatória.');
      return;
    }
    if (!isDraft && !cidade.trim()) {
      setFormError('Por favor, selecione pelo menos uma cidade para a viagem.');
      return;
    }

    if (!isDraft && !bypassQtyCheck) {
      const enteredWaterQty = sales
        .filter(s => (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua') || s.item.toLowerCase().includes('bonifica')) && !isDisposableProduct(s.item))
        .reduce((sum, s) => sum + s.qty, 0);
      const enteredVasilhameQty = sales
        .filter(s => s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('retorno'))
        .reduce((sum, s) => sum + s.qty, 0);

      const hasQtyMismatch = (enteredWaterQty !== suggestedWaterQty) || (enteredVasilhameQty !== currentTargetVasilhameQty);
      if (hasQtyMismatch) {
        setShowQtyWarningModal(true);
        return;
      }
    }

    const matchingDriver = registeredDrivers?.find(d => d.name.toLowerCase() === selectedMovement.driver.toLowerCase());
    const driverId = matchingDriver?.id || 'unknown';

    // Find if we already have a draft for this movement (checking both raw and prefixed IDs)
    const existingDraft = driverSettlements.find(ds => 
      ds.status === 'pending' && (ds.movementId === selectedMovement.id || ds.movementId === `settled-${selectedMovement.id}`)
    );
    const settlementId = existingDraft ? existingDraft.id : ('set-' + Date.now().toString(36));

    const isEntrada = selectedMovement.type === 'entrada';
    const movementIdValue = existingDraft ? existingDraft.movementId : (isEntrada ? `settled-${selectedMovement.id}` : selectedMovement.id);

    const newSettlement: DriverSettlement = {
      id: settlementId,
      movementId: movementIdValue,
      tripControlNumber: selectedMovement.productionCode || selectedMovement.id,
      driverId: driverId,
      driverName: selectedMovement.driver,
      plate: selectedMovement.plate,
      dateSettlement: existingDraft ? existingDraft.dateSettlement : new Date().toISOString().split('T')[0],
      dateExit: selectedMovement.exitTimestamp || selectedMovement.entryTimestamp || selectedMovement.timestamp, // default to exit or entry or timestamp
      dateArrival: dateArrival,
      sales: sales,
      detailedSales: detailedSales,
      expenses: expenses,
      suprimentos: suprimentos,
      payments: payments,
      avarias: {
        qty: avariaQty,
        value: avariaUnitValue,
        total: avariaQty * avariaUnitValue
      },
      observation: observation,
      commissionPercent: commissionPercent,
      cidade: cidade.trim(),
      
      // Totals
      totalSales: totalSalesAmount,
      totalExpenses: totalExpensesAmount,
      totalSuprimentos: totalSuprimentosAmount,
      totalToReceive: totalToReceive,
      totalDelivered: totalDelivered,
      difference: difference,
      
      // Commission
      basicCommission: basicCommission,
      avariaDeduction: avariaDeduction,
      shortageDeduction: shortageDeduction,
      finalCommission: finalCommission,
      
      isReconciled: isDraft 
        ? (existingDraft ? existingDraft.isReconciled : false)
        : (((payments.pix || 0) === 0 || selectedPixTxIds.length > 0) ? true : (existingDraft ? existingDraft.isReconciled : false)),
      reconciledPixTransactionId: selectedPixTxIds[0] || undefined,
      reconciledPixTransactionIds: selectedPixTxIds,
      reconciledAt: isDraft 
        ? (existingDraft ? existingDraft.reconciledAt : undefined)
        : (((payments.pix || 0) === 0 || selectedPixTxIds.length > 0) ? new Date().toISOString() : (existingDraft ? existingDraft.reconciledAt : undefined)),
      status: isDraft ? 'pending' : 'completed',
      unit: (currentUser?.unit as 'matriz' | 'filial') || 'matriz',
      vendaVasilhameQty: vendaVasilhameQty,
      comodatoVasilhameQty: comodatoVasilhameQty,
      missingBottlesQty: missingBottlesQty,
      finalUnaccountedShortage: Math.max(0, missingBottlesQty - vendaVasilhameQty - comodatoVasilhameQty)
    };

    if (existingDraft) {
      updateDriverSettlement(existingDraft.id, newSettlement);
    } else {
      addDriverSettlement(newSettlement);
    }

    if (!isDraft) {
      const loadsToFinalize = (driverTripLoads || []).filter(t => 
        (t.gateMovementId === selectedMovement.id) ||
        (t.driverName?.toLowerCase() === selectedMovement.driver?.toLowerCase() && t.vehiclePlate?.toLowerCase() === selectedMovement.plate?.toLowerCase() && t.status === 'em_viagem')
      );
      loadsToFinalize.forEach(load => {
        updateDriverTripLoad(load.id, {
          status: 'finalizada',
          currentTruckStock: 0
        });
      });
    }

    // Only reconcile with PIX if we are NOT in draft and have selected transaction IDs
    if (!isDraft && selectedPixTxIds.length > 0) {
      reconcileDriverSettlementWithPix(settlementId, selectedPixTxIds);
    }

    setSelectedMovement(null);
    setSelectedPixTxIds([]);
    setShowQtyWarningModal(false);
    setActiveSubTab(isDraft ? 'pending_movements' : 'history');
  };

  // Parse simulated or real Bank file (OFX only)
  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension - only allow OFX
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'ofx') {
      setImportErrorMessage(`O arquivo "${file.name}" não é um arquivo OFX válido. Apenas arquivos no formato .ofx são aceitos.`);
      setImportSuccessMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setImportErrorMessage('');
      }, 8000);
      return;
    }

    const detectInstitutionFromContent = (text: string, filename: string): string => {
      const upperText = text.toUpperCase();
      const upperFilename = filename.toUpperCase();

      if (
        upperText.includes('BANCO DO BRASIL') || 
        upperText.includes('BANKID>001') || 
        upperText.includes('ORG>BB') ||
        upperFilename.includes('BANCO DO BRASIL') ||
        upperFilename.includes('BANCO_DO_BRASIL') ||
        upperFilename.includes(' BB ') ||
        upperFilename.includes('_BB_') ||
        upperFilename.startsWith('BB')
      ) {
        return 'Banco do Brasil';
      }

      if (
        upperText.includes('CAIXA ECONOMICA') || 
        upperText.includes('CAIXA ECONÔMICA') || 
        upperText.includes('BANKID>104') || 
        upperText.includes('ORG>CEF') ||
        upperText.includes('ORG>CAIXA') ||
        upperFilename.includes('CAIXA') ||
        upperFilename.includes('CEF') ||
        upperFilename.includes('CEE')
      ) {
        return 'Caixa Econômica';
      }

      if (
        upperText.includes('BRADESCO') || 
        upperText.includes('BANKID>237') || 
        upperFilename.includes('BRADESCO') ||
        upperFilename.includes('BRAD')
      ) {
        return 'Bradesco';
      }

      if (upperText.includes('ITAU') || upperText.includes('ITAÚ') || upperFilename.includes('ITAU') || upperFilename.includes('ITAÚ')) {
        return 'Itaú';
      }
      if (upperText.includes('SANTANDER') || upperFilename.includes('SANTANDER')) {
        return 'Santander';
      }
      if (upperText.includes('SICOOB') || upperFilename.includes('SICOOB')) {
        return 'Sicoob';
      }
      if (upperText.includes('SICREDI') || upperFilename.includes('SICREDI')) {
        return 'Sicredi';
      }

      return 'Outra / Não Identificada';
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const userUnit = (currentUser?.unit as 'matriz' | 'filial') || 'matriz';
      let parsedTransactions: BankTransaction[] = [];

      try {
        if (text.toUpperCase().includes('<OFX>') || text.toUpperCase().includes('<STMTTRN>')) {
          parsedTransactions = parseOFX(text, userUnit);
        } else {
          setImportErrorMessage(`O arquivo "${file.name}" não parece conter um formato de extrato OFX válido (faltando tags <OFX> ou <STMTTRN>).`);
          setImportSuccessMessage('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => {
            setImportErrorMessage('');
          }, 8000);
          return;
        }
      } catch (err) {
        console.error("Erro ao analisar arquivo bancário:", err);
      }

      const fileId = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

      let inst = selectedImportInstitution;
      if (inst === 'auto') {
        inst = detectInstitutionFromContent(text, file.name);
      } else if (inst === 'outro') {
        inst = customImportInstitution.trim() || 'Outra';
      }

      if (parsedTransactions.length > 0) {
        const enriched = parsedTransactions.map(tx => ({
          ...tx,
          importedFileId: fileId,
          importFilename: file.name,
          institution: inst
        }));
        importBankTransactions(enriched);
        setImportSuccessMessage(`Importação concluída! ${enriched.length} transações recebidas (PIX/Transferências) do arquivo "${file.name}" de [${inst}] importadas com sucesso.`);
        setImportErrorMessage('');
      } else {
        setImportErrorMessage(`Nenhuma transação PIX ou recebimento válido foi encontrado no arquivo "${file.name}". Verifique se o arquivo está no formato esperado.`);
        setImportSuccessMessage('');
      }
      setTimeout(() => {
        setImportSuccessMessage('');
        setImportErrorMessage('');
      }, 8000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group bank transactions by imported files
  const importedFiles = React.useMemo(() => {
    const filesMap = new Map<string, { id: string; name: string; count: number; date: string }>();
    bankTransactions.forEach(tx => {
      if (tx.importedFileId) {
        const existing = filesMap.get(tx.importedFileId);
        if (existing) {
          existing.count++;
        } else {
          filesMap.set(tx.importedFileId, {
            id: tx.importedFileId,
            name: tx.importFilename || 'Extrato sem Nome',
            count: 1,
            date: tx.importedAt
          });
        }
      }
    });
    return Array.from(filesMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bankTransactions]);

  // Filter and sort bank transactions (from newest to oldest)
  const filteredBankTxs = React.useMemo(() => {
    const filtered = bankTransactions.filter(tx => {
      // 1. Filter by institution first
      if (filterBankInstitution !== 'all') {
        const txInst = tx.institution || 'Outra / Não Identificada';
        if (txInst !== filterBankInstitution) {
          return false;
        }
      }

      const query = searchBankQuery.toLowerCase().trim();
      if (!query) {
        if (filterBankReconciliation === 'reconciled') {
          return tx.isReconciled;
        } else if (filterBankReconciliation === 'pending') {
          return !tx.isReconciled;
        } else if (filterBankReconciliation === 'refunds') {
          return !!tx.isRefund;
        }
        return true;
      }

      const matchesDesc = tx.description.toLowerCase().includes(query);
      const matchesAmount = tx.amount.toString().includes(query) || 
                            tx.amount.toFixed(2).includes(query) ||
                            tx.amount.toFixed(2).replace('.', ',').includes(query);
      const matchesRef = (tx.documentRef || '').toLowerCase().includes(query);
      const normalizedInst = (tx.institution || '').toLowerCase();
      const matchesInst = normalizedInst.includes(query) ||
                          (normalizedInst.includes('banco do brasil') && query === 'bb') ||
                          (normalizedInst.includes('caixa') && query === 'cef');
      const matchesFilename = (tx.importFilename || '').toLowerCase().includes(query);
      const matchesDate = tx.date.includes(query) || (() => {
        const [y, m, d] = tx.date.split('-');
        if (y && m && d) {
          const brDate = `${d}/${m}/${y}`;
          const brDateShort = `${d}/${m}`;
          return brDate.includes(query) || brDateShort.includes(query);
        }
        return false;
      })();

      const matchesSearch = matchesDesc || matchesAmount || matchesRef || matchesInst || matchesFilename || matchesDate;
      
      if (filterBankReconciliation === 'reconciled') {
        return matchesSearch && tx.isReconciled;
      } else if (filterBankReconciliation === 'pending') {
        return matchesSearch && !tx.isReconciled;
      } else if (filterBankReconciliation === 'refunds') {
        return matchesSearch && !!tx.isRefund;
      }
      return matchesSearch;
    });

    // Sort by date from newest to oldest (descending)
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      // If dates are identical, sort by creation time (importedAt)
      const timeA = a.importedAt ? new Date(a.importedAt).getTime() : 0;
      const timeB = b.importedAt ? new Date(b.importedAt).getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id.localeCompare(a.id);
    });
  }, [bankTransactions, filterBankInstitution, filterBankReconciliation, searchBankQuery]);

  const handleOpenReconcile = (settlement: DriverSettlement) => {
    setReconcilingSettlement(settlement);
    setSearchPixQuery('');
    setSelectedTxIds(settlement.reconciledPixTransactionIds || (settlement.reconciledPixTransactionId ? [settlement.reconciledPixTransactionId] : []));
  };

  const handleConfirmReconciliation = (txIds: string[]) => {
    if (!reconcilingSettlement) return;
    reconcileDriverSettlementWithPix(reconcilingSettlement.id, txIds);
    setReconcilingSettlement(null);
  };

  const handlePrintCashAdvance = (advance: {
    id: string;
    movementId: string;
    driverName: string;
    plate: string;
    value: number;
    reason: string;
    timestamp: string;
    operator: string;
  }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Adiantamento - ${advance.driverName}</title>
          <style>
            @page {
              size: auto;
              margin: 4mm;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 10px; 
              margin: 0; 
              color: #000; 
              line-height: 1.4; 
              font-size: 13px;
              background: #fff;
            }
            .receipt {
              border: 1px solid #000;
              padding: 18px;
              max-width: 440px;
              margin: 0 auto;
              background: #fff;
            }
            .logo-area {
              text-align: center;
              font-weight: 900;
              font-size: 16px;
              letter-spacing: 2px;
              text-transform: uppercase;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .doc-title {
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 6px 0;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 12px 0;
            }
            .value-container {
              border: 2px solid #000;
              padding: 10px;
              text-align: center;
              margin: 12px 0;
              background-color: #f8fafc;
            }
            .value-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #475569;
            }
            .value-display {
              font-size: 26px;
              font-weight: 900;
              color: #000;
              margin-top: 4px;
              font-family: monospace, Courier, monospace;
            }
            .info-table {
              width: 100%;
              margin: 12px 0;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 5px 2px;
              vertical-align: top;
            }
            .info-table td.label {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11px;
              width: 125px;
              color: #334155;
            }
            .info-table td.value {
              font-size: 12px;
              color: #000;
            }
            .signature-section {
              margin-top: 35px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              text-align: center;
            }
            .sig-box {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .sig-line {
              border-top: 1px solid #000;
              width: 100%;
              margin-top: 30px;
              padding-top: 6px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #475569;
              margin-top: 25px;
              border-top: 1px dashed #000;
              padding-top: 8px;
              line-height: 1.3;
            }
            @media print {
              body { padding: 0; }
              .receipt { border: 1px solid #000; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="logo-area">VIA GERAL</div>
            <div class="doc-title">Comprovante de Adiantamento</div>
            <div class="doc-title" style="font-size: 10px; font-weight: normal; margin-top: -4px;">Controle de Caixa e Saída de Frota</div>
            
            <div class="divider"></div>

            <div class="value-container">
              <div class="value-label">VALOR DO REPASSE</div>
              <div class="value-display">R$ ${advance.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <table class="info-table">
              <tr>
                <td class="label">ID Recibo:</td>
                <td class="value" style="font-family: monospace; font-weight: bold;">${advance.id}</td>
              </tr>
              <tr>
                <td class="label">Motorista:</td>
                <td class="value" style="font-weight: bold;">${advance.driverName}</td>
              </tr>
              <tr>
                <td class="label">Veículo/Placa:</td>
                <td class="value" style="font-family: monospace;">${advance.plate.toUpperCase()}</td>
              </tr>
              <tr>
                <td class="label">Motivo:</td>
                <td class="value">${advance.reason}</td>
              </tr>
              <tr>
                <td class="label">Emissão:</td>
                <td class="value">${new Date(advance.timestamp).toLocaleString('pt-BR')}</td>
              </tr>
              <tr>
                <td class="label">Operador:</td>
                <td class="value">${advance.operator}</td>
              </tr>
            </table>

            <div class="signature-section">
              <div class="sig-box">
                <div class="sig-line">Motorista</div>
              </div>
              <div class="sig-box">
                <div class="sig-line">Conferente</div>
              </div>
            </div>

            <div class="footer">
              Este recibo comprova a entrega de valores em espécie para custeio de despesas de viagem.<br/>
              A prestação de contas será exigida no retorno do veículo.<br/>
              Emitido via Sistema de Logística - ${new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveCashAdvance = () => {
    if (!cashAdvanceMovement) return;
    const value = parseFloat(cashAdvanceValue.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      alert('Por favor, informe um valor de adiantamento válido e maior que zero.');
      return;
    }
    if (!cashAdvanceReason.trim()) {
      alert('Por favor, informe o motivo do adiantamento.');
      return;
    }

    const newAdvance = {
      id: 'ADV-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      value,
      reason: cashAdvanceReason.trim(),
      timestamp: new Date().toISOString(),
      operator: currentUser?.name || 'Conferente'
    };

    const updatedAdvances = [...(cashAdvanceMovement.cashAdvances || []), newAdvance];
    updateMovementDetails(cashAdvanceMovement.id, {
      cashAdvances: updatedAdvances
    });

    const receiptData = {
      id: newAdvance.id,
      movementId: cashAdvanceMovement.id,
      driverName: cashAdvanceMovement.driver,
      plate: cashAdvanceMovement.plate,
      value: newAdvance.value,
      reason: newAdvance.reason,
      timestamp: newAdvance.timestamp,
      operator: newAdvance.operator
    };

    setCashAdvanceReceipt(receiptData);
    setCashAdvanceValue('');
    setCashAdvanceReason('');
    
    handlePrintCashAdvance(receiptData);
  };

  const handlePrint = (settlement: DriverSettlement) => {
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
              ${settlement.sales.map(s => `
                <tr>
                  <td style="font-weight: 600;">${s.item}</td>
                  <td style="font-weight: 700; font-family: monospace;">${s.qty}</td>
                  <td style="font-family: monospace;">R$ ${s.value.toFixed(2)}</td>
                  <td style="font-weight: 700; font-family: monospace;">R$ ${(s.qty * s.value).toFixed(2)}</td>
                </tr>
              `).join('')}
              ${settlement.sales.length === 0 ? '<tr><td colspan="4">Nenhuma venda informada</td></tr>' : ''}
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
                  ${settlement.expenses.map(e => `
                    <tr>
                      <td style="font-weight: 500;">${e.item}</td>
                      <td style="font-weight: 700; font-family: monospace;">R$ ${e.value.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  ${settlement.expenses.length === 0 ? '<tr><td colspan="2" style="color: #64748b; font-style: italic;">Nenhuma despesa informada</td></tr>' : ''}
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
                  ${(settlement.payments.dinheiro === 0 && settlement.payments.pix === 0 && settlement.payments.boleto === 0 && settlement.payments.cheque === 0 && settlement.payments.outros === 0) ? '<tr><td colspan="2" style="color: #64748b; font-style: italic;">Nenhum valor informado</td></tr>' : ''}
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

          ${settlement.isReconciled ? `
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

  const handlePrintCaixa = (settlement: DriverSettlement) => {
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
                  <span class="info-label">Cidade:</span>
                  <span class="info-value">${settlement.cidade || 'Não informada'}</span>
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

  return (
    <div className="p-6 space-y-6 flex-1 overflow-auto h-full bg-slate-50">
      
      {/* View Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2.5 rounded-lg text-white shadow">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Prestação de Contas (Acertos)</h1>
            <p className="text-xs text-slate-500 font-medium">Controle de saídas, acertos de carga, conciliação e comissão de veículos próprios.</p>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="flex bg-slate-200/80 p-1 rounded-lg self-start">
          <button
            onClick={() => { setSelectedMovement(null); setActiveSubTab('pending_movements'); }}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'pending_movements' && !selectedMovement
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aguardando Acerto ({movementsPendingSettlement.length})
          </button>
          <button
            onClick={() => { setSelectedMovement(null); setActiveSubTab('history'); }}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico de Acertos ({driverSettlements.length})
          </button>
          <button
            onClick={() => { setSelectedMovement(null); setActiveSubTab('bank_reconciliation'); }}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'bank_reconciliation'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conciliação PIX Bancário ({bankTransactions.filter(b => !b.isReconciled).length})
          </button>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {formError && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded shadow-sm flex items-center space-x-2 text-xs font-medium">
          <ShieldAlert size={16} className="text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* SUB-TABS LOGIC */}
      {!selectedMovement && activeSubTab === 'pending_movements' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <Info size={18} className="text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed font-medium">
              <p className="font-bold mb-1">Regras de Negócio Importantes:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>O módulo de Prestação de Contas é exclusivo para <strong>veículos próprios</strong> da empresa.</li>
                <li>Os produtos e valores começam zerados e devem ser preenchidos manualmente pelo conferente.</li>
                <li>Qualquer avaria ou perda informada é <strong>descontada integralmente</strong> da comissão do motorista.</li>
                <li>Se o valor entregue for menor do que o esperado (Vendas - Despesas), a diferença de caixa (falta) também é <strong>descontada do motorista</strong>.</li>
                <li>Se o valor entregue for maior, a sobra pertence à empresa e não é acrescida à comissão.</li>
              </ul>
            </div>
          </div>

          {/* VEÍCULOS EM VIAGEM (ADIANTAMENTO DE SAÍDA) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-slate-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Adiantamento para Motoristas (Carregados e em Viagem)</h2>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100 animate-fadeIn">
                  {activeTripsOnRoad.filter(m => m.type === 'entrada').length} no pátio carregados
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-100 animate-fadeIn">
                  {activeTripsOnRoad.filter(m => m.type === 'saida').length} em viagem
                </span>
              </div>
            </div>

            {activeTripsOnRoad.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum veículo próprio ou terceirizado carregado ou em viagem no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="p-4">Placa / Veículo</th>
                      <th className="p-4">Motorista</th>
                      <th className="p-4">Status / Saída</th>
                      <th className="p-4">Adiantamentos Lançados</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {activeTripsOnRoad.map(mov => {
                      const totalAdvancesVal = mov.cashAdvances?.reduce((sum, adv) => sum + adv.value, 0) || 0;
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200 uppercase">
                                {mov.plate}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold italic">
                                ({isProprioMovement(mov) ? 'Próprio' : 'Terceiro'})
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold">{mov.driver}</span>
                          </td>
                          <td className="p-4">
                            {mov.type === 'entrada' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-extrabold border border-indigo-100 uppercase animate-fadeIn">
                                  📥 Carregado (No Pátio)
                                </span>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Carregamento: {new Date(mov.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-extrabold border border-amber-100 uppercase animate-fadeIn">
                                  🚚 Em Viagem
                                </span>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Saída: {new Date(mov.exitTimestamp || mov.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {totalAdvancesVal > 0 ? (
                              <div className="space-y-1">
                                <span className="text-emerald-600 font-bold">R$ {totalAdvancesVal.toFixed(2)}</span>
                                <div className="text-[9px] text-slate-400 font-normal">
                                  {mov.cashAdvances?.map(a => `${a.reason} (R$ ${a.value})`).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Nenhum</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setCashAdvanceMovement(mov);
                                setCashAdvanceModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded text-[11px] font-bold transition-all border border-emerald-200 cursor-pointer"
                            >
                              <Coins size={12} />
                              Adiantar Caixa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Cargas de Veículos Próprios Prontas para Acerto</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {movementsPendingSettlement.length} cargas pendentes
              </span>
            </div>

            {movementsPendingSettlement.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Tudo em dia!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Nenhuma carga pendente de acerto financeiro para motoristas com veículo próprio no pátio neste momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="p-4">Placa / Veículo</th>
                      <th className="p-4">Motorista</th>
                      <th className="p-4">Etapa Atual</th>
                      <th className="p-4">Data Entrada</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {movementsPendingSettlement.map(mov => {
                      const retMov = getReturnMovement(mov);
                      const currentStep = retMov?.kanbanStep || 'aguardando_descarregamento';
                      const isUnloaded = retMov 
                        ? (retMov.type === 'saida' || retMov.bypassProduction || (currentStep !== 'aguardando_descarregamento' && currentStep !== 'descarregamento')) 
                        : false; // If not returned, it cannot be settled
                      const hasDraft = driverSettlements.some(ds => 
                        ds.status === 'pending' && (ds.movementId === mov.id || ds.movementId === `settled-${mov.id}`)
                      );
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-900">{mov.plate}</td>
                          <td className="p-4">
                            <div>{mov.driver}</div>
                            {mov.cashAdvances && mov.cashAdvances.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {mov.cashAdvances.map(adv => (
                                  <button
                                    key={adv.id}
                                    onClick={() => handlePrintCashAdvance({
                                      id: adv.id,
                                      movementId: mov.id,
                                      driverName: mov.driver,
                                      plate: mov.plate,
                                      value: adv.value,
                                      reason: adv.reason,
                                      timestamp: adv.timestamp,
                                      operator: adv.operator
                                    })}
                                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                                    title="Clique para re-imprimir o comprovante"
                                  >
                                    <Coins size={10} /> R$ {adv.value.toFixed(2)} ({adv.reason})
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                isUnloaded ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                              }`}>
                                {!retMov 
                                  ? 'Não Retornado' 
                                  : (retMov.bypassProduction 
                                    ? 'Fila Dispensada' 
                                    : (currentStep === 'aguardando_descarregamento' 
                                      ? 'Aguardando Descarregamento' 
                                      : (currentStep === 'descarregamento' 
                                        ? 'Descarregando' 
                                        : 'Descarregado')))}
                              </span>
                              {hasDraft && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                  Rascunho Parcial
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(mov.entryTimestamp || mov.timestamp).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-4 text-right font-sans flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartSettlement(mov)}
                              disabled={!retMov || !isUnloaded}
                              className={`inline-flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold uppercase rounded shadow transition ${
                                !retMov || !isUnloaded
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed'
                                  : (hasDraft
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md cursor-pointer'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md cursor-pointer')
                              }`}
                              title={
                                !retMov
                                  ? 'Aguarde o retorno do veículo para realizar o acerto'
                                  : (!isUnloaded
                                    ? 'Aguarde a conclusão do descarregamento para realizar o acerto'
                                    : (hasDraft ? 'Continuar rascunho de acerto' : 'Iniciar acerto de contas'))
                              }
                            >
                              <span>{hasDraft ? 'Continuar' : 'Acertar'}</span>
                              <ArrowRight size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE SETTLEMENT FORM SCREEN */}
      {selectedMovement && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Side - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Receipt size={16} className="text-blue-600" />
                  Acerto da Carga: <span className="text-blue-600">{selectedMovement.plate}</span> - {selectedMovement.driver}
                </h2>
                <button
                  onClick={() => setSelectedMovement(null)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de Saída</label>
                  <input
                    type="text"
                    disabled
                    value={new Date(selectedMovement.exitTimestamp || selectedMovement.entryTimestamp || selectedMovement.timestamp).toLocaleString('pt-BR')}
                    className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2.5 font-bold text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de Chegada (Retorno)</label>
                  <input
                    type="datetime-local"
                    required
                    value={dateArrival}
                    onChange={e => setDateArrival(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Comissão Definida (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionPercent}
                    onChange={e => setCommissionPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-bold"
                  />
                </div>
              </div>

        {/* Sales Section (Starts Zeroed) */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Produtos Vendidos / Carga de Saída</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Informe as quantidades e valores unitários das vendas realizadas.</p>
            </div>
            {(suggestedWaterQty > 0 || currentTargetVasilhameQty > 0) && (
              <button
                type="button"
                onClick={handleAutoFillSuggestions}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer self-start sm:self-center"
                title="Preencher com base nos vasilhames descarregados"
              >
                <CheckCircle2 size={12} className="text-blue-600" />
                <span>Sugerir Qtds ({suggestedWaterQty} Águas / {currentTargetVasilhameQty} Vasilhames)</span>
              </button>
            )}
          </div>

          {/* Composição da Carga do Motorista Próprio */}
          {selectedMovement && isProprioMovement(selectedMovement) && (
            (() => {
              const baseControl = selectedMovement.productionControl;
              const returnControl = getReturnMovement(selectedMovement)?.productionControl;
              const totalLoadedWater = baseControl?.totalCarregado ?? returnControl?.totalCarregado ?? 0;
              const disposableLoads = (driverTripLoads || []).filter(t => 
                t.gateMovementId === selectedMovement.id || 
                (!t.gateMovementId && t.driverName?.toLowerCase() === selectedMovement.driver?.toLowerCase() && t.vehiclePlate?.toLowerCase() === selectedMovement.plate?.toLowerCase() && new Date(t.timestamp).getTime() >= new Date(selectedMovement.timestamp).getTime() - 120000 && new Date(t.timestamp).getTime() <= new Date(selectedMovement.timestamp).getTime() + 86400000)
              );

              const groupedDisposableMap = disposableLoads.reduce((acc, load) => {
                const cleanName = load.productName.split('(')[0].trim();
                const key = load.productId || cleanName.toLowerCase();
                if (!acc[key]) {
                  acc[key] = {
                    id: key,
                    productName: cleanName,
                    initialQty: 0
                  };
                }
                acc[key].initialQty += (load.initialQty || 0);
                return acc;
              }, {} as Record<string, { id: string; productName: string; initialQty: number }>);

              const groupedDisposableList = Object.values(groupedDisposableMap);
              
              if (totalLoadedWater > 0 || groupedDisposableList.length > 0) {
                return (
                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-3 text-[10px]">
                    <div className="font-bold text-indigo-900 uppercase mb-2 flex items-center gap-1.5">
                      <Truck size={14} /> Composição da Carga do Motorista Próprio
                    </div>
                    <div className="space-y-1">
                      {totalLoadedWater > 0 && (
                        <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                           <span className="text-indigo-800 font-semibold">Água 20 Lts (Linha Retornável)</span>
                           <span className="font-black text-indigo-950">{totalLoadedWater} un</span>
                        </div>
                      )}
                      {groupedDisposableList.map(load => (
                        <div key={load.id} className="flex justify-between border-b border-indigo-100/50 pb-1">
                           <span className="text-indigo-800 font-semibold">{load.productName} (Linha Descartável)</span>
                           <span className="font-black text-indigo-950">{load.initialQty} un</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Real-time Launch Balance Tracker */}
          {(() => {
            const enteredWaterQty = sales
              .filter(s => (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua') || s.item.toLowerCase().includes('bonifica')) && !isDisposableProduct(s.item))
              .reduce((sum, s) => sum + s.qty, 0);
            const enteredVasilhameQty = sales
              .filter(s => s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('retorno'))
              .reduce((sum, s) => sum + s.qty, 0);

            const waterDiff = suggestedWaterQty - enteredWaterQty;
            const vasilhameDiff = currentTargetVasilhameQty - enteredVasilhameQty;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-xs">
                {/* Water Balance */}
                <div className="bg-white rounded p-2.5 border border-slate-150 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700">💧 Vendas + Bonificações de Água 20L:</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Meta/Vendido: {suggestedWaterQty} un</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Lançado: <strong className="text-slate-800">{enteredWaterQty} un</strong></span>
                    {waterDiff > 0 ? (
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-200">
                        Faltam: {waterDiff} un
                      </span>
                    ) : waterDiff < 0 ? (
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-rose-200">
                        Excesso: {Math.abs(waterDiff)} un
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-emerald-200 inline-flex items-center gap-1">
                        <Check size={10} /> Conciliado
                      </span>
                    )}
                  </div>
                </div>

                {/* Vasilhame Balance */}
                <div className="bg-white rounded p-2.5 border border-slate-150 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700">🪣 Vendas + Comodatos de Vasilhame:</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Meta/Vendido: {currentTargetVasilhameQty} un</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Lançado: <strong className="text-slate-800">{enteredVasilhameQty} un</strong></span>
                    {vasilhameDiff > 0 ? (
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-200">
                        Faltam: {vasilhameDiff} un
                      </span>
                    ) : vasilhameDiff < 0 ? (
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-rose-200">
                        Excesso: {Math.abs(vasilhameDiff)} un
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-emerald-200 inline-flex items-center gap-1">
                        <Check size={10} /> Conciliado
                      </span>
                    )}
                  </div>
                </div>

                {/* Vasilhame Shortage Control */}
                {missingBottlesQty > 0 && (
                  <div className="bg-indigo-50/40 border border-indigo-150 rounded-lg p-3 text-xs md:col-span-2 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-indigo-100 pb-1.5 gap-1">
                      <span className="font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        Conciliação de Diferenças de Vasilhames
                      </span>
                      <span className="font-bold font-mono text-[11px] text-indigo-900 bg-indigo-100/80 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                        Falta Original na Carga: {missingBottlesQty} un
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                      <div className="bg-white p-2 rounded border border-slate-150 text-slate-700">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Lançado como Venda:</span>
                        <strong className="text-slate-800 text-sm font-mono">{vendaVasilhameQty} un</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-150 text-slate-700">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Lançado como Comodato:</span>
                        <strong className="text-indigo-700 text-sm font-mono">{comodatoVasilhameQty} un</strong>
                      </div>
                      <div className="p-2 rounded border flex flex-col justify-center bg-white border-indigo-200">
                        <span className="block text-[9px] uppercase font-bold text-indigo-600">Diferença Restante (Falta Real):</span>
                        {Math.max(0, missingBottlesQty - vendaVasilhameQty - comodatoVasilhameQty) === 0 ? (
                          <strong className="text-emerald-700 text-sm font-mono flex items-center gap-1">
                            <Check size={14} /> Totalmente Justificado!
                          </strong>
                        ) : (
                          <strong className="text-rose-700 text-sm font-mono">
                            {Math.max(0, missingBottlesQty - vendaVasilhameQty - comodatoVasilhameQty)} un faltantes
                          </strong>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Inline add sale form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <Receipt size={16} />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                  Lançar Nova Venda Manualmente (Esquecida pelo Motorista)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Registre as vendas que o motorista deixou de lançar no aplicativo com busca refinada e multi-pagamento.
                </p>
              </div>
            </div>

            {/* 1. Search and Select Client */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                1. Cliente / Destinatário (Nome, Apelido, Código ou CPF/CNPJ) *
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  value={manualSaleClientName} 
                  onChange={e => {
                    setManualSaleClientName(e.target.value);
                    setShowManualSaleClientDropdown(true);
                  }} 
                  onFocus={() => setShowManualSaleClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowManualSaleClientDropdown(false), 200)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 hover:bg-slate-50/50 font-bold text-slate-800 placeholder:text-slate-400 pr-8 transition-all" 
                  placeholder="Pesquise por Código, CNPJ, Nome, Fantasia..." 
                />
                {manualSaleClientName && (
                  <button
                    type="button"
                    onClick={() => setManualSaleClientName('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
              {showManualSaleClientDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                  {(() => {
                    const query = manualSaleClientName.toLowerCase().trim();
                    const filteredDropdownClients = registeredClients
                      .filter(c => {
                        if (!query || query === 'consumidor geral') return true;
                        const nameMatch = c.name.toLowerCase().includes(query);
                        const codeMatch = c.codigo ? c.codigo.toLowerCase().includes(query) : false;
                        const fantasyMatch = c.apelidoFantasia ? c.apelidoFantasia.toLowerCase().includes(query) : false;
                        const cpfCnpjMatch = c.cpfCnpj ? c.cpfCnpj.toLowerCase().includes(query) : false;
                        return nameMatch || codeMatch || fantasyMatch || cpfCnpjMatch;
                      })
                      .sort((a, b) => {
                        const codeA = parseInt(a.codigo || '', 10);
                        const codeB = parseInt(b.codigo || '', 10);
                        const isANum = !isNaN(codeA) && /^\d+$/.test((a.codigo || '').trim());
                        const isBNum = !isNaN(codeB) && /^\d+$/.test((b.codigo || '').trim());
                        if (isANum && isBNum) {
                          return codeA - codeB;
                        }
                        if (isANum) return -1;
                        if (isBNum) return 1;
                        const valA = a.codigo || '';
                        const valB = b.codigo || '';
                        if (valA || valB) {
                          return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                        }
                        return a.name.localeCompare(b.name);
                      });

                    return (
                      <>
                        {filteredDropdownClients.slice(0, 50).map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => {
                              setManualSaleClientName(c.name);
                              setShowManualSaleClientDropdown(false);
                            }}
                            className="p-2 hover:bg-indigo-50 cursor-pointer text-xs space-y-0.5 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{c.name}</span>
                              {c.codigo && (
                                <span className="bg-slate-100 text-slate-600 text-[9px] px-1 rounded font-mono font-bold">
                                  #{c.codigo}
                                </span>
                              )}
                            </div>
                            {c.apelidoFantasia && (
                              <div className="text-[10px] text-slate-500 italic">
                                Fantasia: {c.apelidoFantasia}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 font-mono">
                              {c.cpfCnpj && <span>{c.personType === 'fisica' ? 'CPF' : 'CNPJ'}: {c.cpfCnpj}</span>}
                              {c.cidade && <span>🏙️ {c.cidade}-{c.uf}</span>}
                            </div>
                          </div>
                        ))}
                        {filteredDropdownClients.length === 0 && (
                          <div className="p-3 text-xs text-slate-400 italic text-center">
                            Nenhum cliente cadastrado com este filtro.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 2. Add Product to Manual Cart */}
            <form onSubmit={handleAddToManualCart} className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/60 space-y-3">
              <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                2. Adicionar Produto ao Carrinho da Venda
              </div>

              {/* Product Selector buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'agua', label: '💧 Água 20 Lts', desc: 'Garrafão cheio' },
                  { type: 'agua_copo', label: '🥤 Copo 200ml', desc: 'Cx c/ 48un' },
                  { type: 'garrafa510', label: '🍾 Garrafa 510ml', desc: 'Fd c/ 12un' },
                  { type: 'garrafa15l', label: '🍾 Garrafa 1,5L', desc: 'Fd c/ 6un' },
                  { type: 'vasilhame', label: '🪣 Vasilhame', desc: 'Venda de vasilhame' },
                  { type: 'bonificacao', label: '🎁 Bonificação', desc: 'Custo zero' },
                  { type: 'comodato', label: '🤝 Comodato', desc: 'Vasilhame emprestado' },
                  { type: 'retorno', label: '🔄 Retorno Comodato', desc: 'Devolução de vasilhame' },
                  { type: 'troca', label: '♻️ Troca Vasilhame', desc: 'Avarias por Água' }
                ].map((prod) => (
                  <button
                    key={prod.type}
                    type="button"
                    onClick={() => {
                      setManualSaleProductType(prod.type as any);
                      // Clear unit price when product is selected, so the user has to fill it manually!
                      setManualSaleUnitPrice('');
                    }}
                    className={`p-2 rounded-lg text-left text-xs font-bold uppercase border transition-all ${
                      manualSaleProductType === prod.type
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-[10px] tracking-wide leading-tight">{prod.label}</div>
                    <div className="text-[8px] text-slate-400 lowercase normal-case leading-none mt-0.5 font-medium">{prod.desc}</div>
                  </button>
                ))}
              </div>

              {/* Qty and Unit Price Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    required 
                    value={manualSaleQty} 
                    onChange={e => {
                      const val = e.target.value;
                      setManualSaleQty(val === '' ? '' : Number(val));
                    }} 
                    className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-700" 
                    placeholder="Ex: 5"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Preço Unitário (R$)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required 
                    disabled={manualSaleProductType === 'bonificacao' || manualSaleProductType === 'comodato' || manualSaleProductType === 'retorno' || manualSaleProductType === 'troca'} 
                    value={
                      manualSaleProductType === 'bonificacao' || manualSaleProductType === 'comodato' || manualSaleProductType === 'retorno' || manualSaleProductType === 'troca'
                        ? 'Grátis' 
                        : formatBRLWithoutSymbol(Number(manualSaleUnitPrice) || 0)
                    } 
                    onChange={e => {
                      if (manualSaleProductType === 'bonificacao' || manualSaleProductType === 'comodato' || manualSaleProductType === 'retorno' || manualSaleProductType === 'troca') return;
                      const parsed = parseBRLCurrency(e.target.value);
                      setManualSaleUnitPrice(parsed);
                    }} 
                    className={`w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none ${
                      manualSaleProductType === 'bonificacao' || manualSaleProductType === 'comodato' || manualSaleProductType === 'retorno' || manualSaleProductType === 'troca'
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
                        : 'bg-white font-bold text-slate-700'
                    }`} 
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Troca / Exchange Inputs (Ratio and calculated avarias) */}
              {manualSaleProductType === 'troca' && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-amber-700 uppercase block mb-1">Relação de Troca (Avarias por Água)</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        required
                        value={manualExchangeRatio}
                        onFocus={(e) => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setManualExchangeRatio(val === '' ? 4 : Math.max(1, parseInt(val) || 1));
                        }}
                        className="w-full text-xs p-2 pr-8 border border-amber-200 rounded focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold text-amber-800 text-center"
                      />
                      <span className="absolute right-3 text-[10px] font-bold text-amber-400 pointer-events-none">x1</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-amber-700 uppercase block mb-1">Total de Avarias Entregues pelo Cliente</label>
                    <div className="w-full text-xs p-2 border border-amber-200 rounded bg-amber-100/50 font-black text-amber-900 flex items-center justify-between">
                      <span>{manualExchangeAvariasQty || 0} Avarias</span>
                      <span className="text-[9px] font-medium text-amber-600 font-sans italic">Calculado automaticamente ({manualSaleQty || 0} x {manualExchangeRatio})</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} /> Inserir no Carrinho
                </button>
              </div>
            </form>

            {/* 3. Manual Sale Shopping Cart List */}
            {manualSaleCart.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    3. Produtos no Carrinho (Venda Atual)
                  </span>
                  <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full">
                    {manualSaleCart.length} item(ns)
                  </span>
                </div>

                <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {manualSaleCart.map((item, idx) => (
                    <li key={idx} className="py-2 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800">{getManualProductDisplayName(item.productType)}</span>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          {item.productType === 'troca' ? (
                            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 block mt-0.5">
                              Troca: {item.qty} Água(s) por {item.exchangeAvariasQty || (item.qty * (item.exchangeRatio || 4))} Avarias (1:{item.exchangeRatio || 4})
                            </span>
                          ) : (
                            `${item.qty} un × R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-700">R$ {(item.qty * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFromManualCart(idx)} 
                          className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Cart Total */}
                {(() => {
                  const cartTotal = manualSaleCart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
                  return (
                    <>
                      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Total desta Venda:</span>
                        <strong className="text-base font-black text-indigo-700 font-mono">
                          R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>

                      {/* 4. Split/Multi Payment Forms */}
                      {cartTotal > 0 && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 space-y-3">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            4. Distribuir Formas de Pagamento
                          </div>

                          {/* Real-time remaining manual payment balance helper */}
                          {(() => {
                            const valDinheiro = parseFloat(manualPayDinheiro) || 0;
                            const valPix = parseFloat(manualPayPix) || 0;
                            const valBoleto = parseFloat(manualPayBoleto) || 0;
                            const valCheque = parseFloat(manualPayCheque) || 0;
                            const valOutros = parseFloat(manualPayOutros) || 0;
                            const totalPaidManual = valDinheiro + valPix + valBoleto + valCheque + valOutros;
                            const diff = cartTotal - totalPaidManual;

                            if (diff > 0.01) {
                              return (
                                <div className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5 animate-pulse">
                                  <AlertCircle size={15} />
                                  <span>Falta preencher <strong className="font-mono text-xs">R$ {diff.toFixed(2)}</strong> para fechar o pagamento desta venda.</span>
                                </div>
                              );
                            } else if (Math.abs(diff) < 0.01) {
                              return (
                                <div className="text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/60 flex items-center gap-1.5">
                                  <Check size={15} className="bg-emerald-100 rounded-full p-0.5" />
                                  <span>Valor correto! Pagamento fechado. ✅</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-[11px] font-bold uppercase text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200/60 flex items-center gap-1.5">
                                  <Info size={15} />
                                  <span>Os valores informados superaram o total da venda em <strong className="font-mono text-xs">R$ {Math.abs(diff).toFixed(2)}</strong>.</span>
                                </div>
                              );
                            }
                          })()}

                          <div className="space-y-2.5">
                            {/* Dinheiro */}
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-extrabold text-[11px] text-slate-500 uppercase">Dinheiro</span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="0,00" 
                                value={formatBRLWithoutSymbol(parseFloat(manualPayDinheiro) || 0)} 
                                onChange={e => setManualPayDinheiro(parseBRLCurrency(e.target.value).toString())} 
                                className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-bold text-slate-700 text-right bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAutoFillManualPayment('dinheiro')}
                                className="text-[9px] px-2 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 font-black rounded uppercase transition-colors"
                              >
                                Tudo
                              </button>
                            </div>

                            {/* PIX */}
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-extrabold text-[11px] text-slate-500 uppercase">PIX</span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="0,00" 
                                value={formatBRLWithoutSymbol(parseFloat(manualPayPix) || 0)} 
                                onChange={e => setManualPayPix(parseBRLCurrency(e.target.value).toString())} 
                                className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-bold text-slate-700 text-right bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAutoFillManualPayment('pix')}
                                className="text-[9px] px-2 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 font-black rounded uppercase transition-colors"
                              >
                                Tudo
                              </button>
                            </div>

                            {/* Boleto */}
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-extrabold text-[11px] text-slate-500 uppercase">Boleto</span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="0,00" 
                                value={formatBRLWithoutSymbol(parseFloat(manualPayBoleto) || 0)} 
                                onChange={e => setManualPayBoleto(parseBRLCurrency(e.target.value).toString())} 
                                className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-bold text-slate-700 text-right bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAutoFillManualPayment('boleto')}
                                className="text-[9px] px-2 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 font-black rounded uppercase transition-colors"
                              >
                                Tudo
                              </button>
                            </div>

                            {/* Cheque */}
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-extrabold text-[11px] text-slate-500 uppercase">Cheque</span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="0,00" 
                                value={formatBRLWithoutSymbol(parseFloat(manualPayCheque) || 0)} 
                                onChange={e => setManualPayCheque(parseBRLCurrency(e.target.value).toString())} 
                                className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-bold text-slate-700 text-right bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleAutoFillManualPayment('cheque')}
                                className="text-[9px] px-2 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 font-black rounded uppercase transition-colors"
                              >
                                Tudo
                              </button>
                            </div>

                            {/* Outros / A Prazo */}
                            <div className="space-y-1 bg-white p-2.5 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="w-16 font-extrabold text-[10px] text-slate-500 uppercase">A Prazo</span>
                                <input 
                                  type="text" 
                                  inputMode="numeric"
                                  placeholder="0,00" 
                                  value={formatBRLWithoutSymbol(parseFloat(manualPayOutros) || 0)} 
                                  onChange={e => setManualPayOutros(parseBRLCurrency(e.target.value).toString())} 
                                  className="flex-1 text-xs p-1.5 border border-slate-200 rounded font-bold text-slate-700 text-right focus:border-indigo-400 outline-none"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => handleAutoFillManualPayment('outros')}
                                  className="text-[9px] px-2 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 font-black rounded uppercase transition-colors"
                                >
                                  Tudo
                                </button>
                              </div>
                              <input 
                                type="text" 
                                placeholder="Ex: Boleto faturado, carteira, prazo..." 
                                value={manualPayOutrosNote} 
                                onChange={e => setManualPayOutrosNote(e.target.value)} 
                                className="w-full text-[10px] p-1 px-2 border border-slate-200 rounded font-semibold text-slate-600 bg-slate-50/50 outline-none focus:border-indigo-400"
                              />
                            </div>
                          </div>

                          {/* Finalize Button */}
                          <div className="flex justify-end pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={handleFinalizeManualSale}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-colors cursor-pointer"
                            >
                              <Check size={14} />
                              Confirmar Venda e Registrar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

                {/* Sales Table and Summary */}
                <div className="space-y-4">
                  {/* Sales Table Grouped by Client */}
                  <div className="border border-slate-100 rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase">
                          <th className="p-3">Item / Produto</th>
                          <th className="p-3 text-center w-28">Quantidade</th>
                          <th className="p-3 text-right w-36">Valor Unitário</th>
                          <th className="p-3 text-right w-32">Subtotal</th>
                          <th className="p-3 text-center w-16">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {(() => {
                          if (sales.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 uppercase tracking-wider text-[10px]">Nenhum produto de saída informado. A carga de saída começa zerada.</td>
                              </tr>
                            );
                          }

                          // Group sales by clientName
                          const groups: Record<string, SettlementSale[]> = {};
                          sales.forEach(s => {
                            const client = (s.clientName || 'Carga Inicial (Vendas do App)').trim();
                            if (!groups[client]) {
                              groups[client] = [];
                            }
                            groups[client].push(s);
                          });

                          return Object.entries(groups).map(([clientName, clientSales]) => (
                            <React.Fragment key={clientName}>
                              {/* Group Header */}
                              <tr className="bg-slate-50 font-extrabold text-slate-700 text-[10px] uppercase border-y border-slate-200/60">
                                <td colSpan={5} className="p-2 pl-3 bg-slate-100/70">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-slate-500">👤 CLIENTE:</span>
                                    <span className="text-indigo-700 font-black text-[11px] tracking-wide">{clientName}</span>
                                  </div>
                                </td>
                              </tr>
                              {/* Client Sales rows */}
                              {clientSales.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/40">
                                  <td className="p-3 pl-5 text-slate-900 font-bold">
                                    <div className="flex flex-col">
                                      <span>{s.item}</span>
                                      {s.paymentMethodNote && (
                                        <span className="text-[10px] text-emerald-600 font-extrabold uppercase mt-0.5">
                                          💳 {s.paymentMethodNote}
                                        </span>
                                      )}
                                      {s.paymentMethod && !s.paymentMethodNote && (
                                        <span className="text-[10px] text-indigo-600 font-extrabold uppercase mt-0.5">
                                          💳 Forma de Pagamento: {s.paymentMethod.toUpperCase()}
                                        </span>
                                      )}
                                      {s.item.includes('Água 20 Lts') && suggestedWaterQty > 0 && !s.clientName && (
                                        <span className="block text-[9px] text-slate-400 font-medium">Sugerido p/ descarrego: {suggestedWaterQty} un</span>
                                      )}
                                      {s.item === 'Vasilhame' && currentTargetVasilhameQty > 0 && !s.clientName && (
                                        <span className="block text-[9px] text-slate-400 font-medium">Sugerido p/ descarrego: {currentTargetVasilhameQty} un</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="w-20 text-center border border-slate-200 rounded p-1 bg-white outline-none focus:border-blue-400 font-bold text-xs"
                                      value={s.qty || ''}
                                      placeholder="0"
                                      onChange={e => handleUpdateSaleQty(s.id, parseInt(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end">
                                      <span className="text-slate-400 mr-1 text-[10px] font-bold">R$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 text-right border border-slate-200 rounded p-1 bg-white outline-none focus:border-blue-400 font-bold text-xs"
                                        value={s.value || ''}
                                        placeholder="0.00"
                                        onChange={e => handleUpdateSaleValue(s.id, parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-black text-slate-900">
                                    R$ {(s.qty * s.value).toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSale(s.id)}
                                      className="p-1 hover:text-red-600 text-slate-400 transition cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary of Sales by Payment Method and Products */}
                  {sales.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200/60">
                      {/* Products Summary */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Venda Total de Produtos</h4>
                        <div className="space-y-1.5">
                          {(() => {
                            const prodTotals = calculateSalesProductTotals(sales);
                            return Object.entries(prodTotals).map(([name, qty]) => (
                              <div key={name} className="flex justify-between text-xs font-bold text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-3xs">
                                <span>{name}</span>
                                <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-black">{qty} un</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Payment Methods Summary */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Total de Vendas por Forma de Pagamento</h4>
                        <div className="space-y-1.5">
                          {(() => {
                            const payTotals = calculateSalesPaymentBreakdown(sales);
                            const activeForms = [
                              { label: 'Dinheiro', val: payTotals.dinheiro, color: 'text-emerald-700 bg-emerald-50' },
                              { label: 'PIX', val: payTotals.pix, color: 'text-blue-700 bg-blue-50' },
                              { label: 'Boleto', val: payTotals.boleto, color: 'text-amber-700 bg-amber-50' },
                              { label: 'Cheque', val: payTotals.cheque, color: 'text-purple-700 bg-purple-50' },
                              { label: 'A Prazo', val: payTotals.outros, color: 'text-rose-700 bg-rose-50' },
                            ].filter(f => f.val > 0);

                            if (activeForms.length === 0) {
                              return <div className="text-xs text-slate-400 italic font-semibold p-2">Nenhum valor cobrado.</div>;
                            }

                            return activeForms.map(f => (
                              <div key={f.label} className="flex justify-between text-xs font-bold text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-3xs">
                                <span>{f.label}</span>
                                <span className={`font-mono px-2 py-0.5 rounded text-[11px] font-black ${f.color}`}>R$ {f.val.toFixed(2)}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Despesas Diversas da Viagem</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Informe pedágios, alimentação, reparos emergenciais pagos.</p>
                  </div>
                </div>

                {/* Inline add expense form */}
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-slate-50 p-3 rounded">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Descrição da Despesa</label>
                    <input
                      type="text"
                      placeholder="Ex: Pedágio Rodovia SP-330"
                      required
                      value={newExpenseItem}
                      onChange={e => setNewExpenseItem(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none font-semibold focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Valor</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formatBRLWithoutSymbol(newExpenseValue)}
                        onChange={e => setNewExpenseValue(parseBRLCurrency(e.target.value))}
                        className="w-full bg-white border border-slate-200 pl-7 pr-2 py-2 rounded text-xs outline-none font-bold focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-slate-800 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5 hover:bg-slate-900 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Inserir Despesa</span>
                    </button>
                  </div>
                </form>

                {/* Expenses Table */}
                <div className="border border-slate-100 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase">
                        <th className="p-3">Descrição</th>
                        <th className="p-3 text-right w-36">Valor</th>
                        <th className="p-3 text-center w-16">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900 font-bold">{e.item}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-slate-400 mr-1 text-[10px] font-bold">R$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-24 text-right border border-slate-200 rounded p-1 bg-white outline-none focus:border-blue-400 font-bold text-xs"
                                value={formatBRLWithoutSymbol(e.value || 0)}
                                onChange={evt => handleUpdateExpenseValue(e.id, parseBRLCurrency(evt.target.value))}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveExpense(e.id)}
                              className="p-1 hover:text-red-600 text-slate-400 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 uppercase tracking-wider text-[10px]">Nenhuma despesa de viagem inserida.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suprimentos Section */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2.1 Suprimentos de Viagem / Caixa</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Informe trocos iniciais ou aportes de dinheiro em caixa recebidos pelo motorista.</p>
                  </div>
                </div>

                {/* Inline add suprimento form */}
                <form onSubmit={handleAddSuprimento} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-slate-50 p-3 rounded">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Motivo do Suprimento</label>
                    <input
                      type="text"
                      placeholder="Ex: Troco inicial para viagem"
                      required
                      value={newSuprimentoItem}
                      onChange={e => setNewSuprimentoItem(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none font-semibold focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Valor</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formatBRLWithoutSymbol(newSuprimentoValue)}
                        onChange={e => setNewSuprimentoValue(parseBRLCurrency(e.target.value))}
                        className="w-full bg-white border border-slate-200 pl-7 pr-2 py-2 rounded text-xs outline-none font-bold focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-slate-800 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5 hover:bg-slate-900 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Inserir Suprimento</span>
                    </button>
                  </div>
                </form>

                {/* Suprimentos Table */}
                <div className="border border-slate-100 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase">
                        <th className="p-3">Descrição / Motivo</th>
                        <th className="p-3 text-right w-36">Valor</th>
                        <th className="p-3 text-center w-16">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {suprimentos.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-900 font-bold">{s.item}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-slate-400 mr-1 text-[10px] font-bold">R$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-24 text-right border border-slate-200 rounded p-1 bg-white outline-none focus:border-blue-400 font-bold text-xs"
                                value={formatBRLWithoutSymbol(s.value || 0)}
                                onChange={evt => handleUpdateSuprimentoValue(s.id, parseBRLCurrency(evt.target.value))}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSuprimento(s.id)}
                              className="p-1 hover:text-red-600 text-slate-400 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {suprimentos.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 uppercase tracking-wider text-[10px]">Nenhum suprimento de viagem inserido.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Returns delivered to Conference */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Valores Entregues ao Conferente</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Preencha os valores físicos entregues de acordo com o fechamento.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dinheiro (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRLWithoutSymbol(payments.dinheiro)}
                      onChange={e => setPayments({ ...payments, dinheiro: parseBRLCurrency(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold text-slate-800 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">PIX (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRLWithoutSymbol(payments.pix)}
                      onChange={e => setPayments({ ...payments, pix: parseBRLCurrency(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold text-slate-800 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Boleto (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRLWithoutSymbol(payments.boleto)}
                      onChange={e => setPayments({ ...payments, boleto: parseBRLCurrency(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold text-slate-800 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Cheque (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRLWithoutSymbol(payments.cheque)}
                      onChange={e => setPayments({ ...payments, cheque: parseBRLCurrency(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold text-slate-800 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Outros (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRLWithoutSymbol(payments.outros)}
                      onChange={e => setPayments({ ...payments, outros: parseBRLCurrency(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold text-slate-800 focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Real-time remaining payment balance helper */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">Total Esperado (Item 2):</span>
                    <span className="text-slate-900 font-mono text-sm">R$ {totalToReceive.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">Total Informado no Caixa (Dinheiro + PIX + etc):</span>
                    <span className="text-slate-900 font-mono text-sm">R$ {totalDelivered.toFixed(2)}</span>
                  </div>
                  
                  {(() => {
                    const diff = totalToReceive - totalDelivered;
                    if (diff > 0.01) {
                      return (
                        <div className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5 animate-pulse">
                          <AlertCircle size={15} />
                          <span>Falta preencher <strong className="font-mono text-xs">R$ {diff.toFixed(2)}</strong> para fechar o caixa corretamente.</span>
                        </div>
                      );
                    } else if (Math.abs(diff) < 0.01) {
                      return (
                        <div className="text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/60 flex items-center gap-1.5">
                          <Check size={15} className="bg-emerald-100 rounded-full p-0.5" />
                          <span>Valor correto! O caixa está perfeitamente fechado. ✅</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-[11px] font-bold uppercase text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200/60 flex items-center gap-1.5">
                          <Info size={15} />
                          <span>Os valores preenchidos superaram o total esperado em <strong className="font-mono text-xs">R$ {Math.abs(diff).toFixed(2)}</strong>.</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {payments.pix > 0 && (
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3 mt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-blue-900 uppercase">Conciliar PIX do Banco (Opcional)</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Selecione o recebimento no extrato bancário importado para vincular a esta carga.</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full self-start sm:self-center">
                        PIX Esperado: R$ {payments.pix.toFixed(2)}
                      </span>
                    </div>

                    {bankTransactions.filter(tx => !tx.isReconciled).length === 0 ? (
                      <div className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded border border-amber-100 font-bold uppercase">
                        ⚠️ Nenhum PIX disponível no extrato do sistema. Você pode salvar o acerto agora e conciliar depois quando importar o arquivo de extrato do banco.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const selectedSum = bankTransactions.filter(t => selectedPixTxIds.includes(t.id)).reduce((s, t) => s + t.amount, 0);
                          const diff = payments.pix - selectedSum;
                          return (
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider shadow-sm">
                              <div className="text-slate-500">
                                Selecionado: <span className="text-slate-800 font-black font-mono">R$ {selectedSum.toFixed(2)}</span>
                              </div>
                              {diff > 0.01 ? (
                                <div className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60 font-black">
                                  Falta para o total: <span className="font-black font-mono text-xs ml-1">R$ {diff.toFixed(2)}</span>
                                </div>
                              ) : Math.abs(diff) < 0.01 ? (
                                <div className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 font-black flex items-center gap-1">
                                  Valor exato atingido! ✅
                                </div>
                              ) : (
                                <div className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60 font-black">
                                  Superou por: <span className="font-black font-mono text-xs ml-1">R$ {Math.abs(diff).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <label className="block text-[9px] font-black text-slate-600 uppercase">Transações Disponíveis no Extrato (Não Conciliadas)</label>
                        
                        {/* Search input in active settlement form */}
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar transação por valor, data ou nome..."
                            value={searchPixInActiveSettlementQuery}
                            onChange={e => setSearchPixInActiveSettlementQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-400 font-medium"
                          />
                        </div>

                        <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-white">
                          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 p-1 hover:bg-slate-50 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedPixTxIds.length === 0}
                              onChange={() => setSelectedPixTxIds([])}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>-- Não Conciliar Agora (Deixar para conciliar depois) --</span>
                          </label>
                          {[...bankTransactions]
                            .filter(tx => !tx.isReconciled && !tx.isVoided && !tx.isRefund && tx.amount > 0)
                            .filter(tx => {
                              const query = searchPixInActiveSettlementQuery.toLowerCase().trim();
                              if (!query) return true;

                              const matchesDesc = tx.description.toLowerCase().includes(query);
                              const matchesAmount = tx.amount.toString().includes(query) || 
                                                    tx.amount.toFixed(2).includes(query) ||
                                                    tx.amount.toFixed(2).replace('.', ',').includes(query);
                              const matchesRef = (tx.documentRef || '').toLowerCase().includes(query);
                              const matchesDate = tx.date.includes(query) || (() => {
                                const [y, m, d] = tx.date.split('-');
                                if (y && m && d) {
                                  const brDate = `${d}/${m}/${y}`;
                                  const brDateShort = `${d}/${m}`;
                                  return brDate.includes(query) || brDateShort.includes(query);
                                }
                                return false;
                              })();

                              return matchesDesc || matchesAmount || matchesRef || matchesDate;
                            })
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(tx => {
                              const isChecked = selectedPixTxIds.includes(tx.id);
                              return (
                                <label key={tx.id} className="flex items-center space-x-2 text-xs font-bold text-slate-700 p-1 hover:bg-slate-50 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPixTxIds(prev => [...prev, tx.id]);
                                      } else {
                                        setSelectedPixTxIds(prev => prev.filter(id => id !== tx.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>
                                    R$ {tx.amount.toFixed(2)} - {tx.description} ({formatDateStringBR(tx.date)})
                                    {(() => {
                                      const matchingRefund = getMatchingRefund(tx);
                                      if (matchingRefund) {
                                        return (
                                          <span 
                                            className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                                            title={`Atenção: Este PIX possui uma devolução de R$ -${matchingRefund.amount.toFixed(2)} pendente de inutilização no extrato.`}
                                          >
                                            ⚠️ DEVOLUÇÃO DETECTADA (R$ -{matchingRefund.amount.toFixed(2)})
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </span>
                                </label>
                              );
                            })}
                          {bankTransactions
                            .filter(tx => !tx.isReconciled && !tx.isVoided && !tx.isRefund && tx.amount > 0)
                            .filter(tx => {
                              const query = searchPixInActiveSettlementQuery.toLowerCase().trim();
                              if (!query) return true;

                              const matchesDesc = tx.description.toLowerCase().includes(query);
                              const matchesAmount = tx.amount.toString().includes(query) || 
                                                    tx.amount.toFixed(2).includes(query) ||
                                                    tx.amount.toFixed(2).replace('.', ',').includes(query);
                              const matchesRef = (tx.documentRef || '').toLowerCase().includes(query);
                              const matchesDate = tx.date.includes(query) || (() => {
                                const [y, m, d] = tx.date.split('-');
                                if (y && m && d) {
                                  const brDate = `${d}/${m}/${y}`;
                                  const brDateShort = `${d}/${m}`;
                                  return brDate.includes(query) || brDateShort.includes(query);
                                }
                                return false;
                              })();

                              return matchesDesc || matchesAmount || matchesRef || matchesDate;
                            }).length === 0 && (
                              <div className="p-4 text-center text-slate-400 uppercase tracking-wider text-[10px] font-bold">Nenhuma transação corresponde à busca.</div>
                            )}
                        </div>
                        {selectedPixTxIds.length > 0 && (
                          <div className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100 font-bold uppercase">
                            ✅ PIX(s) selecionado(s) será(ão) conciliado(s) automaticamente! (Total: R$ {bankTransactions.filter(t => selectedPixTxIds.includes(t.id)).reduce((s, t) => s + t.amount, 0).toFixed(2)})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Damages / Loss (Avarias e Perdas) */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">4. Avarias ou Perdas no Percurso</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                    Este motorista possui limite de tolerância de{' '}
                    <strong className="text-indigo-700">{currentDamageToleranceQty} un</strong> de avarias. 
                    Será descontado da comissão o excedente cobrado ({avariaQty} un).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Avarias a Cobrar (unidades)</label>
                    <input
                      type="number"
                      min="0"
                      value={avariaQty || '0'}
                      onChange={e => setAvariaQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none font-bold focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    />
                    {resolvedProductionControl?.avariasDescarregamento && (
                      <span className="block text-[10px] text-rose-700 font-semibold mt-1">
                        Sincronizado do descarregamento (Dutíveis): {totalAvariasDescarrego} un
                      </span>
                    )}

                    <div className="mt-2.5 bg-rose-100/50 border border-rose-200 p-2.5 rounded-lg text-rose-950 font-bold text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span>Total de Avarias:</span>
                        <span>{totalAvariasDescarrego} un</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tolerância do Motorista:</span>
                        <span>- {currentDamageToleranceQty} un</span>
                      </div>
                      <div className="flex justify-between border-t border-rose-200/80 pt-1 text-xs font-black text-rose-900">
                        <span>Avarias a Cobrar (Após Tolerância):</span>
                        <span>{avariasACobrarCalculado} un</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Valor do Prejuízo por Unidade (R$)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatBRLWithoutSymbol(avariaUnitValue)}
                        onChange={e => setAvariaUnitValue(parseBRLCurrency(e.target.value))}
                        className="w-full bg-white border border-slate-200 pl-7 pr-2 py-2.5 rounded text-xs outline-none font-bold focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>



              {/* Cidade da Viagem */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cidade(s) da Viagem <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value=""
                    onChange={e => {
                      const value = e.target.value;
                      if (value) {
                        const currentList = cidade ? cidade.split(', ').map(c => c.trim()).filter(Boolean) : [];
                        if (!currentList.includes(value)) {
                          const updated = [...currentList, value];
                          setCidade(updated.join(', '));
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-bold text-slate-800"
                  >
                    <option value="">-- Adicione uma ou mais Cidades --</option>
                    {[...(registeredCities || [])]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(city => {
                        const currentList = cidade ? cidade.split(', ').map(c => c.trim()).filter(Boolean) : [];
                        return !currentList.includes(city.name);
                      })
                      .map(city => (
                        <option key={city.id} value={city.name}>
                          {city.name} {city.uf ? `(${city.uf})` : ''}
                        </option>
                      ))}
                  </select>

                  {/* Selected cities badges */}
                  {(() => {
                    const currentList = cidade ? cidade.split(', ').map(c => c.trim()).filter(Boolean) : [];
                    if (currentList.length === 0) {
                      return (
                        <p className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 p-2 rounded-lg">
                          ⚠️ Nenhuma cidade selecionada. Por favor, adicione pelo menos uma cidade.
                        </p>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-150 min-h-[36px] items-center">
                        {currentList.map((city, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-md shadow-3xs transition-all duration-100 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <span>🏙️ {city}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentList.filter(c => c !== city);
                                setCidade(updated.join(', '));
                              }}
                              className="text-indigo-400 hover:text-indigo-600 font-black cursor-pointer text-xs ml-1 flex items-center justify-center w-3 h-3 rounded-full hover:bg-indigo-200/50"
                              title="Remover"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Gerencie as cidades disponíveis no menu de <strong>Configurações (Painel de Apoio)</strong>.
                </p>
              </div>

              {/* Observation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observações Gerais</label>
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Observações de caixa ou ocorrências de viagem..."
                  className="w-full bg-white border border-slate-200 rounded text-xs p-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 min-h-[80px]"
                />
              </div>

            </div>
          </div>

          {/* Sidebar calculations card */}
          <div className="space-y-6">
            {/* Driver Mobile Entries Card */}
            {resolvedProductionControl && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={14} className="text-blue-600 animate-pulse" />
                    Lançamentos do Motorista (App)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingMobileData(true)}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
                  >
                    <Edit size={10} />
                    <span>Editar Lançamentos</span>
                  </button>
                </div>
                
                {/* Sales list from mobile */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vendas Realizadas:</span>
                  {(groupedMobileSales && groupedMobileSales.length > 0) ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {groupedMobileSales.map((g, idx) => {
                        const activePayments: string[] = [];
                        if (g.payments.dinheiro > 0) activePayments.push(`Dinheiro: R$ ${g.payments.dinheiro.toFixed(2)}`);
                        if (g.payments.pix > 0) activePayments.push(`PIX: R$ ${g.payments.pix.toFixed(2)}`);
                        if (g.payments.boleto > 0) activePayments.push(`Boleto: R$ ${g.payments.boleto.toFixed(2)}`);
                        if (g.payments.cheque > 0) activePayments.push(`Cheque: R$ ${g.payments.cheque.toFixed(2)}`);
                        if (g.payments.outros > 0) activePayments.push(`A Prazo: R$ ${g.payments.outros.toFixed(2)}`);

                        return (
                          <div key={idx} className="bg-white p-2.5 rounded border border-slate-150 text-[11px] flex flex-col gap-1.5 shadow-2xs">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-slate-800 text-xs truncate max-w-[150px]" title={g.clientName}>
                                {g.clientName}
                              </span>
                              <span className="font-black text-slate-900 font-mono text-xs shrink-0">
                                R$ {g.totalValue.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Products list */}
                            <div className="space-y-0.5 text-[10px] text-slate-600 border-l-2 border-slate-200 pl-1.5 py-0.5">
                              {g.products.map((p, pIdx) => (
                                <div key={pIdx} className="flex justify-between">
                                  <span>{p.item}</span>
                                  <span className="font-bold font-mono">{p.qty} un</span>
                                </div>
                              ))}
                            </div>

                            {/* Payment Methods */}
                            {activePayments.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-500">
                                {activePayments.map((payStr, payIdx) => (
                                  <span key={payIdx} className="bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                    {payStr}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[9px] text-emerald-600 font-bold mt-1 pt-1 border-t border-slate-100">
                                Cortesia / Sem Custo
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic block pl-1">Nenhuma venda registrada no App</span>
                  )}
                </div>

                {/* Logistics Operations */}
                <div className="grid grid-cols-4 gap-1.5 border-t border-b border-slate-200/60 py-2.5 text-center bg-white/40 rounded-lg px-1">
                  <div className="bg-white p-1 rounded border border-slate-150 flex flex-col justify-center shadow-3xs">
                    <span className="block text-[7.5px] font-extrabold text-slate-400 uppercase leading-none mb-1">Bonificação</span>
                    <strong className="text-slate-700 text-[11px] font-mono leading-none">{resolvedProductionControl.mobileBonifications || 0} un</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-150 flex flex-col justify-center shadow-3xs">
                    <span className="block text-[7.5px] font-extrabold text-slate-400 uppercase leading-none mb-1 font-mono">Com. Deixado</span>
                    <strong className="text-indigo-600 text-[11px] font-mono leading-none">{resolvedProductionControl.mobileComodato || 0} un</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-150 flex flex-col justify-center shadow-3xs">
                    <span className="block text-[7.5px] font-extrabold text-slate-400 uppercase leading-none mb-1 font-mono">Com. Retirado</span>
                    <strong className="text-emerald-600 text-[11px] font-mono leading-none">{resolvedProductionControl.mobileComodatoReturn || 0} un</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-150 flex flex-col justify-center shadow-3xs">
                    <span className="block text-[7.5px] font-extrabold text-slate-400 uppercase leading-none mb-1 font-mono">Trocas</span>
                    <strong className="text-blue-600 text-[11px] font-mono leading-none">{resolvedProductionControl.mobileExchanges || 0} un</strong>
                  </div>
                </div>

                {/* Expenses from mobile */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Despesas de Viagem:</span>
                  {(resolvedProductionControl.mobileExpenses && resolvedProductionControl.mobileExpenses.length > 0) ? (
                    <div className="space-y-1">
                      {resolvedProductionControl.mobileExpenses.map((e, idx) => (
                        <div key={idx} className="bg-white p-1.5 rounded border border-slate-150 text-[11px] flex justify-between items-center shadow-3xs">
                          <span className="font-bold text-slate-700">{e.item}</span>
                          <span className="font-semibold text-slate-900 font-mono">R$ {e.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic block pl-1">Nenhuma despesa registrada no App</span>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
              
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Painel Financeiro</span>
                <Coins size={16} className="text-blue-400" />
              </div>

              <div className="p-5 space-y-4">
                {/* Total Sales */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                  <span className="text-slate-500">TOTAL DE VENDAS:</span>
                  <span className="text-slate-900 font-extrabold text-sm">R$ {totalSalesAmount.toFixed(2)}</span>
                </div>

                {/* Total Expenses */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                  <span className="text-slate-500">DESPESAS REEMBOLSADAS:</span>
                  <span className="text-slate-900 font-bold">- R$ {totalExpensesAmount.toFixed(2)}</span>
                </div>

                {/* Total Suprimentos */}
                {totalSuprimentosAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                    <span className="text-slate-500">SUPRIMENTOS DE CAIXA:</span>
                    <span className="text-slate-900 font-bold">+ R$ {totalSuprimentosAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Total Cash Advances */}
                {totalCashAdvances > 0 && (
                  <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                    <span className="text-slate-500">ADIANTAMENTO DE CAIXA:</span>
                    <span className="text-emerald-600 font-bold">+ R$ {totalCashAdvances.toFixed(2)}</span>
                  </div>
                )}

                {/* Expected to Receive */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                  <span className="text-slate-500">VALOR ESPERADO LÍQUIDO:</span>
                  <span className="text-slate-900 font-extrabold text-sm text-blue-600">R$ {totalToReceive.toFixed(2)}</span>
                </div>

                {/* Delivered Cash by Driver */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                  <span className="text-slate-500">VALORES FÍSICOS ENTREGUES:</span>
                  <span className="text-slate-900 font-extrabold text-sm text-indigo-600">R$ {totalDelivered.toFixed(2)}</span>
                </div>

                {/* Caixas discrepancies logic */}
                <div className="flex justify-between text-xs font-bold border-b border-slate-100 pb-3">
                  <span className="text-slate-500">DIFERENÇA DE CAIXA:</span>
                  {difference < 0 ? (
                    <span className="text-rose-600 font-bold">R$ {difference.toFixed(2)} (FALTA)</span>
                  ) : difference > 0 ? (
                    <span className="text-emerald-600 font-bold">R$ +{difference.toFixed(2)} (SOBRA)</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">R$ 0.00 (CORRETO)</span>
                  )}
                </div>

                {/* Warnings or informational boxes */}
                {difference < 0 && (
                  <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-[10px] text-rose-800 font-bold">
                    ATENÇÃO: A falta de R$ {Math.abs(difference).toFixed(2)} será descontada da comissão do motorista.
                  </div>
                )}
                {difference > 0 && (
                  <div className="p-2.5 bg-emerald-50 border-l-4 border-emerald-500 rounded text-[10px] text-emerald-800 font-bold">
                    O excedente de R$ {difference.toFixed(2)} pertence à empresa e não será adicionado à comissão.
                  </div>
                )}

                {/* COMMISSION CALCULATOR */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-3.5 border border-slate-200/60">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 pb-1.5">Memória de Cálculo de Comissão</h4>
                  
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Comissão Vendas de Água Galão ({commissionPercent}%):</span>
                    <span>R$ {galaoCommission.toFixed(2)}</span>
                  </div>

                  {copoSalesAmount > 0 && (
                    <div className="flex justify-between text-[11px] font-bold text-blue-700 bg-blue-50/60 p-1.5 rounded border border-blue-100">
                      <span>(+) Comissão Copo 200ml Descartável (1,5%):</span>
                      <span>R$ {copoCommission.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] font-black text-slate-700 border-t border-slate-200/50 pt-1">
                    <span>Subtotal Comissão Bruta:</span>
                    <span>R$ {basicCommission.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] font-bold text-rose-600">
                    <span>Desconto de Avarias:</span>
                    <span>- R$ {avariaDeduction.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] font-bold text-rose-600">
                    <span>Desconto Falta Caixa:</span>
                    <span>- R$ {shortageDeduction.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-200/80 pt-2 flex justify-between text-xs font-black text-slate-800">
                    <span>COMISSÃO LÍQUIDA A PAGAR:</span>
                    <span className="text-emerald-600 text-sm">R$ {finalCommission.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-3 space-y-2">
                  <button
                    onClick={() => handleSaveSettlement(true)}
                    className="w-full border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 p-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={14} className="text-amber-600" />
                    <span>Salvar Parcial (Rascunho)</span>
                  </button>

                  <button
                    onClick={() => handleSaveSettlement(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Concluir e Salvar Acerto</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>
      )}

      {/* MODAL: EDIT DRIVER LAUNCHED LOGS */}
      {isEditingMobileData && selectedMovement && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Smartphone className="text-indigo-600 animate-bounce" size={20} />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Editar Lançamentos Originais do Motorista</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Corrija os lançamentos enviados no aplicativo para esta viagem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingMobileData(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-150 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditingMobileTab('sales')}
                className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition cursor-pointer ${
                  editingMobileTab === 'sales'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                Vendas do Roteiro ({selectedMovement.productionControl?.mobileSales?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setEditingMobileTab('expenses')}
                className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition cursor-pointer ${
                  editingMobileTab === 'expenses'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                Despesas de Viagem ({selectedMovement.productionControl?.mobileExpenses?.length || 0})
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {editingMobileTab === 'sales' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tabela de Vendas Registradas</span>
                  </div>

                  {(!selectedMovement.productionControl?.mobileSales || selectedMovement.productionControl.mobileSales.length === 0) ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-500 italic">Nenhuma venda registrada pelo motorista para esta viagem.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-3xs bg-white">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                            <th className="p-3">Cliente</th>
                            <th className="p-3">Produto/Descrição</th>
                            <th className="p-3 w-20 text-center">Qtd</th>
                            <th className="p-3 w-28 text-center">Preço Unit. (R$)</th>
                            <th className="p-3 w-28 text-center">Total (R$)</th>
                            <th className="p-3 w-56 text-center">F. Pagamento</th>
                            <th className="p-3 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedMovement.productionControl.mobileSales.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/40">
                              <td className="p-2">
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="text"
                                    value={s.clientName || ''}
                                    onChange={(e) => {
                                      const newClient = e.target.value;
                                      const prodPart = cleanItemDisplay(s.item, s.clientName || '');
                                      const updated = selectedMovement.productionControl!.mobileSales!.map(item =>
                                        item.id === s.id ? { 
                                          ...item, 
                                          clientName: newClient,
                                          item: newClient ? `${newClient} - ${prodPart}` : prodPart
                                        } : item
                                      );
                                      handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                    }}
                                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-2 py-1 outline-none font-medium text-xs transition"
                                  />
                                </div>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={cleanItemDisplay(s.item, s.clientName || '')}
                                  onChange={(e) => {
                                    const newProd = e.target.value;
                                    const clientPart = s.clientName || '';
                                    const updated = selectedMovement.productionControl!.mobileSales!.map(item =>
                                      item.id === s.id ? { 
                                        ...item, 
                                        item: clientPart ? `${clientPart} - ${newProd}` : newProd
                                      } : item
                                    );
                                    handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                  }}
                                  className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-2 py-1 outline-none font-medium text-xs transition"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={s.qty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const updated = selectedMovement.productionControl!.mobileSales!.map(item =>
                                      item.id === s.id ? { ...item, qty: val } : item
                                    );
                                    handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                  }}
                                  className="w-16 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-1 text-center outline-none font-bold font-mono text-xs transition"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatBRLWithoutSymbol(s.value)}
                                  onChange={(e) => {
                                    const val = parseBRLCurrency(e.target.value);
                                    const updated = selectedMovement.productionControl!.mobileSales!.map(item =>
                                      item.id === s.id ? { ...item, value: val } : item
                                    );
                                    handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                  }}
                                  className="w-24 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-1 text-right outline-none font-bold font-mono text-xs transition"
                                />
                              </td>
                              <td className="p-2 text-center font-bold font-mono text-slate-800 bg-slate-50/50">
                                R$ {((s.qty || 0) * (s.value || 0)).toFixed(2)}
                              </td>
                              <td className="p-2 text-center">
                                <div className="space-y-1 text-left">
                                  <select
                                    value={
                                      s.paymentMethod === 'misto' || 
                                      Object.values(s.paymentsBreakdown || {}).filter(v => (v || 0) > 0).length > 1
                                        ? 'misto'
                                        : s.paymentMethod || 'dinheiro'
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const total = s.qty * s.value;
                                      const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                        if (item.id === s.id) {
                                          const newBreakdown = { dinheiro: 0, pix: 0, boleto: 0, cheque: 0, outros: 0 };
                                          if (val === 'dinheiro') newBreakdown.dinheiro = total;
                                          else if (val === 'pix') newBreakdown.pix = total;
                                          else if (val === 'boleto') newBreakdown.boleto = total;
                                          else if (val === 'cheque') newBreakdown.cheque = total;
                                          else if (val === 'outros') newBreakdown.outros = total;
                                          else {
                                            return {
                                              ...item,
                                              paymentMethod: 'misto',
                                              paymentsBreakdown: item.paymentsBreakdown || { dinheiro: total, pix: 0, boleto: 0, cheque: 0, outros: 0 }
                                            };
                                          }
 
                                          return { 
                                            ...item, 
                                            paymentMethod: val,
                                            paymentsBreakdown: newBreakdown 
                                          };
                                        }
                                        return item;
                                      });
                                      handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs outline-none font-bold text-slate-700 focus:border-indigo-400 transition"
                                  >
                                    <option value="dinheiro">💵 Dinheiro</option>
                                    <option value="pix">⚡ PIX</option>
                                    <option value="boleto">📄 Boleto</option>
                                    <option value="cheque">✍️ Cheque</option>
                                    <option value="outros">⏳ A Prazo</option>
                                    <option value="misto">🎨 Misto (Múltiplos)</option>
                                  </select>

                                  {(s.paymentMethod === 'misto' || Object.values(s.paymentsBreakdown || {}).filter(v => (v || 0) > 0).length > 1) && (
                                    <div className="bg-slate-50 p-1.5 rounded border border-slate-150 space-y-1 text-left w-full">
                                      <div className="grid grid-cols-2 gap-1 text-[9px] font-semibold text-slate-600">
                                        <div className="flex items-center gap-0.5 justify-between">
                                          <span>💵 Din:</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={s.paymentsBreakdown?.dinheiro || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                                if (item.id === s.id) {
                                                  const breakdown = { ...item.paymentsBreakdown, dinheiro: val };
                                                  return { ...item, paymentsBreakdown: breakdown, paymentMethod: 'misto' };
                                                }
                                                return item;
                                              });
                                              handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-0.5 text-center font-mono text-[9px]"
                                          />
                                        </div>
                                        <div className="flex items-center gap-0.5 justify-between">
                                          <span>⚡ PIX:</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={s.paymentsBreakdown?.pix || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                                if (item.id === s.id) {
                                                  const breakdown = { ...item.paymentsBreakdown, pix: val };
                                                  return { ...item, paymentsBreakdown: breakdown, paymentMethod: 'misto' };
                                                }
                                                return item;
                                              });
                                              handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-0.5 text-center font-mono text-[9px]"
                                          />
                                        </div>
                                        <div className="flex items-center gap-0.5 justify-between">
                                          <span>📄 Bol:</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={s.paymentsBreakdown?.boleto || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                                if (item.id === s.id) {
                                                  const breakdown = { ...item.paymentsBreakdown, boleto: val };
                                                  return { ...item, paymentsBreakdown: breakdown, paymentMethod: 'misto' };
                                                }
                                                return item;
                                              });
                                              handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-0.5 text-center font-mono text-[9px]"
                                          />
                                        </div>
                                        <div className="flex items-center gap-0.5 justify-between">
                                          <span>✍️ Chq:</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={s.paymentsBreakdown?.cheque || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                                if (item.id === s.id) {
                                                  const breakdown = { ...item.paymentsBreakdown, cheque: val };
                                                  return { ...item, paymentsBreakdown: breakdown, paymentMethod: 'misto' };
                                                }
                                                return item;
                                              });
                                              handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-0.5 text-center font-mono text-[9px]"
                                          />
                                        </div>
                                        <div className="flex items-center gap-0.5 justify-between col-span-2 bg-slate-100 p-0.5 rounded">
                                          <span>⏳ A Prazo:</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={s.paymentsBreakdown?.outros || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const updated = selectedMovement.productionControl!.mobileSales!.map(item => {
                                                if (item.id === s.id) {
                                                  const breakdown = { ...item.paymentsBreakdown, outros: val };
                                                  return { ...item, paymentsBreakdown: breakdown, paymentMethod: 'misto' };
                                                }
                                                return item;
                                              });
                                              handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-0.5 text-center font-mono text-[9px]"
                                          />
                                        </div>
                                      </div>
                                      {(() => {
                                        const expectedTotal = s.qty * s.value;
                                        const bd = s.paymentsBreakdown || {};
                                        const currentSum = (bd.dinheiro || 0) + (bd.pix || 0) + (bd.boleto || 0) + (bd.cheque || 0) + (bd.outros || 0);
                                        const diff = expectedTotal - currentSum;
                                        return (
                                          <div className={`text-[8px] font-bold ${Math.abs(diff) < 0.01 ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                                            {Math.abs(diff) < 0.01 
                                              ? '✓ Total Ok' 
                                              : `Restante: R$ ${diff.toFixed(2)}`}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedMovement.productionControl!.mobileSales!.filter(item => item.id !== s.id);
                                    handleSyncMobileData(updated, selectedMovement.productionControl!.mobileExpenses || []);
                                  }}
                                  className="text-red-500 hover:text-red-750 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                  title="Remover venda"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tabela de Despesas Registradas</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentExpenses = selectedMovement.productionControl?.mobileExpenses || [];
                        const newExpense: SettlementExpense = {
                          id: 'mobe-' + Math.random().toString(36).substring(2, 9),
                          item: 'Nova Despesa',
                          value: 10.00
                        };
                        handleSyncMobileData(selectedMovement.productionControl?.mobileSales || [], [...currentExpenses, newExpense]);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm transition cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Adicionar Despesa</span>
                    </button>
                  </div>

                  {(!selectedMovement.productionControl?.mobileExpenses || selectedMovement.productionControl.mobileExpenses.length === 0) ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-500 italic">Nenhuma despesa registrada pelo motorista para esta viagem.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-3xs bg-white max-w-xl mx-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                            <th className="p-3">Descrição da Despesa</th>
                            <th className="p-3 w-36 text-center">Valor (R$)</th>
                            <th className="p-3 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedMovement.productionControl.mobileExpenses.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50/40">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={e.item}
                                  onChange={(evt) => {
                                    const updated = selectedMovement.productionControl!.mobileExpenses!.map(item =>
                                      item.id === e.id ? { ...item, item: evt.target.value } : item
                                    );
                                    handleSyncMobileData(selectedMovement.productionControl!.mobileSales || [], updated);
                                  }}
                                  className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-2 py-1 outline-none font-medium text-xs transition"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatBRLWithoutSymbol(e.value)}
                                  onChange={(evt) => {
                                    const val = parseBRLCurrency(evt.target.value);
                                    const updated = selectedMovement.productionControl!.mobileExpenses!.map(item =>
                                      item.id === e.id ? { ...item, value: val } : item
                                    );
                                    handleSyncMobileData(selectedMovement.productionControl!.mobileSales || [], updated);
                                  }}
                                  className="w-32 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-1 text-right outline-none font-bold font-mono text-xs transition"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedMovement.productionControl!.mobileExpenses!.filter(item => item.id !== e.id);
                                    handleSyncMobileData(selectedMovement.productionControl!.mobileSales || [], updated);
                                  }}
                                  className="text-red-500 hover:text-red-750 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                  title="Remover despesa"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingMobileData(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Check size={14} />
                <span>Salvar e Fechar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED SETTLEMENTS VIEW (HISTORY) */}
      {activeSubTab === 'history' && !selectedMovement && (
        <div className="space-y-4">
          
          {/* Caixa/Cashier summary bento panel */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 overflow-hidden space-y-3">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={16} className="text-amber-500" /> Resultado de Fluxo de Caixa (Prestações Homologadas)
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase">
                {cashierSummary.completedCount} acerto(s) finalizado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dinheiro (Sales - Expenses) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-200/50 pb-1 flex items-center gap-1">
                  💵 Dinheiro (Espécie)
                </span>
                <div className="space-y-1.5 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Vendas em Dinheiro (Bruto):</span>
                    <span className="font-mono font-bold text-slate-800">R$ {cashierSummary.totalSalesDinheiro.toFixed(2)}</span>
                  </div>
                  {cashierSummary.totalShortageDeductions > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Faltas de Carga (Dinheiro Não Recebido):</span>
                      <span className="font-mono font-bold">- R$ {cashierSummary.totalShortageDeductions.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-rose-700">
                    <span>Despesas de Viagem:</span>
                    <span className="font-mono font-bold">- R$ {cashierSummary.totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700/90">
                    <span>Comissão Efetivamente Paga (Dinheiro):</span>
                    <span className="font-mono font-bold">- R$ {cashierSummary.totalFinalCommissions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pl-3 border-b border-dashed border-slate-200/60 pb-1">
                    <span>↳ Comissão de Vendas de Água (Valor Real):</span>
                    <span className="font-mono">R$ {cashierSummary.totalBasicCommissions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Suprimentos de Caixa:</span>
                    <span className="font-mono font-bold">+ R$ {cashierSummary.totalSuprimentos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pb-1 border-b border-dashed border-slate-200/60">
                    <span>Sobra de Caixa (Diferenças Positivas):</span>
                    <span className="font-mono font-bold">+ R$ {cashierSummary.totalSobraCaixa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 font-bold text-slate-900 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-200/40">
                    <span className="text-emerald-800 font-black">SALDO LÍQUIDO:</span>
                    <span className="font-mono font-black text-emerald-900 text-sm">R$ {cashierSummary.netDinheiro.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Outras Formas de Pagamento */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-200/50 pb-1 flex items-center gap-1">
                  🏦 Outros Meios de Recebimento
                </span>
                <div className="space-y-1 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Vendas via PIX:</span>
                    <span className="font-mono font-bold text-blue-700">R$ {cashierSummary.totalSalesPix.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas via Boleto:</span>
                    <span className="font-mono font-bold text-purple-700">R$ {cashierSummary.totalSalesBoleto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas via Cheque:</span>
                    <span className="font-mono font-bold text-slate-700">R$ {cashierSummary.totalSalesCheque.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outras Formas:</span>
                    <span className="font-mono font-bold text-slate-600">R$ {cashierSummary.totalSalesOutros.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Caixa Geral */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-xs border border-indigo-950/80">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 block">
                    💰 TOTAL ACUMULADO EM CAIXA
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight text-white block mt-1">
                    R$ {cashierSummary.totalCaixaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[9px] text-indigo-200/70 font-medium block mt-2 border-t border-indigo-800/60 pt-1.5">
                  Fórmula: Saldo Líquido Dinheiro + PIX + Boleto + Cheque + Outros
                </span>
              </div>
            </div>
          </div>

          {/* Filters card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por motorista, placa ou ID..."
                  value={searchSettlementQuery}
                  onChange={e => setSearchSettlementQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-medium"
                />
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Filter size={14} /> Filtrar Conciliação:
                </span>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setFilterReconciliation('all')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                      filterReconciliation === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterReconciliation('reconciled')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                      filterReconciliation === 'reconciled' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Conciliado PIX
                  </button>
                  <button
                    onClick={() => setFilterReconciliation('pending')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                      filterReconciliation === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Pendente PIX
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Advanced filters */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              {/* Filter by Start Date */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Inicial</label>
                <input
                  type="date"
                  value={filterSettlementStartDate}
                  onChange={e => setFilterSettlementStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium outline-none focus:bg-white focus:border-blue-400"
                />
              </div>

              {/* Filter by End Date */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Final</label>
                <input
                  type="date"
                  value={filterSettlementEndDate}
                  onChange={e => setFilterSettlementEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium outline-none focus:bg-white focus:border-blue-400"
                />
              </div>

              {/* Filter by Driver */}
              <div className="flex flex-col gap-1 min-w-[160px] flex-1 md:flex-initial">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motorista</label>
                <select
                  value={filterSettlementDriver}
                  onChange={e => setFilterSettlementDriver(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium outline-none focus:bg-white focus:border-blue-400"
                >
                  <option value="">Todos os Motoristas</option>
                  {uniqueDriversForHistory.map(drv => (
                    <option key={drv} value={drv}>{drv}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Vehicle */}
              <div className="flex flex-col gap-1 min-w-[140px] flex-1 md:flex-initial">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Veículo / Placa</label>
                <select
                  value={filterSettlementVehicle}
                  onChange={e => setFilterSettlementVehicle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 font-medium outline-none focus:bg-white focus:border-blue-400 uppercase"
                >
                  <option value="">Todos os Veículos</option>
                  {uniqueVehiclesForHistory.map(v => (
                    <option key={v} value={v}>{v.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Clear filters button */}
              {(filterSettlementStartDate || filterSettlementEndDate || filterSettlementDriver || filterSettlementVehicle || searchSettlementQuery || filterReconciliation !== 'all') && (
                <div className="flex items-end self-end h-[34px]">
                  <button
                    onClick={() => {
                      setFilterSettlementStartDate('');
                      setFilterSettlementEndDate('');
                      setFilterSettlementDriver('');
                      setFilterSettlementVehicle('');
                      setSearchSettlementQuery('');
                      setFilterReconciliation('all');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Limpar Filtros</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* History table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Lista de Acertos Realizados</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {filteredCompletedSettlements.length} resultados
              </span>
            </div>

            {filteredCompletedSettlements.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-sm font-bold text-slate-800">Nenhum acerto encontrado</h3>
                <p className="text-xs text-slate-400 mt-1">Experimente mudar o filtro ou buscar outro termo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="p-4">Carga / Placa</th>
                      <th className="p-4">Motorista</th>
                      <th className="p-4">Data Acerto</th>
                      <th className="p-4 text-right">Vendas Líquidas</th>
                      <th className="p-4 text-right">Diferença Caixa</th>
                      <th className="p-4 text-right font-bold">Comissão Líquida</th>
                      <th className="p-4 text-center">Status PIX</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCompletedSettlements.map(ds => (
                      <tr key={ds.id} className="hover:bg-slate-50/60">
                        <td className="p-4">
                          <span className="font-bold text-slate-900">{ds.plate}</span>
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mt-0.5">ID: {ds.id}</span>
                        </td>
                        <td className="p-4">{ds.driverName}</td>
                        <td className="p-4 text-slate-500">{new Date(ds.dateArrival).toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-bold text-slate-900">R$ {ds.totalToReceive.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          {ds.difference < 0 ? (
                            <span className="text-rose-600 font-bold">R$ {ds.difference.toFixed(2)}</span>
                          ) : ds.difference > 0 ? (
                            <span className="text-emerald-600 font-bold">R$ +{ds.difference.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">R$ 0.00</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-emerald-600 font-black text-sm">
                          R$ {ds.finalCommission.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          {(ds.payments?.pix || 0) === 0 ? (
                            <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-slate-200" title="Não possui pagamentos via PIX. Conciliado automaticamente.">
                              NÃO UTILIZA PIX
                            </span>
                          ) : ds.isReconciled ? (
                            <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider rounded-full">
                              CONCILIADO
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider rounded-full">
                              AGUARDANDO PIX
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detailed Modal view */}
                            <button
                              onClick={() => setViewingSettlement(ds)}
                              className="p-1 hover:text-blue-600 text-slate-400 cursor-pointer"
                              title="Visualizar Acerto"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handlePrint(ds)}
                              className="p-1 hover:text-slate-950 text-slate-400 cursor-pointer"
                              title="Imprimir Recibo"
                            >
                              <Printer size={16} />
                            </button>
                            {!ds.isReconciled && ds.payments.pix > 0 && !(ds.reconciledPixTransactionIds && ds.reconciledPixTransactionIds.length > 0) && !ds.reconciledPixTransactionId && (
                              <button
                                onClick={() => handleOpenReconcile(ds)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase rounded shadow cursor-pointer"
                                title="Conciliar recebimento com transação de PIX"
                              >
                                Conciliar
                              </button>
                            )}
                            {(ds.isReconciled || (ds.reconciledPixTransactionIds && ds.reconciledPixTransactionIds.length > 0) || ds.reconciledPixTransactionId) && (
                              <div className="px-2 py-1 bg-slate-100 text-slate-400 font-bold text-[9px] uppercase rounded flex items-center gap-1 cursor-not-allowed select-none" title="Conciliação não pode ser desfeita">
                                <Lock size={10} />
                                Conciliado
                              </div>
                            )}
                            <button
                              onClick={() => deleteDriverSettlement(ds.id)}
                              className="p-1 hover:text-red-600 text-slate-400 cursor-pointer"
                              title="Excluir Acerto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BANK RECONCILIATION TAB */}
      {activeSubTab === 'bank_reconciliation' && !selectedMovement && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Upload and Imported Files Manager */}
          <div className="space-y-6">
            {/* Statement Upload Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5 h-fit">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Landmark size={18} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Extrato do Banco (Importação)</h2>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Faça upload do arquivo de extrato do banco no formato <strong>OFX (.ofx)</strong> para importar os recebimentos PIX de entrada. O sistema processará o arquivo buscando PIX que possam ser vinculados à carga.
              </p>

              {/* Simulated file layout instruction */}
              <div className="bg-slate-50 p-3 rounded text-[10px] text-slate-600 font-semibold space-y-1">
                <p className="font-bold uppercase text-slate-800">Formato OFX esperado:</p>
                <code className="block bg-white p-1.5 border border-slate-100 rounded text-slate-500 font-mono">
                  &lt;OFX&gt;<br />
                  &nbsp;&nbsp;&lt;BANKMSGSRSV1&gt;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;STMTTRN&gt;...&lt;/STMTTRN&gt;
                </code>
              </div>

              <div className="space-y-3">
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Instituição Bancária
                  </label>
                  <select
                    value={selectedImportInstitution}
                    onChange={(e) => setSelectedImportInstitution(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="auto">🔍 Detectar Automaticamente</option>
                    <option value="Banco do Brasil">Banco do Brasil</option>
                    <option value="Caixa Econômica">Caixa Econômica</option>
                    <option value="Bradesco">Bradesco</option>
                    <option value="outro">Outra Instituição...</option>
                  </select>

                  {selectedImportInstitution === 'outro' && (
                    <div className="pt-1.5 animate-fadeIn">
                      <input
                        type="text"
                        value={customImportInstitution}
                        onChange={(e) => setCustomImportInstitution(e.target.value)}
                        placeholder="Digite o nome do Banco..."
                        className="w-full text-xs p-2.5 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBankFileUpload}
                  accept=".ofx"
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase p-3 rounded shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={16} />
                  <span>Importar Arquivo Bancário</span>
                </button>

              </div>

              {importSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-100 font-medium">
                  {importSuccessMessage}
                </div>
              )}

              {importErrorMessage && (
                <div className="p-3.5 bg-rose-50 text-rose-800 text-xs rounded border border-rose-100 font-medium">
                  {importErrorMessage}
                </div>
              )}
            </div>

            {/* Imported Files Manager */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <FileSpreadsheet size={18} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Arquivos Importados</h2>
              </div>

              {importedFiles.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  Nenhum arquivo importado registrado recentemente.
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {importedFiles.map(file => (
                    <div key={file.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 group hover:border-slate-200 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700 break-all">{file.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">
                          {file.count} {file.count === 1 ? 'Transação' : 'Transações'} • {new Date(file.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => setFileToDelete({ id: file.id, name: file.name })}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-all cursor-pointer"
                        title="Excluir arquivo e suas transações"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statement Transaction List */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por banco (ex: BB, Bradesco), descrição, valor ou ref..."
                    value={searchBankQuery}
                    onChange={e => setSearchBankQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-400"
                  />
                </div>
                <select
                  value={filterBankInstitution}
                  onChange={(e) => setFilterBankInstitution(e.target.value)}
                  className="w-full sm:w-44 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:bg-white font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">🏦 Todas Inst.</option>
                  <option value="Banco do Brasil">Banco do Brasil</option>
                  <option value="Caixa Econômica">Caixa Econômica</option>
                  <option value="Bradesco">Bradesco</option>
                  {Array.from(new Set(bankTransactions.map(tx => tx.institution).filter(Boolean)))
                    .filter(inst => inst !== 'Banco do Brasil' && inst !== 'Caixa Econômica' && inst !== 'Bradesco')
                    .map(inst => (
                      <option key={inst} value={inst!}>{inst}</option>
                    ))}
                </select>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setFilterBankReconciliation('all')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
                    filterBankReconciliation === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterBankReconciliation('reconciled')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
                    filterBankReconciliation === 'reconciled' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Conciliados
                </button>
                <button
                  onClick={() => setFilterBankReconciliation('pending')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
                    filterBankReconciliation === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Não Conciliados
                </button>
                <button
                  onClick={() => setFilterBankReconciliation('refunds')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase transition ${
                    filterBankReconciliation === 'refunds' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Devoluções
                </button>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedBankTxIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-blue-800 block sm:inline">
                      {selectedBankTxIds.length} {selectedBankTxIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
                    </span>
                    <span className="text-xs text-blue-600 sm:ml-2">
                      (Total: <strong>R$ {bankTransactions.filter(tx => selectedBankTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}</strong>)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setBulkManualReconcileReason('');
                      setShowBulkReconcileModal(true);
                    }}
                    className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Conciliar Lote
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Excluir Lote</span>
                  </button>
                  <button
                    onClick={() => setSelectedBankTxIds([])}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] uppercase px-3 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Transações PIX do Extrato Importado</h3>
                {selectedBankTxIds.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {selectedBankTxIds.length} selecionadas
                  </span>
                )}
              </div>

              {filteredBankTxs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 uppercase tracking-wider text-[10px]">Nenhuma transação bancária importada correspondente.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                        <th className="p-4 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={filteredBankTxs.filter(tx => !tx.isReconciled).length > 0 && filteredBankTxs.filter(tx => !tx.isReconciled).every(tx => selectedBankTxIds.includes(tx.id))}
                            onChange={(e) => {
                              const selectable = filteredBankTxs.filter(tx => !tx.isReconciled);
                              if (e.target.checked) {
                                setSelectedBankTxIds(prev => {
                                  const next = new Set([...prev, ...selectable.map(tx => tx.id)]);
                                  return Array.from(next);
                                });
                              } else {
                                const selectableIds = selectable.map(tx => tx.id);
                                setSelectedBankTxIds(prev => prev.filter(id => !selectableIds.includes(id)));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-4">Data Transação</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4">Cód. Documento</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredBankTxs.map(tx => (
                        <tr 
                          key={tx.id} 
                          className={`hover:bg-slate-50/60 transition-colors ${
                            selectedBankTxIds.includes(tx.id) ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            {!tx.isReconciled ? (
                              <input 
                                type="checkbox"
                                checked={selectedBankTxIds.includes(tx.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBankTxIds(prev => [...prev, tx.id]);
                                  } else {
                                    setSelectedBankTxIds(prev => prev.filter(id => id !== tx.id));
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                              />
                            ) : (
                              <div className="w-4 h-4 mx-auto flex items-center justify-center" title="Conciliado e travado">
                                <Lock size={10} className="text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-4">{formatDateStringBR(tx.date)}</td>
                          <td className="p-4 font-bold text-slate-900">
                            <div>
                              <div className={`break-words whitespace-normal text-xs md:text-sm font-bold ${tx.isVoided ? 'line-through text-slate-400' : 'text-slate-900'}`}>{tx.description}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {tx.isVoided && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 animate-fadeIn" title="Esta transação foi inutilizada devido a uma devolução de PIX">
                                    🚫 Inutilizada (Devolvido)
                                  </span>
                                )}
                                {tx.isRefund && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 animate-fadeIn" title="Estorno ou Devolução de PIX">
                                    ↩️ Devolução de PIX
                                  </span>
                                )}
                                {(() => {
                                  const matchingRefund = getMatchingRefund(tx);
                                  if (matchingRefund) {
                                    return (
                                      <span 
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 animate-pulse cursor-pointer" 
                                        title={`Identificada uma devolução pendente para este PIX no valor de R$ -${matchingRefund.amount.toFixed(2)}. Clique em 'Inutilizar Entrada' na devolução para vinculá-los.`}
                                      >
                                        ⚠️ Devolução Pendente (R$ -{matchingRefund.amount.toFixed(2)})
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                {tx.institution && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 animate-fadeIn" title="Instituição Bancária">
                                    🏦 {tx.institution}
                                  </span>
                                )}
                                {tx.importFilename && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200" title="Arquivo de origem">
                                    📄 {tx.importFilename}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={`p-4 text-right font-black ${tx.isRefund || tx.amount < 0 ? 'text-rose-600' : tx.isVoided ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
                            R$ {tx.amount.toFixed(2)}
                          </td>
                          <td className="p-4 text-slate-500 font-mono">{tx.documentRef || '-'}</td>
                          <td className="p-4 text-center">
                            {tx.isVoided ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded-full" title="Transação de entrada inutilizada por devolução">
                                INUTILIZADA
                              </span>
                            ) : tx.isReconciled ? (
                              tx.isRefund ? (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-bold rounded-full" title={`Devolução vinculada à entrada ID: ${tx.refundsTransactionId}`}>
                                  DEV. CONCILIADA
                                </span>
                              ) : tx.manualReconciliationReason ? (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded-full" title={`Conciliado Manualmente: ${tx.manualReconciliationReason}`}>
                                  CONCILIADO MANUAL
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full" title={`Vinculado ao acerto ID: ${tx.reconciledWithSettlementId}`}>
                                  VINCULADO / CONCILIADO
                                </span>
                              )
                            ) : (
                              tx.isRefund ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full" title="Devolução disponível para vincular e inutilizar entrada">
                                  DEV. DISPONÍVEL
                                </span>
                              ) : getMatchingRefund(tx) ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold rounded-full animate-pulse" title="Esta transação de entrada possui uma devolução pendente no extrato bancário">
                                  DEV. DETECTADA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full">
                                  DISPONÍVEL
                                </span>
                              )
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {tx.isVoided && (
                                <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1 select-none py-1 px-2 bg-slate-50 border border-slate-100 rounded">
                                  🚫 Estornado
                                </span>
                              )}
                              {tx.isRefund && tx.isReconciled && (
                                <button 
                                  onClick={() => undoVoidBankTransaction(tx.id)}
                                  className="text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                  title="Desfazer vinculação de estorno"
                                >
                                  Desfazer Estorno
                                </button>
                              )}
                              {tx.isRefund && !tx.isReconciled && (
                                <>
                                  <button
                                    onClick={() => {
                                      setRefundTxToLink(tx);
                                      setSelectedEntryTxId('');
                                    }}
                                    className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    title="Inutilizar transação de entrada correspondente"
                                  >
                                    Inutilizar Entrada
                                  </button>
                                  <button
                                    onClick={() => setTxToDelete(tx)}
                                    className="text-rose-600 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    title="Excluir Transação"
                                  >
                                    Excluir
                                  </button>
                                </>
                              )}
                              {!tx.isRefund && !tx.isVoided && tx.isReconciled && !tx.manualReconciliationReason && tx.reconciledWithSettlementId && (
                                <button 
                                  onClick={() => {
                                    const st = driverSettlements.find(d => d.id === tx.reconciledWithSettlementId);
                                    if (st) setViewingSettlement(st);
                                  }}
                                  className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                  title="Visualizar Acerto"
                                >
                                  Ver Acerto
                                </button>
                              )}
                              {!tx.isRefund && !tx.isVoided && tx.isReconciled && tx.manualReconciliationReason && !tx.voidedWithTransactionId && (
                                <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1 select-none py-1 px-2 bg-slate-50 border border-slate-100 rounded" title="Conciliação manual não pode ser desfeita">
                                  <Lock size={10} className="text-slate-400" />
                                  Conciliação Bloqueada
                                </span>
                              )}
                              {!tx.isRefund && !tx.isVoided && tx.isReconciled && tx.voidedWithTransactionId && (
                                <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1 select-none py-1 px-2 bg-slate-50 border border-slate-100 rounded" title="Inutilizada devido a uma devolução de PIX">
                                  Inutilizada por Estorno
                                </span>
                              )}
                              {!tx.isRefund && !tx.isVoided && !tx.isReconciled && (
                                <>
                                  <button
                                    onClick={() => setTxToManualReconcile(tx)}
                                    className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    title="Conciliar sem acerto"
                                  >
                                    Conciliar Manual
                                  </button>
                                  <button
                                    onClick={() => setTxToDelete(tx)}
                                    className="text-rose-600 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                                    title="Excluir Transação"
                                  >
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingSettlement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
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

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Veículo / Placa:</span>
                  <span className="text-slate-800 font-bold">{viewingSettlement.plate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cidade da Viagem:</span>
                  <span className="text-slate-800 font-bold text-indigo-700">{viewingSettlement.cidade || 'Não informada'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Data do Fechamento:</span>
                  <span className="text-slate-800 font-bold">{new Date(viewingSettlement.dateArrival).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Items Table Grouped by Client */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Produtos Vendidos</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center w-24">Quantidade</th>
                        <th className="p-2.5 text-right w-28">Unitário</th>
                        <th className="p-2.5 text-right w-28">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {(() => {
                        if (!viewingSettlement.sales || viewingSettlement.sales.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400 text-[10px] uppercase">Nenhuma venda informada</td>
                            </tr>
                          );
                        }

                        // Group sales by clientName
                        const groups: Record<string, SettlementSale[]> = {};
                        viewingSettlement.sales.forEach(s => {
                          const client = (s.clientName || 'Carga Inicial (Vendas do App)').trim();
                          if (!groups[client]) {
                            groups[client] = [];
                          }
                          groups[client].push(s);
                        });

                        return Object.entries(groups).map(([clientName, clientSales]) => (
                          <React.Fragment key={clientName}>
                            {/* Group Header */}
                            <tr className="bg-slate-50 font-bold text-slate-600 text-[9px] uppercase border-y border-slate-100">
                              <td colSpan={4} className="p-1.5 pl-2.5 bg-slate-100/50">
                                👤 CLIENTE: <span className="text-indigo-700 font-extrabold">{clientName}</span>
                              </td>
                            </tr>
                            {/* Rows */}
                            {clientSales.map(s => (
                              <tr key={s.id}>
                                <td className="p-2.5 pl-4 text-slate-900">
                                  <div className="flex flex-col">
                                    <span>{s.item}</span>
                                    {s.paymentMethodNote && (
                                      <span className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5">
                                        💳 {s.paymentMethodNote}
                                      </span>
                                    )}
                                    {s.paymentMethod && !s.paymentMethodNote && (
                                      <span className="text-[9px] text-indigo-600 font-bold uppercase mt-0.5">
                                        💳 {s.paymentMethod.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2.5 text-center">{s.qty}</td>
                                <td className="p-2.5 text-right">R$ {s.value.toFixed(2)}</td>
                                <td className="p-2.5 text-right font-bold text-slate-900">R$ {(s.qty * s.value).toFixed(2)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ));
                      })()}
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="p-2.5 text-right uppercase">Total Vendas:</td>
                        <td className="p-2.5 text-right">R$ {viewingSettlement.totalSales.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary of Sales by Payment Method and Products in viewing modal */}
              {viewingSettlement.sales && viewingSettlement.sales.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border text-xs">
                  {/* Products Summary */}
                  <div className="space-y-1.5">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-b pb-0.5">Venda Total de Produtos</h4>
                    <div className="space-y-1">
                      {(() => {
                        const prodTotals = calculateSalesProductTotals(viewingSettlement.sales);
                        return Object.entries(prodTotals).map(([name, qty]) => (
                          <div key={name} className="flex justify-between text-[11px] font-bold text-slate-600 bg-white p-1.5 rounded border">
                            <span>{name}</span>
                            <span className="font-mono text-slate-900 font-black">{qty} un</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Payment Methods Summary */}
                  <div className="space-y-1.5">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-b pb-0.5">Total por Forma de Pagamento</h4>
                    <div className="space-y-1">
                      {(() => {
                        const payTotals = calculateSalesPaymentBreakdown(viewingSettlement.sales);
                        const activeForms = [
                          { label: 'Dinheiro', val: payTotals.dinheiro, color: 'text-emerald-700' },
                          { label: 'PIX', val: payTotals.pix, color: 'text-blue-700' },
                          { label: 'Boleto', val: payTotals.boleto, color: 'text-amber-700' },
                          { label: 'Cheque', val: payTotals.cheque, color: 'text-purple-700' },
                          { label: 'A Prazo', val: payTotals.outros, color: 'text-rose-700' },
                        ].filter(f => f.val > 0);

                        if (activeForms.length === 0) {
                          return <div className="text-[11px] text-slate-400 italic font-semibold p-1">Nenhum valor cobrado.</div>;
                        }

                        return activeForms.map(f => (
                          <div key={f.label} className="flex justify-between text-[11px] font-bold text-slate-600 bg-white p-1.5 rounded border">
                            <span>{f.label}</span>
                            <span className={`font-mono font-black ${f.color}`}>R$ {f.val.toFixed(2)}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

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
                      {viewingSettlement.expenses.map(e => (
                        <tr key={e.id}>
                          <td className="p-2.5 text-slate-900">{e.item}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">R$ {e.value.toFixed(2)}</td>
                        </tr>
                      ))}
                      {viewingSettlement.expenses.length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-slate-400 text-[10px] uppercase">Nenhuma despesa de viagem registrada</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold">
                        <td className="p-2.5 text-right uppercase">Total Despesas:</td>
                        <td className="p-2.5 text-right">R$ {viewingSettlement.totalExpenses.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suprimentos Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider border-b pb-1">Suprimentos Registrados</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                        <th className="p-2.5">Descrição / Motivo</th>
                        <th className="p-2.5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {(viewingSettlement.suprimentos || []).map(s => (
                        <tr key={s.id}>
                          <td className="p-2.5 text-slate-900">{s.item}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">R$ {s.value.toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!viewingSettlement.suprimentos || viewingSettlement.suprimentos.length === 0) && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-slate-400 text-[10px] uppercase">Nenhum suprimento de viagem registrado</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold">
                        <td className="p-2.5 text-right uppercase">Total Suprimentos:</td>
                        <td className="p-2.5 text-right text-emerald-600 font-bold">R$ {(viewingSettlement.totalSuprimentos || 0).toFixed(2)}</td>
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
                    <span>R$ {viewingSettlement.totalToReceive.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded">
                    <span className="block text-[9px] text-slate-400 uppercase font-semibold">Total Entregue:</span>
                    <span>R$ {viewingSettlement.totalDelivered.toFixed(2)}</span>
                  </div>
                  <div className={`p-3 rounded ${viewingSettlement.difference < 0 ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
                    <span className="block text-[9px] uppercase font-semibold">Diferença:</span>
                    <span>R$ {viewingSettlement.difference.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded col-span-2 md:col-span-1">
                    <span className="block text-[9px] text-slate-400 uppercase font-semibold">Status PIX:</span>
                    <span className="uppercase text-[10px]">{viewingSettlement.isReconciled ? 'Reconciliado' : 'Não Conciliado'}</span>
                  </div>
                </div>
              </div>

              {/* Commission Closing Panel */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-semibold text-xs">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">Resumo da Comissão a Pagar</h4>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Comissão de Viagem ({viewingSettlement.commissionPercent}%):</span>
                  <span>R$ {viewingSettlement.basicCommission.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-rose-400">
                  <span>Descontos de Avarias / Perdas:</span>
                  <span>- R$ {viewingSettlement.avariaDeduction.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-rose-400">
                  <span>Descontos por Falta de Caixa:</span>
                  <span>- R$ {viewingSettlement.shortageDeduction.toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm">
                  <span className="text-emerald-400">Comissão Líquida Final:</span>
                  <span className="text-emerald-400 text-base">R$ {viewingSettlement.finalCommission.toFixed(2)}</span>
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
                onClick={() => handlePrint(viewingSettlement)}
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

      {/* RECONCILE MODAL */}
      {reconcilingSettlement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Conciliação de Múltiplos PIX</h3>
                <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-bold">Acerto Placa: {reconcilingSettlement.plate}</p>
              </div>
              <button
                onClick={() => setReconcilingSettlement(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Valor Esperado</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    R$ {(reconcilingSettlement?.payments?.pix ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Total Selecionado</span>
                  <span className={`text-sm font-black font-mono ${
                    Math.abs(
                      bankTransactions.filter(tx => selectedTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0) - 
                      (reconcilingSettlement?.payments?.pix ?? 0)
                    ) < 0.01 
                      ? 'text-emerald-600' 
                      : 'text-amber-600'
                  }`}>
                    R$ {bankTransactions
                      .filter(tx => selectedTxIds.includes(tx.id))
                      .reduce((sum, tx) => sum + tx.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  {(() => {
                    const expected = reconcilingSettlement?.payments?.pix ?? 0;
                    const selected = bankTransactions.filter(tx => selectedTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0);
                    const diff = expected - selected;
                    return (
                      <>
                        <span className="text-slate-400 font-bold block uppercase text-[9px]">
                          {diff > 0.01 ? 'Falta para o total' : diff < -0.01 ? 'Superado' : 'Status'}
                        </span>
                        <span className={`text-sm font-black font-mono ${
                          diff > 0.01 
                            ? 'text-amber-600' 
                            : diff < -0.01 
                              ? 'text-blue-600' 
                              : 'text-emerald-600'
                        }`}>
                          {diff > 0.01 
                            ? `R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                            : diff < -0.01 
                              ? `R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                              : 'Exato! ✅'
                          }
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {Math.abs(
                bankTransactions.filter(tx => selectedTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0) - 
                reconcilingSettlement.payments.pix
              ) >= 0.01 && (
                <div className="bg-amber-50 text-amber-800 p-2.5 rounded-lg text-[10px] font-bold flex items-start gap-1.5 border border-amber-200">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Atenção: O valor selecionado é diferente do valor esperado. Ao confirmar, as transações serão vinculadas, mas o acerto continuará pendente ("Aguardando PIX") até que o valor total seja liquidado.</span>
                </div>
              )}

              <p className="text-xs text-slate-500 font-medium">
                Selecione um ou mais PIX recebidos no extrato bancário para liquidar o valor informado. Transações já vinculadas a este acerto aparecem marcadas.
              </p>

              {/* Search input in modal */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por banco, data (ex: 26/06), nome ou valor..."
                  value={searchPixQuery}
                  onChange={e => setSearchPixQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-blue-400 font-medium"
                />
              </div>

               {/* Statement List to choose from */}
              <div className="max-h-[250px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                {[...bankTransactions]
                  .filter(tx => (!tx.isReconciled || tx.reconciledWithSettlementId === reconcilingSettlement.id) && !tx.isVoided && !tx.isRefund && tx.amount > 0)
                  .filter(tx => {
                    const query = searchPixQuery.toLowerCase().trim();
                    if (!query) return true;

                    const matchesDesc = tx.description.toLowerCase().includes(query);
                    const matchesAmount = tx.amount.toString().includes(query) || 
                                          tx.amount.toFixed(2).includes(query) ||
                                          tx.amount.toFixed(2).replace('.', ',').includes(query);
                    const matchesRef = (tx.documentRef || '').toLowerCase().includes(query);
                    const normalizedInst = (tx.institution || '').toLowerCase();
                    const matchesInst = normalizedInst.includes(query) ||
                                        (normalizedInst.includes('banco do brasil') && query === 'bb') ||
                                        (normalizedInst.includes('caixa') && query === 'cef');
                    const matchesFilename = (tx.importFilename || '').toLowerCase().includes(query);
                    const matchesDate = tx.date.includes(query) || (() => {
                      const [y, m, d] = tx.date.split('-');
                      if (y && m && d) {
                        const brDate = `${d}/${m}/${y}`;
                        const brDateShort = `${d}/${m}`;
                        return brDate.includes(query) || brDateShort.includes(query);
                      }
                      return false;
                    })();

                    return matchesDesc || matchesAmount || matchesRef || matchesInst || matchesFilename || matchesDate;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(tx => {
                    const isChecked = selectedTxIds.includes(tx.id);
                    return (
                      <label 
                        key={tx.id} 
                        className={`p-3 flex items-center justify-between text-xs hover:bg-slate-50 font-medium cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/40 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              setSelectedTxIds(prev => 
                                prev.includes(tx.id) ? prev.filter(id => id !== tx.id) : [...prev, tx.id]
                              );
                            }}
                            className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-slate-900 break-words whitespace-normal text-xs md:text-sm">{tx.description}</p>
                              {tx.institution && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  🏦 {tx.institution}
                                </span>
                              )}
                              {(() => {
                                const matchingRefund = getMatchingRefund(tx);
                                if (matchingRefund) {
                                  return (
                                    <span 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                                      title={`Atenção: Este PIX possui uma devolução de R$ -${matchingRefund.amount.toFixed(2)} pendente no extrato.`}
                                    >
                                      ⚠️ DEVOLUÇÃO DETECTADA (R$ -{matchingRefund.amount.toFixed(2)})
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                              Ref: {tx.documentRef || '-'} | Data: {formatDateStringBR(tx.date)} {tx.reconciledWithSettlementId === reconcilingSettlement.id && (
                                <span className="text-emerald-600 font-extrabold ml-1 uppercase text-[8px] tracking-wider">[Vinculado]</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="font-extrabold text-slate-800 font-mono">R$ {tx.amount.toFixed(2)}</span>
                      </label>
                    );
                  })}
                {bankTransactions.filter(tx => (!tx.isReconciled || tx.reconciledWithSettlementId === reconcilingSettlement.id) && !tx.isVoided && !tx.isRefund && tx.amount > 0).length === 0 && (
                  <div className="p-8 text-center text-slate-400 uppercase tracking-wider text-[10px] font-bold">Nenhuma transação bancária PIX disponível. Importe ou simule um arquivo bancário primeiro.</div>
                )}
                {bankTransactions.filter(tx => (!tx.isReconciled || tx.reconciledWithSettlementId === reconcilingSettlement.id) && !tx.isVoided && !tx.isRefund && tx.amount > 0).length > 0 &&
                 bankTransactions
                  .filter(tx => (!tx.isReconciled || tx.reconciledWithSettlementId === reconcilingSettlement.id) && !tx.isVoided && !tx.isRefund && tx.amount > 0)
                  .filter(tx => {
                    const query = searchPixQuery.toLowerCase().trim();
                    if (!query) return true;

                    const matchesDesc = tx.description.toLowerCase().includes(query);
                    const matchesAmount = tx.amount.toString().includes(query) || 
                                          tx.amount.toFixed(2).includes(query) ||
                                          tx.amount.toFixed(2).replace('.', ',').includes(query);
                    const matchesRef = (tx.documentRef || '').toLowerCase().includes(query);
                    const normalizedInst = (tx.institution || '').toLowerCase();
                    const matchesInst = normalizedInst.includes(query) ||
                                        (normalizedInst.includes('banco do brasil') && query === 'bb') ||
                                        (normalizedInst.includes('caixa') && query === 'cef');
                    const matchesFilename = (tx.importFilename || '').toLowerCase().includes(query);
                    const matchesDate = tx.date.includes(query) || (() => {
                      const [y, m, d] = tx.date.split('-');
                      if (y && m && d) {
                        const brDate = `${d}/${m}/${y}`;
                        const brDateShort = `${d}/${m}`;
                        return brDate.includes(query) || brDateShort.includes(query);
                      }
                      return false;
                    })();

                    return matchesDesc || matchesAmount || matchesRef || matchesInst || matchesFilename || matchesDate;
                  }).length === 0 && (
                    <div className="p-8 text-center text-slate-400 uppercase tracking-wider text-[10px] font-bold">Nenhuma transação corresponde à busca.</div>
                  )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setReconcilingSettlement(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleConfirmReconciliation(selectedTxIds)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
                >
                  Confirmar Conciliação ({selectedTxIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL RECONCILIATION MODAL */}
      {txToManualReconcile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Conciliação Manual Avulsa</h3>
              </div>
              <button onClick={() => setTxToManualReconcile(null)} className="text-indigo-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Informe o motivo da conciliação avulsa para a transação <strong>{txToManualReconcile.description}</strong> no valor de <strong>R$ {txToManualReconcile.amount.toFixed(2)}</strong>. Ela não será vinculada a nenhum acerto.
              </p>
              
              <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Motivo / Observação</label>
                <textarea
                  value={manualReconcileReason}
                  onChange={(e) => setManualReconcileReason(e.target.value)}
                  placeholder="Ex: Recebimento de sucata, acerto antigo, etc..."
                  className="w-full border border-slate-300 p-2 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => setTxToManualReconcile(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (manualReconcileReason.trim() === '') {
                    alert('Informe um motivo para a conciliação manual.');
                    return;
                  }
                  manuallyReconcileBankTransaction(txToManualReconcile.id, manualReconcileReason.trim());
                  setTxToManualReconcile(null);
                  setManualReconcileReason('');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BANK TRANSACTION MODAL */}
      {txToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-rose-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Excluir Transação Bancária</h3>
              </div>
              <button onClick={() => setTxToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Deseja realmente excluir a transação <strong>{txToDelete.description}</strong> no valor de <strong>R$ {txToDelete.amount.toFixed(2)}</strong>?
              </p>
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded border border-rose-200">
                Esta ação é irreversível e a transação não estará mais disponível para conciliação.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  removeBankTransaction(txToDelete.id);
                  setSelectedBankTxIds(prev => prev.filter(id => id !== txToDelete.id));
                  setTxToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INUTILIZAR ENTRADA MODAL */}
      {refundTxToLink && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 animate-fadeIn">
            <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-1.5">
                  <AlertTriangle size={18} />
                  Inutilizar Transação por Devolução
                </h3>
              </div>
              <button 
                onClick={() => {
                  setRefundTxToLink(null);
                  setSelectedEntryTxId('');
                  setSearchInutilizarQuery('');
                }} 
                className="text-amber-100 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Devolução Info */}
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs space-y-1">
                <div className="font-bold text-rose-800 uppercase tracking-wider text-[9px]">Transação de Devolução (Estorno)</div>
                <div className="flex justify-between items-start gap-3">
                  <div className="font-bold text-slate-800 text-xs md:text-sm flex-1 min-w-0 break-all whitespace-normal pr-2 leading-relaxed">{refundTxToLink.description}</div>
                  <span className="font-black text-rose-600 text-xs md:text-sm shrink-0">R$ {refundTxToLink.amount.toFixed(2)}</span>
                </div>
                <div className="text-slate-500 font-semibold uppercase text-[9px] flex gap-2">
                  <span>Data: {formatDateStringBR(refundTxToLink.date)}</span>
                  <span>|</span>
                  <span>Ref: {refundTxToLink.documentRef || 'N/A'}</span>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Selecione a Transação de Entrada correspondente para inutilizar:
                </label>

                {/* Search input for selection area */}
                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchInutilizarQuery}
                    onChange={(e) => setSearchInutilizarQuery(e.target.value)}
                    placeholder="Pesquisar por descrição, valor ou data..."
                    className="block w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-hidden transition"
                  />
                  {searchInutilizarQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchInutilizarQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Entry selection scrollable area */}
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {(() => {
                    const candidates = bankTransactions.filter(tx => !tx.isVoided && !tx.isRefund && tx.amount > 0);
                    
                    const filteredCandidates = candidates.filter(tx => {
                      if (!searchInutilizarQuery.trim()) return true;
                      const query = searchInutilizarQuery.toLowerCase();
                      
                      const matchesDesc = tx.description.toLowerCase().includes(query);
                      const matchesAmount = tx.amount.toFixed(2).includes(query) || tx.amount.toString().includes(query);
                      const matchesDate = formatDateStringBR(tx.date).includes(query) || tx.date.includes(query);
                      
                      return matchesDesc || matchesAmount || matchesDate;
                    });
                    
                    const sortedCandidates = [...filteredCandidates].sort((a, b) => {
                      const diffA = Math.abs(a.amount - Math.abs(refundTxToLink.amount));
                      const diffB = Math.abs(b.amount - Math.abs(refundTxToLink.amount));
                      const isExactA = diffA < 0.01;
                      const isExactB = diffB < 0.01;
                      if (isExactA && !isExactB) return -1;
                      if (!isExactA && isExactB) return 1;
                      return b.date.localeCompare(a.date);
                    });

                    if (sortedCandidates.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          {searchInutilizarQuery ? 'Nenhuma transação correspondente aos filtros' : 'Nenhuma transação de entrada disponível para inutilização.'}
                        </div>
                      );
                    }

                    return sortedCandidates.map(tx => {
                      const isExactValue = Math.abs(tx.amount - Math.abs(refundTxToLink.amount)) < 0.01;
                      const isSelected = selectedEntryTxId === tx.id;
                      
                      const linkedSettlement = tx.isReconciled ? driverSettlements.find(s => s.id === tx.reconciledWithSettlementId) : null;
                      const linkedDriver = linkedSettlement ? registeredDrivers.find(d => d.id === linkedSettlement.driverId) : null;

                      return (
                        <label 
                          key={tx.id} 
                          className={`flex items-start p-3 gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors ${
                            isSelected ? 'bg-blue-50 hover:bg-blue-50' : isExactValue ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="selectedEntryTxId" 
                            checked={isSelected}
                            onChange={() => setSelectedEntryTxId(tx.id)}
                            className="mt-0.5 rounded-full text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-3">
                              <div className="font-bold text-xs text-slate-900 flex-1 break-all whitespace-normal pr-1 leading-relaxed">{tx.description}</div>
                              <span className="font-black text-xs text-emerald-600 shrink-0">R$ {tx.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">
                                {formatDateStringBR(tx.date)}
                              </span>
                              {isExactValue && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ⭐ Valor Idêntico
                                </span>
                              )}
                              {tx.isReconciled && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  ⚠️ Conciliado ({linkedDriver?.name || 'Motorista'})
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Warnings and alerts */}
              {(() => {
                if (!selectedEntryTxId) return null;
                const selectedTx = bankTransactions.find(t => t.id === selectedEntryTxId);
                if (!selectedTx?.isReconciled) return null;
                
                const linkedSettlement = driverSettlements.find(s => s.id === selectedTx.reconciledWithSettlementId);
                const linkedDriver = linkedSettlement ? registeredDrivers.find(d => d.id === linkedSettlement.driverId) : null;

                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs font-semibold space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                      <AlertTriangle size={15} />
                      <span>ATENÇÃO: TRANSAÇÃO CONCILIADA!</span>
                    </div>
                    <p className="normal-case leading-relaxed text-[11px]">
                      A entrada selecionada já está conciliada com o acerto do motorista <strong>{linkedDriver?.name || 'Não identificado'}</strong> (Placa: {linkedSettlement?.plate || 'N/A'}, Data: {linkedSettlement ? formatDateStringBR(linkedSettlement.dateSettlement) : 'N/A'}).
                    </p>
                    <p className="normal-case text-amber-800 leading-relaxed text-[10px]">
                      Ao confirmar, esta transação de entrada será desmarcada do acerto e marcada como <strong>inutilizada</strong>.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => {
                  setRefundTxToLink(null);
                  setSelectedEntryTxId('');
                  setSearchInutilizarQuery('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedEntryTxId}
                onClick={() => {
                  voidBankTransaction(selectedEntryTxId, refundTxToLink.id);
                  setRefundTxToLink(null);
                  setSelectedEntryTxId('');
                  setSearchInutilizarQuery('');
                }}
                className={`px-4 py-2 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer ${
                  selectedEntryTxId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                Inutilizar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE IMPORTED FILE MODAL */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-rose-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Excluir Arquivo do Extrato</h3>
              </div>
              <button onClick={() => setFileToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Deseja realmente excluir o arquivo de extrato <strong>{fileToDelete.name}</strong> e todas as suas transações correspondentes?
              </p>
              <div className="text-xs text-rose-600 font-semibold bg-rose-50 p-3 rounded border border-rose-200 space-y-1.5">
                <p className="font-bold">⚠️ ATENÇÃO:</p>
                <p>• Esta ação removerá todas as transações importadas a partir deste arquivo.</p>
                <p>• Quaisquer transações que já tenham sido vinculadas ou conciliadas a acertos de motoristas serão desvinculadas automaticamente!</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteImportedFile(fileToDelete.id);
                  // Clear selection if some deleted transactions were selected
                  const remainingIds = bankTransactions
                    .filter(tx => tx.importedFileId !== fileToDelete.id)
                    .map(tx => tx.id);
                  setSelectedBankTxIds(prev => prev.filter(id => remainingIds.includes(id)));
                  setFileToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK MANUAL RECONCILIATION MODAL */}
      {showBulkReconcileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Conciliar {selectedBankTxIds.length} Transações</h3>
              </div>
              <button onClick={() => setShowBulkReconcileModal(false)} className="text-indigo-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Informe o motivo da conciliação avulsa em lote para as <strong>{selectedBankTxIds.length} transações selecionadas</strong> que somam <strong>R$ {bankTransactions.filter(tx => selectedBankTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}</strong>. Elas não serão vinculadas a nenhum acerto.
              </p>
              
              <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Motivo / Observação</label>
                <textarea
                  value={bulkManualReconcileReason}
                  onChange={(e) => setBulkManualReconcileReason(e.target.value)}
                  placeholder="Ex: Conciliado via conferência manual de lançamentos, ajuste de saldo..."
                  className="w-full border border-slate-300 p-2 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => setShowBulkReconcileModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (bulkManualReconcileReason.trim() === '') {
                    alert('Informe um motivo para a conciliação manual.');
                    return;
                  }
                  selectedBankTxIds.forEach(id => {
                    manuallyReconcileBankTransaction(id, bulkManualReconcileReason.trim());
                  });
                  setSelectedBankTxIds([]);
                  setShowBulkReconcileModal(false);
                  setBulkManualReconcileReason('');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
              >
                Confirmar Conciliação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE BANK TRANSACTIONS MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-rose-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Excluir {selectedBankTxIds.length} Transações</h3>
              </div>
              <button onClick={() => setShowBulkDeleteModal(false)} className="text-rose-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Deseja realmente excluir as <strong>{selectedBankTxIds.length} transações selecionadas</strong> no valor total de <strong>R$ {bankTransactions.filter(tx => selectedBankTxIds.includes(tx.id)).reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}</strong>?
              </p>
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded border border-rose-200">
                Esta ação é irreversível e estas transações não estarão mais disponíveis para conciliação.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  selectedBankTxIds.forEach(id => {
                    removeBankTransaction(id);
                  });
                  setSelectedBankTxIds([]);
                  setShowBulkDeleteModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer"
              >
                Excluir Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUANTITY MISMATCH WARNING CONFIRMATION MODAL */}
      {showQtyWarningModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <h3 className="text-sm font-bold uppercase tracking-tight">Divergência de Quantidades</h3>
              </div>
              <button onClick={() => setShowQtyWarningModal(false)} className="text-amber-100 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                As quantidades de vendas lançadas no acerto <strong>não coincidem</strong> com as quantidades recomendadas (descarregadas) para este motorista.
              </p>

              {(() => {
                const enteredWaterQty = sales
                  .filter(s => (s.item.toLowerCase().includes('água') || s.item.toLowerCase().includes('agua') || s.item.toLowerCase().includes('bonifica')) && !isDisposableProduct(s.item))
                  .reduce((sum, s) => sum + s.qty, 0);
                const enteredVasilhameQty = sales
                  .filter(s => s.item.toLowerCase().includes('vasilhame') && !s.item.toLowerCase().includes('retorno'))
                  .reduce((sum, s) => sum + s.qty, 0);

                return (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60 divide-y divide-slate-200">
                    <div className="pb-2 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <span>Produto</span>
                      <div className="flex gap-6">
                        <span>Meta/Sugerido</span>
                        <span>Lançado</span>
                      </div>
                    </div>
                    
                    {/* Water comparison */}
                    <div className="py-2.5 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">💧 Água + Bonificação 20L</span>
                      <div className="flex gap-12 font-mono font-bold">
                        <span className="text-slate-500 w-8 text-right">{suggestedWaterQty} un</span>
                        <span className={`w-8 text-right ${enteredWaterQty === suggestedWaterQty ? 'text-emerald-600' : 'text-amber-600 font-extrabold'}`}>
                          {enteredWaterQty} un
                        </span>
                      </div>
                    </div>

                    {/* Vasilhame comparison */}
                    <div className="pt-2.5 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">🪣 Vasilhame + Comodato</span>
                      <div className="flex gap-12 font-mono font-bold">
                        <span className="text-slate-500 w-8 text-right">{currentTargetVasilhameQty} un</span>
                        <span className={`w-8 text-right ${enteredVasilhameQty === currentTargetVasilhameQty ? 'text-emerald-600' : 'text-amber-600 font-extrabold'}`}>
                          {enteredVasilhameQty} un
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-[10px] font-bold flex items-start gap-2 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Atenção: Ao salvar com divergência, as diferenças de estoque podem gerar descontos adicionais na comissão ou faltas registradas. Deseja prosseguir assim mesmo?
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-between gap-2">
              <button
                onClick={() => setShowQtyWarningModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
              >
                Voltar e Ajustar
              </button>
              <button
                onClick={() => {
                  handleSaveSettlement(false, true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase rounded-lg shadow transition-colors cursor-pointer flex items-center gap-1"
              >
                <Check size={12} />
                Prosseguir e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASH ADVANCE MODAL */}
      {cashAdvanceModalOpen && cashAdvanceMovement && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-emerald-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="text-emerald-400" size={18} />
                <h3 className="text-sm font-bold uppercase tracking-tight">Incluir Dinheiro no Caixa do Motorista</h3>
              </div>
              <button 
                onClick={() => {
                  setCashAdvanceModalOpen(false);
                  setCashAdvanceMovement(null);
                  setCashAdvanceValue('');
                  setCashAdvanceReason('');
                }} 
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200/60 text-emerald-900 text-xs space-y-1">
                <div><strong>Motorista:</strong> {cashAdvanceMovement.driver}</div>
                <div><strong>Placa / Veículo:</strong> {cashAdvanceMovement.plate}</div>
                <div><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Valor do Adiantamento (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="text"
                    value={cashAdvanceValue}
                    onChange={(e) => setCashAdvanceValue(e.target.value)}
                    placeholder="0,00"
                    className="w-full border border-slate-300 pl-9 pr-3 py-2 rounded text-sm font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Este valor será entregue em dinheiro ao motorista para despesas ou troco de saída.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Motivo do Repasse</label>
                <input
                  type="text"
                  value={cashAdvanceReason}
                  onChange={(e) => setCashAdvanceReason(e.target.value)}
                  placeholder="Ex: Troco inicial para viagem, adiantamento de viagem"
                  className="w-full border border-slate-300 px-3 py-2 rounded text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {cashAdvanceMovement.cashAdvances && cashAdvanceMovement.cashAdvances.length > 0 && (
                <div className="border-t pt-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Repasses já efetuados nesta viagem:</span>
                  <div className="space-y-1.5">
                    {cashAdvanceMovement.cashAdvances.map((adv: any) => (
                      <div key={adv.id} className="flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded border border-slate-150">
                        <div>
                          <span className="font-semibold text-slate-800">{adv.reason}</span>
                          <span className="text-[9px] text-slate-400 block">{new Date(adv.timestamp).toLocaleTimeString('pt-BR')} - por {adv.operator}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-700 font-mono">R$ {adv.value.toFixed(2)}</strong>
                          <button
                            onClick={() => handlePrintCashAdvance({
                              id: adv.id,
                              movementId: cashAdvanceMovement.id,
                              driverName: cashAdvanceMovement.driver,
                              plate: cashAdvanceMovement.plate,
                              value: adv.value,
                              reason: adv.reason,
                              timestamp: adv.timestamp,
                              operator: adv.operator
                            })}
                            className="text-emerald-600 hover:text-emerald-800 font-semibold underline text-[10px]"
                            title="Imprimir novamente"
                          >
                            Imprimir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button
                onClick={() => {
                  setCashAdvanceModalOpen(false);
                  setCashAdvanceMovement(null);
                  setCashAdvanceValue('');
                  setCashAdvanceReason('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleSaveCashAdvance();
                  // Close the modal after save/print
                  setCashAdvanceModalOpen(false);
                  setCashAdvanceMovement(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded shadow cursor-pointer flex items-center gap-1"
              >
                <Printer size={12} />
                <span>Emitir e Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
