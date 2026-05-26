/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs imports node: prefixed built-ins — strip the prefix so
      // resolve.fallback can stub them out for the browser bundle.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:(https?|fs|crypto|stream|path|os|net|tls|zlib|buffer|util|events|assert|url|querystring|punycode|string_decoder|process)$/,
          (resource) => { resource.request = resource.request.replace(/^node:/, '') }
        )
      )
      config.resolve.fallback = {
        ...config.resolve.fallback,
        https: false,
        http: false,
        fs: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        zlib: false,
        'image-size': false,
      }
    }
    return config
  },
}

module.exports = nextConfig
