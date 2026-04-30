import { resolve } from 'node:path';
import { defineConfig } from '@rspack/cli';
import { rspack, type SwcLoaderOptions } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

const isDev = process.env.NODE_ENV !== 'production';
const apiPort = process.env.API_PORT ?? '4000';
const webPort = Number(process.env.WEB_PORT ?? '3000');
const here = import.meta.dirname;

export default defineConfig({
  context: here,
  mode: isDev ? 'development' : 'production',
  entry: { main: './src/main.tsx' },
  output: {
    path: resolve(here, 'dist'),
    filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@': resolve(here, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(tsx?|jsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev,
                },
              },
              target: 'es2022',
            },
          } satisfies SwcLoaderOptions,
        },
      },
      {
        test: /\.css$/,
        use: [{ loader: 'postcss-loader' }],
        type: 'css',
      },
    ],
  },
  plugins: [
    // tanstack-router-plugin: routes/ klasöründen routeTree.gen.ts üretir + autoCodeSplitting.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    isDev && new ReactRefreshRspackPlugin(),
  ].filter(Boolean),
  experiments: {
    css: true,
  },
  devtool: isDev ? 'cheap-module-source-map' : 'source-map',
  devServer: {
    port: webPort,
    host: '0.0.0.0',
    hot: true,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api'],
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    ],
  },
});
