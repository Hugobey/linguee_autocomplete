const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'functions'),
        publicPath: '/functions/', // Specify the public URL of the output directory
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'functions'), // Serve files from the 'functions' directory
        compress: true,
        port: 8000,
    },
};
