import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Global ignores (flat config supports an object with 'ignores')
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      "public/",
      "docs/",
      "claudedocs/",
      "examples/",
      "build/",
      "*.log",
      ".cache/",
      ".vscode/",
      ".idea/",
      ".yalc/",
      ".turbo/",
      ".parcel-cache/",
      "tests/templates/",
      "tests/fixtures/",
    ],
  },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.node } },
  // Relax rules for test files: many tests define helpers and intentionally
  // declare variables used only in test scaffolding. Use languageOptions.globals
  // to define Vitest globals and reduce strictness for unused vars in tests
  // so lint feedback stays focused on production `src/` code.
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: Object.assign({}, globals.node, {
        afterEach: true,
        beforeEach: true,
        describe: true,
        it: true,
        expect: true,
        vi: true,
      }),
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  }
]);
