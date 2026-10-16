import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Las pantallas privadas no se guardan en la caché del navegador: después de «Salir», «Atrás» no las muestra.
  async headers() {
    return [{ source: '/private/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] }];
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'node_modules')],
    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'if-function'],
    quietDeps: true,
  },
};

export default nextConfig;
