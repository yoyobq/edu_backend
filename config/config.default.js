/* eslint valid-jsdoc: "off" */
const path = require('path');
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

    sequelize: {
      dialect: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      database: 'edu_platform',
      username: 'admin',
      password: process.env.MYSQL_ADMIN_PASSWORD,
      define: {
        freezeTableName: true,
        underscored: true,
      },
    },

    logger: {
      dir: path.join(__dirname, '../logs'), // 使用相对路径
      level: 'INFO',
      consoleLevel: 'INFO',
      appLogName: 'app.log',
      coreLogName: 'egg-web.log',
      agentLogName: 'egg-agent.log',
      errorLogName: 'common-error.log',
      // 添加日志旋转配置
      rotateLogDirs: [ path.join(__dirname, '../logs') ],
      maxDays: 5, // 日志文件保留时间，单位：天
      maxFiles: 10, // 最多保留的日志文件数量
    },

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

    // 选用 egg-jwt 处理 token 的初衷是方便直接在路由里写验证，
    // 但实际使用后发现由于 graphql 的存在，很不方便，准备转 jsonwebtoken，
    // 此处暂保留 egg-jwt 的方式，有时间来改
    jwt: {
      secret: process.env.APP_JWT_SECRET || 'temp_secret_key',
      expiresIn: '12h',
    },
    // 通过 app.jwt.sign() 方法来签名生成 JWT，app.jwt.verify() 方法来验证 JWT，
    // 并使用 ctx.request.header.authorization 获取请求头中的 JWT。
    // 最后，在路由中定义相应的接口地址，用于测试 JWT 的生成和验证功能。
    // jwt: {
    //   secret: process.env.APP_JWT_SECRET || 'temp_secret_key',
    //   match: [ '/graphql', '/chat', '/textGen' ],
    //   expiresIn: '1d',
    //   // match: '/jwt', // 匹配需要使用 JWT 的路由
    //   // ignore: '/jwt/ignore', // 忽略使用 JWT 的路由
    //   // passthrough: '/jwt/passthrough', // 通过但不校验 JWT 的路由
    //   // decode: { complete: true }, // 解码 JWT 时传递给 jsonwebtoken 的 decode 选项
    //   // sign: { expiresIn: '1h' }, // 签名 JWT 时传递给 jsonwebtoken 的 sign 选项
    //   // verify: { ignoreExpiration: true }, // 验证 JWT 时传递给 jsonwebtoken 的 verify 选项
    // },
  };

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1620227052763_4470';

  // add your middleware config here
  config.middleware = [ 'validateHandler', 'graphqlResponseHandler', 'graphql' ];
  // middleware: [ 'errorHandler', 'validateHandler' ],

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',

    // 只对 /graphql 前缀的 url 路径生效
    graphqlResponseHandler: {
      match: '/graphql',
    },
  };


  return {
    ...config,
    ...userConfig,
  };
};
