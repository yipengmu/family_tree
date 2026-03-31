module.exports = {
  devServer: (devServerConfig) => {
    // 修复 allowedHosts 为空数组的问题
    devServerConfig.allowedHosts = ['localhost', '.local', '.localhost'];
    return devServerConfig;
  },
};
