const webpackConfig = require('./webpack.config');

module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],
        frameworks: ['mocha', 'dirty-chai'],
        reporters: ['spec', 'coverage', 'markdown'],
        files: [
            // './index.js'
            'specs/*.js',
            '../src/*.js',
        ],
        preprocessors: {
            // './index.js': ['webpack', 'sourcemap'],
            // 'specs/*.js': ['webpack'],
            // '../src/*.js': ['coverage'],
            'specs/*.js': ['webpack', 'sourcemap'],
            '../src/*.js': ['coverage', 'webpack', 'sourcemap'],
        },
        port: 9876,
        colors: true,
        // logLevel: config.LOG_DEBUG,
        autoWatch: false,
        concurrency: Infinity,
        webpack: webpackConfig,
        webpackMiddleware: {
            noInfo: true
        },
        coverageReporter: {
            includeAllSources: true,
            dir: '../coverage',
            reporters: [
                { type: 'html', subdir: '.' },
                { type: 'lcov', subdir: '.' },
                { type: 'text-summary' }
            ]
        },
        client: {
            mocha: {
                expose: ['body']
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
        },
        singleRun: true
    });
};
