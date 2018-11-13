const mkdirp = require('mkdirp');
const rollup = require('rollup').rollup;
const VuePlugin = require('rollup-plugin-vue').default;
const jsx = require('rollup-plugin-jsx');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');
const cjs = require('rollup-plugin-commonjs');
const node = require('rollup-plugin-node-resolve');
const uglify = require('uglify-js');

// Make sure dist dir exists
mkdirp('dist');

const { logError, write, banner, name, moduleName, version } = require('./utils');

function rollupBundle({ env }) {
    return rollup({
        input: 'src/index.js',
        output: {
            name,
            moduleName,
        },
        plugins: [
            node({
                extensions: ['.js', '.jsx', '.vue']
            }),
            cjs(),
            VuePlugin({
                compileTemplate: true
            }),
            jsx({ factory: 'h' }),
            replace(Object.assign({
                __VERSION__: version
            }, env)),
            buble({
                objectAssign: 'Object.assign'
            })
        ]
    });
}

const bundleOptions = {
    banner,
    exports: 'named',
    format: 'umd',
    moduleName,
    name
};

function createBundle({ name: bundleName, env, format }) {
    return rollupBundle({
        env
    }).then(bundle => {
        const options = Object.assign({}, bundleOptions);
        if (format) {
            options.format = format;
        }

        return bundle.generate(options);
    }).then(({ code }) => {
        if (/min$/.test(bundleName)) {
            const minified = uglify.minify(code, {
                output: {
                    preamble: banner,
                    ascii_only: true // eslint-disable-line camelcase
                }
            }).code;
            return write(`dist/${bundleName}.js`, minified);
        }

        return write(`dist/${bundleName}.js`, code);
    }).catch(logError);
}

// Browser bundle (can be used with script)
createBundle({
    name: `${name}`,
    env: {
        'process.env.NODE_ENV': '"development"'
    }
});

// Commonjs bundle (preserves process.env.NODE_ENV) so
// the user can replace it in dev and prod mode
createBundle({
    name: `${name}.common`,
    env: {},
    format: 'cjs'
});

// uses export and import syntax. Should be used with modern bundlers
// like rollup and webpack 2
createBundle({
    name: `${name}.esm`,
    env: {},
    format: 'es'
});

// Minified version for browser
createBundle({
    name: `${name}.min`,
    env: {
        'process.env.NODE_ENV': '"production"'
    }
});
