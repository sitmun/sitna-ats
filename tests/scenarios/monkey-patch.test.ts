import {
  patchFetch,
  patchFunction,
  patchProperty,
  createPatchManager,
  withPatches,
} from '../../src/app/utils/monkey-patch';

describe('Monkey Patch Utilities', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  describe('patchFetch', () => {
    it('should patch window.fetch', () => {
      const mockFetch = jest.fn();
      const patch = patchFetch(mockFetch as typeof fetch);
      expect(window.fetch).toBe(mockFetch);
      patch.restore();
      expect(window.fetch).toBe(originalFetch);
    });
  });

  describe('patchFunction', () => {
    it('should patch a function', () => {
      const obj = {
        testMethod: () => 'original',
      };
      const patch = patchFunction(obj, 'testMethod', () => 'patched');
      expect(obj.testMethod()).toBe('patched');
      patch.restore();
      expect(obj.testMethod()).toBe('original');
    });
  });

  describe('patchProperty', () => {
    it('should patch an object property', () => {
      const obj: any = { prop: 'original' };
      const patch = patchProperty(obj, 'prop', 'patched');
      expect(obj.prop).toBe('patched');
      patch.restore();
      expect(obj.prop).toBe('original');
    });
  });

  describe('createPatchManager', () => {
    it('should manage multiple patches', () => {
      const manager = createPatchManager();
      const obj1 = { prop: 'original1' };
      const obj2 = { prop: 'original2' };
      const patch1 = patchProperty(obj1, 'prop', 'patched1');
      const patch2 = patchProperty(obj2, 'prop', 'patched2');
      manager.add(patch1.restore);
      manager.add(patch2.restore);
      expect(obj1.prop).toBe('patched1');
      expect(obj2.prop).toBe('patched2');
      manager.restoreAll();
      expect(obj1.prop).toBe('original1');
      expect(obj2.prop).toBe('original2');
    });
  });

  describe('withPatches', () => {
    it('should execute code with automatic patch restoration', () => {
      const obj = { prop: 'original' };
      const result = withPatches(
        [() => patchProperty(obj, 'prop', 'patched')],
        () => {
          expect(obj.prop).toBe('patched');
          return 'result';
        }
      );
      expect(result).toBe('result');
      expect(obj.prop).toBe('original');
    });
  });
});

