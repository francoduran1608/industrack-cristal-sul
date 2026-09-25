import { withFirebirdConnection } from './config.js';

export interface EntradaPortariaParams {
  uuid: string;
  placa: string;
  motorista: string;
  tipoProprietario: 'proprio' | 'terceiro';
  tipoVeiculo: string;
  odometro?: number;
  finalidade?: string;
  ignoraProducao?: boolean;
  unidade?: string;
  operador: string;
  checklistOk?: boolean;
  checklistDetalhes?: any;
}

export interface ProducaoParams {
  movimentoId: number;
  operador: string;
  descarregado: number;
  tampas: number;
  lacres: number;
  retiradaVasilhame: number;
  observacoes?: string;
  avarias?: {
    fase: 'descarregamento' | 'carregamento';
    tipo: string;
    qty: number;
    categoria?: string;
    descontarMotorista?: boolean;
  }[];
}

export class FirebirdService {
  /**
   * Testa a conectividade com o banco Firebird 5.0
   */
  static async checkHealth(): Promise<{ status: string; timestamp: Date; database: string }> {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('SELECT CURRENT_TIMESTAMP AS AGORA FROM RDB$DATABASE', [], (err, result) => {
          if (err) return reject(err);
          resolve({
            status: 'conectado',
            timestamp: result && result[0] ? result[0].AGORA : new Date(),
            database: 'Firebird 5.0'
          });
        });
      });
    });
  }

  /**
   * Executa a Stored Procedure: SP_REGISTRAR_ENTRADA_PORTARIA
   */
  static async registrarEntrada(params: EntradaPortariaParams) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        const sql = `
          EXECUTE PROCEDURE SP_REGISTRAR_ENTRADA_PORTARIA(
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `;
        const queryParams = [
          params.uuid,
          params.placa.toUpperCase(),
          params.motorista,
          params.tipoProprietario || 'proprio',
          params.tipoVeiculo || 'Truck',
          params.odometro || 0,
          params.finalidade || 'producao',
          params.ignoraProducao ? 'S' : 'N',
          params.unidade || 'matriz',
          params.operador,
          params.checklistOk !== false ? 'S' : 'N',
          params.checklistDetalhes ? JSON.stringify(params.checklistDetalhes) : null
        ];

        db.query(sql, queryParams, (err, result) => {
          if (err) return reject(err);
          resolve(result && result[0] ? result[0] : result);
        });
      });
    });
  }

  /**
   * Executa a Stored Procedure: SP_SALVAR_CONTROLE_PRODUCAO
   * e registra os itens de avaria chamando SP_ADICIONAR_AVARIA_ITEM
   */
  static async salvarProducao(params: ProducaoParams) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        // 1. Chamar a procedure de produção
        const sqlProducao = `
          EXECUTE PROCEDURE SP_SALVAR_CONTROLE_PRODUCAO(?, ?, ?, ?, ?, ?, ?)
        `;
        const prodParams = [
          params.movimentoId,
          params.operador,
          params.descarregado || 0,
          params.tampas || 0,
          params.lacres || 0,
          params.retiradaVasilhame || 0,
          params.observacoes || ''
        ];

        db.query(sqlProducao, prodParams, async (err, result) => {
          if (err) return reject(err);

          const resProd = result && result[0] ? result[0] : {};
          const producaoId = resProd.O_PRODUCAO_ID;

          // 2. Se houver avarias detalhadas, limpar antigas e inserir chamando a procedure de avarias
          if (producaoId && params.avarias && params.avarias.length > 0) {
            db.query('DELETE FROM TB_AVARIAS_ITENS WHERE PRODUCAO_CONTROLE_ID = ?', [producaoId], (delErr) => {
              if (delErr) console.warn('Erro ao limpar avarias antigas no Firebird:', delErr.message);

              let pending = params.avarias!.length;
              if (pending === 0) return resolve(resProd);

              for (const av of params.avarias!) {
                const sqlAvaria = `
                  EXECUTE PROCEDURE SP_ADICIONAR_AVARIA_ITEM(?, ?, ?, ?, ?, ?)
                `;
                const avParams = [
                  producaoId,
                  av.fase,
                  av.tipo,
                  av.qty,
                  av.categoria || 'avaria',
                  av.descontarMotorista !== false ? 'S' : 'N'
                ];

                db.query(sqlAvaria, avParams, (avErr) => {
                  if (avErr) console.error('Erro ao adicionar avaria no Firebird:', avErr.message);
                  pending--;
                  if (pending === 0) {
                    resolve(resProd);
                  }
                });
              }
            });
          } else {
            resolve(resProd);
          }
        });
      });
    });
  }

  /**
   * Executa a Stored Procedure: SP_REGISTRAR_SAIDA_PORTARIA
   */
  static async registrarSaida(movimentoId: number, operadorSaida: string) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        const sql = `EXECUTE PROCEDURE SP_REGISTRAR_SAIDA_PORTARIA(?, ?)`;
        db.query(sql, [movimentoId, operadorSaida], (err, result) => {
          if (err) return reject(err);
          resolve(result && result[0] ? result[0] : result);
        });
      });
    });
  }

  /**
   * Executa a Stored Procedure: SP_RELATORIO_PRODUCAO_PERIODO (Para BI e Mineração de Dados)
   */
  static async obterRelatorioBI(dataInicial: string, dataFinal: string, unidade?: string) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT * FROM SP_RELATORIO_PRODUCAO_PERIODO(?, ?, ?)
        `;
        db.query(sql, [dataInicial, dataFinal, unidade || null], (err, result) => {
          if (err) return reject(err);
          resolve(result || []);
        });
      });
    });
  }

  /**
   * Retorna todos os lançamentos registrados no Firebird 5.0 com dados da produção e totais
   */
  static async obterTodosLancamentos(filtros?: {
    dataInicial?: string;
    dataFinal?: string;
    placa?: string;
    status?: string;
    unidade?: string;
    limite?: number;
  }) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        let sql = `
          SELECT FIRST ?
            M.ID,
            M.UUID,
            M.CODIGO_PRODUCAO,
            M.PLACA,
            M.MOTORISTA,
            M.TIPO_PROPRIETARIO,
            M.TIPO_VEICULO,
            M.ODOMETRO,
            M.TIPO_FLUXO,
            M.STATUS_MOVIMENTO,
            M.FINALIDADE,
            M.UNIDADE,
            M.DATA_ENTRADA,
            M.DATA_SAIDA,
            M.OPERADOR_ENTRADA,
            M.OPERADOR_SAIDA,
            M.ETAPA_KANBAN,
            P.ID AS PRODUCAO_ID,
            P.OPERADOR AS OPERADOR_PRODUCAO,
            COALESCE(P.DESCARREGADO_TOTAL, 0) AS DESCARREGADO_TOTAL,
            COALESCE(P.CARREGADO_TOTAL, 0) AS CARREGADO_TOTAL,
            COALESCE(P.CORPO_ESTRANHO_TOTAL, 0) AS CORPO_ESTRANHO_TOTAL,
            COALESCE(P.MAL_LAVADO_TOTAL, 0) AS MAL_LAVADO_TOTAL,
            COALESCE(P.VASILHAMES_RETORNADOS_LAVAR, 0) AS VASILHAMES_RETORNADOS_LAVAR,
            COALESCE(P.TAMPAS_UTILIZADAS, 0) AS TAMPAS_UTILIZADAS,
            COALESCE(P.LACRES_UTILIZADOS, 0) AS LACRES_UTILIZADOS,
            COALESCE(P.RETIRADA_VASILHAME_CARGA, 0) AS RETIRADA_VASILHAME_CARGA,
            P.PRODUCAO_CONCLUIDA
          FROM TB_MOVIMENTOS M
          LEFT JOIN TB_PRODUCAO_CONTROLE P ON P.MOVIMENTO_ID = M.ID
          WHERE 1=1
        `;

        const params: any[] = [filtros?.limite || 500];

        if (filtros?.dataInicial) {
          sql += ` AND M.DATA_ENTRADA >= ?`;
          params.push(filtros.dataInicial);
        }
        if (filtros?.dataFinal) {
          sql += ` AND M.DATA_ENTRADA <= ?`;
          params.push(filtros.dataFinal + ' 23:59:59');
        }
        if (filtros?.placa) {
          sql += ` AND UPPER(M.PLACA) LIKE ?`;
          params.push(`%${filtros.placa.toUpperCase()}%`);
        }
        if (filtros?.status) {
          sql += ` AND M.STATUS_MOVIMENTO = ?`;
          params.push(filtros.status);
        }
        if (filtros?.unidade) {
          sql += ` AND M.UNIDADE = ?`;
          params.push(filtros.unidade);
        }

        sql += ` ORDER BY M.DATA_ENTRADA DESC`;

        db.query(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    });
  }

  /**
   * Obtém os detalhes completos de um lançamento específico, incluindo avarias
   */
  static async obterLancamentoPorId(movimentoId: number) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        const sqlMov = `
          SELECT M.*, P.ID AS PROD_ID, P.DESCARREGADO_TOTAL, P.CARREGADO_TOTAL,
                 P.VASILHAMES_RETORNADOS_LAVAR, P.TAMPAS_UTILIZADAS, P.LACRES_UTILIZADOS,
                 P.OBSERVACOES AS PROD_OBS
          FROM TB_MOVIMENTOS M
          LEFT JOIN TB_PRODUCAO_CONTROLE P ON P.MOVIMENTO_ID = M.ID
          WHERE M.ID = ?
        `;

        db.query(sqlMov, [movimentoId], (err, movRows) => {
          if (err) return reject(err);
          if (!movRows || movRows.length === 0) return resolve(null);

          const mov = movRows[0];
          if (!mov.PROD_ID) {
            return resolve({ ...mov, avarias: [] });
          }

          const sqlAvarias = `
            SELECT * FROM TB_AVARIAS_ITENS WHERE PRODUCAO_CONTROLE_ID = ? ORDER BY FASE, TIPO_AVARIA
          `;
          db.query(sqlAvarias, [mov.PROD_ID], (avErr, avRows) => {
            if (avErr) return reject(avErr);
            resolve({
              ...mov,
              avarias: avRows || []
            });
          });
        });
      });
    });
  }

  /**
   * Retorna estatísticas de consolidação para painel de controle
   */
  static async obterEstatisticasGerais(unidade?: string) {
    return withFirebirdConnection(async (db) => {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT 
            COUNT(M.ID) AS TOTAL_MOVIMENTOS,
            SUM(CASE WHEN M.STATUS_MOVIMENTO = 'na_fila' THEN 1 ELSE 0 END) AS TOTAL_NA_FILA,
            SUM(CASE WHEN M.STATUS_MOVIMENTO = 'em_atendimento' THEN 1 ELSE 0 END) AS TOTAL_EM_ATENDIMENTO,
            SUM(CASE WHEN M.STATUS_MOVIMENTO = 'concluido' OR M.STATUS_MOVIMENTO = 'saida' THEN 1 ELSE 0 END) AS TOTAL_CONCLUIDOS,
            SUM(COALESCE(P.DESCARREGADO_TOTAL, 0)) AS TOTAL_DESCARREGADO,
            SUM(COALESCE(P.CARREGADO_TOTAL, 0)) AS TOTAL_CARREGADO,
            SUM(COALESCE(P.VASILHAMES_RETORNADOS_LAVAR, 0)) AS TOTAL_RETORNADOS_LAVAR,
            SUM(COALESCE(P.TAMPAS_UTILIZADAS, 0)) AS TOTAL_TAMPAS,
            SUM(COALESCE(P.LACRES_UTILIZADOS, 0)) AS TOTAL_LACRES
          FROM TB_MOVIMENTOS M
          LEFT JOIN TB_PRODUCAO_CONTROLE P ON P.MOVIMENTO_ID = M.ID
          WHERE (? IS NULL OR M.UNIDADE = ?)
        `;

        db.query(sql, [unidade || null, unidade || null], (err, rows) => {
          if (err) return reject(err);
          resolve(rows && rows[0] ? rows[0] : {});
        });
      });
    });
  }

  /**
   * Sincronização em massa do estado da aplicação para o Firebird 5.0
   */
  static async sincronizarEstadoCompleto(appState: any) {
    return withFirebirdConnection(async (db) => {
      const movements = appState.movements || [];
      let inseridos = 0;

      for (const m of movements) {
        try {
          // Verificar se já existe pelo UUID
          const checkExists: any = await new Promise((res, rej) => {
            db.query('SELECT ID FROM TB_MOVIMENTOS WHERE UUID = ?', [m.id], (err, r) => {
              if (err) rej(err);
              else res(r && r.length > 0 ? r[0] : null);
            });
          });

          let movId: number;

          if (!checkExists) {
            const insRes: any = await new Promise((res, rej) => {
              const sql = `
                INSERT INTO TB_MOVIMENTOS (
                  UUID, CODIGO_PRODUCAO, PLACA, MOTORISTA, TIPO_PROPRIETARIO, TIPO_VEICULO,
                  ODOMETRO, TIPO_FLUXO, STATUS_MOVIMENTO, FINALIDADE, IGNORA_PRODUCAO,
                  UNIDADE, DATA_ENTRADA, OPERADOR_ENTRADA, CHECKLIST_OK
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING ID
              `;
              db.query(sql, [
                m.id,
                m.productionCode || null,
                (m.plate || '').toUpperCase(),
                m.driver || 'Não Informado',
                m.ownerType || 'proprio',
                m.vehicleType || 'Truck',
                m.odometer || 0,
                m.type || 'entrada',
                m.status || 'na_fila',
                m.purpose || 'producao',
                m.bypassProduction ? 'S' : 'N',
                m.unit || 'matriz',
                m.entryTimestamp || m.timestamp || new Date(),
                m.createdBy || 'Sistema',
                'S'
              ], (err, r) => {
                if (err) rej(err);
                else res(r && r[0] ? r[0].ID : null);
              });
            });
            movId = insRes;
            inseridos++;
          } else {
            movId = checkExists.ID;
          }

          // Se tiver productionControl, registrar
          if (m.productionControl && movId) {
            const pc = m.productionControl;
            const sqlPc = `
              EXECUTE PROCEDURE SP_SALVAR_CONTROLE_PRODUCAO(?, ?, ?, ?, ?, ?, ?)
            `;
            await new Promise((res) => {
              db.query(sqlPc, [
                movId,
                pc.operator || 'Operador',
                pc.vasilhamesDescarregados || 0,
                pc.tampasUtilizadas || 0,
                pc.lacresUtilizados || 0,
                pc.retiradaVasilhameCarga || 0,
                pc.observacoes || ''
              ], () => res(true));
            });
          }
        } catch (itemErr: any) {
          console.warn(`Aviso ao sincronizar movimento ${m.id} no Firebird:`, itemErr.message);
        }
      }

      return {
        sucesso: true,
        totalProcessado: movements.length,
        novosRegistros: inseridos
      };
    });
  }
}
