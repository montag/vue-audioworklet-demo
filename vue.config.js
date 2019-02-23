

module.exports = {
  publicPath: process.env.PUBLIC_PATH,
  outputDir: 'dist',
  assetsDir: '',
  runtimeCompiler: false,
  productionSourceMap: false,
  parallel: true,
  css: {
    sourceMap: true
  },
  devServer: {
    https: true
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: /Worklet.js/,
          loader: 'worklet-loader',
          options: {
            publicPath: process.env.PUBLIC_PATH
          }
        }
      ]
    }
  }
}
