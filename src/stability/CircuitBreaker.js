/**
 * CIRCUIT BREAKER PATTERN IMPLEMENTATION
 * Prevents cascade failures and enables automatic recovery
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.config = {
      failureThreshold: 10,      // Number of failures before opening
      recoveryTimeout: 5000,     // Time before attempting recovery
      monitoringWindow: 60000,   // Window for failure tracking
      successThreshold: 3,       // Successes needed to close circuit
      ...options
    };

    this.state = 'CLOSED';       // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failureHistory = [];
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptRecovery()) {
        this.state = 'HALF_OPEN';
        console.log('🟡 Circuit breaker attempting recovery');
      } else {
        return this.executeFallback(fallback);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      return this.executeFallback(fallback);
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
        console.log('🟢 Circuit breaker closed - system recovered');
      }
    }
  }

  /**
   * Handle failed operation
   */
  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.failureHistory.push({
      error: error.message,
      timestamp: Date.now()
    });

    // Clean old failures outside monitoring window
    this.cleanFailureHistory();

    if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  /**
   * Determine if circuit should open
   */
  shouldOpenCircuit() {
    return this.failureCount >= this.config.failureThreshold;
  }

  /**
   * Open the circuit breaker
   */
  openCircuit() {
    this.state = 'OPEN';
    this.successCount = 0;
    console.warn('🔴 Circuit breaker opened');
  }

  /**
   * Check if recovery should be attempted
   */
  shouldAttemptRecovery() {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * Reset circuit breaker to healthy state
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.failureHistory = [];
  }

  /**
   * Execute fallback operation
   */
  async executeFallback(fallback) {
    if (typeof fallback === 'function') {
      return await fallback();
    }
    return fallback;
  }

  /**
   * Clean failure history outside monitoring window
   */
  cleanFailureHistory() {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failureHistory = this.failureHistory.filter(
      failure => failure.timestamp > cutoff
    );
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: this.calculateFailureRate(),
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state === 'CLOSED'
    };
  }

  /**
   * Calculate failure rate within monitoring window
   */
  calculateFailureRate() {
    if (this.failureHistory.length === 0) return 0;
    
    const recentFailures = this.failureHistory.filter(
      failure => Date.now() - failure.timestamp <= this.config.monitoringWindow
    );
    
    return recentFailures.length / this.config.failureThreshold;
  }
}

export default CircuitBreaker;
