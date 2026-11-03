import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".local-tools/**",
      ".wrangler/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "worker/**/*.ts", "scripts/**/*.mjs", "tests/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { security },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-debugger": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-pseudoRandomBytes": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "ユーザー入力はReactのテキストとして描画する。",
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: "HTMLを直接差し込まない。",
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "乱数はWebCryptoを使う。セキュリティ用途でない場合は理由を書く。",
        },
      ],
    },
  },
];
