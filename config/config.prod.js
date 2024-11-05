/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {
    cluster: {
      listen: {
        port: 7002, // 生产环境使用端口 7002
        hostname: '127.0.0.1', // 仅本地访问（如果生产环境不需要暴露给公网）
      },
    },
  };

  config.keys = appInfo.name + '_1620227052763_7002';

  return {
    ...config,
  };
};
