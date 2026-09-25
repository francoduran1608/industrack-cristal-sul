import Firebird from 'node-firebird';

export interface FirebirdConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  role?: string | null;
  pageSize?: number;
  lowercase_keys?: boolean;
}

export function getFirebirdConfig(): FirebirdConfig {
  return {
    host: process.env.FIREBIRD_HOST || '127.0.0.1',
    port: parseInt(process.env.FIREBIRD_PORT || '3050', 10),
    database: process.env.FIREBIRD_DATABASE || '/var/lib/firebird/data/SISTEMA_LOGISTICA.FDB',
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD || 'masterkey',
    role: null,
    pageSize: 16384,
    lowercase_keys: false
  };
}

let fbPool: any = null;

export function getFirebirdPool(max = 10) {
  if (!fbPool) {
    const config = getFirebirdConfig();
    fbPool = Firebird.pool(max, config);
  }
  return fbPool;
}

/**
 * Executa uma operação segura obtendo uma conexão do pool e liberando-a ao final
 */
export function withFirebirdConnection<T>(
  action: (db: Firebird.Database) => Promise<T>
): Promise<T> {
  const pool = getFirebirdPool();

  return new Promise((resolve, reject) => {
    pool.get((err: any, db: Firebird.Database) => {
      if (err) {
        return reject(new Error(`Falha de conexão com Firebird 5.0 (${getFirebirdConfig().host}:${getFirebirdConfig().port}): ${err.message}`));
      }

      action(db)
        .then((result) => {
          db.detach();
          resolve(result);
        })
        .catch((actionErr) => {
          db.detach();
          reject(actionErr);
        });
    });
  });
}
