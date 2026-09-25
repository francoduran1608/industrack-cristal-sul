#!/usr/bin/env bash
set -e

echo "========================================================"
echo " INICIANDO SISTEMA DE GESTAO LOGISTICA COM FIREBIRD 5.0"
echo "========================================================"
echo ""

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "[1/2] Docker & Docker Compose detectados!"
    echo "[2/2] Subindo Firebird 5.0 e Servidor da Aplicacao..."
    docker-compose up -d --build
    echo ""
    echo "========================================================"
    echo " SISTEMA PRONTO E RODANDO NO SEU SERVIDOR!"
    echo " - Acesso Web: http://localhost:3000"
    echo " - Visualizacao de Lancamentos Backend: http://localhost:3000/api/firebird/lancamentos"
    echo " - Banco Firebird 5.0: localhost:3050"
    echo "========================================================"
    exit 0
fi

echo "Docker nao detectado. Iniciando em modo Node.js nativo..."
npm install
npm run build
npm start
