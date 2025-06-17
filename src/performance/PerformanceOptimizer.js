/**
 * PERFORMANCE OPTIMIZATION MODULE
 * Intelligent throttling and visibility-based processing
 */

export class PerformanceOptimizer {
  constructor(options = {}) {
    this.config = {
      throttleRate: 0.98,           // 98% throttling rate
      performanceBudget: 16,        // 60fps budget in ms
      adaptiveThrottling: true,     // Adjust throttling based on performance
      visibilityOptimization: true, // Only process visible elements
      gpuAcceleration: true,        // Enable hardware acceleration
      memoryOptimization: true,     // Optimize memory usage
      ...options
    };

    this.metrics = {
      processedFrames: 0,
      skippedFrames: 0,
      averageProcessTime: 0,
      totalProcessTime: 0,
      visibilitySkips: 0,
      performanceBudgetExceeded: 0
    };

    this.performanceHistory = [];
    this.adaptiveMultiplier = 1.0;
    this.visibilityMap = new WeakMap();
    
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring and adaptive optimization
   */
  setupPerformanceMonitoring() {
    // Track frame performance
    this.frameMonitor = {
      lastFrameTime: performance.now(),
      frameCount: 0,
      fps: 60
    };

    // Setup intersection observer for visibility optimization
    if (this.config.visibilityOptimization && typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        this.handleVisibilityChange.bind(this),
        {
          threshold: 0.1,
          rootMargin: '50px' // Preload margin for smooth transitions
        }
      );
    }

    // Monitor device performance characteristics
    this.deviceMetrics = this.detectDeviceCapabilities();
  }

  /**
   * Detect device performance capabilities
   */
  detectDeviceCapabilities() {
    const capabilities = {
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      connection: navigator.connection?.effectiveType || '4g',
      pixelRatio: window.devicePixelRatio || 1
    };

    // Adjust throttling based on device capabilities
    if (capabilities.hardwareConcurrency < 4 || capabilities.memory < 4) {
      this.adaptiveMultiplier = 1.5; // More aggressive throttling
    } else if (capabilities.hardwareConcurrency > 8 && capabilities.memory > 8) {
      this.adaptiveMultiplier = 0.7; // Less aggressive throttling
    }

    return capabilities;
  }

  /**
   * Intelligent throttling with adaptive optimization
   */
  shouldProcessFrame() {
    const currentTime = performance.now();
    const frameTime = currentTime - this.frameMonitor.lastFrameTime;
    
    // Update FPS calculation
    this.frameMonitor.frameCount++;
    if (this.frameMonitor.frameCount % 60 === 0) {
      this.frameMonitor.fps = 1000 / (frameTime / 60);
    }

    // Adaptive throttling based on performance
    let effectiveThrottleRate = this.config.throttleRate;
    
    if (this.config.adaptiveThrottling) {
      effectiveThrottleRate = this.calculateAdaptiveThrottling();
    }

    // Check if we should skip this frame
    if (Math.random() > (1 - effectiveThrottleRate)) {
      this.metrics.skippedFrames++;
      return false;
    }

    this.frameMonitor.lastFrameTime = currentTime;
    return true;
  }

  /**
   * Calculate adaptive throttling based on performance history
   */
  calculateAdaptiveThrottling() {
    // Base throttling rate
    let adaptiveRate = this.config.throttleRate;

    // Adjust based on recent performance
    if (this.performanceHistory.length > 10) {
      const recentAverage = this.performanceHistory
        .slice(-10)
        .reduce((sum, time) => sum + time, 0) / 10;

      // If processing is taking too long, increase throttling
      if (recentAverage > this.config.performanceBudget * 0.8) {
        adaptiveRate = Math.min(0.99, adaptiveRate + 0.01);
      }
      // If processing is very fast, decrease throttling slightly
      else if (recentAverage < this.config.performanceBudget * 0.3) {
        adaptiveRate = Math.max(0.90, adaptiveRate - 0.005);
      }
    }

    // Apply device-based multiplier
    return Math.min(0.99, adaptiveRate * this.adaptiveMultiplier);
  }

  /**
   * Process element with performance optimization
   */
  async processElementOptimized(element, operation) {
    // Check throttling first
    if (!this.shouldProcessFrame()) {
      return { skipped: true, reason: 'throttled' };
    }

    // Check element visibility
    if (!this.isElementVisible(element)) {
      this.metrics.visibilitySkips++;
      return { skipped: true, reason: 'not_visible' };
    }

    // Performance budget check
    const startTime = performance.now();
    
    try {
      // Execute operation with GPU acceleration hints
      if (this.config.gpuAcceleration) {
        this.enableGPUAcceleration(element);
      }

      const result = await operation();
      
      const processTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processTime);

      // Check if we exceeded performance budget
      if (processTime > this.config.performanceBudget) {
        this.metrics.performanceBudgetExceeded++;
        this.handlePerformanceBudgetExceeded(processTime);
      }

      return { success: true, processTime, result };
    } catch (error) {
      const processTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processTime);
      throw error;
    }
  }

  /**
   * Enable GPU acceleration for element
   */
  enableGPUAcceleration(element) {
    // Apply GPU acceleration hints
    element.style.transform = element.style.transform || 'translateZ(0)';
    element.style.willChange = 'transform';
    
    // Set up for hardware acceleration
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
  }

  /**
   * Handle visibility changes for elements
   */
  handleVisibilityChange(entries) {
    for (const entry of entries) {
      const element = entry.target;
      const isVisible = entry.isIntersecting;
      
      // Update visibility map
      this.visibilityMap.set(element, {
        visible: isVisible,
        intersectionRatio: entry.intersectionRatio,
        lastUpdate: Date.now()
      });

      // Apply visibility-based optimizations
      this.applyVisibilityOptimizations(element, isVisible);
    }
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    if (!this.config.visibilityOptimization) {
      return true;
    }

    const visibilityData = this.visibilityMap.get(element);
    if (visibilityData) {
      return visibilityData.visible;
    }

    // Fallback visibility check
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /**
   * Apply visibility-based optimizations
   */
  applyVisibilityOptimizations(element, isVisible) {
    if (isVisible) {
      // Element is visible - enable full processing
      element.style.willChange = 'auto';
      element.removeAttribute('data-processing-paused');
    } else {
      // Element is not visible - reduce processing
      element.style.willChange = 'auto';
      element.setAttribute('data-processing-paused', 'true');
    }
  }

  /**
   * Register element for performance optimization
   */
  registerElement(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }

    // Initialize visibility data
    this.visibilityMap.set(element, {
      visible: true, // Assume visible initially
      intersectionRatio: 1.0,
      lastUpdate: Date.now()
    });

    // Apply initial GPU acceleration if enabled
    if (this.config.gpuAcceleration) {
      this.enableGPUAcceleration(element);
    }
  }

  /**
   * Unregister element from performance optimization
   */
  unregisterElement(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }

    this.visibilityMap.delete(element);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(processTime) {
    this.metrics.processedFrames++;
    this.metrics.totalProcessTime += processTime;
    this.metrics.averageProcessTime = 
      this.metrics.totalProcessTime / this.metrics.processedFrames;

    // Keep performance history for adaptive optimization
    this.performanceHistory.push(processTime);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Handle performance budget exceeded
   */
  handlePerformanceBudgetExceeded(processTime) {
    console.warn(`⚠️ Performance budget exceeded: ${processTime.toFixed(2)}ms`);
    
    // Temporarily increase throttling
    if (this.config.adaptiveThrottling) {
      this.adaptiveMultiplier = Math.min(2.0, this.adaptiveMultiplier * 1.1);
    }
  }

  /**
   * Memory optimization utilities
   */
  optimizeMemoryUsage() {
    if (!this.config.memoryOptimization) return;

    // Clean up old performance history
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }

    // Request garbage collection if available
    if (window.gc && this.metrics.processedFrames % 1000 === 0) {
      window.gc();
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics() {
    const throttleEfficiency = this.metrics.skippedFrames / 
      (this.metrics.processedFrames + this.metrics.skippedFrames);

    return {
      processing: {
        processedFrames: this.metrics.processedFrames,
        skippedFrames: this.metrics.skippedFrames,
        averageProcessTime: this.metrics.averageProcessTime,
        budgetExceeded: this.metrics.performanceBudgetExceeded
      },
      throttling: {
        effectiveRate: this.calculateAdaptiveThrottling(),
        efficiency: throttleEfficiency,
        adaptiveMultiplier: this.adaptiveMultiplier
      },
      visibility: {
        visibilitySkips: this.metrics.visibilitySkips,
        trackedElements: this.visibilityMap.size
      },
      device: this.deviceMetrics,
      frame: {
        fps: this.frameMonitor.fps,
        frameCount: this.frameMonitor.frameCount
      }
    };
  }

  /**
   * Cleanup performance optimizer
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.visibilityMap = new WeakMap();
    this.performanceHistory = [];
  }
}

export default PerformanceOptimizer;
