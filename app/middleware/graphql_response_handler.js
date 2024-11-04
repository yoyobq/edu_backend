// app/middleware/graphql_error_handler.js
// 这个自己写的中间件是为了解决2个问题
// 1 egg-graphql 的 /graphql 不只是数据查询接口，还是自带的 graphql语句查询网页访问地址，
//   因此，访问 /graphql 地址以后反馈的未必是数据信息，也可能是一张网页信息，需要想办法加以区分
// 2 来自前端的外部查询，需要重新封装 /graphql 这个接口，更好的反馈数据，方便前端获取
// 除此以外，顺带提供了一个小功能，
// 3 run dev 的时候，能在后台即时输出运行的状态，方便debug
'use strict';

// const { EggConsoleLogger } = require('egg-logger');

module.exports = () => {
  return async function graphqlResponseHandler(ctx, next) {
    let isGqlQuery = false;

    // 获取访问源地址，说明不是响应查询，而是用于读取 egg-graphql 提供的查询网页
    const origin = ctx.request.header.origin;
    if (origin !== undefined || ctx.response.header['content-type'] !== 'text/html') {
      // 满足条件是一次查询，否则就是一张网页（不要对数据做处理）
      // console.log('发起了一次q/m');
      // Host 请求头指明了请求将要发送到的服务器主机名和端口号
      // const host = ctx.request.header.host;
      // 数据发送到;
      // console.log(host);
      // 数据来自于;
      // console.log(origin);

      // referer 代表发出当前请求的 URL
      const referer = ctx.request.header.referer;

      // 如果没有 referer，说明是在浏览器访问 GrqphiQL 查询页面
      // 如果查询页面后缀是 /graphql 说明就是在 GraphiQL 页面中查询，无需手动处理，
      if (referer !== undefined && !referer.endsWith('/graphql')) {
        isGqlQuery = true;
        console.log('-------检测到外部发起的 Graphql 查询-------');
        console.log('访问发起自:' + referer);
      }

      await next();

      if (isGqlQuery) {
        // antd pro 建议后台反馈数据的结构
        // export interface response {
        //   success: boolean; // 如果请求成功则为 true
        //   data?: any; // 响应数据
        //   errorCode?: string; // 错误类型的代码
        //   errorMessage?: string; // 显示给用户的错误信息
        //   showType?: number; // 错误显示类型：0 静默，1 message.warn，2 message.error，4 notification，9 page
        //   traceId?: string; // 便于后端故障排查的唯一请求 ID
        //   host?: string; // 便于后端故障排查的当前访问服务器的主机
        // }
        // console.log(ctx.body);
        const response = JSON.parse(ctx.body);
        // console.log(response);
        // 在控制台输出错误
        if (response.errors) {
          console.log('------- Graphql 异常处理信息 -------');
          console.log(response);
          // console.log(response.errors[0].extensions.code);
        }
        const success = !response.errors;
        // 重新封装 graphql 的信息，如有错误，则增加 error，方便前端统一处理
        ctx.body = {
          success,
          data: response.data,
          errorCode: response.errors ? response.errors[0].extensions.code : undefined,
          errorMessage: response.errors ? response.errors[0].message : undefined,
          showType: response.errors ? 0 : undefined,
          // traceId: 2333,
          host: ctx.request.header.host,
        };
        // 默认的接口反馈形式是 body { data:{}, errors {} } 感觉这种形式也不错，

        // console.log(ctx.body);
        console.log('------- Graphql 查询处理完成 -------\n');
      }
    }
  };
};
