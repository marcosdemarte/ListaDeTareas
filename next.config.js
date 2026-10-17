/** @type {import('next').NextConfig} */
const nextConfig = {
    // Le indica a Turbopack/Webpack que transpiles el JSX que viene desde /src de este paquete
    transpilePackages: ['@marcosdemarte/lista-de-tareas'],
};

module.exports = nextConfig;