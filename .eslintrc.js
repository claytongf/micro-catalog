module.exports = {
  extends: '@loopback/eslint-config',
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase', 'snake_case'],
      },

      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
      },

      {
        selector: 'variable',
        format: null,
        filter: {
          regex: '^_$',
          match: true,
        },
      },

      // For mixin functions
      {
        selector: 'function',
        format: ['PascalCase'],
        filter: {
          regex: 'Mixin$',
          match: true,
        },
      },

      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },

      // For members such as `Content-Type`
      {
        selector: 'memberLike',
        format: null,
        filter: {
          // you can expand this regex as you find more cases that require
          // quoting that you want to allow
          regex: '[- ]',
          match: true,
        },
      },

      // For enum members
      {
        selector: 'enumMember',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
        leadingUnderscore: 'allow',
      },

      // For properties
      {
        selector: 'property',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
        leadingUnderscore: 'allow',
      },

      {
        selector: 'method',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },

      // For static members
      {
        selector: 'memberLike',
        modifiers: ['static'],
        format: ['camelCase', 'UPPER_CASE'],
      },

      // For private members
      {
        selector: 'memberLike',
        modifiers: ['private'],
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },

      // For protected members
      {
        selector: 'memberLike',
        modifiers: ['protected'],
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },

      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
    ],
  },
};
