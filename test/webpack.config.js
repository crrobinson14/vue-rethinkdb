const webpack = require('webpack');
const path = require('path');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');

function resolve(dir) {
    return path.join(__dirname, '..', dir);
}

module.exports = {
    entry: './src/index.js',
    output: {
        path: resolve('dist'),
        filename: 'index.js',
        library: 'VueJSModules',
        libraryTarget: 'umd',
        // REMOVE FOR PROD
        pathinfo: true,
    },
    resolve: {
        extensions: ['.js', '.vue', '.json'],
    },
    module: {
        rules: [
            { test: /\.(png|jpe?g|gif|svg)(\?.*)?$/, loader: 'url-loader' },
            { test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/, loader: 'url-loader' },
            { test: /\.vue$/, loader: 'vue-loader' },
            { test: /\.json$/, loader: 'json-loader' },
            {
                test: /\.(js|vue)$/,
                loader: 'eslint-loader',
                enforce: 'pre',
                include: [resolve('src'), resolve('test')],
                options: {
                    formatter: eslintFriendlyFormatter
                }
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: [resolve('src'), resolve('test')],
                exclude: /(node_modules|bower_components)/,
                options: {
                    presets: ['env'],
                    plugins: []
                    // plugins: ['transform-runtime']
                }
            },
        ]
    },
    devtool: 'inline-source-map'
};

if (process.env.NODE_ENV === 'production') {
    module.exports.plugins = [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"'
            }
        }),
        // new webpack.optimize.UglifyJsPlugin({
        //     sourceMap: false,
        //     drop_console: true,
        //     compress: {
        //         warnings: false
        //     }
        // }),
        // new webpack.optimize.OccurenceOrderPlugin()
    ];
}
