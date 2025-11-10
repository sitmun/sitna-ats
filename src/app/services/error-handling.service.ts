import { Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';

export interface AppError {
  message: string;
  error?: unknown;
  context?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private readonly logger = inject(LoggingService);

  handleError(error: unknown, context?: string): AppError {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    const appError: AppError = {
      message: errorMessage,
      error,
      context,
      timestamp: new Date(),
    };

    this.logger.error(
      `Error${context ? ` in ${context}` : ''}: ${errorMessage}`,
      error
    );

    return appError;
  }

  handlePromiseError(
    error: unknown,
    context?: string
  ): Promise<AppError> {
    const appError = this.handleError(error, context);
    return Promise.resolve(appError);
  }

  createErrorHandler(context?: string): (error: unknown) => void {
    return (error: unknown): void => {
      this.handleError(error, context);
    };
  }
}

