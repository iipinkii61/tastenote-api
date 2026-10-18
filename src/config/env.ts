export function validateEnv(env: Record<string, unknown>) {
  const databaseUrl = String(env.DATABASE_URL ?? '');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return {
    ...env,
    DATABASE_URL: databaseUrl,
    PORT: port,
    HOST: String(env.HOST ?? '127.0.0.1'),
    CORS_ORIGIN: String(env.CORS_ORIGIN ?? 'http://localhost:3000'),
  };
}
