// app/middleware/graphql_error_handler.js
'use strict';

module.exports = () => {
  return async function graphqlErrorHandler(ctx, next) {
    await next();
    console.log('----origin-----');


    // 获取访问源地址，说明不是响应了一次查询，而是用于读取 egg-graphql 提供的查询网页
    const origin = ctx.request.header.origin;
    if (origin !== undefined || ctx.response.header['content-type'] !== 'text/html') {
      // 满足条件是一次查询，否则就是一张网页（不要对数据做处理）
      console.log('query');
      // Host 请求头指明了请求将要发送到的服务器主机名和端口号
      const host = ctx.request.header.host;

      // 数据发送到
      // console.log(host);
      // 数据来自于
      // console.log(origin);

      if (origin.indexOf(host) === -1) {
        // 不一致则说明：
        console.log('不是本eggjs服务发起，这是一次外部查询，需要封装反馈数据');
        // 重新封装 graphql 的错误信息，抛出标准的error，方便前端统一处理

        const body = JSON.parse(ctx.body);
        if (body.errors) {
          console.log('-------error msg-------');
          console.log(body.errors[0]);
          throw new Error(body.errors[0]);
        }
      }
      // 否则：console.log('本机，本端口，就是本eggjs服务器');
    }
  };
};
