import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export interface CodedExceptionResponse {
  statusCode: number;
  message: string;
  errorCode: ErrorCode;
  timestamp: string;
  path?: string;
}

/**
 * Custom exception class that includes error codes for frontend integration
 */
export class CodedBadRequestException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CodedNotFoundException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class CodedUnauthorizedException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class CodedForbiddenException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class CodedConflictException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class CodedInternalServerErrorException extends HttpException {
  constructor(message: string, errorCode: ErrorCode) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
