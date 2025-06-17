#!/usr/bin/env bun
/**
 * DEVELOPMENT SERVER FOR DEMOS
 * 
 * High-performance development server optimized for Bun runtime
 * Serves comparison demos with hot reload and performance monitoring
 */

import { serve } from "bun";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";

class DevServer {
  constructor() {
    this.port = 3000;
    this.host = 'localhost';
    this.staticDir = './demos';
    this.mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    
    this.performanceLog = [];
    this.startTime = Date.now();
  }

  async start() {
    console.log('🚀 Starting Ultra-Stable Resize System Development Server...\n');
    
    const server = serve({
      port: this.port,
      hostname: this.host,
      fetch: this.handleRequest.bind(this),
      error: this.handleError.bind(this)
    });

    console.log(`✅ Server running at http://${this.host}:${this.port}`);
    console.log(`📁 Serving files from: ${this.staticDir}`);
    console.log(`🎮 Available demos:`);
    console.log(`   - http://${this.host}:${this.port}/comparison`);
    console.log(`   - http://${this.host}:${this.port}/stability-demo.html`);
    console.log(`   - http://${this.host}:${this.port}/performance-demo.html`);
    console.log(`\n💡 Press Ctrl+C to stop the server`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      this.logPerformanceStats();
      process.exit(0);
    });

    return server;
  }

  async handleRequest(request) {
    const startTime = performance.now();
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Route handling
    if (pathname === '/') {
      pathname = '/index.html';
    } else if (pathname === '/comparison') {
      pathname = '/stability-demo.html';
    }

    // Remove leading slash for file path
    const filePath = join(this.staticDir, pathname.slice(1));
    
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        return this.handleNotFound(pathname);
      }

      // Check if it's a directory
      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        return this.handleDirectory(filePath);
      }

      // Serve the file
      const response = await this.serveFile(filePath, pathname);
      
      // Log performance
      const processingTime = performance.now() - startTime;
      this.logRequest(request.method, pathname, 200, processingTime);
      
      return response;
      
    } catch (error) {
      console.error(`❌ Error serving ${pathname}:`, error.message);
      return this.handleServerError(error);
    }
  }

  async serveFile(filePath, pathname) {
    const fileContent = readFileSync(filePath);
    const ext = extname(filePath);
    const mimeType = this.mimeTypes[ext] || 'application/octet-stream';

    // Add development headers
    const headers = {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Dev-Server': 'Ultra-Stable-Resize-System',
      'X-Bun-Version': Bun.version
    };

    // Add CORS headers for development
    if (ext === '.js' || ext === '.json') {
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }

    // Inject performance monitoring for HTML files
    if (ext === '.html') {
      const htmlContent = this.injectPerformanceMonitoring(fileContent.toString());
      return new Response(htmlContent, { headers });
    }

    return new Response(fileContent, { headers });
  }

  injectPerformanceMonitoring(htmlContent) {
    // Inject performance monitoring script before closing body tag
    const performanceScript = `
    <script>
      // Ultra-Stable Development Performance Monitor
      window.ULTRA_STABLE_DEV = {
        startTime: performance.now(),
        metrics: [],
        
        log: function(event, data) {
          this.metrics.push({
            timestamp: performance.now() - this.startTime,
            event,
            data
          });
          console.log('🔍 [Ultra-Stable Dev]', event, data);
        },
        
        report: function() {
          console.table(this.metrics);
          return this.metrics;
        }
      };
      
      // Auto-report on page load
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        window.ULTRA_STABLE_DEV.log('page-loaded', { loadTime: loadTime.toFixed(2) + 'ms' });
      });
      
      // Monitor resize system if available
      if (window.UltraStableResizeSystemV2) {
        console.log('🎯 Ultra-Stable Resize System V2 detected - enabling enhanced monitoring');
      }
    </script>
    `;

    return htmlContent.replace('</body>', performanceScript + '\n</body>');
  }

  handleNotFound(pathname) {
    const notFoundHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>404 - Not Found</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #1e3c72; color: white; text-align: center; padding: 50px; }
            h1 { font-size: 3rem; margin-bottom: 20px; }
            p { font-size: 1.2rem; margin-bottom: 30px; }
            .links { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
            .link { background: #4ade80; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; }
            .link:hover { background: #22d3ee; }
        </style>
    </head>
    <body>
        <h1>404 - Page Not Found</h1>
        <p>The requested file "${pathname}" was not found.</p>
        <div class="links">
            <a href="/comparison" class="link">V1 vs V2 Comparison</a>
            <a href="/stability-demo.html" class="link">Stability Demo</a>
            <a href="/performance-demo.html" class="link">Performance Demo</a>
        </div>
    </body>
    </html>
    `;

    this.logRequest('GET', pathname, 404, 0);
    return new Response(notFoundHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  handleDirectory(dirPath) {
    // Simple directory listing
    const directoryHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Ultra-Stable Resize System - Demos</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #1e3c72; color: white; padding: 50px; }
            h1 { text-align: center; margin-bottom: 40px; }
            .demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .demo-card { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; }
            .demo-link { color: #4ade80; text-decoration: none; font-weight: bold; }
            .demo-link:hover { color: #22d3ee; }
        </style>
    </head>
    <body>
        <h1>🚀 Ultra-Stable Resize System - Development Demos</h1>
        <div class="demo-grid">
            <div class="demo-card">
                <h3>Side-by-Side Comparison</h3>
                <p>Real-time V1 vs V2 performance comparison with sticky metrics footer.</p>
                <a href="/comparison" class="demo-link">Launch Demo →</a>
            </div>
            <div class="demo-card">
                <h3>Stability Demo</h3>
                <p>Interactive demonstration of stability features and error recovery.</p>
                <a href="/stability-demo.html" class="demo-link">Launch Demo →</a>
            </div>
            <div class="demo-card">
                <h3>Performance Demo</h3>
                <p>GPU acceleration, caching, and worker processing visualization.</p>
                <a href="/performance-demo.html" class="demo-link">Launch Demo →</a>
            </div>
        </div>
    </body>
    </html>
    `;

    return new Response(directoryHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  handleServerError(error) {
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>500 - Server Error</title>
        <style>
            body { font-family: monospace; background: #1e3c72; color: white; padding: 50px; }
            .error { background: rgba(248, 113, 113, 0.2); padding: 20px; border-radius: 8px; border-left: 4px solid #f87171; }
        </style>
    </head>
    <body>
        <h1>500 - Server Error</h1>
        <div class="error">
            <h3>Error Details:</h3>
            <p>${error.message}</p>
        </div>
    </body>
    </html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  handleError(error) {
    console.error('❌ Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  logRequest(method, path, status, processingTime) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      method,
      path,
      status,
      processingTime: `${processingTime.toFixed(2)}ms`
    };

    this.performanceLog.push(logEntry);

    // Color code by status
    const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
    const timeColor = processingTime > 100 ? '🐌' : processingTime > 50 ? '⚡' : '🚀';
    
    console.log(`${statusColor} ${method} ${path} - ${status} - ${timeColor} ${processingTime.toFixed(2)}ms`);

    // Keep only last 100 entries
    if (this.performanceLog.length > 100) {
      this.performanceLog.shift();
    }
  }

  logPerformanceStats() {
    console.log('\n📊 Development Server Performance Stats:');
    console.log(`   Uptime: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    console.log(`   Total Requests: ${this.performanceLog.length}`);
    
    if (this.performanceLog.length > 0) {
      const avgResponseTime = this.performanceLog
        .reduce((sum, entry) => sum + parseFloat(entry.processingTime), 0) / this.performanceLog.length;
      
      const successfulRequests = this.performanceLog.filter(entry => entry.status < 400).length;
      const successRate = (successfulRequests / this.performanceLog.length) * 100;
      
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    }
  }
}

// Start server if called directly
if (import.meta.main) {
  const server = new DevServer();
  server.start().catch(console.error);
}

export default DevServer;
