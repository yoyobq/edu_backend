'use strict';

module.exports = () => {
  return async function sstsResponseHandler(ctx, next) {
    await next();

    // 如果不是 graphql 访问，无需处理
    if (ctx.request.method !== 'POST' || ctx.request.path !== '/graphql') {
      return;
    }

    // 如果不是 ssts 打头的操作（即非校园网爬虫操作），无需处理
    const { operationName } = ctx.request.body;
    if (!operationName || !operationName.startsWith('ssts')) {
      return;
    }

    const response = ctx.response;
    // 如果查询成功，无需处理
    if (response.status === 200) {
      return;
    }

    console.log('-----本次查询出错的 Request.bod 及 Response.data 数据为-------');
    console.log(ctx.request.body);
    console.log(response.data);
    // 后台抛出的错误 response.data 示例
    // { code: 400, msg: '用户名密码错！', success: false }
  };
};
