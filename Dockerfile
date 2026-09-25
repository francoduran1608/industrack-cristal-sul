# Dockerfile para Implantação no Servidor Próprio (On-Premise / VPS)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências completas
RUN npm ci

# Copiar todo o código-fonte
COPY . .

# Compilar aplicação para produção
RUN npm run build

# Stage de Produção
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copiar artefatos compilados e arquivos necessários
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/database ./database

# Expor porta da aplicação
EXPOSE 3000

# Iniciar servidor
CMD ["node", "dist/server.cjs"]
