/** @type {import('next').NextConfig} */

// Origens autorizadas a embedar a aplicação em um <iframe>.
// Configure EMBED_ANCESTORS no .env (separe múltiplas por espaço), ex.:
//   EMBED_ANCESTORS="https://portal.mse.com.br https://intranet.mse.com.br"
// Padrão 'self' permite apenas a própria origem.
const frameAncestors = (process.env.EMBED_ANCESTORS || "'self'").trim()

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors};`,
          },
        ],
      },
    ]
  },
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
