const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'inline-source-map',
    entry: ['./dist/index.js'],
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'output'),
        filename: 'index.js',
        libraryTarget: 'umd',
    },
};