#!/usr/bin/env bun
/**
 * DEMO SERVER LAUNCHER
 * 
 * Launches the comparison demo with performance monitoring
 */

import DevServer from './dev-server.js';

// Simple demo launcher
const server = new DevServer();
server.start().catch(console.error);
