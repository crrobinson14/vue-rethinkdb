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
        library: 'VueFirebaseData',
        libraryTarget: 'umd',
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
                    presets: ['latest'],
                    plugins: []
                }
            },
            // {
            //     test: /\.js$/,
            //     use: {
            //         loader: 'istanbul-instrumenter-loader',
            //         options: { esModules: true }
            //     },
            //     enforce: 'post',
            //     exclude: /node_modules|\.spec\.js$/,
            // }
        ]
    },
    devtool: 'inline-source-map'
};
