'use strict';

/**
 * @file graphql_response_handler.js
 * @description Egg.js 中间件，用于处理 GraphQL 请求响应。主要解决以下问题：
 *
 * 1. 区分普通 GraphQL 数据查询请求与 GraphiQL 查询页面访问请求，
 *    并确保仅在 GraphQL 查询请求中进行自定义响应封装。
 * 2. 为来自前端的外部 GraphQL 查询请求提供标准化的响应结构，便于前端统一处理。
 * 3. 在开发模式中输出运行日志，便于实时监控和调试。
 *
 * 功能概述：
 * - 通过判断请求路径和响应内容类型来识别 GraphQL 请求。
 * - 封装 GraphQL 响应，增加 success、data、errorCode 等标准化字段，符合 Ant Design Pro 建议的格式。
 * - 在非生产环境下输出详细的日志信息，便于调试。
 * - 使用 ctx.logger 在生产环境中记录错误信息。
 *
 * 日志输出：
 * - 在非生产环境下，控制台输出检测到的 GraphQL 查询和可能的错误信息。
 * - 在生产环境下，错误信息通过 ctx.logger 记录。
 *
 * @module middleware/graphql_response_handler
 */

module.exports = () => {
  return async function graphqlResponseHandler(ctx, next) {
    let isGqlQuery = false;
    // 判断是否在生产环境
    const isProduction = process.env.NODE_ENV === 'production';

    // 判断是否是 GraphQL 查询请求，判断1 是否包含约定的 /grpahql 字符
    const isGraphqlPath = ctx.request.url.includes('/graphql');
    // 判断2 正常 grapqhl 都是 json
    const isJsonContent = ctx.request.header['content-type']?.includes('application/json');

    if (isGraphqlPath && isJsonContent) {
      // 符合 GraphQL 查询的路径和内容类型，表明这是一次 GraphQL 数据请求
      isGqlQuery = true;
      if (!isProduction) {
        const currentTime = new Date().toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
        console.log(`[${currentTime}]-------检测到外部发起的 GraphQL 查询-------`);
        // console.log(ctx.request.body.query);
      } else {
        ctx.logger.info(`GraphQL 请求发起自: ${ctx.request.header.referer || ctx.request.header.origin}`);
      }
    }

    await next();
    if (isGqlQuery) {
      const response = JSON.parse(ctx.body);
      // console.log(response);
      // 在控制台输出错误，并记录到日志
      if (response.errors) {
        // 生成标准结构的错误信息
        const errorCode = response.errors[0].extensions.code;
        const errorMessage = response.errors[0].message;
        const queryInfo = {
          method: ctx.request.method,
          query: ctx.request.body.query,
          variables: ctx.request.body.variables,
          url: ctx.request.url,
          referer: ctx.request.header.referer || ctx.request.header.origin,
        };

        const errInfo = {
          errorCode,
          errorMessage,
          queryInfo,
        };

        if (!isProduction) {
          const currentTime = new Date().toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
          console.log(`[${currentTime}]------- Graphql 异常处理信息 -------`);
        }
        ctx.logger.error('GraphQL 错误', errInfo);
      }

      const success = !response.errors;
      // 重新封装 graphql 的信息，如有错误，则增加 error，方便前端统一处理
      ctx.body = {
        success,
        data: response.data,
        errorCode: response.errors ? response.errors[0].extensions.code : undefined,
        errorMessage: response.errors ? response.errors[0].message : undefined,
        showType: response.errors ? response.errors[0].extensions.showType : 0, // 默认值 0 表示静默处理,
        // traceId: 2333,
        host: ctx.request.header.host,
      };
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
      // 默认的接口反馈形式是 body { data:{}, errors {} } 感觉这种形式也不错，
      if (!isProduction) {
        const currentTime = new Date().toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
        console.log(`[${currentTime}]------- Graphql 查询处理完成 -------`);
      }
    }
  };
};
