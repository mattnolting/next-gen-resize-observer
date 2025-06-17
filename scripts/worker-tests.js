#!/usr/bin/env bun
/**
 * WEB WORKER FUNCTIONALITY TESTING SCRIPT
 * 
 * Tests Web Worker capabilities and performance for the resize system
 * Validates worker creation, communication, and optimization potential
 */

import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';

class WorkerTester {
  constructor() {
    this.results = {
      capabilities: {},
      performance: {},
      recommendations: []
    };
    this.workers = [];
  }

  async runTests() {
    console.log('⚙️ Web Worker Testing for Ultra-Stable Resize System\n');
    
    // Test worker capabilities
    await this.testWorkerCapabilities();
    
    // Test worker performance
    await this.testWorkerPerformance();
    
    // Test worker scaling
    await this.testWorkerScaling();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Output results
    this.outputResults();
    
    // Cleanup
    this.cleanup();
  }

  async testWorkerCapabilities() {
    console.log('🔍 Testing Worker Capabilities...');
    
    try {
      // Test basic worker creation
      const testWorker = await this.createTestWorker();
      
      this.results.capabilities = {
        supported: true,
        workerThreads: typeof Worker !== 'undefined',
        hardwareConcurrency: require('os').cpus().length,
        maxRecommendedWorkers: Math.min(require('os').cpus().length, 8),
        features: {
          transferableObjects: true, // Node.js supports transferable objects
          sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
          atomics: typeof Atomics !== 'undefined'
        }
      };
      
      // Test worker communication
      const communicationTest = await this.testWorkerCommunication(testWorker);
      this.results.capabilities.communication = communicationTest;
      
      console.log('   ✅ Worker creation: Supported');
      console.log(`   🖥️  Hardware concurrency: ${this.results.capabilities.hardwareConcurrency} cores`);
      console.log(`   📊 Recommended workers: ${this.results.capabilities.maxRecommendedWorkers}`);
      console.log(`   📡 Communication test: ${communicationTest.success ? 'Passed' : 'Failed'}`);
      
      testWorker.terminate();
      
    } catch (error) {
      console.log('   ❌ Worker support: Not available');
      console.log(`   📝 Error: ${error.message}`);
      
      this.results.capabilities = {
        supported: false,
        error: error.message,
        fallbackMode: 'CPU processing only'
      };
    }
  }

  async createTestWorker() {
    const workerCode = `
      const { parentPort } = require('worker_threads');
      
      // Test worker functionality
      parentPort.on('message', (data) => {
        try {
          const { type, payload } = data;
          
          switch (type) {
            case 'echo':
              parentPort.postMessage({ type: 'echo-response', payload });
              break;
              
            case 'calculate':
              const result = payload.numbers.map(n => Math.sqrt(n * n + 1));
              parentPort.postMessage({ type: 'calculate-response', result });
              break;
              
            case 'simulate-resize':
              const elements = payload.elements.map(el => ({
                ...el,
                area: el.width * el.height,
                aspectRatio: el.width / el.height,
                processed: true
              }));
              parentPort.postMessage({ type: 'resize-response', elements });
              break;
              
            default:
              parentPort.postMessage({ type: 'error', message: 'Unknown command' });
          }
        } catch (error) {
          parentPort.postMessage({ type: 'error', message: error.message });
        }
      });
      
      // Signal ready
      parentPort.postMessage({ type: 'ready' });
    `;

    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(workerCode, { eval: true });
        
        worker.on('message', (message) => {
          if (message.type === 'ready') {
            resolve(worker);
          } else if (message.type === 'error') {
            reject(new Error(message.message));
          }
        });
        
        worker.on('error', reject);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async testWorkerCommunication(worker) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      worker.on('message', (message) => {
        if (message.type === 'echo-response') {
          const endTime = performance.now();
          resolve({
            success: true,
            latency: endTime - startTime,
            data: message.payload
          });
        }
      });
      
      worker.postMessage({
        type: 'echo',
        payload: { test: 'communication-test', timestamp: Date.now() }
      });
      
      // Timeout after 2 seconds
      setTimeout(() => {
        resolve({ success: false, error: 'Communication timeout' });
      }, 2000);
    });
  }

  async testWorkerPerformance() {
    if (!this.results.capabilities.supported) {
      console.log('\n⚠️  Skipping performance tests - Workers not supported');
      return;
    }

    console.log('\n⚡ Testing Worker Performance...');
    
    const testSizes = [100, 500, 1000];
    this.results.performance.tests = [];

    for (const size of testSizes) {
      console.log(`   Testing ${size} elements...`);
      
      // CPU baseline test
      const cpuResult = await this.benchmarkCPUProcessing(size);
      
      // Worker test
      const workerResult = await this.benchmarkWorkerProcessing(size);
      
      const test = {
        elementCount: size,
        cpu: cpuResult,
        worker: workerResult,
        speedup: cpuResult.avgTime / workerResult.avgTime,
        overhead: workerResult.avgTime - cpuResult.avgTime
      };
      
      this.results.performance.tests.push(test);
      
      console.log(`   ✅ CPU: ${cpuResult.avgTime.toFixed(2)}ms, Worker: ${workerResult.avgTime.toFixed(2)}ms, Speedup: ${test.speedup.toFixed(2)}x`);
    }
  }

  async benchmarkCPUProcessing(elementCount) {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const elements = this.generateTestElements(elementCount);
      const startTime = performance.now();
      
      // Process elements on main thread
      const processed = elements.map(el => ({
        ...el,
        area: el.width * el.height,
        aspectRatio: el.width / el.height,
        distance: Math.sqrt(el.x * el.x + el.y * el.y),
        processed: true
      }));
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    return {
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  async benchmarkWorkerProcessing(elementCount) {
    const iterations = 5;
    const times = [];
    
    // Create worker for testing
    const worker = await this.createTestWorker();

    for (let i = 0; i < iterations; i++) {
      const elements = this.generateTestElements(elementCount);
      const startTime = performance.now();
      
      // Process elements in worker
      await new Promise((resolve) => {
        worker.on('message', (message) => {
          if (message.type === 'resize-response') {
            const endTime = performance.now();
            times.push(endTime - startTime);
            resolve();
          }
        });
        
        worker.postMessage({
          type: 'simulate-resize',
          payload: { elements }
        });
      });
    }

    worker.terminate();

    return {
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  async testWorkerScaling() {
    if (!this.results.capabilities.supported) {
      console.log('\n⚠️  Skipping scaling tests - Workers not supported');
      return;
    }

    console.log('\n📈 Testing Worker Scaling...');
    
    const maxWorkers = Math.min(this.results.capabilities.hardwareConcurrency, 8);
    const elementCount = 1000;
    
    this.results.performance.scaling = [];

    for (let workerCount = 1; workerCount <= maxWorkers; workerCount++) {
      console.log(`   Testing with ${workerCount} worker(s)...`);
      
      const result = await this.benchmarkMultiWorkerProcessing(elementCount, workerCount);
      this.results.performance.scaling.push({
        workerCount,
        ...result
      });
      
      console.log(`   ✅ ${workerCount} workers: ${result.avgTime.toFixed(2)}ms`);
    }

    // Find optimal worker count
    const optimal = this.results.performance.scaling.reduce((best, current) => 
      current.avgTime < best.avgTime ? current : best
    );
    
    this.results.performance.optimalWorkerCount = optimal.workerCount;
    console.log(`   🎯 Optimal worker count: ${optimal.workerCount}`);
  }

  async benchmarkMultiWorkerProcessing(elementCount, workerCount) {
    const elements = this.generateTestElements(elementCount);
    const elementsPerWorker = Math.ceil(elements.length / workerCount);
    
    const workers = [];
    const startTime = performance.now();
    
    try {
      // Create workers
      for (let i = 0; i < workerCount; i++) {
        workers.push(await this.createTestWorker());
      }
      
      // Distribute work
      const promises = workers.map((worker, index) => {
        const start = index * elementsPerWorker;
        const end = Math.min(start + elementsPerWorker, elements.length);
        const workerElements = elements.slice(start, end);
        
        return new Promise((resolve) => {
          worker.on('message', (message) => {
            if (message.type === 'resize-response') {
              resolve(message.elements);
            }
          });
          
          worker.postMessage({
            type: 'simulate-resize',
            payload: { elements: workerElements }
          });
        });
      });
      
      // Wait for all workers to complete
      await Promise.all(promises);
      const endTime = performance.now();
      
      return {
        avgTime: endTime - startTime,
        workerOverhead: (endTime - startTime) - (elementCount * 0.1) // Estimated base processing time
      };
      
    } finally {
      // Cleanup workers
      workers.forEach(worker => worker.terminate());
    }
  }

  generateTestElements(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      width: Math.random() * 1000 + 100,
      height: Math.random() * 800 + 50,
      x: Math.random() * 1920,
      y: Math.random() * 1080
    }));
  }

  generateRecommendations() {
    console.log('\n💡 Generating Worker Recommendations...');
    
    if (!this.results.capabilities.supported) {
      this.results.recommendations.push({
        priority: 'High',
        category: 'Fallback',
        recommendation: 'Workers not supported - ensure CPU optimization',
        impact: 'Maintain performance without worker acceleration',
        implementation: 'Focus on caching and throttling optimizations'
      });
      return;
    }

    const perfTests = this.results.performance.tests || [];
    const scaling = this.results.performance.scaling || [];

    // Performance recommendations
    if (perfTests.length > 0) {
      const largestTest = perfTests[perfTests.length - 1];
      
      if (largestTest.speedup > 1.2) {
        this.results.recommendations.push({
          priority: 'High',
          category: 'Performance',
          recommendation: 'Enable Web Workers for significant performance gains',
          impact: `${largestTest.speedup.toFixed(1)}x speedup for large datasets`,
          implementation: 'Set enableWorkers: true in system configuration'
        });
      } else if (largestTest.overhead < 10) {
        this.results.recommendations.push({
          priority: 'Medium',
          category: 'Performance',
          recommendation: 'Workers show minimal overhead - safe to enable',
          impact: 'Future-proof for larger datasets',
          implementation: 'Enable workers with conservative settings'
        });
      }
    }

    // Scaling recommendations
    if (scaling.length > 0 && this.results.performance.optimalWorkerCount) {
      this.results.recommendations.push({
        priority: 'Medium',
        category: 'Scaling',
        recommendation: `Use ${this.results.performance.optimalWorkerCount} workers for optimal performance`,
        impact: 'Best performance-to-overhead ratio',
        implementation: `Set maxWorkers: ${this.results.performance.optimalWorkerCount}`
      });
    }

    // Hardware-specific recommendations
    const cores = this.results.capabilities.hardwareConcurrency;
    if (cores >= 8) {
      this.results.recommendations.push({
        priority: 'Low',
        category: 'Hardware',
        recommendation: 'High-core system detected - excellent for worker parallelization',
        impact: 'Maximum benefit from worker acceleration',
        implementation: 'Use aggressive worker settings for best performance'
      });
    } else if (cores <= 2) {
      this.results.recommendations.push({
        priority: 'Medium',
        category: 'Hardware',
        recommendation: 'Low-core system - use workers carefully',
        impact: 'Prevent worker overhead on limited cores',
        implementation: 'Limit workers to 1-2 maximum'
      });
    }

    // Output recommendations
    this.results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.recommendation}`);
      console.log(`      Impact: ${rec.impact}`);
      console.log(`      Implementation: ${rec.implementation}\n`);
    });
  }

  outputResults() {
    console.log('📄 Saving Worker Test Results...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        runtime: 'Bun',
        version: Bun.version,
        platform: process.platform,
        arch: process.arch,
        cores: require('os').cpus().length
      },
      ...this.results
    };

    // Save detailed results
    Bun.write('worker-test-results.json', JSON.stringify(report, null, 2));
    
    // Create readable report
    const readableReport = this.createReadableReport(report);
    Bun.write('worker-test-report.md', readableReport);
    
    console.log('✅ Worker testing completed!');
    console.log('   📊 Detailed results: worker-test-results.json');
    console.log('   📝 Readable report: worker-test-report.md');
  }

  createReadableReport(report) {
    const supported = report.capabilities.supported;
    
    return `# Web Worker Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Environment:** ${report.environment.runtime} ${report.environment.version}
**Hardware:** ${report.environment.cores} CPU cores

## ⚙️ Worker Capabilities

- **Support Status:** ${supported ? '✅ Supported' : '❌ Not Supported'}
${supported ? `- **Hardware Concurrency:** ${report.capabilities.hardwareConcurrency} cores
- **Recommended Workers:** ${report.capabilities.maxRecommendedWorkers}
- **Communication Latency:** ${report.capabilities.communication?.latency?.toFixed(2) || 'N/A'}ms
- **Transferable Objects:** ${report.capabilities.features?.transferableObjects ? '✅' : '❌'}
- **SharedArrayBuffer:** ${report.capabilities.features?.sharedArrayBuffer ? '✅' : '❌'}` : `
- **Error:** ${report.capabilities.error}
- **Fallback Mode:** ${report.capabilities.fallbackMode}`}

## ⚡ Performance Results

${supported && report.performance.tests ? report.performance.tests.map(test => `
### ${test.elementCount} Elements
- **CPU Processing:** ${test.cpu.avgTime.toFixed(2)}ms (${test.cpu.minTime.toFixed(2)}-${test.cpu.maxTime.toFixed(2)}ms range)
- **Worker Processing:** ${test.worker.avgTime.toFixed(2)}ms (${test.worker.minTime.toFixed(2)}-${test.worker.maxTime.toFixed(2)}ms range)
- **Speedup Factor:** ${test.speedup.toFixed(2)}x
- **Worker Overhead:** ${test.overhead > 0 ? '+' : ''}${test.overhead.toFixed(2)}ms
`).join('') : '⚠️ Performance tests skipped - Workers not supported'}

## 📈 Scaling Analysis

${supported && report.performance.scaling ? `
**Optimal Worker Count:** ${report.performance.optimalWorkerCount || 'Not determined'}

| Workers | Processing Time | Efficiency |
|---------|----------------|------------|
${report.performance.scaling.map(scale => 
  `| ${scale.workerCount} | ${scale.avgTime.toFixed(2)}ms | ${(1 / scale.workerCount * scale.avgTime).toFixed(1)}% |`
).join('\n')}
` : '⚠️ Scaling tests skipped'}

## 💡 Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.recommendation} [${rec.priority} Priority]
- **Category:** ${rec.category}
- **Impact:** ${rec.impact}
- **Implementation:** ${rec.implementation}
`).join('')}

## 🔧 Implementation Guide

### Enabling Web Workers
\`\`\`javascript
const resizeSystem = new UltraStableResizeSystemV2({
  enableWorkers: true,
  workers: {
    maxWorkers: ${report.performance?.optimalWorkerCount || 'auto'},
    poolSize: ${Math.min(report.performance?.optimalWorkerCount || 2, 4)},
    timeoutMs: 5000,
    enableTransferables: true,
    reuseWorkers: true
  }
});
\`\`\`

### Performance Considerations
- **Best for:** Large element counts (500+ elements)
- **Worker overhead:** ~${report.performance?.tests?.[0]?.overhead?.toFixed(1) || '2-5'}ms base cost
- **Optimal threshold:** Use workers when processing time > 20ms

---
*Worker testing completed with Bun runtime for maximum accuracy*
`;
  }

  cleanup() {
    // Terminate any remaining workers
    this.workers.forEach(worker => {
      try {
        worker.terminate();
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    this.workers = [];
  }
}

// Run tests if called directly
if (import.meta.main) {
  const tester = new WorkerTester();
  tester.runTests().catch(console.error);
}

export default WorkerTester;
