# Manual da API de Integração para Sistemas Externos (ERP / Fiscal / Estoque)

Este documento fornece as instruções técnicas para que o seu **outro sistema** (ERP, Sistema Fiscal, Contabilidade, Controle de Estoque, TOTVS, SAP, Omie, Bling ou sistema legado) receba os dados gerados pela fábrica e logística.

---

## 1. Visão Geral da Arquitetura

```
[ OUTRO SISTEMA / ERP ]
       ▲
       │ 1. Requisição HTTP GET / JSON
       │    Headers: { "x-api-key": "SUA_CHAVE" }
       │
[ NOSSO BACKEND NO SEU SERVIDOR ]
       │
       ▼ Executa Stored Procedures e lê tabelas
[ BANCO DE DADOS FIREBIRD 5.0 ]
```

- **Protocolo**: HTTP / HTTPS (RESTful)
- **Formato de Dados**: `application/json; charset=utf-8`
- **Autenticação**: Enviar o cabeçalho `x-api-key: <CHAVE>` ou `Authorization: Bearer <CHAVE>`.
- **Chave Padrão (configurável no `.env`)**: `chave_integracao_padrao_logistica_2026`

---

## 2. Endpoints Disponíveis para o Outro Sistema

### A. Carregamentos e Vistorias de Produção
> **Objetivo**: O outro sistema consulta os caminhões expedidos, vasilhames descarregados, carregados, itens retornados para lavar, tampas, lacres e avarias.

- **Método**: `GET`
- **Endpoint**: `/api/v1/integracao/carregamentos`
- **Filtros Opcionais (Query Params)**:
  - `dataInicial`: `YYYY-MM-DD` (ex: `2026-09-01`)
  - `dataFinal`: `YYYY-MM-DD` (ex: `2026-09-30`)
  - `placa`: Placa do veículo (ex: `ABC1234`)
  - `status`: `concluido`, `saida`, `em_atendimento` ou `na_fila`
  - `limite`: Número máximo de registros (padrão: 500)

#### Exemplo de Chamada:
```bash
curl -X GET "http://seu-servidor:3000/api/v1/integracao/carregamentos?dataInicial=2026-09-20&status=saida" \
     -H "x-api-key: chave_integracao_padrao_logistica_2026"
```

#### Exemplo de Resposta (JSON):
```json
{
  "sucesso": true,
  "total_registros": 1,
  "dados": [
    {
      "id": "mov_12345",
      "codigo_producao": "P-2026-00042",
      "placa": "ABC1D23",
      "motorista": "Carlos Eduardo",
      "tipo_veiculo": "Truck",
      "tipo_proprietario": "proprio",
      "data_entrada": "2026-09-22T08:00:00.000Z",
      "data_saida": "2026-09-22T09:40:00.000Z",
      "status": "saida",
      "totais": {
        "vasilhames_descarregados": 600,
        "vasilhames_carregados": 590,
        "vasilhames_retornados_lavagem": 8,
        "avarias_totais": 2,
        "tampas_utilizadas": 590,
        "lacres_utilizados": 590,
        "retirada_vasilhame_carga": 0
      },
      "detalhes_avarias": [
        {
          "tipo": "microfuro",
          "categoria": "troca",
          "fase": "descarregamento",
          "quantidade": 2,
          "observacao": "Furo identificado no bocal"
        }
      ]
    }
  ]
}
```

---

### B. Estoque e Vasilhames
> **Objetivo**: O outro sistema consulta os saldos acumulados de vasilhames cheios, vazios, descartados por quebra/sucata e consumos de tampas e lacres.

- **Método**: `GET`
- **Endpoint**: `/api/v1/integracao/estoque`

#### Exemplo de Chamada:
```bash
curl -X GET "http://seu-servidor:3000/api/v1/integracao/estoque" \
     -H "x-api-key: chave_integracao_padrao_logistica_2026"
```

#### Exemplo de Resposta (JSON):
```json
{
  "sucesso": true,
  "timestamp": "2026-09-22T10:00:00.000Z",
  "saldos_consolidados": {
    "vasilhames_descarregados_acumulado": 15420,
    "vasilhames_carregados_acumulado": 14980,
    "vasilhames_retornados_lavagem_acumulado": 310,
    "avarias_descartadas_acumulado": 130,
    "tampas_consumidas_acumulado": 14980,
    "lacres_consumidos_acumulado": 14980
  },
  "ajustes_estoque": [],
  "conferencias_sucata": []
}
```

---

### C. Despesas e Custos Operacionais
> **Objetivo**: O módulo fiscal/contábil do outro sistema recebe todos os abastecimentos de frota própria, notas de compra de diesel/Arla a granel e adiantamentos/acertos de motoristas.

- **Método**: `GET`
- **Endpoint**: `/api/v1/integracao/despesas`
- **Filtros Opcionais**: `dataInicial` e `dataFinal`

#### Exemplo de Chamada:
```bash
curl -X GET "http://seu-servidor:3000/api/v1/integracao/despesas?dataInicial=2026-09-01" \
     -H "x-api-key: chave_integracao_padrao_logistica_2026"
```

#### Exemplo de Resposta (JSON):
```json
{
  "sucesso": true,
  "resumo_financeiro": {
    "total_abastecimentos_veiculos": 12,
    "total_litros_abastecidos": 1850.5,
    "total_compras_diesel_reais": 28400.00,
    "total_compras_arla_reais": 1650.00,
    "total_acertos_motoristas": 8
  },
  "dados": {
    "abastecimentos_veiculos": [
      {
        "id": "sup_01",
        "data": "2026-09-22T07:30:00.000Z",
        "placa": "XYZ9876",
        "motorista": "Marcos Oliveira",
        "combustivel": "diesel_s10",
        "litros": 120.5,
        "quilometragem_odometro": 285400,
        "posto": "Tanque Interno",
        "valor_total": 723.00,
        "operador": "Portaria 01"
      }
    ],
    "compras_combustivel_tanque": [
      {
        "id": "dp_01",
        "data": "2026-09-18",
        "nota_fiscal": "104928",
        "fornecedor": "Distribuidora Petrobras",
        "litros": 5000,
        "preco_por_litro": 5.68,
        "valor_total": 28400.00
      }
    ]
  }
}
```

---

## 3. Notificação Automática por Webhook (Envio Ativo)

Em vez do outro sistema ficar fazendo requisições frequentes ("polling"), o nosso servidor pode avisar o outro sistema **em tempo real** no exato momento em que uma carga ou despesa for salva.

### Configurar a URL do Webhook do Outro Sistema:
- **Método**: `POST`
- **Endpoint**: `/api/v1/integracao/webhooks/config`
- **Body**:
```json
{
  "url": "https://erp.suaempresa.com.br/api/receber-logistica",
  "secret": "token_secreto_para_assinatura",
  "active": true
}
```

Quando um caminhão finalizar o carregamento ou a saída for liberada, nosso servidor enviará um `POST` com os dados completos para a URL informada.
