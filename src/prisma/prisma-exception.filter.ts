import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mappings: Record<string, [number, string]> = {
      P2025: [HttpStatus.NOT_FOUND, 'Record not found'],
      P2002: [HttpStatus.CONFLICT, 'Record already exists'],
      P2003: [HttpStatus.BAD_REQUEST, 'Invalid related record'],
    };
    const [statusCode, message] = mappings[error.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Database request failed',
    ];
    host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>()
      .status(statusCode)
      .json({ statusCode, message });
  }
}
