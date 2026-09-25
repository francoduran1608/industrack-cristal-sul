@echo off
TITLE Inicializador do Servidor e Banco Firebird 5.0
echo ========================================================
echo  INICIANDO SISTEMA DE GESTAO LOGISTICA COM FIREBIRD 5.0
echo ========================================================
echo.

WHERE docker >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo [1/2] Docker detectado no sistema!
    echo [2/2] Subindo Firebird 5.0 e Servidor da Aplicacao via Docker Compose...
    docker-compose up -d --build
    echo.
    echo ========================================================
    echo  SISTEMA PRONTO E RODANDO NO SEU SERVIDOR!
    echo  - Acesso Web / Frontend: http://localhost:3000
    echo  - Visualizacao de Lancamentos Backend: http://localhost:3000/api/firebird/lancamentos
    echo  - Banco Firebird 5.0: localhost:3050 (SYSDBA / masterkey)
    echo ========================================================
    pause
    exit /b
)

echo Docker nao encontrado. Iniciando em modo Node.js nativo...
echo Verifique se o servico do Firebird 5.0 esta rodando na porta 3050.
echo.
npm install
npm run build
npm start
pause
