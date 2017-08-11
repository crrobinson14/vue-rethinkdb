// const karmaMarkdownReporter = require('../node_modules/@webng/karma-markdown-reporter');
const webpackConfig = require('./webpack.config');

module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],
        frameworks: ['mocha', 'dirty-chai'],
        reporters: ['spec', 'coverage', 'markdown'],
        mochaOwnReporter: {
            // reporter: 'mocha-markdown-extended-reporter'
            // "test": "cross-env NODE_ENV=test node_modules/.bin/nyc --reporter=text-summary --reporter=html mocha",
            // "posttest": "cross-env NODE_ENV=test node_modules/.bin/nyc --reporter=none
            // mocha -R mocha-markdown-extended-reporter > docs/test.md",
        },
        // files: ['test/**/*.js'],
        // files: ['./index.js'],
        files: [
            'specs/*.js',
            // '../src/*.js'
        ],
        preprocessors: {
            'specs/*.js': ['webpack', 'sourcemap'],
            // '../src/*.js': ['coverage']
        },
        port: 9876, // karma web server port
        colors: true,
        // logLevel: config.LOG_DEBUG,
        autoWatch: false,
        concurrency: Infinity,
        // preprocessors: {
        //     './index.js': ['webpack', 'sourcemap']
        // },
        webpack: webpackConfig,
        webpackMiddleware: {
            noInfo: true,
        },
        coverageReporter: {
            dir: '../coverage',
            reporters: [
                { type: 'html', subdir: '.' },
                { type: 'lcov', subdir: '.' },
                { type: 'text-summary' }
            ]
        },
        client: {
            mocha: {
                expose: ['body'],
                // change Karma's debug.html to the mocha web reporter
                reporter: 'nyan'

                // require specific files after Mocha is initialized
                // require: [require.resolve('bdd-lazy-var/bdd_lazy_var_global')],

                // custom ui, defined in required file above
                // ui: 'bdd-lazy-var/global',
            }
        },
        plugins: [
            'karma-mocha',
            'karma-chai',
            'karma-dirty-chai',
            'karma-spec-reporter',
            'karma-coverage',
            'karma-webpack',
            'karma-sourcemap-loader',
            'karma-phantomjs-launcher',
            'karma-phantomjs-shim',
            '@webng/karma-markdown-reporter'
        ],
        markdownReporter: {
            output: 'docs/test.md'
        }
    });
};

/*
 const webpackConfig = require('./webpack.config');

module.exports = function(config) {
    config.set({
        reporters: ['mocha-own', 'coverage'],
        mochaOwnReporter: {
            // reporter: 'mocha-markdown-extended-reporter',
            // "test": "cross-env NODE_ENV=test node_modules/.bin/nyc --reporter=text-summary --reporter=html mocha",
            // "posttest": "cross-env NODE_ENV=test node_modules/.bin/nyc --reporter=none
            // mocha -R mocha-markdown-extended-reporter > docs/test.md",
        },
        // reporters: ['progress', 'spec', 'coverage'],
        files: [
            'specs/*.js',
            // '../src/*.js'
        ],
        preprocessors: {
            'specs/*.js': ['webpack', 'sourcemap'],
            // '../src/*.js': ['coverage']
        },
    });
};
// "posttest": "cross-env NODE_ENV=test node_modules/.bin/nyc --reporter=none mocha -R mocha-
markdown-extended-reporter > docs/test.md",
*/
