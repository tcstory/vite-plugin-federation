import federation from 'vite-plugin-federation';
import typescript from '@rollup/plugin-typescript';

import pkg from "./package.json" assert { type: "json" };

export default {
  input: "src/index.js",
  preserveEntrySignatures: false,
  plugins: [
    federation({
      remotes: {
        remote_app: "http://localhost:5001/remoteEntry.js",
      }
    }),

    typescript(),
  ],
  output: [{ format: "esm", dir: pkg.main }],
};
