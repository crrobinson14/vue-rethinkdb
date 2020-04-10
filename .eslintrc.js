module.exports = {
    root: true,
    // parser: 'babel-eslint',
    // parserOptions: {
    //     sourceType: 'module'
    // },
    env: {
        browser: true,
    },
    extends: 'airbnb-base',
    plugins: [],
    globals: {},
    // Uncomment this block to use the Webpack resolver to check if imports are valid.
    settings: {},
    rules: {
        // Our rules are based on "AirBNB Base'. Below are our overrides.
        'indent': ['error', 4, { SwitchCase: 1 }], // 4-space indents
        'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }],
        'max-len': ['error', {
            code: 120,                             // We all have big screens - use them!
            ignoreUrls: true,                      // A bunch of these things are a pain to maintain when wrapped...
            ignoreStrings: true,
            ignoreRegExpLiterals: true,
            ignoreTemplateLiterals: true,
        }],
        'arrow-parens': ['error', 'as-needed'],    // No reason to write ((a) => {..}) when (a => {..}) will do
        'no-trailing-spaces': 0,                   // Many IDEs insert these, they're invisible, and cause no harm
        'no-console': 0,                           // We use console for debugging, should revisit this
        'no-alert': 0,                             // These are actually pretty useful in modern browsers
        'comma-dangle': 0,                         // This seems good but ends up being painful in large nested objects
        'no-plusplus': 0,                          // i += 1 is REALLY annoying for devs used to ++. We'll be careful.
        'global-require': 0,                       // This can be useful shorthand when done right...
        'no-param-reassign': 0,                    // We want to store data on sockets as they arrive.
        'prefer-template': 0,                      // Stay a little closer to some related code bases for now

        // don't require extensions when importing
        'import/extensions': ['error', 'always', {
            'js': 'never',
        }],

        // allow optionalDependencies
        'import/no-extraneous-dependencies': ['error', {
            'optionalDependencies': ['test/index.js']
        }],

        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
    }
};
