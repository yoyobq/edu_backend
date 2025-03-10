'use strict';

const { GraphQLError } = require('graphql');
const Service = require('egg').Service;

class ErrorHandlerService extends Service {
  /**
   * 统一处理爬虫操作中的错误
   * @param {object} response - 响应数据
   * @throws {Error} - 抛出相应的错误并转化为 GraphQL 错误
   */
  async handleScrapingError(response) {
    // 保留一个错误示例
    // { code: 400, msg: '用户名密码错！', success: false }
    // 保证response有code和msg字段
    if (!response || typeof response.code === 'undefined' || typeof response.msg === 'undefined') {
      throw this.createGraphQLError({
        message: '来自校园网的响应数据缺失或格式不正确',
        code: 'INVALID_RESPONSE',
        showType: 2, // ERROR_MESSAGE
      });
    }

    const { code, msg } = response;

    // 错误码和显示类型映射配置
    const errorMapping = {
      400: { message: `校园网出错提示：${msg}`, code: 'BAD_REQUEST', showType: 2 }, // ERROR_MESSAGE
      500: { message: `校园网服务器错误：${msg}`, code: 'SERVER_ERROR', showType: 2 }, // ERROR_MESSAGE
      403: { message: `校园网权限错误：${msg}`, code: 'FORBIDDEN', showType: 1 }, // WARN_MESSAGE
      404: { message: `校园网页面不存在：${msg}`, code: 'NOT_FOUND', showType: 3 }, // NOTIFICATION
      default: { message: `校园网的未知错误：${msg || '错误信息缺失'}`, code: 'UNKNOWN_ERROR', showType: 2 }, // ERROR_MESSAGE
    };

    // 根据错误码选择映射的处理
    const error = errorMapping[code] || errorMapping.default;
    console.log(this.createGraphQLError(error));
    // 抛出相应的GraphQL错误
    throw this.createGraphQLError(error);
  }

  /**
 * 将错误信息转化为 GraphQL 错误格式
 * @param {Object} error - 错误信息对象
 * @param {string} error.message - 错误消息
 * @param {string} error.code - 错误码
 * @param {number} error.showType - 错误的显示方式
 * @return {GraphQLError} - 返回 GraphQL 错误格式
 */
  createGraphQLError({ message, code, showType }) {
    return new GraphQLError(message, {
      extensions: {
        code,
        showType, // 将 showType 包含进 GraphQL 错误扩展
      },
    });
  }
}

module.exports = ErrorHandlerService;
