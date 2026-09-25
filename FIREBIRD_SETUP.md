# Guia de Implantação e Operação: Firebird 5.0 & Backend Node.js

Este projeto conta com suporte completo para banco de dados relacional **Firebird 5.0** com execução de **Stored Procedures internas**, Triggers, Sequences e rotas dedicadas no backend.

---

## 1. Arquivos Criados no Projeto

- **Script DDL e Procedures**: `/database/firebird/schema_firebird_5.0.sql`
  - Tabelas: `TB_USUARIOS`, `TB_VEICULOS`, `TB_MOTORISTAS`, `TB_CLIENTES`, `TB_MOVIMENTOS`, `TB_PRODUCAO_CONTROLE`, `TB_AVARIAS_ITENS`, `TB_ABASTECIMENTOS`, `TB_AUDITORIA_LOGS`.
  - Sequences e Triggers de auto-incremento de ID.
  - Stored Procedures em PSQL do Firebird 5.0:
    - `SP_REGISTRAR_ENTRADA_PORTARIA`
    - `SP_SALVAR_CONTROLE_PRODUCAO` (com lógica industrial de retorno para lavagem e desconto de carga)
    - `SP_ADICIONAR_AVARIA_ITEM`
    - `SP_REGISTRAR_SAIDA_PORTARIA`
    - `SP_RELATORIO_PRODUCAO_PERIODO` (visão otimizada para BI / Mineração de Dados)
- **Configuração e Pool**: `/server/firebird/config.ts`
- **Serviço de Execução**: `/server/firebird/service.ts`
- **Rotas REST da API**: `/server/firebird/routes.ts`

---

## 2. Como Criar o Banco de Dados no Firebird 5.0

### No Linux (Ubuntu/Debian/CentOS)
```bash
# Acessar o utilitário isql do Firebird
isql-fb -u SYSDBA -p masterkey

# Criar o banco de dados com Dialect 3 e UTF8
CREATE DATABASE '/var/lib/firebird/data/SISTEMA_LOGISTICA.FDB'
  USER 'SYSDBA' PASSWORD 'masterkey'
  PAGE_SIZE 16384
  DEFAULT CHARACTER SET UTF8;

# Executar o script DDL com as tabelas e procedures
INPUT '/caminho/do/projeto/database/firebird/schema_firebird_5.0.sql';

# Sair
QUIT;
```

### No Windows (FlameRobin, DBeaver ou IBExpert)
1. Instale o Firebird 5.0 (Server x64).
2. Abra seu gerenciador favorito (DBeaver, FlameRobin ou IBExpert).
3. Conecte ao servidor local `localhost:3050`.
4. Crie a base de dados `C:\Sistemas\Dados\SISTEMA_LOGISTICA.FDB` (Page Size 16384, Charset UTF8).
5. Abra e execute o arquivo `database/firebird/schema_firebird_5.0.sql`.

---

## 3. Configuração do Backend (Variáveis de Ambiente)

No arquivo `.env` da aplicação, configure a conexão com a sua instância do Firebird 5.0:

```env
FIREBIRD_HOST=127.0.0.1
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=/var/lib/firebird/data/SISTEMA_LOGISTICA.FDB
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey
```

Se o banco estiver em outro servidor na rede interna ou nuvem, basta apontar o IP do servidor (ex: `192.168.1.100` ou IP público).

---

## 4. Rotas da API Disponíveis no Backend

O servidor Express disponibiliza as seguintes rotas conectadas diretamente às Stored Procedures:

| Método | Endpoint | Função | Stored Procedure / Consulta |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/firebird/status` | Testa a conectividade com o Firebird 5.0 | `SELECT CURRENT_TIMESTAMP FROM RDB$DATABASE` |
| `GET` | `/api/firebird/lancamentos` | **Visualizar todos os lançamentos** (com filtros de data, placa, status e unidade) | Query com `TB_MOVIMENTOS` + `TB_PRODUCAO_CONTROLE` |
| `GET` | `/api/firebird/lancamentos/:id` | **Visualizar detalhes e avarias de um lançamento** específico | JOIN com `TB_AVARIAS_ITENS` |
| `GET` | `/api/firebird/estatisticas` | **Estatísticas consolidadas** (total descarregado, carregado, retorno lavar, tampas) | Agregações SQL no Firebird |
| `GET` | `/api/firebird/exportar/csv` | **Exporta todos os lançamentos em CSV** para Excel e BI | Exportação tabular UTF-8 |
| `POST` | `/api/firebird/entrada` | Registra entrada de veículo na portaria | `EXECUTE PROCEDURE SP_REGISTRAR_ENTRADA_PORTARIA(...)` |
| `POST` | `/api/firebird/producao` | Registra vistoria, produção e avarias | `EXECUTE PROCEDURE SP_SALVAR_CONTROLE_PRODUCAO(...)` e `SP_ADICIONAR_AVARIA_ITEM(...)` |
| `POST` | `/api/firebird/saida` | Registra saída do veículo e encerra ciclo | `EXECUTE PROCEDURE SP_REGISTRAR_SAIDA_PORTARIA(...)` |
| `GET` | `/api/firebird/relatorio` | Extrai dados analíticos consolidados | `SELECT * FROM SP_RELATORIO_PRODUCAO_PERIODO(...)` |
| `POST` | `/api/firebird/sync` | Sincroniza em lote todos os dados do sistema | Insere/atualiza registros e executa procedures em lote |

---

## 5. Como Visualizar os Lançamentos pelo Backend

### Exemplo 1: Listar Todos os Lançamentos via Terminal ou Script (JSON)
```bash
curl -X GET "http://localhost:3000/api/firebird/lancamentos"
```

### Exemplo 2: Filtrar Lançamentos por Placa ou Período
```bash
curl -X GET "http://localhost:3000/api/firebird/lancamentos?placa=ABC1234&dataInicial=2026-09-01&dataFinal=2026-09-30"
```

### Exemplo 3: Inspecionar um Lançamento Específico com Todas as Avarias e Vistorias
```bash
curl -X GET "http://localhost:3000/api/firebird/lancamentos/1"
```
*Retorna o movimento com a lista completa de avarias individualizadas (`fase`, `tipo`, `categoria`, `quantidade`).*

### Exemplo 4: Baixar CSV Direto para Excel
Basta acessar no seu navegador ou chamar via script:
```
http://seu-servidor:3000/api/firebird/exportar/csv
```

---

## 6. Como Rodar no seu Próprio Servidor (100% Autônomo)

### Opção A: Via Docker Compose (Recomendado - 1 Comando)
O arquivo `docker-compose.yml` já vem configurado para subir tanto o Firebird 5.0 oficial quanto o backend na mesma rede:
```bash
# No Linux ou Windows com Docker:
docker-compose up -d --build
```
Ou dê duplo clique no script:
- **Windows**: `iniciar_servidor.bat`
- **Linux**: `./iniciar_servidor.sh`

### Opção B: Direto na Máquina (Node.js + Firebird Instalado)
```bash
# 1. Configurar o .env com as credenciais do seu Firebird local
cp .env.example .env

# 2. Instalar e compilar
npm install
npm run build

# 3. Iniciar o servidor
npm start
```
Acesse `http://localhost:3000` em qualquer navegador da sua rede local.

---

## 7. Como Conectar Ferramentas de Mineração de Dados (BI / Power BI / Metabase)

Para conectar o Firebird 5.0 em ferramentas analíticas:

1. **Power BI Desktop**:
   - Baixe e instale o **Firebird ODBC Driver** oficial (v3.0+).
   - Configure um DSN no painel ODBC do Windows apontando para o seu banco `.FDB`.
   - No Power BI: *Obter Dados* $\rightarrow$ *ODBC* $\rightarrow$ Selecionar o DSN do Firebird.
   - Você pode consultar diretamente a procedure de relatórios:
     ```sql
     SELECT * FROM SP_RELATORIO_PRODUCAO_PERIODO('2026-01-01', '2026-12-31', 'matriz');
     ```

2. **Python / Pandas (Data Science & Mineração)**:
   ```python
   import fdb
   import pandas as pd

   conn = fdb.connect(
       host='localhost',
       database='/var/lib/firebird/data/SISTEMA_LOGISTICA.FDB',
       user='SYSDBA',
       password='masterkey',
       charset='UTF8'
   )

   query = "SELECT * FROM SP_RELATORIO_PRODUCAO_PERIODO('2026-01-01', '2026-12-31', NULL)"
   df = pd.read_sql(query, conn)
   print(df.head())
   ```
