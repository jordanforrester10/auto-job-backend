// chrome-extension/webpack.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      'background/service-worker': './src/background/service-worker.js',
      'content/content-main': './src/content/content-main.js',
      'popup/popup': './src/popup/popup.js',
      'options/options': './src/options/options.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'src/[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'assets', to: 'assets', noErrorOnMissing: true },
          { from: 'src/content/content-styles.css', to: 'src/content/content-styles.css' }
        ]
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'src/popup/popup.html',
        chunks: ['popup/popup']
      }),
      new HtmlWebpackPlugin({
        template: './src/options/options.html',
        filename: 'src/options/options.html',
        chunks: ['options/options']
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'src/[name]/[name].css'
        })
      ] : [])
    ],
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    resolve: {
      extensions: ['.js', '.json']
    }
  };
};