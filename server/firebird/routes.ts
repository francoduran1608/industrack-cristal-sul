import { Router } from 'express';
import { FirebirdService } from './service.js';
import { getFirebirdConfig } from './config.js';

export const firebirdRouter = Router();

/**
 * Rota GET /api/firebird/status
 * Verifica a conexão ativa com o banco Firebird 5.0
 */
firebirdRouter.get('/status', async (req, res) => {
  try {
    const health = await FirebirdService.checkHealth();
    res.json({
      online: true,
      config: {
        host: getFirebirdConfig().host,
        port: getFirebirdConfig().port,
        database: getFirebirdConfig().database,
        user: getFirebirdConfig().user
      },
      ...health
    });
  } catch (error: any) {
    res.status(503).json({
      online: false,
      mensagem: 'Não foi possível conectar ao banco de dados Firebird 5.0',
      detalhes: error.message,
      config: {
        host: getFirebirdConfig().host,
        port: getFirebirdConfig().port,
        database: getFirebirdConfig().database
      }
    });
  }
});

/**
 * Rota POST /api/firebird/entrada
 * Dispara a Stored Procedure SP_REGISTRAR_ENTRADA_PORTARIA
 */
firebirdRouter.post('/entrada', async (req, res) => {
  try {
    const resultado = await FirebirdService.registrarEntrada(req.body);
    res.json({ success: true, resultado });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao executar SP_REGISTRAR_ENTRADA_PORTARIA: ' + error.message });
  }
});

/**
 * Rota POST /api/firebird/producao
 * Dispara a Stored Procedure SP_SALVAR_CONTROLE_PRODUCAO e insere avarias
 */
firebirdRouter.post('/producao', async (req, res) => {
  try {
    const resultado = await FirebirdService.salvarProducao(req.body);
    res.json({ success: true, resultado });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao executar SP_SALVAR_CONTROLE_PRODUCAO: ' + error.message });
  }
});

/**
 * Rota POST /api/firebird/saida
 * Dispara a Stored Procedure SP_REGISTRAR_SAIDA_PORTARIA
 */
firebirdRouter.post('/saida', async (req, res) => {
  try {
    const { movimentoId, operadorSaida } = req.body;
    const resultado = await FirebirdService.registrarSaida(Number(movimentoId), operadorSaida || 'Operador Portaria');
    res.json({ success: true, resultado });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao executar SP_REGISTRAR_SAIDA_PORTARIA: ' + error.message });
  }
});

/**
 * Rota GET /api/firebird/relatorio
 * Executa a Stored Procedure SP_RELATORIO_PRODUCAO_PERIODO para BI e mineração de dados
 */
firebirdRouter.get('/relatorio', async (req, res) => {
  try {
    const { dataInicial, dataFinal, unidade } = req.query;
    const dIni = (dataInicial as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const dFim = (dataFinal as string) || new Date().toISOString().split('T')[0];

    const relatorio = await FirebirdService.obterRelatorioBI(dIni, dFim, unidade as string);
    res.json({ success: true, total: (relatorio as any[]).length, registros: relatorio });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao extrair relatório do Firebird: ' + error.message });
  }
});

/**
 * Rota GET /api/firebird/lancamentos
 * Retorna todos os lançamentos com suporte a filtros e ordenação
 */
firebirdRouter.get('/lancamentos', async (req, res) => {
  try {
    const { dataInicial, dataFinal, placa, status, unidade, limite } = req.query;
    const lancamentos = await FirebirdService.obterTodosLancamentos({
      dataInicial: dataInicial as string,
      dataFinal: dataFinal as string,
      placa: placa as string,
      status: status as string,
      unidade: unidade as string,
      limite: limite ? parseInt(limite as string, 10) : 500
    });
    res.json({
      success: true,
      total: (lancamentos as any[]).length,
      dados: lancamentos
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao consultar lançamentos do Firebird: ' + error.message });
  }
});

/**
 * Rota GET /api/firebird/lancamentos/:id
 * Retorna os detalhes completos de um lançamento (com avarias)
 */
firebirdRouter.get('/lancamentos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lancamento = await FirebirdService.obterLancamentoPorId(id);
    if (!lancamento) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }
    res.json({ success: true, dados: lancamento });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar lançamento no Firebird: ' + error.message });
  }
});

/**
 * Rota GET /api/firebird/estatisticas
 * Retorna consolidações operacionais e industriais do Firebird
 */
firebirdRouter.get('/estatisticas', async (req, res) => {
  try {
    const { unidade } = req.query;
    const stats = await FirebirdService.obterEstatisticasGerais(unidade as string);
    res.json({ success: true, estatisticas: stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao obter estatísticas do Firebird: ' + error.message });
  }
});

/**
 * Rota GET /api/firebird/exportar/csv
 * Exporta todos os lançamentos em formato CSV para Excel/BI
 */
firebirdRouter.get('/exportar/csv', async (req, res) => {
  try {
    const { dataInicial, dataFinal, unidade } = req.query;
    const lancamentos: any = await FirebirdService.obterTodosLancamentos({
      dataInicial: dataInicial as string,
      dataFinal: dataFinal as string,
      unidade: unidade as string,
      limite: 5000
    });

    const headers = [
      'ID', 'CODIGO_PRODUCAO', 'DATA_ENTRADA', 'DATA_SAIDA', 'PLACA', 'MOTORISTA',
      'TIPO_PROPRIETARIO', 'TIPO_VEICULO', 'STATUS', 'ETAPA_KANBAN', 'OPERADOR_ENTRADA',
      'OPERADOR_PRODUCAO', 'DESCARREGADO', 'CARREGADO', 'CORPO_ESTRANHO', 'MAL_LAVADO',
      'RETORNADOS_LAVAR', 'TAMPAS', 'LACRES', 'RETIRADA_VASILHAME'
    ];

    const rows = (lancamentos || []).map((l: any) => [
      l.ID,
      `"${l.CODIGO_PRODUCAO || ''}"`,
      `"${l.DATA_ENTRADA ? new Date(l.DATA_ENTRADA).toLocaleString('pt-BR') : ''}"`,
      `"${l.DATA_SAIDA ? new Date(l.DATA_SAIDA).toLocaleString('pt-BR') : ''}"`,
      `"${l.PLACA || ''}"`,
      `"${(l.MOTORISTA || '').replace(/"/g, '""')}"`,
      `"${l.TIPO_PROPRIETARIO || ''}"`,
      `"${l.TIPO_VEICULO || ''}"`,
      `"${l.STATUS_MOVIMENTO || ''}"`,
      `"${l.ETAPA_KANBAN || ''}"`,
      `"${l.OPERADOR_ENTRADA || ''}"`,
      `"${l.OPERADOR_PRODUCAO || ''}"`,
      l.DESCARREGADO_TOTAL || 0,
      l.CARREGADO_TOTAL || 0,
      l.CORPO_ESTRANHO_TOTAL || 0,
      l.MAL_LAVADO_TOTAL || 0,
      l.VASILHAMES_RETORNADOS_LAVAR || 0,
      l.TAMPAS_UTILIZADAS || 0,
      l.LACRES_UTILIZADOS || 0,
      l.RETIRADA_VASILHAME_CARGA || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r: any) => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lancamentos_firebird_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao exportar CSV do Firebird: ' + error.message });
  }
});

/**
 * Rota POST /api/firebird/sync
 * Sincroniza em lote os dados do frontend/Firestore para o Firebird 5.0
 */
firebirdRouter.post('/sync', async (req, res) => {
  try {
    const appState = req.body;
    const resultado = await FirebirdService.sincronizarEstadoCompleto(appState);
    res.json({ success: true, resultado });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro na sincronização com Firebird: ' + error.message });
  }
});
