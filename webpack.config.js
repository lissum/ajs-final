const path                 = require( 'path' );
const HtmlWebpackPlugin    = require( 'html-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve( __dirname, 'dist' ),
    filename: 'app.bundle.js',
    assetModuleFilename: 'assets/[hash][ext][query]',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, 'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192, // 8kb - аналогично предыдущей конфигурации
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin( {
      template: './src/index.html',
      filename: './index.html',
    } ),
    new MiniCssExtractPlugin( {
      filename: '[name].css',
    } ),
  ],
};
