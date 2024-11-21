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
    // 关于跨域安全，
    // 此处是 https://github.com/eggjs/egg/issues/3177 比较公认的解决方案
    // 由于 cors 插件也提供了白名单的功能，并且颗粒度更细，此处不启用 domian 白名单
    // domainWhiteList: [
    //   'http://192.168.72.55', // 生产环境域
    //   'http://192.168.72.55:8000', // 开发环境域
    // ], // 没有配置的话，错误信息：404

      // 一直想试试 csrf，仔细研究下了，发现是无法拦截合法用户对数据的抓取的
      // csrf 仅能防止第三方的中间人攻击，出于性能和服务器实际考量，关闭 csrf
      csrf: {
        enable: false, // 关闭 CSRF 校验
        ignoreJSON: false, // 即使 JSON 请求也进行 CSRF 校验
        // 其他可选配置项
      },
    },

    // 此处是天猪（eggjs作者）推荐的跨域访问解决方案
    cors: {
      // 这里，支持函数
      // {string|Function} origin: '*',
      origin: ctx => {
        const allowedOrigins = [
          'http://192.168.72.55', // 生产环境域
          'http://192.168.72.55:8000', // 开发环境域
        ];
        // 检查请求来源是否在允许列表中
        return allowedOrigins.includes(ctx.request.header.origin) ? ctx.request.header.origin : '';
      },
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
      dir: '/var/log/backend',
      level: 'INFO',
      consoleLevel: 'INFO',
      appLogName: 'app.log',
      coreLogName: 'egg-web.log',
      agentLogName: 'egg-agent.log',
      errorLogName: 'common-error.log',
      // 添加日志旋转配置，新版不需要配置这个了，新版配置日志轮转见下方 logrotator 部分
      // rotateLogDirs: [ path.join(__dirname, '../logs') ],
      // maxDays: 5, // 日志文件保留时间，单位：天
      // maxFiles: 10, // 最多保留的日志文件数量
    },

    logrotator: {
      maxDays: 10, // 日志保留的最大天数，超过的文件将被删除
      maxFiles: 10, // 最多保留的日志文件数，超过的文件将被删除
      maxSize: 50 * 1024 * 1024, // 每个日志文件最大为 50MB
    },

    graphql: {
      router: '/graphql',
      // 是否加载到 app 上，默认开启
      app: true,
      // 是否加载到 agent 上，默认关闭
      agent: false,
      // 是否加载开发者工具 graphiql, 默认开启。路由同 router 字段。使用浏览器打开该可见。
      graphiql: process.env.NODE_ENV === 'development',
      // 是否设置默认的Query和Mutation, 默认关闭
      defaultEmptySchema: true,
      // graphQL 路由前的拦截器
      // onPreGraphQL: function* (ctx) {},
      // 开发工具 graphiQL 路由前的拦截器，建议用于做权限操作(如只提供开发者使用)
      // 这是一个仅允许开发机使用的示例
      onPreGraphiQL: async ctx => {
        if (ctx.request.header.host !== '192.168.72.55:7001') {
          ctx.throw(403, `${ctx.request.header.host} Access Denied`);
        }
      },
    },

    // jsonwebtoken 的必要变量
    jwt: {
      jwtSecret: 'process.env.APP_JWT_SECRET',
      expiresIn: '9h', // 设置 token 过期时间，可调整为适合的值
    },

    // 选用 egg-jwt 处理 token 的初衷是方便直接在路由里写验证，
    // 但实际使用后发现由于 graphql 的存在，很不方便，准备转 jsonwebtoken，
    // 此处暂保留 egg-jwt 的方式，有时间来改
    // jwt: {
    //   secret: process.env.APP_JWT_SECRET || 'temp_secret_key',
    //   expiresIn: '12h',
    // },
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
  config.middleware = [
    // 'errorHandler',
    'validateHandler',
    'graphqlResponseHandler', // 正常引用中间件名称
    'sstsResponseHandler',
    'graphql',
  ];
  // middleware: [ 'errorHandler', 'validateHandler' ],
  // 为 graphqlResponseHandler 中间件设置路径匹配
  config.graphqlResponseHandler = {
    match: '/graphql', // 只对 /graphql 路径生效
  };

  return {
    ...config,
  };
};
