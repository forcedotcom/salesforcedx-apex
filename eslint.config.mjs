import salesforceTypescriptConfig from 'eslint-config-salesforce-typescript';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  // Replaces "ignorePatterns": ["*.js"]
  {
    ignores: ['**/*.js']
  },

  // eslintrc defaulted reportUnusedDisableDirectives to off; flat config
  // defaults it to "warn". Keep it off to match the old behavior.
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  },

  // Base on the shared Salesforce config. We consume it mainly for its
  // ESLint 10-compatible plugin wiring — notably @tony.ganchev/eslint-plugin-header
  // (registered as `header`), which replaces the unmaintained eslint-plugin-header.
  ...salesforceTypescriptConfig,

  // The old .eslintrc.json used the non-type-checked recommended set, so turn
  // off the type-aware rules the shared config enables.
  tseslint.configs.disableTypeChecked,

  // Run prettier as a lint rule, matching the old "plugin:prettier/recommended".
  // Placed before the rule block below so the block's rules win, mirroring how
  // top-level "rules" overrode "extends" in the old eslintrc config.
  prettierRecommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 6,
      sourceType: 'module',
      // The type-checked rules are disabled above, so full type information is
      // not needed for linting.
      parserOptions: {
        projectService: false,
        project: false
      }
    },
    rules: {
      // ----- Rules carried over from the old .eslintrc.json -----
      '@typescript-eslint/ban-ts-comment': 'off',
      'arrow-body-style': 'error',
      'constructor-super': 'warn',
      curly: 'error',
      eqeqeq: 'error',
      'no-buffer-constructor': 'error',
      'no-caller': 'error',
      'no-debugger': 'warn',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'error',
      'no-eval': 'error',
      'no-extra-semi': 'warn',
      'no-redeclare': 'error',
      'no-sparse-arrays': 'error',
      'no-throw-literal': 'error',
      'no-unsafe-finally': 'warn',
      'no-unused-labels': 'warn',
      // non-complete list of globals that are easy to access unintentionally
      'no-restricted-globals': [
        'warn',
        'name',
        'length',
        'event',
        'closed',
        'external',
        'status',
        'origin',
        'context'
      ],
      'no-var': 'error',
      'jsdoc/no-types': 'warn',
      'header/header': [
        2,
        'block',
        [
          '',
          {
            pattern: ' \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.',
            template: ' * Copyright (c) 2021, salesforce.com, inc.'
          },
          ' * All rights reserved.',
          ' * Licensed under the BSD 3-Clause license.',
          ' * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause',
          ' '
        ]
      ],

      // The old config's "@typescript-eslint/ban-types" was a warning; its v8
      // successor rules are errors by default, so restore the warn severity.
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',

      // ESLint 9+/typescript-eslint v8 changed the default to check `catch`
      // bindings; the old config did not, so keep them unchecked.
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],

      // ----- Stricter rules added by the shared config, turned off to stay
      // equivalent to the old .eslintrc.json -----
      'prefer-arrow-callback': 'off',
      camelcase: 'off',
      complexity: 'off',
      'class-methods-use-this': 'off',
      'guard-for-in': 'off',
      'id-denylist': 'off',
      'id-match': 'off',
      'no-await-in-loop': 'off',
      'no-console': 'off',
      'no-lonely-if': 'off',
      'no-new-wrappers': 'off',
      'no-octal-escape': 'off',
      'no-restricted-imports': 'off',
      'no-undef-init': 'off',
      'no-underscore-dangle': 'off',
      'no-unused-expressions': 'off',
      'object-shorthand': 'off',
      'one-var': 'off',
      'prefer-const': 'off',
      'prefer-spread': 'off',
      radix: 'off',
      'spaced-comment': 'off',
      'import-x/order': 'off',
      'jsdoc/check-alignment': 'off',
      'jsdoc/check-indentation': 'off',
      'jsdoc/tag-lines': 'off',
      'unicorn/prefer-node-protocol': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-function-type': 'off',
      '@typescript-eslint/unified-signatures': 'off',

      // Core rules from eslint:recommended (pulled in by the shared config) that
      // the old .eslintrc.json never enabled.
      'no-control-regex': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-useless-catch': 'off',
      'preserve-caught-error': 'off'
    }
  },

  // Replaces "overrides" for files exempt from the license header.
  {
    files: ['src/common/cancellation.ts', 'src/common/types.ts'],
    rules: {
      'header/header': 'off'
    }
  }
];
