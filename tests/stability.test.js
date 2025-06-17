/**
 * STABILITY TEST SUITE
 * Comprehensive testing for stability features and error recovery
 */

import { UltraStableResizeSystem } from '../src/core/UltraStableResizeSystem.js';
import { CircuitBreaker } from '../src/stability/CircuitBreaker.js';
import { ErrorRecoverySystem } from '../src/stability/ErrorRecoverySystem.js';

describe('Ultra-Stable Resize System - Stability Tests', () => {
  let resizeSystem;
  let mockElement;

  beforeEach(() => {
    // Setup mock DOM environment
    mockElement = {
      nodeType: 1,
      getBoundingClientRect: () => ({ top: 0, bottom: 100, left: 0, right: 100 }),
      style: {},
      classList: { add: jest.fn(), remove: jest.fn() },
      setAttribute: jest.fn(),
      removeAttribute: jest.fn()
    };

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn()
    }));

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn()
    }));

    resizeSystem = new UltraStableResizeSystem({
      throttleRate: 0.98,
      maxErrors: 5,
      recoveryTimeout: 1000
    });
  });

  afterEach(() => {
    if (resizeSystem) {
      resizeSystem.destroy();
    }
  });

  describe('Initialization Stability', () => {
    test('should initialize successfully with default configuration', async () => {
      const system = new UltraStableResizeSystem();
      expect(system).toBeDefined();
      expect(system.config.throttleRate).toBe(0.98);
      
      const health = system.getSystemHealth();
      expect(health.state.isHealthy).toBe(true);
    });

    test('should handle missing browser APIs gracefully', async () => {
      // Temporarily remove ResizeObserver
      const originalResizeObserver = global.ResizeObserver;
      delete global.ResizeObserver;

      const system = new UltraStableResizeSystem();
      expect(system.capabilities.resizeObserver).toBe(false);
      
      // Should still register elements with fallback
      const result = await system.registerElement(mockElement);
      expect(result.success).toBe(false);
      expect(result.mode).toBe('degraded');

      // Restore ResizeObserver
      global.ResizeObserver = originalResizeObserver;
    });
  });

  describe('Error Recovery', () => {
    test('should recover from TypeError gracefully', async () => {
      const errorRecovery = new ErrorRecoverySystem();
      
      // Mock operation that throws TypeError
      const failingOperation = jest.fn()
        .mockRejectedValueOnce(new TypeError('Cannot read property of undefined'))
        .mockResolvedValueOnce('success');

      const result = await errorRecovery.executeWithRecovery(failingOperation);
      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(2);
    });

    test('should implement exponential backoff for retries', async () => {
      const errorRecovery = new ErrorRecoverySystem({
        retryDelay: 100,
        backoffMultiplier: 2
      });

      const delays = [];
      for (let i = 1; i <= 3; i++) {
        const delay = errorRecovery.calculateBackoffDelay(i);
        delays.push(delay);
      }

      expect(delays).toEqual([100, 200, 400]);
    });

    test('should activate graceful degradation after max retry attempts', async () => {
      const errorRecovery = new ErrorRecoverySystem({
        maxRetryAttempts: 2
      });

      const alwaysFailingOperation = jest.fn()
        .mockRejectedValue(new Error('Persistent failure'));

      const result = await errorRecovery.executeWithRecovery(alwaysFailingOperation);
      
      expect(result.success).toBe(false);
      expect(result.mode).toBe('degraded');
      expect(result.fallbackActive).toBe(true);
      expect(alwaysFailingOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 1000
      });

      const failingOperation = () => Promise.reject(new Error('Failure'));
      const fallback = () => Promise.resolve('fallback');

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failingOperation, fallback);
      }

      expect(circuitBreaker.state).toBe('OPEN');
      
      // Next call should immediately return fallback
      const result = await circuitBreaker.execute(failingOperation, fallback);
      expect(result).toBe('fallback');
    });

    test('should transition to half-open state for recovery', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100
      });

      const failingOperation = () => Promise.reject(new Error('Failure'));
      
      // Open the circuit
      await circuitBreaker.execute(failingOperation);
      await circuitBreaker.execute(failingOperation);
      expect(circuitBreaker.state).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const successfulOperation = () => Promise.resolve('success');
      await circuitBreaker.execute(successfulOperation);
      
      expect(circuitBreaker.state).toBe('HALF_OPEN');
    });

    test('should close circuit after successful recovery', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        successThreshold: 2
      });

      // Open the circuit
      await circuitBreaker.execute(() => Promise.reject(new Error('Failure')));
      await circuitBreaker.execute(() => Promise.reject(new Error('Failure')));
      
      // Wait and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      await circuitBreaker.execute(() => Promise.resolve('success'));
      
      // Successful operations should close the circuit
      await circuitBreaker.execute(() => Promise.resolve('success'));
      
      expect(circuitBreaker.state).toBe('CLOSED');
    });
  });

  describe('Memory Management', () => {
    test('should clean up observers on destroy', () => {
      const mockObserver = { disconnect: jest.fn() };
      resizeSystem.observers.set(mockElement, mockObserver);
      
      resizeSystem.destroy();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(resizeSystem.isDestroyed).toBe(true);
    });

    test('should use WeakMap for automatic cleanup', () => {
      expect(resizeSystem.observers).toBeInstanceOf(WeakMap);
      
      // WeakMap should allow garbage collection of elements
      resizeSystem.observers.set(mockElement, { test: 'data' });
      expect(resizeSystem.observers.has(mockElement)).toBe(true);
    });
  });

  describe('State Management', () => {
    test('should maintain immutable state', () => {
      const originalState = resizeSystem.state;
      
      resizeSystem.updateState({ newProperty: 'test' });
      
      expect(resizeSystem.state).not.toBe(originalState);
      expect(Object.isFrozen(resizeSystem.state)).toBe(true);
    });

    test('should maintain state history for rollback', () => {
      const initialState = resizeSystem.state;
      
      resizeSystem.updateState({ test: 'value1' });
      resizeSystem.updateState({ test: 'value2' });
      
      expect(resizeSystem.stateHistory).toHaveLength(2);
      expect(resizeSystem.stateHistory[0]).toBe(initialState);
    });

    test('should limit state history size', () => {
      // Update state more times than history limit
      for (let i = 0; i < 10; i++) {
        resizeSystem.updateState({ iteration: i });
      }
      
      expect(resizeSystem.stateHistory.length).toBeLessThanOrEqual(
        resizeSystem.config.stateHistorySize
      );
    });
  });

  describe('Performance Monitoring', () => {
    test('should track system health metrics', () => {
      const health = resizeSystem.getSystemHealth();
      
      expect(health).toHaveProperty('stability');
      expect(health).toHaveProperty('performance');
      expect(health).toHaveProperty('state');
      
      expect(health.stability.errorCount).toBe(0);
      expect(health.state.isHealthy).toBe(true);
    });

    test('should format uptime correctly', () => {
      const uptime = 3661000; // 1 hour, 1 minute, 1 second
      const formatted = resizeSystem.formatUptime(uptime);
      
      expect(formatted).toBe('1h 1m 1s');
    });
  });

  describe('Element Registration', () => {
    test('should register element successfully', async () => {
      const result = await resizeSystem.registerElement(mockElement, {
        breakpoints: [768, 1024]
      });
      
      expect(result).toBe(true);
      expect(resizeSystem.state.elements.has(mockElement)).toBe(true);
    });

    test('should handle registration during circuit breaker open state', async () => {
      // Force circuit breaker to open
      resizeSystem.stability.circuitBreakerOpen = true;
      
      const result = await resizeSystem.registerElement(mockElement);
      
      expect(result.success).toBe(false);
      expect(result.mode).toBe('degraded');
    });

    test('should validate element before registration', async () => {
      const invalidElement = null;
      
      await expect(
        resizeSystem.registerElement(invalidElement)
      ).rejects.toThrow('Invalid element provided');
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid element registration', async () => {
      const elements = Array.from({ length: 100 }, (_, i) => ({
        ...mockElement,
        id: `element-${i}`
      }));

      const registrations = elements.map(element => 
        resizeSystem.registerElement(element)
      );

      const results = await Promise.allSettled(registrations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(90); // At least 90% success rate
    });

    test('should maintain stability under error conditions', async () => {
      // Simulate multiple error conditions
      const errors = [
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new Error('Generic error')
      ];

      for (const error of errors) {
        await resizeSystem.handleError(error, { test: 'context' });
      }

      const health = resizeSystem.getSystemHealth();
      expect(health.stability.errorCount).toBe(3);
      expect(health.state.isHealthy).toBe(true); // Should still be healthy
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all stability features correctly', async () => {
      // Register multiple elements
      const elements = Array.from({ length: 10 }, (_, i) => ({
        ...mockElement,
        id: `integration-element-${i}`
      }));

      for (const element of elements) {
        await resizeSystem.registerElement(element);
      }

      // Simulate some errors
      await resizeSystem.handleError(new Error('Test error 1'));
      await resizeSystem.handleError(new Error('Test error 2'));

      // Check system health
      const health = resizeSystem.getSystemHealth();
      
      expect(health.state.elementCount).toBe(10);
      expect(health.stability.errorCount).toBe(2);
      expect(health.state.isHealthy).toBe(true);
      expect(health.stability.successRate).toBeGreaterThan(0.8);
    });
  });
});

// Performance Benchmark Tests
describe('Performance Impact Assessment', () => {
  test('should maintain performance within acceptable thresholds', async () => {
    const startTime = performance.now();
    
    const system = new UltraStableResizeSystem();
    
    // Register 100 elements
    const elements = Array.from({ length: 100 }, (_, i) => ({
      nodeType: 1,
      getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
      style: {},
      classList: { add: jest.fn(), remove: jest.fn() },
      id: `perf-element-${i}`
    }));

    for (const element of elements) {
      await system.registerElement(element);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(totalTime).toBeLessThan(1000); // 1 second for 100 elements
    
    system.destroy();
  });

  test('should demonstrate stability performance trade-off', () => {
    const stabilityConfig = {
      throttleRate: 0.98,
      maxErrors: 10,
      stateHistorySize: 5
    };

    const performanceConfig = {
      throttleRate: 0.90,
      maxErrors: 5,
      stateHistorySize: 2
    };

    const stableSystem = new UltraStableResizeSystem(stabilityConfig);
    const fastSystem = new UltraStableResizeSystem(performanceConfig);

    // Stability-focused system should have more conservative settings
    expect(stableSystem.config.throttleRate).toBeGreaterThan(fastSystem.config.throttleRate);
    expect(stableSystem.config.maxErrors).toBeGreaterThan(fastSystem.config.maxErrors);
    
    stableSystem.destroy();
    fastSystem.destroy();
  });
});
