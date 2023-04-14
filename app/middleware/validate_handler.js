/**
 * 用于处理前台传来的 token，目前还有两个问题待改进
 * 1. 用 handle 中间件处理 token 的形式和 egg-jwt 的思路不符，日后替换成 jsonwebtoken 自行处理
 * 2. 错误处理混乱，有待统一
 */

'use strict';

module.exports = (_, app) => {
  return async function validateHandler(ctx, next) {
    // 原本更好的解决方法是为所有的 graphql 做 @auth，但时间关系暂时不用这种做法
    // 这里是处理了一个前台防止爬虫登录的临时的障眼法，前台想用爬虫模拟登录的时候，
    // 会以为访问的链接是 /graphql/login， 其实访问的还是 /graphql
    if (ctx.url === '/graphql/login') {
      // 当前台提交登录请求时，不检查 header 里的 cookie
      ctx.request.url = ('/graphql');
    } else {
      // 当前台提交其他请求时，获取请求 header 中的验证字符串
      // 实例: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwic3RhdHVzIjoxLCJsb2dpbkFkZHIiOiIxOTIuMTY4LjcyLjI1NiIsImlhdCI6MTY4MTE0MTUxOCwiZXhwIjoxNjgxMjI3OTE4fQ.AKUzLa1az9vlkH0p3PB8cyHDMS39ZCD9bfX_B5AVtxU"
      // const authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ';
      const authorization = ctx.header.authorization;

      if (!authorization) {
        // ctx.status = 401;
        ctx.body = {
          success: false,
          errorMessage: 'Authorization header is missing',
        };
        return;
      }

      // 拆分以逗号为间隔的字符串，验证格式并提取token
      const parts = authorization.split(' ');
      if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
        // ctx.status = 401;
        ctx.body = {
          success: false,
          errorMessage: 'Authorization header invalid',
        };
        return;
      }

      // 由于 jwt.verify 会主动抛出异常，所以这里用 try catch来处理 token 的验证
      try {
        const token = parts[1];
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
        console.log(payload);
        // 将解码后的 payload 数据保存到 ctx.state.user 属性中
        ctx.state.user = payload;

        // 获取客户端请求的 IP 地址
        const remoteAddr = ctx.req.socket.remoteAddress;
        console.log(remoteAddr);
      } catch (err) {
        // ctx.status = 401;
        ctx.body = {
          success: false,
          errorCode: -1,
          errorMessage: '非法登录',
          // showType: 0,
          host: ctx.request.header.host,
        };
        return;
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
    // console.log('--------------validate Start-------------');

    // console.log(ctx.request.url);
    // console.log('--------------request.params---------------------');
    // 收到的应该是个 JSON
    // const queryData = ctx.request.body;
    // console.log(queryData.query);
    // console.log('--------------Query start---------------------');
    // const data = await ctx.service.graphql.query(JSON.stringify(queryData)); // 主查询方法
    // console.log(data.data);
    // console.log('--------------Query end---------------------');
    // const authkey = ctx.request.header.authkey;
    // console.log(authkey);
    // if (authkey !== undefined) {
    //   // 计算真正的atuhkey（未完成）
    // }
    // if (authkey === 'v2secret') {

    // } else {
    // 远程调用返回格式错误
    // ctx.throw(403, '非法的数据访问');
    // }
    // console.log('--------------response.body---------------------');
    // console.log(ctx.body);
    // console.log('--------------validate End----------------------');
  };
};
