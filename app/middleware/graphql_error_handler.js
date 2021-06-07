// app/middleware/graphql_error_handler.js
// 这个自己写的中间件是为了解决2个问题
// 1 egg-graphql 的 /graphql 不只是数据查询接口，还是自带的 graphql语句查询网页访问地址，
//   因此，访问 /graphql 地址以后反馈的未必是数据信息，也可能是一张网页信息，需要想办法加以区分
// 2 来自前端的外部查询，需要重新封装 /graphql 这个接口，更好的反馈数据，方便前端获取
// 除此以外，顺带提供了一个小功能，
// 3 run dev 的时候，能在后台即时输出运行的状态，方便debug
'use strict';

module.exports = () => {
  return async function graphqlErrorHandler(ctx, next) {
    await next();

    // 获取访问源地址，说明不是响应查询，而是用于读取 egg-graphql 提供的查询网页
    const origin = ctx.request.header.origin;
    if (origin !== undefined || ctx.response.header['content-type'] !== 'text/html') {
      // 满足条件是一次查询，否则就是一张网页（不要对数据做处理）
      // console.log('发起了一次q/m');
      // Host 请求头指明了请求将要发送到的服务器主机名和端口号
      const host = ctx.request.header.host;

      // 数据发送到
      // console.log(host);
      // 数据来自于
      // console.log(ctx.request);
      // console.log(origin);

      if (origin.indexOf(host) === -1) {
        // 不一致则说明：
        // console.log('不是本eggjs服务发起，这是一次外部查询，需要封装反馈数据');
        // 重新封装 graphql 的错误信息，抛出标准的error，方便前端统一处理
        const body = JSON.parse(ctx.body);
        // console.log(body);

        if (body.errors) {
          console.log('-------Graphql Middleware Error Msg-------');
          console.log(body.errors[0]);

          // 2021-6-5补充，突然觉得重新封装未必必要，默认的接口反馈形式是
          // { data:{}, errors {} } 感觉这种形式也不错，
          // 内部系统，让前端知道具体发生了什么也方便溯源
          // 所以本来准在这里重新封装返回数据的，现在思路变了，暂时取消。
          // 但架构保留，至少调试的时候方便 debug
          // const err = new Error(body.errors[0].message);
          // err.name = 'Graphql Error';
          // err.status = 400;
          // err.statusText = body.errors[0].message;
        }
      }
      // 否则：console.log('本机，本端口，就是本eggjs服务器');
    }
  };
};
