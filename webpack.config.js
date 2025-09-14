const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const rules = [
  {
    test: /\.js$/,
    exclude: /(node_modules)/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-env"],
      },
    },
  },
  {
    test: /\.css$/,
    use: [MiniCssExtractPlugin.loader, "css-loader"],
  },
]

const demoConfig = {
  entry: "./demo/index.js",
  output: {
    path: path.resolve(__dirname, "dist/demo"),
    filename: "main.js",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  mode: "development",
  module: { rules },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./demo/index.html",
      inject: "body",
      filename: "index.html",
    }),
    new MiniCssExtractPlugin({
      filename: "main.css",
    }),
  ],
  devServer: {
    static: path.join(__dirname, "dist/demo"),
    compress: true,
    port: 9000,
  },
}

const libraryConfig = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist/lib"),
    filename: "index.js",
    library: {
      name: "threejsOffset",
      type: "umd",
    },
    clean: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  mode: "production",
  module: { rules },
  externals: {
    three: "three", // Exclude 'three' from the bundle because can happen the user has already threejs in his project
  },
  plugins: [],
}

module.exports = [demoConfig, libraryConfig]
