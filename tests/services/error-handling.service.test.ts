import { TestBed } from '@angular/core/testing';
import { ErrorHandlingService, type AppError } from '../../src/app/services/error-handling.service';
import { LoggingService } from '../../src/app/services/logging.service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let loggingService: LoggingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlingService, LoggingService],
    });
    service = TestBed.inject(ErrorHandlingService);
    loggingService = TestBed.inject(LoggingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle Error instances correctly', () => {
      const errorLogSpy = jest.spyOn(loggingService, 'error');
      const testError = new Error('Test error message');
      const context = 'TestContext';

      const result: AppError = service.handleError(testError, context);

      expect(result.message).toBe('Test error message');
      expect(result.error).toBe(testError);
      expect(result.context).toBe(context);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(errorLogSpy).toHaveBeenCalledWith(
        'Error in TestContext: Test error message',
        testError
      );
    });

    it('should handle non-Error instances', () => {
      const errorLogSpy = jest.spyOn(loggingService, 'error');
      const testError = 'String error';

      const result: AppError = service.handleError(testError);

      expect(result.message).toBe('Unknown error occurred');
      expect(result.error).toBe(testError);
      expect(result.context).toBeUndefined();
      expect(errorLogSpy).toHaveBeenCalled();
    });

    it('should handle errors without context', () => {
      const errorLogSpy = jest.spyOn(loggingService, 'error');
      const testError = new Error('Test error');

      const result: AppError = service.handleError(testError);

      expect(result.context).toBeUndefined();
      expect(errorLogSpy).toHaveBeenCalledWith(
        'Error: Test error',
        testError
      );
    });
  });

  describe('handlePromiseError', () => {
    it('should return a resolved promise with AppError', async () => {
      const testError = new Error('Promise error');
      const context = 'PromiseContext';

      const result: AppError = await service.handlePromiseError(testError, context);

      expect(result.message).toBe('Promise error');
      expect(result.error).toBe(testError);
      expect(result.context).toBe(context);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createErrorHandler', () => {
    it('should create a function that handles errors with context', () => {
      const errorHandleSpy = jest.spyOn(service, 'handleError');
      const context = 'CreatedHandler';
      const errorHandler = service.createErrorHandler(context);

      expect(typeof errorHandler).toBe('function');

      const testError = new Error('Handler test error');
      errorHandler(testError);

      expect(errorHandleSpy).toHaveBeenCalledWith(testError, context);
    });

    it('should create a function that handles errors without context', () => {
      const errorHandleSpy = jest.spyOn(service, 'handleError');
      const errorHandler = service.createErrorHandler();

      const testError = new Error('Handler test error');
      errorHandler(testError);

      expect(errorHandleSpy).toHaveBeenCalledWith(testError, undefined);
    });
  });
});

