// app/middleware/error_handler.js
// 参照eggjs教程，用于响应RESTful API的错误
// 将错误的详细信息记录进日志，并向请求源发送error中的字符串
'use strict';

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      console.log('--------error----------');
      // 所有的异常都在 app 上触发一个 error 事件，框架会记录一条错误日志
      // ctx.thorw 就会主动触发这个异常
      ctx.app.emit('error', err, ctx);
      const status = err.status || 500;
      // 生产环境时 500 错误的详细错误内容不返回给客户端，因为可能包含敏感信息
      const error = status === 500 && ctx.app.config.env === 'prod'
        ? '服务器内部错误'
        : err.message;

      // 从 error 对象上读出各个属性，设置到响应中
      ctx.body = { error };
      if (status === 422) {
        ctx.body.detail = err.errors;
      }
      ctx.status = status;
    }
  };
};
