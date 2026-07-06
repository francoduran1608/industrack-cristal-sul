import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Printer, X, FileText } from 'lucide-react';

export const PrintSale: React.FC<{ saleNumber: string }> = ({ saleNumber }) => {
  const { movements = [], driverSettlements = [], companyLogo } = useStore();

  // Consolidate sales to find the one we need
  const saleData = React.useMemo(() => {
    let foundSales: any[] = [];
    let driverName = '';
    let plate = '';
    let date = '';
    let tripControlNumber = '';

    // Search in driver settlements
    const ds = driverSettlements.find(d => (d.sales || []).some(s => s.saleNumber === saleNumber));
    if (ds) {
      foundSales = ds.sales.filter(s => s.saleNumber === saleNumber);
      driverName = ds.driverName;
      plate = ds.plate;
      date = foundSales[0]?.timestamp || ds.dateSettlement;
      const parentMovement = movements.find(m => m.id === ds.movementId.replace('settled-', ''));
      tripControlNumber = ds.tripControlNumber || parentMovement?.productionCode || parentMovement?.id || 'S/N';
    } else {
      // Search in active/pending movements
      const m = movements.find(mov => (mov.productionControl?.mobileSales || []).some(s => s.saleNumber === saleNumber));
      if (m && m.productionControl?.mobileSales) {
        foundSales = m.productionControl.mobileSales.filter(s => s.saleNumber === saleNumber);
        driverName = m.driver;
        plate = m.plate;
        date = foundSales[0]?.timestamp || m.exitTimestamp || m.timestamp;
        tripControlNumber = m.productionCode || m.id || 'S/N';
      }
    }

    if (foundSales.length === 0) return null;

    // Group sales (similar to groupSales helper)
    const first = foundSales[0];
    const clientName = first?.clientName || 'Consumidor';
    const signature = foundSales.find(i => i.signature)?.signature;

    const productsMap: Record<string, { itemDisplayName: string; qty: number; unitPrice: number; productType?: string }> = {};
    foundSales.forEach(item => {
      const itemDisplayName = item.item.includes(' - ') ? item.item.split(' - ').slice(1).join(' - ') : item.item;
      const key = itemDisplayName + '_' + (item.productType || '');
      if (!productsMap[key]) {
        productsMap[key] = {
          itemDisplayName,
          qty: 0,
          unitPrice: item.value,
          productType: item.productType
        };
      }
      productsMap[key].qty += item.qty;
    });

    const paymentsMap: Record<string, { method: string; amount: number; note?: string }> = {};
    foundSales.forEach(item => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno');
      if (isZeroVal) return;

      const method = (item.paymentMethod || 'dinheiro').toLowerCase().trim();
      const amount = item.qty * item.value;
      if (!paymentsMap[method]) {
        paymentsMap[method] = {
          method,
          amount: 0,
          note: item.paymentMethodNote
        };
      }
      paymentsMap[method].amount += amount;
    });

    const totalValue = foundSales.reduce((sum, item) => {
      const isZeroVal = item.productType === 'bonificacao' || item.productType === 'comodato' || item.productType === 'retorno' || item.item.toLowerCase().includes('bonifica') || item.item.toLowerCase().includes('comodato') || item.item.toLowerCase().includes('retorno');
      return sum + (isZeroVal ? 0 : item.qty * item.value);
    }, 0);

    return {
      saleNumber,
      clientName,
      signature,
      date,
      driverName,
      plate,
      tripControlNumber,
      products: Object.values(productsMap),
      payments: Object.values(paymentsMap),
      totalValue
    };
  }, [saleNumber, driverSettlements, movements]);

  useEffect(() => {
    if (saleData) {
      // Small delay to ensure render is fully complete and images are loaded
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [saleData]);

  if (!saleData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md max-w-sm w-full">
          <p className="text-red-500 font-bold mb-2 uppercase text-xs tracking-wider">Pedido Não Encontrado</p>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            O pedido de venda número <strong className="font-mono text-slate-800">{saleNumber}</strong> não foi localizado no banco de dados.
          </p>
          <button 
            onClick={() => window.close()} 
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Fechar Aba
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 px-4 print:py-0 print:px-0 flex flex-col items-center font-sans text-slate-800">
      {/* Print Control Bar (hidden in print) */}
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-3 mb-4 shadow-sm flex items-center justify-between gap-4 print:hidden shrink-0">
        <div className="text-left">
          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <FileText size={12} className="text-blue-500" />
            Cupom de Venda
          </p>
          <p className="text-slate-500 text-[9px]">Imprima ou salve como PDF usando o navegador.</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Printer size={12} /> Imprimir
          </button>
          <button
            onClick={() => window.close()}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X size={12} /> Fechar
          </button>
        </div>
      </div>

      {/* Ticket Container */}
      <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-xl shadow-md p-5 print:shadow-none print:border-none print:p-0 font-mono text-[11px] text-black">
        {/* Header */}
        <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3 print:border-black">
          <div className="mb-2">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Logo" 
                className="max-h-12 max-w-[140px] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="font-sans font-black tracking-widest text-[#0c2a5c] text-base uppercase">
                CRISTAL SUL
              </div>
            )}
          </div>
          <h2 className="font-black text-[12px] uppercase tracking-wider">PEDIDO DE VENDA</h2>
          <div className="text-[9px] text-slate-500 mt-0.5 print:text-black">
            {saleData.date.includes('T') ? new Date(saleData.date).toLocaleString('pt-BR') : saleData.date}
          </div>
          <div className="text-[10px] font-bold mt-0.5">PEDIDO Nº: {saleData.saleNumber}</div>
        </div>

        {/* Info */}
        <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-[10px] space-y-0.5 print:border-black">
          <div className="font-black">CLIENTE: <span className="font-bold text-slate-700 uppercase font-sans text-[10px]">{saleData.clientName}</span></div>
          <div>CONDUTOR: <span className="font-medium uppercase">{saleData.driverName}</span></div>
          <div>PLACA: <span className="font-medium uppercase">{saleData.plate}</span></div>
          <div>Nº VIAGEM: <span className="font-medium">{saleData.tripControlNumber}</span></div>
        </div>

        {/* Products */}
        <div className="border-b border-dashed border-slate-300 pb-2 mb-2 print:border-black">
          <div className="text-[9px] text-slate-400 mb-1 uppercase font-bold print:text-black">PRODUTOS COMERCIALIZADOS:</div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-dashed border-slate-200 text-left text-slate-400 font-bold print:text-black print:border-black">
                <th className="pb-1">DESCRIÇÃO</th>
                <th className="pb-1 text-center">QTD</th>
                <th className="pb-1 text-right">UNIT</th>
                <th className="pb-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {saleData.products.map((p, idx) => {
                const isZero = p.productType === 'bonificacao' || p.productType === 'comodato' || p.productType === 'retorno';
                return (
                  <tr key={idx} className="border-b border-dashed border-slate-100 last:border-none print:border-black">
                    <td className="py-1 pr-1">
                      <div className="font-sans text-[10px] font-bold uppercase text-slate-700">{p.itemDisplayName}</div>
                      {p.productType && p.productType !== 'agua' && p.productType !== 'vasilhame' && (
                        <span className="text-[8px] font-sans px-1 bg-slate-100 text-slate-600 rounded font-bold uppercase">{p.productType}</span>
                      )}
                    </td>
                    <td className="py-1 text-center font-bold text-slate-900">{p.qty}</td>
                    <td className="py-1 text-right text-slate-500">
                      {isZero ? 'Grátis' : `R$ ${p.unitPrice.toFixed(2)}`}
                    </td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {isZero ? 'R$ 0,00' : `R$ ${(p.qty * p.unitPrice).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-b border-dashed border-slate-300 pb-2 mb-3 space-y-0.5 text-[10px] print:border-black">
          <div className="flex justify-between font-black text-xs">
            <span>TOTAL:</span>
            <span>R$ {saleData.totalValue.toFixed(2)}</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-1 uppercase print:text-black font-bold">Forma de Pagamento:</div>
          {saleData.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between text-[9px]">
              <span className="uppercase">{p.method}:</span>
              <span>R$ {p.amount.toFixed(2)}</span>
            </div>
          ))}
          {saleData.payments.length === 0 && (
            <div className="text-[9px] text-slate-500 mt-0.5 uppercase print:text-black italic">
              Grátis / Comodato / Devolução
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="text-center pt-2">
          {saleData.signature ? (
            <div className="flex flex-col items-center">
              <img src={saleData.signature} alt="Assinatura" className="max-h-16 object-contain mb-1" />
              <div className="border-t border-slate-400 w-4/5 mx-auto print:border-black"></div>
              <span className="text-[8px] uppercase mt-0.5 text-slate-500">Assinatura do Cliente</span>
            </div>
          ) : (
            <div className="flex flex-col items-center mt-6">
              <div className="border-t border-slate-300 w-4/5 mx-auto print:border-black"></div>
              <span className="text-[8px] uppercase mt-0.5 text-slate-400">Assinatura do Cliente</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
