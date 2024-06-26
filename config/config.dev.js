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
    // config/config.${env}.js
    security: {
      // 关于跨域安全
      // 此处是 https://github.com/eggjs/egg/issues/3177 比较公认的解决方案
      // domainWhiteList: [ 'http://localhost:8899' ], // 没有配置的话，错误信息：404
      csrf: {
        enable: false, // 暂时禁用掉 csrf，错误信息：403 missing csrf token
      },
    },

    // 此处是天猪（eggjs作者）推荐的跨域访问解决方案
    cors: {
      // 这里，支持函数
      // {string|Function} origin: '*',
      origin: '*',
      // {string|Array} allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
      allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    },

    // sequelize: {
    //   dialect: 'mysql',
    //   host: '127.0.0.1',
    //   port: 3306,
    //   database: 'edu_platform_test',
    //   username: 'admin',
    //   password: process.env.MYSQL_ADMIN_PASSWORD,
    // },

    graphql: {
      router: '/graphql',
      // 是否加载到 app 上，默认开启
      app: true,
      // 是否加载到 agent 上，默认关闭
      agent: false,
      // 是否加载开发者工具 graphiql, 默认开启。路由同 router 字段。使用浏览器打开该可见。
      graphiql: true,
      // 是否设置默认的Query和Mutation, 默认关闭
      defaultEmptySchema: true,
      // graphQL 路由前的拦截器
      // onPreGraphQL: function* (ctx) {},
      // 开发工具 graphiQL 路由前的拦截器，建议用于做权限操作(如只提供开发者使用)
      // async onPreGraphiQL(ctx) {},
      // apollo server的透传参数，参考[文档](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#parameters)
      // apolloServerOptions: {
      //   rootValue,
      //   formatError,
      //   formatResponse,
      //   mocks,
      //   schemaDirectives,
      //   introspection,
      //   playground,
      //   debug,
      //   validationRules,
      //   tracing,
      //   cacheControl,
      //   subscriptions,
      //   engine,
      //   persistedQueries,
      //   cors,
      // }
    },
  };

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1620227052763_4470';

  // add your middleware config here
  config.middleware = [ 'validateHandler', 'graphql' ];
  // middleware: [ 'errorHandler', 'validateHandler' ],
  // 只对 /api 前缀的 url 路径生效
  // validateHandler: {
  //   // enable: true,
  //   match: '/api/v2',
  // },

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
