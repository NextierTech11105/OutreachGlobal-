/**
 * Canonical Jest entrypoint for the monorepo.
 *
 * VS Code Jest struggles to auto-detect in a monorepo with multiple Jest roots.
 * This config provides a single, explicit config to run, delegating to each
 * app's existing Jest config so their environments/transforms stay intact.
 */
module.exports = {
  projects: [
    '<rootDir>/apps/api/jest.config.js',
    '<rootDir>/apps/front/jest.config.js',
  ],
};

