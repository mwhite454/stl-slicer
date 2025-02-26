/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly use transpilePackages to handle Three.js and its loaders
  transpilePackages: ['three'],
  
  // Disable automatic static optimization to prevent hydration issues
  // with browser-only components
  reactStrictMode: false,
  
  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Webpack configuration to support Three.js modules and improve chunking
  webpack: (config, { isServer }) => {
    // Make sure we don't attempt to resolve aliases during build configuration
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Optimize chunking for dynamic imports
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendors: false, // Disable the built-in vendors cache group
          // Separate three.js into its own chunk
          three: {
            test: /[\\/]node_modules[\\/](three|@types\/three)[\\/]/,
            name: 'three-vendor',
            priority: 10,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  }
};

module.exports = nextConfig; 