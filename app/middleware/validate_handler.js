// app/middleware/validate_handler.js
// 用于V2版本的后台安全验证

'use strict';

module.exports = () => {
  return async function validateHandler(ctx, next) {
    // // 获取客户端请求的 IP 地址
    // // const remoteAddr = ctx.req.socket.remoteAddress;
    // const remoteAddr = ctx.headers['x-real-ip'];
    console.log(ctx.request.header);
    console.log(ctx.request.ip); // .header);
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
    await next();
    // } else {
    // 远程调用返回格式错误
    // ctx.throw(403, '非法的数据访问');
    // }
    // console.log('--------------response.body---------------------');
    // console.log(ctx.body);
    // console.log('--------------validate End----------------------');
  };
};
