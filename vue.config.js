const publicPath = '/'

module.exports = {
  publicPath: publicPath,
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
            publicPath: publicPath
          }
        }
      ]
    }
  }
}
