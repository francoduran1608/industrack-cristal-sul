import { Request, Response, NextFunction } from 'express';

export function getIntegrationApiKey(): string {
  return process.env.INTEGRATION_API_KEY || 'chave_integracao_padrao_logistica_2026';
}

/**
 * Middleware para validar chamadas de sistemas externos
 * Suporta headers:
 * - x-api-key: SUA_CHAVE
 * - Authorization: Bearer SUA_CHAVE
 */
export function requireIntegrationAuth(req: Request, res: Response, next: NextFunction) {
  const configuredKey = getIntegrationApiKey();

  const apiKeyHeader = req.headers['x-api-key'] as string;
  const authHeader = req.headers['authorization'];
  let bearerToken = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const providedKey = apiKeyHeader || bearerToken;

  if (!providedKey) {
    return res.status(401).json({
      erro: 'Acesso não autorizado',
      mensagem: 'Chave de integração ausente. Forneça o header "x-api-key" ou "Authorization: Bearer <chave>".'
    });
  }

  if (providedKey !== configuredKey) {
    return res.status(403).json({
      erro: 'Acesso negado',
      mensagem: 'Chave de integração inválida ou expirada.'
    });
  }

  next();
}
