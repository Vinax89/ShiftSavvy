/** Minimal Turbopack config — no webpack() override */
const config = {
  // Explicit Turbopack so Next doesn’t assume Webpack config is intended
  turbopack: {},

  // Dev host allowance for Firebase Studio / Workstations
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.cloudworkstations.dev',
  ],
};
export default config;
