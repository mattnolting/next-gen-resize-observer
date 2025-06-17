#!/usr/bin/env node
/**
 * BUNDLE OPTIMIZATION SCRIPT
 * 
 * Features:
 * - Tree-shaking analysis
 * - Bundle size optimization
 * - Dead code elimination 
 * - Module dependency analysis
 * - Performance recommendations
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

class BundleOptimizer {
  constructor() {
    this.distPath = './dist';
    this.analysis = {
      bundles: [],
      totalSize: 0,
      gzipSize: 0,
      brotliSize: 0,
      treeshakingOpportunities: [],
      recommendations: []
    };
  }

  async optimize() {
    console.log('🚀 Starting bundle optimization analysis...\n');

    // Analyze all bundles
    await this.analyzeBundles();
    
    // Find optimization opportunities
    await this.findOptimizations();
    
    // Generate recommendations
    await this.generateRecommendations();
    
    // Create optimization report
    await this.createReport();
    
    console.log('✅ Bundle optimization complete!\n');
  }

  async analyzeBundles() {
    const files = readdirSync(this.distPath);
    
    for (const file of files) {
      if (extname(file) === '.js') {
        const filePath = join(this.distPath, file);
        const stats = statSync(filePath);
        const content = readFileSync(filePath, 'utf8');
        
        const bundleInfo = {
          name: file,
          size: stats.size,
          gzipSize: gzipSync(content).length,
          brotliSize: brotliCompressSync(content).length,
          lines: content.split('\n').length,
          functions: this.countFunctions(content),
          exports: this.countExports(content),
          imports: this.countImports(content),
          deadCode: this.detectDeadCode(content),
          treeshakeable: this.isTreeshakeable(content)
        };
        
        this.analysis.bundles.push(bundleInfo);
        this.analysis.totalSize += bundleInfo.size;
        this.analysis.gzipSize += bundleInfo.gzipSize;
        this.analysis.brotliSize += bundleInfo.brotliSize;
        
        console.log(`📦 ${file}: ${this.formatBytes(bundleInfo.size)} (gzip: ${this.formatBytes(bundleInfo.gzipSize)})`);
      }
    }
  }

  countFunctions(content) {
    const functionRegex = /(function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|class\s+\w+)/g;
    return (content.match(functionRegex) || []).length;
  }

  countExports(content) {
    const exportRegex = /export\s+(?:default\s+|{[^}]*}|const\s+|function\s+|class\s+)/g;
    return (content.match(exportRegex) || []).length;
  }

  countImports(content) {
    const importRegex = /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"][^'"]+['"]/g;
    return (content.match(importRegex) || []).length;
  }

  detectDeadCode(content) {
    const deadCodePatterns = [
      /\/\*\s*@__PURE__\s*\*\/\s*function\s+\w+[^}]*}/g,
      /console\.log\([^)]*\);?/g,
      /debugger;?/g,
      /\/\*[\s\S]*?\*\//g,
      /\/\/.*$/gm
    ];
    
    let deadCodeSize = 0;
    for (const pattern of deadCodePatterns) {
      const matches = content.match(pattern) || [];
      deadCodeSize += matches.join('').length;
    }
    
    return deadCodeSize;
  }

  isTreeshakeable(content) {
    // Check for tree-shaking friendly patterns
    const hasNamedExports = /export\s+{[^}]+}/.test(content);
    const hasESModules = /import\s+/.test(content);
    const noSideEffects = !/window\.|global\.|self\./.test(content);
    
    return hasNamedExports && hasESModules && noSideEffects;
  }

  async findOptimizations() {
    console.log('\n🔍 Finding optimization opportunities...\n');
    
    for (const bundle of this.analysis.bundles) {
      // Large bundle size opportunities
      if (bundle.size > 20000) {
        this.analysis.treeshakingOpportunities.push({
          file: bundle.name,
          type: 'size',
          description: `Large bundle size (${this.formatBytes(bundle.size)}) - consider splitting`,
          savings: Math.floor(bundle.size * 0.3)
        });
      }
      
      // Dead code opportunities
      if (bundle.deadCode > 1000) {
        this.analysis.treeshakingOpportunities.push({
          file: bundle.name,
          type: 'deadcode',
          description: `Dead code detected (${this.formatBytes(bundle.deadCode)})`,
          savings: bundle.deadCode
        });
      }
      
      // Tree-shaking opportunities
      if (!bundle.treeshakeable) {
        this.analysis.treeshakingOpportunities.push({
          file: bundle.name,
          type: 'treeshaking',
          description: 'Bundle is not tree-shakeable - refactor to ES modules',
          savings: Math.floor(bundle.size * 0.2)
        });
      }
      
      // Compression opportunities
      const compressionRatio = bundle.gzipSize / bundle.size;
      if (compressionRatio > 0.4) {
        this.analysis.treeshakingOpportunities.push({
          file: bundle.name,
          type: 'compression',
          description: `Poor compression ratio (${Math.round(compressionRatio * 100)}%) - code may benefit from minification`,
          savings: Math.floor(bundle.size * 0.1)
        });
      }
    }
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...\n');
    
    const totalSavings = this.analysis.treeshakingOpportunities
      .reduce((sum, opp) => sum + opp.savings, 0);
    
    // Bundle splitting recommendations
    const largeBundles = this.analysis.bundles.filter(b => b.size > 15000);
    if (largeBundles.length > 0) {
      this.analysis.recommendations.push({
        type: 'splitting',
        priority: 'high',
        description: 'Consider splitting large bundles for better loading performance',
        impact: 'Faster initial load, better caching',
        files: largeBundles.map(b => b.name)
      });
    }
    
    // Tree-shaking recommendations
    const nonTreeshakeable = this.analysis.bundles.filter(b => !b.treeshakeable);
    if (nonTreeshakeable.length > 0) {
      this.analysis.recommendations.push({
        type: 'treeshaking',
        priority: 'medium',
        description: 'Improve tree-shaking by using ES modules and named exports',
        impact: 'Smaller bundle sizes, better dead code elimination',
        files: nonTreeshakeable.map(b => b.name)
      });
    }
    
    // Compression recommendations
    if (this.analysis.gzipSize / this.analysis.totalSize > 0.35) {
      this.analysis.recommendations.push({
        type: 'compression',
        priority: 'low', 
        description: 'Enable Brotli compression for additional 10-15% size reduction',
        impact: 'Smaller transfer sizes, faster loading'
      });
    }
    
    // Dynamic import recommendations
    if (this.analysis.totalSize > 50000) {
      this.analysis.recommendations.push({
        type: 'dynamic-imports',
        priority: 'high',
        description: 'Use dynamic imports for optional features (GPU, Workers)',
        impact: 'Reduced initial bundle size, faster startup',
        example: 'import("./gpu/processor.js").then(module => ...)'
      });
    }
    
    console.log(`📊 Total potential savings: ${this.formatBytes(totalSavings)}\n`);
  }

  async createReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBundles: this.analysis.bundles.length,
        totalSize: this.analysis.totalSize,
        gzipSize: this.analysis.gzipSize,
        brotliSize: this.analysis.brotliSize,
        compressionRatio: Math.round((this.analysis.gzipSize / this.analysis.totalSize) * 100),
        brotliRatio: Math.round((this.analysis.brotliSize / this.analysis.totalSize) * 100)
      },
      bundles: this.analysis.bundles,
      opportunities: this.analysis.treeshakingOpportunities,
      recommendations: this.analysis.recommendations,
      metrics: this.calculateMetrics()
    };
    
    // Write detailed JSON report
    writeFileSync('./dist/bundle-analysis.json', JSON.stringify(report, null, 2));
    
    // Write human-readable report
    const readableReport = this.generateReadableReport(report);
    writeFileSync('./dist/optimization-report.md', readableReport);
    
    console.log('📄 Reports generated:');
    console.log('  - ./dist/bundle-analysis.json (detailed)');
    console.log('  - ./dist/optimization-report.md (readable)');
  }

  calculateMetrics() {
    const avgBundleSize = this.analysis.totalSize / this.analysis.bundles.length;
    const treeshakeableBundles = this.analysis.bundles.filter(b => b.treeshakeable).length;
    const treeshakeablePercentage = (treeshakeableBundles / this.analysis.bundles.length) * 100;
    
    return {
      averageBundleSize: Math.round(avgBundleSize),
      treeshakeablePercentage: Math.round(treeshakeablePercentage),
      compressionEfficiency: Math.round((this.analysis.gzipSize / this.analysis.totalSize) * 100),
      bundleHealthScore: this.calculateHealthScore()
    };
  }

  calculateHealthScore() {
    let score = 100;
    
    // Deduct for large bundles
    const largeBundles = this.analysis.bundles.filter(b => b.size > 20000).length;
    score -= largeBundles * 15;
    
    // Deduct for non-tree-shakeable bundles
    const nonTreeshakeable = this.analysis.bundles.filter(b => !b.treeshakeable).length;
    score -= nonTreeshakeable * 10;
    
    // Deduct for poor compression
    if (this.analysis.gzipSize / this.analysis.totalSize > 0.4) {
      score -= 20;
    }
    
    return Math.max(0, score);
  }

  generateReadableReport(report) {
    return `# Bundle Optimization Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Total Bundles:** ${report.summary.totalBundles}
- **Total Size:** ${this.formatBytes(report.summary.totalSize)}
- **Gzipped Size:** ${this.formatBytes(report.summary.gzipSize)} (${report.summary.compressionRatio}%)
- **Brotli Size:** ${this.formatBytes(report.summary.brotliSize)} (${report.summary.brotliRatio}%)
- **Bundle Health Score:** ${report.metrics.bundleHealthScore}/100

## Bundle Analysis

${report.bundles.map(bundle => `
### ${bundle.name}
- **Size:** ${this.formatBytes(bundle.size)}
- **Gzipped:** ${this.formatBytes(bundle.gzipSize)}
- **Functions:** ${bundle.functions}
- **Tree-shakeable:** ${bundle.treeshakeable ? '✅' : '❌'}
- **Dead Code:** ${this.formatBytes(bundle.deadCode)}
`).join('\n')}

## Optimization Opportunities

${report.opportunities.map(opp => `
### ${opp.file} - ${opp.type}
- **Issue:** ${opp.description}
- **Potential Savings:** ${this.formatBytes(opp.savings)}
`).join('\n')}

## Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.type} (${rec.priority} priority)
- **Description:** ${rec.description}
- **Impact:** ${rec.impact}
${rec.files ? `- **Files:** ${rec.files.join(', ')}` : ''}
${rec.example ? `- **Example:** \`${rec.example}\`` : ''}
`).join('\n')}

## Metrics

- **Average Bundle Size:** ${this.formatBytes(report.metrics.averageBundleSize)}
- **Tree-shakeable Bundles:** ${report.metrics.treeshakeablePercentage}%
- **Compression Efficiency:** ${report.metrics.compressionEfficiency}%

---
*Generated by Ultra-Stable Resize System Bundle Optimizer*
`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new BundleOptimizer();
  optimizer.optimize().catch(console.error);
}

export default BundleOptimizer;
