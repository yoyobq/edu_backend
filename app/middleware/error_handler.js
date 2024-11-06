/**
 * @file error_handler.js
 * @description 这是一个错误处理中间件，负责捕获所有的异常，并记录详细的错误信息到日志中，同时将错误信息返回给请求源。
 *
 * 主要功能:
 * - 捕获所有未处理的异常，并记录详细的错误信息到日志中。
 * - 对于没有状态码的错误，默认返回 500 状态码，并返回错误消息。
 * - 对于有状态码的错误，返回对应的状态码和错误消息。
 *
 * 使用场景:
 * - 该中间件适用于所有需要全局错误处理的场景，确保应用中的所有错误都能被捕获和处理。
 *
 * 安全性考虑:
 * - 在生产环境中，500 错误的详细错误内容不返回给客户端，以避免泄露敏感信息。
 *
 * @module middleware/error_handler
 */
'use strict';

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (error) {
      console.log(error);
      console.log(ctx.body.errorCode);
      // 所有的异常都在 app 上触发一个 error 事件，框架会记录一条错误日志
      // ctx.thorw 或 throw new Error 都会主动触发这个异常
      // ctx.app.emit('error', err, ctx);

      // 获取错误的状态码，默认为 500
      // const status = err.status || 500;

      // 生产环境时 500 错误的详细错误内容不返回给客户端，因为可能包含敏感信息
      // const error = status === 500 && ctx.app.config.env === 'prod'
      //   ? '服务器内部错误'
      //   : err.message;

      // 从 error 对象上读出各个属性，设置到响应中
      // ctx.body = { error: err.message };
      // if (status === 422) {
      //   ctx.body.detail = err.errors;
      // }
      // ctx.status = status;
    }
  };
};
