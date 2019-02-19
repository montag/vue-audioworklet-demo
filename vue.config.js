
module.exports = {
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: '',
  runtimeCompiler: false,
  productionSourceMap: false,
  parallel: true,
  css: {
    sourceMap: true
  },
  devServer: {
    https: true,
  },
  chainWebpack: config => {
    // Worker Loader
    config.module
      .rule('worklet-loader')
      .test(/\.worklet\.js$/)
      .use('worklet-loader')
      .loader('worklet-loader')
      .end()
  }
}
