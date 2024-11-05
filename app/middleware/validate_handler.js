/**
 * 用于处理前台传来的 token，目前还有两个问题待改进
 * 1. 用 handle 中间件处理 token 的形式和 egg-jwt 的思路不符，日后替换成 jsonwebtoken 自行处理
 * 2. 错误处理混乱，有待统一
 */

'use strict';

module.exports = (_, app) => {
  return async function validateHandler(ctx, next) {
    // 原本更好的解决方法是为所有的 graphql 做 @auth，但时间关系暂时不用这种做法

    // 分析 url
    const referer = ctx.request.header.referer;
    // console.log(referer);
    // console.log(ctx.url);

    if (!referer) {
      /**
       *  这里又是一个临时解决方案，记录下前因后果：
       *  graphql 服务，默认提供 /graphql 地址，方便直接访问 playground（一个图形化的查询测试页）
       *  由于我在 else 分支里写了大量的验证功能，
       *  造成 /graphql 地址 失效，无法显示 playground 界面，引起调试困难
       *  这段代码就是强行恢复了随时访问 playground 界面的权限，不触发验证。
       *
       *  TODO: 更完善的鉴权方案
       */
      if (ctx.url === '/graphql') {
        ctx.request.url = ('/graphql');
      } else {
        return;
      }
    } else {
      // 这是老版本的写法，目前已经不推荐
      // const parsedUrl = url.parse(referer);
      const parsedUrl = new URL(referer);

      const path = parsedUrl.pathname;
      // console.log(path);
      // * 因为 /graphql 访问数据后台访问接口的命名都是一样的，具体的查询要求放在了 POST 的数据里
      //   所以，我们不太好区别 /grqphql 的后台到底是处理登录（不需要 token），
      //   还是处理其他信息（需要验证token），这里就临时采用了一个障眼法。特意让前台的登录访问写成
      //   /graphql/login，其实后台还是 /grqphql。

      // * 前台想用爬虫模拟登录的时候，障眼法也有一定的功效，爬虫会以为访问的链接是 /graphql/login，
      //   其实访问的还是 /graphql，但此处阻止爬虫的代码还未开发，仅注释保留这个想法
      if (ctx.url === '/graphql/login' || ctx.url === '/graphql/register') {
        // 当前台提交登录请求时，不检查 header 里的 cookie，
        // 但要检查发起请求的网页是否是 /user/login 否则不予登录
        console.log('登录、注册、重置密码时不验证 token');
        if (path === '/user/login' || /^\/user\/reset-password\/[^/]+$/.test(path)) {
          ctx.request.url = ('/graphql');
        } else {
          ctx.body = {
            success: false,
            errorMessage: '请勿随意爬取数据',
          };
          return;
        }
      } else if (ctx.query.noToken === 'true') {
        // 这个分支是处理 url 中带了查询参数 ?noToken=true 时的处理
        console.log('查询参数标记 noToken');
        let isPathValid = false;

        // 只有限定的 path 才能通过 noToken 的形式跳过验证
        switch (path) {
          case '/crawl':
          case '/user/login':
            isPathValid = true;
            break;
          default:
        }

        // console.log(isPathValid);

        if (!isPathValid) {
          ctx.body = {
            success: false,
            errorMessage: '请勿随意爬取数据',
          };
          return;
        }
      } else if (path === '/graphql' && ctx.header.host === '192.168.72.55') {
        // 此分支解决的是从 graphql playground 发来查询请求的鉴权问题
        // console.log(ctx.header.host);
        ctx.request.url = ('/graphql');
      } else {
        console.log(`来自 ${path} 需要验证 token`);
        try {
          // 当前台提交其他请求时，获取请求 header 中的验证字符串
          // 实例: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwic3RhdHVzIjoxLCJsb2dpbkFkZHIiOiIxOTIuMTY4LjcyLjI1NiIsImlhdCI6MTY4MTE0MTUxOCwiZXhwIjoxNjgxMjI3OTE4fQ.AKUzLa1az9vlkH0p3PB8cyHDMS39ZCD9bfX_B5AVtxU"
          // const authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ';
          const authorization = ctx.header.authorization;

          if (!authorization) {
            // throw new Error('请勿随意爬取数据');
            // 也可以 throw 一个错误对象，但 new 对象开销太大，所以沿用 ctx.body 的方式返回错误
            ctx.body = {
              success: false,
              errorCode: 1001,
              errorMessage: '非法登录，自重',
            };
            return;
          }

          // 拆分以逗号为间隔的字符串，验证格式并提取token
          const parts = authorization.split(' ');
          if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
            // ctx.status = 401;
            ctx.body = {
              success: false,
              errorCode: 1001,
              errorMessage: '非法登录，自重。',
            };
            return;
          }

          const token = parts[1];
          // 由于 jwt.verify 会主动抛出异常，所以这里用 try catch来处理 token 的验证
          // 验证 JWT Token
          const secret = app.config.jwt.secret;
          // 验证失败则抛出异常，成功则返回 decode 后的 payload：
          // {
          //   id: 2,
          //   status: 1,
          //   loginAddr: '192.168.72.256',
          //   iat: 1681405728,
          //   exp: 1681492128
          // }
          const payload = app.jwt.verify(token, secret);
          // 获取包含在 header 里的真实远程地址，
          // 如果是开发环境没有远程地址，则给一个事先放在 token 里的，明显错误的本地地址用做识别。
          // const remoteAddr = ctx.headers['x-real-ip'] || ctx.ip || '192.168.72.256';

          // if (payload.loginAddr !== remoteAddr) {
          //   console.log(`${remoteAddr} 正在试图使用用 ${payload.loginAddr} 的 token 登录`);
          //   ctx.body = {
          //     success: false,
          //     errorCode: 1001,
          //     errorMessage: '非法登录，自重！',
          //     // showType: 0,
          //     host: ctx.request.header.host,
          //   };
          //   return;
          // }

          console.log(`来自 ${path} 的 token 验证通过`);

          // 将解码后的 payload 数据保存到 ctx.state.user 属性中
          ctx.state.user = payload;
        } catch (err) {
          // console.log(err);
          ctx.body = {
            success: false,
            errorCode: 1001,
            errorMessage: '非法登录或 token 过期',
            // showType: 0,
            host: ctx.request.header.host,
          };
          return;
        }
      }
    }

    await next();
    // console.log(ctx.request.ip); // .header);
    // // 判断是否是 IPv6 地址
    // const isIpv6 = remoteAddr.includes(':');

    // let ipv4Pat = null;
    // // 如果是 IPv6 地址，则通过正则表达式提取 IPv4 地址
    // if (isIpv6) {
    //   ipv4Pat = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
    // }

    // const ipv4Addr = remoteAddr.match(ipv4Pat) || remoteAddr;
    // // 设置客户端请求的 IP 地址
    // ctx.clientIP = ipv4Addr;

    // console.log(ipv4Addr);
  };
};
