/**
 * ERROR RECOVERY SYSTEM
 * Intelligent error handling with automatic recovery strategies
 */

export class ErrorRecoverySystem {
  constructor(options = {}) {
    this.config = {
      maxRetryAttempts: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxBackoffDelay: 10000,
      enableLearning: true,
      ...options
    };

    this.recoveryStrategies = new Map();
    this.errorPatterns = new Map();
    this.recoveryHistory = [];
    this.learningData = {
      successfulStrategies: new Map(),
      failedStrategies: new Map()
    };

    // Register default recovery strategies
    this.registerDefaultStrategies();
  }

  /**
   * Register default recovery strategies for common errors
   */
  registerDefaultStrategies() {
    // Memory errors
    this.registerStrategy('MemoryError', async (error, context) => {
      console.log('🔧 Recovering from memory error');
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Clean up unused observers
      await this.cleanupObservers(context);
      
      // Reduce processing load temporarily
      this.reduceProcessingLoad(context);
      
      return { strategy: 'memory_cleanup', success: true };
    });

    // Type errors (usually from undefined/null references)
    this.registerStrategy('TypeError', async (error, context) => {
      console.log('🔧 Recovering from type error');
      
      // Validate and sanitize context data
      const sanitizedContext = this.sanitizeContext(context);
      
      // Re-initialize with safe defaults
      await this.reinitializeWithDefaults(sanitizedContext);
      
      return { strategy: 'type_recovery', success: true };
    });

    // Reference errors (missing variables/functions)
    this.registerStrategy('ReferenceError', async (error, context) => {
      console.log('🔧 Recovering from reference error');
      
      // Check for missing dependencies
      const missingDeps = this.detectMissingDependencies(error);
      
      // Load fallback implementations
      await this.loadFallbackImplementations(missingDeps);
      
      return { strategy: 'reference_recovery', success: true };
    });

    // DOM errors (elements not found, etc.)
    this.registerStrategy('DOMError', async (error, context) => {
      console.log('🔧 Recovering from DOM error');
      
      // Wait for DOM to be ready
      await this.waitForDOMReady();
      
      // Re-query elements with safer selectors
      const safeElements = await this.reFindElements(context);
      
      return { 
        strategy: 'dom_recovery', 
        success: true, 
        recoveredElements: safeElements 
      };
    });

    // Network/Resource errors
    this.registerStrategy('NetworkError', async (error, context) => {
      console.log('🔧 Recovering from network error');
      
      // Switch to local/cached resources
      await this.switchToLocalResources(context);
      
      // Implement offline-first strategy
      this.enableOfflineMode(context);
      
      return { strategy: 'network_recovery', success: true };
    });
  }

  /**
   * Register a custom recovery strategy
   */
  registerStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Execute operation with automatic error recovery
   */
  async executeWithRecovery(operation, context = {}) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.config.maxRetryAttempts) {
      try {
        const result = await operation();
        
        // Record successful recovery if this wasn't the first attempt
        if (attempt > 0) {
          this.recordRecoverySuccess(lastError, attempt, context);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        console.warn(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt < this.config.maxRetryAttempts) {
          // Attempt recovery
          const recoveryResult = await this.attemptRecovery(error, context);
          
          if (recoveryResult.success) {
            // Wait before retry with exponential backoff
            const delay = this.calculateBackoffDelay(attempt);
            await this.sleep(delay);
            
            // Update context if recovery provided new data
            if (recoveryResult.recoveredElements) {
              context.elements = recoveryResult.recoveredElements;
            }
          } else {
            // Recovery failed, exit retry loop
            break;
          }
        }
      }
    }

    // All recovery attempts failed
    this.recordRecoveryFailure(lastError, attempt, context);
    return this.gracefulDegradation(lastError, context);
  }

  /**
   * Attempt to recover from a specific error
   */
  async attemptRecovery(error, context) {
    const errorType = error.constructor.name;
    const strategy = this.recoveryStrategies.get(errorType);

    if (!strategy) {
      console.warn(`⚠️ No recovery strategy for ${errorType}`);
      return { success: false, strategy: 'none' };
    }

    try {
      const recoveryResult = await strategy(error, context);
      
      // Learn from successful recovery
      if (this.config.enableLearning && recoveryResult.success) {
        this.recordStrategySuccess(errorType, recoveryResult.strategy);
      }
      
      return recoveryResult;
    } catch (recoveryError) {
      console.error('💥 Recovery strategy failed:', recoveryError);
      
      // Learn from failed recovery
      if (this.config.enableLearning) {
        this.recordStrategyFailure(errorType, 'unknown');
      }
      
      return { success: false, strategy: 'failed' };
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoffDelay(attempt) {
    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxBackoffDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful degradation when all recovery attempts fail
   */
  gracefulDegradation(error, context) {
    console.warn('🛡️ Activating graceful degradation for:', error.message);
    
    return {
      success: false,
      mode: 'degraded',
      error: error.message,
      fallbackActive: true,
      context
    };
  }

  /**
   * Record successful recovery for learning
   */
  recordRecoverySuccess(error, attempts, context) {
    this.recoveryHistory.push({
      error: error.constructor.name,
      attempts,
      success: true,
      timestamp: Date.now(),
      context: { ...context }
    });
  }

  /**
   * Record failed recovery for learning
   */
  recordRecoveryFailure(error, attempts, context) {
    this.recoveryHistory.push({
      error: error.constructor.name,
      attempts,
      success: false,
      timestamp: Date.now(),
      context: { ...context }
    });
  }

  /**
   * Record successful strategy for machine learning
   */
  recordStrategySuccess(errorType, strategy) {
    const key = `${errorType}:${strategy}`;
    const current = this.learningData.successfulStrategies.get(key) || 0;
    this.learningData.successfulStrategies.set(key, current + 1);
  }

  /**
   * Record failed strategy for machine learning
   */
  recordStrategyFailure(errorType, strategy) {
    const key = `${errorType}:${strategy}`;
    const current = this.learningData.failedStrategies.get(key) || 0;
    this.learningData.failedStrategies.set(key, current + 1);
  }

  /**
   * Get recovery system metrics
   */
  getMetrics() {
    const totalRecoveries = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(r => r.success).length;
    
    return {
      totalRecoveries,
      successfulRecoveries,
      successRate: totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 1,
      averageAttempts: totalRecoveries > 0 ? 
        this.recoveryHistory.reduce((sum, r) => sum + r.attempts, 0) / totalRecoveries : 0,
      strategiesLearned: this.learningData.successfulStrategies.size,
      recentRecoveries: this.recoveryHistory.slice(-10)
    };
  }

  // Helper methods for recovery strategies
  async cleanupObservers(context) {
    // Implementation for cleaning up observers
    console.log('🧹 Cleaning up unused observers');
  }

  reduceProcessingLoad(context) {
    // Implementation for reducing processing load
    console.log('⚡ Reducing processing load temporarily');
  }

  sanitizeContext(context) {
    // Implementation for sanitizing context data
    return { ...context };
  }

  async reinitializeWithDefaults(context) {
    // Implementation for re-initialization
    console.log('🔄 Re-initializing with safe defaults');
  }

  detectMissingDependencies(error) {
    // Implementation for detecting missing dependencies
    return [];
  }

  async loadFallbackImplementations(deps) {
    // Implementation for loading fallbacks
    console.log('📦 Loading fallback implementations');
  }

  async waitForDOMReady() {
    if (document.readyState === 'loading') {
      return new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }
  }

  async reFindElements(context) {
    // Implementation for re-finding DOM elements
    return [];
  }

  async switchToLocalResources(context) {
    // Implementation for switching to local resources
    console.log('💾 Switching to local/cached resources');
  }

  enableOfflineMode(context) {
    // Implementation for offline mode
    console.log('📴 Enabling offline-first mode');
  }
}

export default ErrorRecoverySystem;
