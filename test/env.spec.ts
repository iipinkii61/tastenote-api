import { validateEnv } from '../src/config/env';
import { isDateOnly } from '../src/common/date-only.validator';
describe('configuration and date validation', () => {
  it('requires a PostgreSQL URL and valid port', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://localhost/test', PORT: 'bad' }),
    ).toThrow('PORT');
    expect(
      validateEnv({ DATABASE_URL: 'postgresql://localhost/test' }),
    ).toMatchObject({
      PORT: 3001,
      HOST: '127.0.0.1',
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });
  it('accepts leap days only in leap years', () => {
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(isDateOnly('2026-02-29')).toBe(false);
  });
});
