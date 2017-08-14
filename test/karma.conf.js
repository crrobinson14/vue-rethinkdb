const merge = require('webpack-merge');
const baseConfig = require('../build/webpack.config.dev.js');

const webpackConfig = merge(baseConfig, {
    // use inline sourcemap for karma-sourcemap-loader
    devtool: '#inline-source-map'
});

webpackConfig.plugins = [];

const vueRule = webpackConfig.module.rules.find(rule => rule.loader === 'vue-loader');
vueRule.options = vueRule.options || {};
vueRule.options.loaders = vueRule.options.loaders || {};
vueRule.options.loaders.js = 'babel-loader';

// no need for app entry during tests
delete webpackConfig.entry;

module.exports = function(config) {
    config.set({
        browsers: ['PhantomJS'],
        frameworks: ['mocha', 'chai-dom', 'sinon-chai'],
        reporters: ['spec', 'coverage', 'markdown'],
        files: ['./index.js'],
        preprocessors: {
            './index.js': ['webpack', 'sourcemap']
        },
        webpack: webpackConfig,
        webpackMiddleware: {
            noInfo: true
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
                expose: ['body']
            }
        },
        plugins: [
            'karma-mocha',
            'karma-spec-reporter',
            'karma-coverage',
            'karma-webpack',
            'karma-chai-dom',
            'karma-sinon-chai',
            'karma-sourcemap-loader',
            'karma-phantomjs-launcher',
            'karma-phantomjs-shim',
            '@webng/karma-markdown-reporter'
        ],
        markdownReporter: {
            output: 'docs/test.md'
        },
    });
};
