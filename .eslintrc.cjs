module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
  },
  ignorePatterns: ["functions/*.js", "dist/**/*", "playwright-report/**/*"],
  plugins: ["@typescript-eslint", "solid"],
  extends: [
    "plugin:astro/recommended",
    "plugin:astro/jsx-a11y-recommended",
    "plugin:solid/typescript",
    "plugin:@typescript-eslint/recommended",
  ],
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
        sourceType: "module",
      },
      extends: ["plugin:astro/recommended", "plugin:astro/jsx-a11y-strict"],
      rules: {
        "astro/no-conflict-set-directives": "error",
        "astro/no-unused-define-vars-in-style": "error",
        "solid/self-closing-comp": 0,
      },
    },
    {
      files: ["*.jsx", "*.tsx"],
      rules: {
        "solid/no-innerhtml": 0,
      },
    },
    {
      files: ["*.ts"],
      rules: {
        "no-undef": "off",
      },
    },
  ],
};
// https://github.com/ota-meshi/eslint-plugin-astro
