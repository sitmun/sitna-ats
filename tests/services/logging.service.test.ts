import { TestBed } from '@angular/core/testing';
import { LoggingService, type LogLevel } from '../../src/app/services/logging.service';

describe('LoggingService', () => {
  let service: LoggingService;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoggingService],
    });
    service = TestBed.inject(LoggingService);

    // Spy on console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('debug', () => {
    it('should not call console.debug in test environment', () => {
      service.debug('Test message', 'param1', 'param2');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should not call console.info in test environment', () => {
      service.info('Test message', 'param1', 'param2');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should not call console.warn in test environment', () => {
      service.warn('Test message', 'param1', 'param2');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should not call console.error in test environment', () => {
      service.error('Test message', 'param1', 'param2');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should call debug method when level is debug', () => {
      const debugSpy = jest.spyOn(service, 'debug');
      service.log('debug' as LogLevel, 'Test message', 'param1');
      expect(debugSpy).toHaveBeenCalledWith('Test message', 'param1');
      debugSpy.mockRestore();
    });

    it('should call info method when level is info', () => {
      const infoSpy = jest.spyOn(service, 'info');
      service.log('info' as LogLevel, 'Test message', 'param1');
      expect(infoSpy).toHaveBeenCalledWith('Test message', 'param1');
      infoSpy.mockRestore();
    });

    it('should call warn method when level is warn', () => {
      const warnSpy = jest.spyOn(service, 'warn');
      service.log('warn' as LogLevel, 'Test message', 'param1');
      expect(warnSpy).toHaveBeenCalledWith('Test message', 'param1');
      warnSpy.mockRestore();
    });

    it('should call error method when level is error', () => {
      const errorSpy = jest.spyOn(service, 'error');
      service.log('error' as LogLevel, 'Test message', 'param1');
      expect(errorSpy).toHaveBeenCalledWith('Test message', 'param1');
      errorSpy.mockRestore();
    });
  });
});

