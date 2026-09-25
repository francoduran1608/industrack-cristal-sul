import { Router } from 'express';
import { requireIntegrationAuth, getIntegrationApiKey } from './auth.js';
import fs from 'fs';
import path from 'path';

export const integrationRouter = Router();

const DB_FILE = path.join(process.cwd(), 'database.json');
const WEBHOOKS_FILE = path.join(process.cwd(), 'data_webhooks.json');

// Helper para ler o banco de dados atual do sistema
function readCurrentState(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler database.json para integração:', err);
  }
  return {};
}

// Helper para obter os webhooks cadastrados
function readWebhooksConfig(): { url?: string; secret?: string; active: boolean } {
  try {
    if (fs.existsSync(WEBHOOKS_FILE)) {
      return JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { active: false };
}

function saveWebhooksConfig(cfg: any) {
  try {
    fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar data_webhooks.json:', e);
  }
}

/**
 * Função utilitária para notificar o outro sistema via Webhook
 */
export async function notifyExternalSystem(event: string, payload: any) {
  const cfg = readWebhooksConfig();
  if (!cfg.active || !cfg.url) return;

  try {
    await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Secret': cfg.secret || ''
      },
      body: JSON.stringify({
        evento: event,
        timestamp: new Date().toISOString(),
        dados: payload
      })
    });
  } catch (err: any) {
    console.warn('Falha ao disparar webhook para o outro sistema:', err.message);
  }
}

// -------------------------------------------------------------
// ROTAS PÚBLICAS / INFORMATIVAS
// -------------------------------------------------------------

/**
 * GET /api/v1/integracao/info
 * Retorna status da API de Integração e versão
 */
integrationRouter.get('/info', (req, res) => {
  res.json({
    sistema: 'API de Integração Logística e Indústria',
    versao: '1.0.0',
    status: 'online',
    autenticacao: 'Header "x-api-key" ou "Authorization: Bearer <chave>"',
    endpoints_disponiveis: [
      { metodo: 'GET', rota: '/api/v1/integracao/carregamentos', descricao: 'Exporta carregamentos, descarregamentos, avarias e tampas' },
      { metodo: 'GET', rota: '/api/v1/integracao/carregamentos/:id', descricao: 'Detalhes completos de um carregamento com avarias discriminadas' },
      { metodo: 'GET', rota: '/api/v1/integracao/estoque', descricao: 'Saldos de estoque de vasilhames e movimentações de estoque' },
      { metodo: 'GET', rota: '/api/v1/integracao/despesas', descricao: 'Despesas de abastecimento de frotas, compras de diesel/arla e acertos' },
      { metodo: 'POST', rota: '/api/v1/integracao/webhooks/config', descricao: 'Configura URL de webhook para recepção instantânea de eventos' }
    ]
  });
});

// A partir daqui, todas as rotas exigem autenticação por chave de API
integrationRouter.use(requireIntegrationAuth);

// -------------------------------------------------------------
// 1. ENDPOINTS DE CARREGAMENTOS E PRODUÇÃO
// -------------------------------------------------------------

/**
 * GET /api/v1/integracao/carregamentos
 * Permite ao outro sistema consultar todas as cargas expedidas e descarregadas
 * Suporta filtros por dataInicial, dataFinal, placa, status e unidade
 */
integrationRouter.get('/carregamentos', (req, res) => {
  try {
    const state = readCurrentState();
    const { dataInicial, dataFinal, placa, status, unidade, limite } = req.query;

    let movements = Array.isArray(state.movements) ? [...state.movements] : [];

    // Filtros
    if (dataInicial) {
      const dIni = new Date(dataInicial as string).getTime();
      movements = movements.filter(m => new Date(m.entryTimestamp || m.timestamp).getTime() >= dIni);
    }
    if (dataFinal) {
      const dFim = new Date(dataFinal as string + 'T23:59:59.999Z').getTime();
      movements = movements.filter(m => new Date(m.entryTimestamp || m.timestamp).getTime() <= dFim);
    }
    if (placa) {
      const pFiltro = (placa as string).toUpperCase().replace(/[^A-Z0-9]/g, '');
      movements = movements.filter(m => (m.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '').includes(pFiltro));
    }
    if (status) {
      movements = movements.filter(m => m.status === status);
    }
    if (unidade) {
      movements = movements.filter(m => m.unit === unidade);
    }

    // Ordenar pelos mais recentes primeiro
    movements.sort((a, b) => new Date(b.entryTimestamp || b.timestamp).getTime() - new Date(a.entryTimestamp || a.timestamp).getTime());

    const maxLimit = limite ? parseInt(limite as string, 10) : 500;
    const paginated = movements.slice(0, maxLimit);

    // Mapear para um formato claro e padronizado para o ERP
    const payload = paginated.map(m => {
      const prod = m.productionControl || {};
      const avariasList = prod.inspections || [];
      
      const avariasTotais = avariasList.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
      const retornoLavar = Number(prod.vasilhamesRetornadosLavagem) || 0;
      const descarregados = Number(prod.vasilhamesDescarregados) || 0;
      const carregados = Number(prod.vasilhamesCarregados) || 0;

      return {
        id: m.id,
        codigo_producao: m.productionCode || `P-${m.plate}`,
        placa: m.plate,
        motorista: m.driver,
        tipo_veiculo: m.vehicleType,
        tipo_proprietario: m.ownerType,
        data_entrada: m.entryTimestamp || m.timestamp,
        data_saida: m.exitTimestamp || null,
        status: m.status,
        etapa_kanban: m.kanbanStage,
        unidade: m.unit || 'matriz',
        operador_entrada: m.createdBy,
        operador_producao: prod.completedBy || null,
        totais: {
          vasilhames_descarregados: descarregados,
          vasilhames_carregados: carregados,
          vasilhames_retornados_lavagem: retornoLavar,
          avarias_totais: avariasTotais,
          tampas_utilizadas: Number(prod.tampasUtilizadas) || 0,
          lacres_utilizados: Number(prod.lacresUtilizados) || 0,
          retirada_vasilhame_carga: Number(prod.retiradaVasilhameCarga) || 0
        },
        producao_concluida: !!prod.isCompleted,
        detalhes_avarias: avariasList.map((av: any) => ({
          tipo: av.type,
          categoria: av.category,
          fase: av.phase || 'descarregamento',
          quantidade: Number(av.quantity) || 0,
          observacao: av.observation || ''
        }))
      };
    });

    res.json({
      sucesso: true,
      total_registros: payload.length,
      filtros_aplicados: { dataInicial, dataFinal, placa, status, unidade },
      dados: payload
    });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao extrair carregamentos: ' + err.message });
  }
});

/**
 * GET /api/v1/integracao/carregamentos/:id
 * Retorna os detalhes específicos de uma carga
 */
integrationRouter.get('/carregamentos/:id', (req, res) => {
  try {
    const state = readCurrentState();
    const id = req.params.id;
    const movement = (state.movements || []).find((m: any) => m.id === id || m.productionCode === id);

    if (!movement) {
      return res.status(404).json({ sucesso: false, erro: 'Carregamento / Movimento não encontrado' });
    }

    const prod = movement.productionControl || {};
    res.json({
      sucesso: true,
      carregamento: {
        id: movement.id,
        codigo_producao: movement.productionCode,
        placa: movement.plate,
        motorista: movement.driver,
        tipo_veiculo: movement.vehicleType,
        tipo_proprietario: movement.ownerType,
        odometro: movement.odometer,
        data_entrada: movement.entryTimestamp || movement.timestamp,
        data_saida: movement.exitTimestamp,
        tempo_permanencia_minutos: movement.entryTimestamp && movement.exitTimestamp 
          ? Math.round((new Date(movement.exitTimestamp).getTime() - new Date(movement.entryTimestamp).getTime()) / 60000)
          : null,
        status: movement.status,
        etapa_kanban: movement.kanbanStage,
        unidade: movement.unit,
        producao: {
          concluida: !!prod.isCompleted,
          operador: prod.completedBy,
          data_conclusao: prod.completedAt,
          vasilhames_descarregados: prod.vasilhamesDescarregados || 0,
          vasilhames_carregados: prod.vasilhamesCarregados || 0,
          vasilhames_retornados_lavagem: prod.vasilhamesRetornadosLavagem || 0,
          tampas_utilizadas: prod.tampasUtilizadas || 0,
          lacres_utilizados: prod.lacresUtilizados || 0,
          retirada_vasilhame_carga: prod.retiradaVasilhameCarga || 0,
          avarias_discriminadas: (prod.inspections || []).map((av: any) => ({
            tipo: av.type,
            categoria: av.category,
            fase: av.phase,
            quantidade: av.quantity,
            observacao: av.observation
          }))
        },
        checklist: movement.checklist || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao buscar carregamento: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. ENDPOINTS DE ESTOQUE E VASILHAMES
// -------------------------------------------------------------

/**
 * GET /api/v1/integracao/estoque
 * Retorna os saldos de estoque atuais e o histórico de conferências/ajustes
 */
integrationRouter.get('/estoque', (req, res) => {
  try {
    const state = readCurrentState();
    
    // Cálculo dos saldos de vasilhames a partir do histórico operacional
    let totalCarregados = 0;
    let totalDescarregados = 0;
    let totalRetornadosLavagem = 0;
    let totalAvarias = 0;
    let totalTampas = 0;
    let totalLacres = 0;

    (state.movements || []).forEach((m: any) => {
      const p = m.productionControl;
      if (p) {
        totalDescarregados += Number(p.vasilhamesDescarregados) || 0;
        totalCarregados += Number(p.vasilhamesCarregados) || 0;
        totalRetornadosLavagem += Number(p.vasilhamesRetornadosLavagem) || 0;
        totalTampas += Number(p.tampasUtilizadas) || 0;
        totalLacres += Number(p.lacresUtilizados) || 0;
        if (Array.isArray(p.inspections)) {
          p.inspections.forEach((av: any) => {
            totalAvarias += Number(av.quantity) || 0;
          });
        }
      }
    });

    res.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      saldos_consolidados: {
        vasilhames_descarregados_acumulado: totalDescarregados,
        vasilhames_carregados_acumulado: totalCarregados,
        vasilhames_retornados_lavagem_acumulado: totalRetornadosLavagem,
        avarias_descartadas_acumulado: totalAvarias,
        tampas_consumidas_acumulado: totalTampas,
        lacres_consumidos_acumulado: totalLacres
      },
      ajustes_estoque: (state.stockAdjustments || []).slice(0, 100),
      requisicoes_estoque: (state.stockRequests || []).slice(0, 100),
      conferencias_sucata: (state.scrapConferences || []).slice(0, 50)
    });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao consolidar estoque: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. ENDPOINTS DE DESPESAS E CUSTOS OPERACIONAIS
// -------------------------------------------------------------

/**
 * GET /api/v1/integracao/despesas
 * Permite ao sistema financeiro/ERP consumir abastecimentos, compras de diesel/arla e acertos
 */
integrationRouter.get('/despesas', (req, res) => {
  try {
    const state = readCurrentState();
    const { dataInicial, dataFinal, tipo } = req.query;

    let abastecimentos = Array.isArray(state.supplyRecords) ? [...state.supplyRecords] : [];
    let comprasDiesel = Array.isArray(state.dieselPurchases) ? [...state.dieselPurchases] : [];
    let comprasArla = Array.isArray(state.arlaPurchases) ? [...state.arlaPurchases] : [];
    let acertosMotoristas = Array.isArray(state.driverSettlements) ? [...state.driverSettlements] : [];

    // Filtros de Data
    if (dataInicial) {
      const dIni = new Date(dataInicial as string).getTime();
      abastecimentos = abastecimentos.filter(a => new Date(a.timestamp || a.date).getTime() >= dIni);
      comprasDiesel = comprasDiesel.filter(c => new Date(c.date || c.timestamp).getTime() >= dIni);
      comprasArla = comprasArla.filter(c => new Date(c.date || c.timestamp).getTime() >= dIni);
      acertosMotoristas = acertosMotoristas.filter(a => new Date(a.date || a.timestamp).getTime() >= dIni);
    }

    if (dataFinal) {
      const dFim = new Date(dataFinal as string + 'T23:59:59.999Z').getTime();
      abastecimentos = abastecimentos.filter(a => new Date(a.timestamp || a.date).getTime() <= dFim);
      comprasDiesel = comprasDiesel.filter(c => new Date(c.date || c.timestamp).getTime() <= dFim);
      comprasArla = comprasArla.filter(c => new Date(c.date || c.timestamp).getTime() <= dFim);
      acertosMotoristas = acertosMotoristas.filter(a => new Date(a.date || a.timestamp).getTime() <= dFim);
    }

    // Calcular Totais Financeiros
    const totalLitrosAbastecidos = abastecimentos.reduce((acc, a) => acc + (Number(a.liters) || 0), 0);
    const totalGastoComprasDiesel = comprasDiesel.reduce((acc, c) => acc + (Number(c.totalValue || (c.liters * c.pricePerLiter)) || 0), 0);
    const totalGastoComprasArla = comprasArla.reduce((acc, c) => acc + (Number(c.totalValue || (c.liters * c.pricePerLiter)) || 0), 0);

    res.json({
      sucesso: true,
      filtros_aplicados: { dataInicial, dataFinal, tipo },
      resumo_financeiro: {
        total_abastecimentos_veiculos: abastecimentos.length,
        total_litros_abastecidos: totalLitrosAbastecidos,
        total_compras_diesel_reais: totalGastoComprasDiesel,
        total_compras_arla_reais: totalGastoComprasArla,
        total_acertos_motoristas: acertosMotoristas.length
      },
      dados: {
        abastecimentos_veiculos: abastecimentos.map(a => ({
          id: a.id,
          data: a.timestamp || a.date,
          placa: a.plate,
          motorista: a.driver,
          combustivel: a.fuelType || 'diesel',
          litros: Number(a.liters) || 0,
          quilometragem_odometro: Number(a.odometer) || 0,
          posto: a.gasStation || 'interno',
          valor_total: Number(a.totalCost) || 0,
          operador: a.operator
        })),
        compras_combustivel_tanque: comprasDiesel.map(d => ({
          id: d.id,
          data: d.date || d.timestamp,
          nota_fiscal: d.invoiceNumber,
          fornecedor: d.supplier,
          litros: Number(d.liters) || 0,
          preco_por_litro: Number(d.pricePerLiter) || 0,
          valor_total: Number(d.totalValue || (d.liters * d.pricePerLiter)) || 0
        })),
        compras_arla_tanque: comprasArla.map(a => ({
          id: a.id,
          data: a.date || a.timestamp,
          nota_fiscal: a.invoiceNumber,
          fornecedor: a.supplier,
          litros: Number(a.liters) || 0,
          valor_total: Number(a.totalValue || (a.liters * a.pricePerLiter)) || 0
        })),
        acertos_viagem_motoristas: acertosMotoristas.map(ac => ({
          id: ac.id,
          data: ac.date || ac.timestamp,
          motorista: ac.driverName,
          placa: ac.plate,
          adiantamento: Number(ac.advanceAmount) || 0,
          despesas_comprovadas: Number(ac.expensesAmount) || 0,
          saldo_final: Number(ac.balanceAmount) || 0,
          status: ac.status
        }))
      }
    });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao extrair despesas: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. CONFIGURAÇÃO DE WEBHOOKS
// -------------------------------------------------------------

/**
 * GET /api/v1/integracao/webhooks/config
 * Consulta a configuração atual do Webhook
 */
integrationRouter.get('/webhooks/config', (req, res) => {
  const cfg = readWebhooksConfig();
  res.json({
    sucesso: true,
    webhook: {
      url: cfg.url || '',
      ativo: !!cfg.active,
      tem_secret: !!cfg.secret
    }
  });
});

/**
 * POST /api/v1/integracao/webhooks/config
 * Atualiza a URL do webhook do outro sistema
 */
integrationRouter.post('/webhooks/config', (req, res) => {
  const { url, secret, active } = req.body;
  
  if (active && !url) {
    return res.status(400).json({ sucesso: false, erro: 'URL de webhook é obrigatória para ativação.' });
  }

  saveWebhooksConfig({
    url: url || '',
    secret: secret || '',
    active: !!active
  });

  res.json({
    sucesso: true,
    mensagem: 'Configuração de Webhook salva com sucesso!',
    configuracao: { url, ativo: !!active }
  });
});

/**
 * POST /api/v1/integracao/webhooks/teste
 * Envia um evento de teste para o webhook configurado
 */
integrationRouter.post('/webhooks/teste', async (req, res) => {
  const cfg = readWebhooksConfig();
  if (!cfg.url) {
    return res.status(400).json({ sucesso: false, erro: 'Nenhuma URL de webhook configurada.' });
  }

  try {
    const response = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'TESTE_CONEXAO',
        'X-Webhook-Secret': cfg.secret || ''
      },
      body: JSON.stringify({
        evento: 'TESTE_CONEXAO',
        mensagem: 'Teste de comunicação da API de Integração Logística e Indústria',
        timestamp: new Date().toISOString()
      })
    });

    res.json({
      sucesso: true,
      mensagem: `Webhook disparado com sucesso! Resposta do receptor: Status ${response.status}`
    });
  } catch (err: any) {
    res.status(502).json({
      sucesso: false,
      erro: 'Falha ao conectar na URL de Webhook: ' + err.message
    });
  }
});
