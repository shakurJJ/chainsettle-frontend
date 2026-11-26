const path = require('path');
const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require('next/constants');
const createNextIntlPlugin = require('next-intl/plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/**
 * Fail fast on missing or malformed NEXT_PUBLIC_* variables so `next build`
 * and `next dev` stop with a readable message instead of failing at runtime.
 */
function validateEnv() {
  const errors = [];
  const read = (key) => (process.env[key] ?? '').trim();
  const contractId = /^C[A-Z2-7]{55}$/;
  const isUrl = (value, protocols = ['http:', 'https:']) => {
    try {
      return protocols.includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };

  for (const key of ['NEXT_PUBLIC_CONTRACT_ID', 'NEXT_PUBLIC_USDC_ADDRESS']) {
    const value = read(key);
    if (!value) errors.push(`${key} is missing`);
    else if (!contractId.test(value)) {
      errors.push(`${key} must be a 56-character Stellar contract ID starting with "C"`);
    }
  }

  const rpcUrl = read('NEXT_PUBLIC_STELLAR_RPC_URL');
  if (!rpcUrl) errors.push('NEXT_PUBLIC_STELLAR_RPC_URL is missing');
  else if (!isUrl(rpcUrl)) errors.push('NEXT_PUBLIC_STELLAR_RPC_URL must be a valid URL');

  const network = read('NEXT_PUBLIC_STELLAR_NETWORK');
  if (network && !['testnet', 'mainnet'].includes(network)) {
    errors.push('NEXT_PUBLIC_STELLAR_NETWORK must be one of testnet | mainnet');
  }

  for (const key of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_HORIZON_URL']) {
    const value = read(key);
    if (value && !isUrl(value)) errors.push(`${key} must be a valid URL`);
  }

  const gateway = read('NEXT_PUBLIC_IPFS_GATEWAY');
  if (gateway && !isUrl(gateway, ['https:'])) {
    errors.push('NEXT_PUBLIC_IPFS_GATEWAY must be a valid https URL');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}\n` +
        'See .env.example for the expected variables.',
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@stellar/freighter-api'],
  webpack(config) {
    config.resolve.alias['@stellar/stellar-sdk'] = path.join(
      __dirname,
      'node_modules/@stellar/stellar-sdk/lib/cjs/index.js',
    );
    return config;
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.js$/,
      include: /[\\/]node_modules[\\/]@stellar[\\/]stellar-sdk[\\/]/,
      use: [require.resolve('./scripts/stellar-es2020-loader.js')],
    });
    return config;
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://open.er-api.com https://api.coingecko.com https://soroban-testnet.stellar.org https://horizon-testnet.stellar.org https://horizon.stellar.org http://localhost:* ws://localhost:*",
        ].join('; '),
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) {
    validateEnv();
  }
  return withBundleAnalyzer(withNextIntl(nextConfig));
};
