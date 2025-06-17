/**
 * OPTIMIZED ROLLUP CONFIGURATION
 * 
 * Features:
 * - Tree-shaking optimized builds
 * - Multiple output formats (ESM, CJS, UMD)
 * - Module splitting for optimal loading
 * - Bundle size analysis and optimization
 * - Modern JavaScript with legacy fallbacks
 */

import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from '@rollup/plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';
import { dts } from 'rollup-plugin-dts';

const isProduction = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === 'true';

// Shared configuration
const external = [];
const globals = {};

// Shared plugins
const commonPlugins = [
  nodeResolve({
    browser: true,
    preferBuiltins: false
  })
];

// Production plugins
const productionPlugins = [
  ...commonPlugins,
  isProduction && terser({
    compress: {
      drop_console: ['log', 'debug'],
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug'],
      passes: 2
    },
    mangle: {
      properties: {
        regex: /^_/
      }
    },
    format: {
      comments: false
    }
  }),
  isAnalyze && visualizer({
    filename: 'dist/bundle-analysis.html',
    open: true,
    gzipSize: true,
    brotliSize: true
  })
].filter(Boolean);

// Core module configuration
const coreConfig = {
  input: 'src/core/index.js',
  external,
  output: [
    {
      file: 'dist/core.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    {
      file: 'dist/core.cjs',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    }
  ],
  plugins: productionPlugins,
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false
  }
};

// GPU module configuration
const gpuConfig = {
  input: 'src/gpu/index.js',
  external: ['./core'],
  output: [
    {
      file: 'dist/gpu.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    {
      file: 'dist/gpu.cjs',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    }
  ],
  plugins: productionPlugins,
  treeshake: {
    moduleSideEffects: false
  }
};

// Workers module configuration
const workersConfig = {
  input: 'src/workers/index.js',
  external: ['./core'],
  output: [
    {
      file: 'dist/workers.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    {
      file: 'dist/workers.cjs',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    }
  ],
  plugins: productionPlugins,
  treeshake: {
    moduleSideEffects: false
  }
};

// Presets module configuration
const presetsConfig = {
  input: 'src/presets/index.js',
  external: ['./core', './gpu', './workers'],
  output: [
    {
      file: 'dist/presets.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    {
      file: 'dist/presets.cjs',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    }
  ],
  plugins: productionPlugins,
  treeshake: {
    moduleSideEffects: false
  }
};

// Main bundle configuration (all modules)
const mainConfig = {
  input: 'src/index.js',
  external,
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'UltraStableResizeSystem',
      globals,
      sourcemap: !isProduction
    }
  ],
  plugins: productionPlugins,
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false
  }
};

// TypeScript declarations
const typesConfig = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.d.ts',
    format: 'es'
  },
  plugins: [dts()],
  external: [/\.css$/]
};

// Web Worker bundles (special handling)
const workerBundleConfig = {
  input: 'src/workers/resize-worker.js',
  output: {
    file: 'dist/resize-worker.js',
    format: 'iife',
    sourcemap: !isProduction
  },
  plugins: [
    ...commonPlugins,
    isProduction && terser({
      compress: {
        drop_console: true,
        passes: 2
      }
    })
  ].filter(Boolean)
};

// Export all configurations
export default [
  coreConfig,
  gpuConfig,
  workersConfig,
  presetsConfig,
  mainConfig,
  typesConfig,
  workerBundleConfig
];
