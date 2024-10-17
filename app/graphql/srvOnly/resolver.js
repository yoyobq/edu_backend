'use strict';

/**
 * @file resolver.js
 * @description 定义GraphQL解析器，用于处理发送验证码邮件的Mutation。
 *
 * 主要功能:
 * - 处理发送验证码邮件的请求。
 * - 将请求传递给 connector 进行处理。
 *
 * 使用场景:
 * - 该解析器用于GraphQL API的服务模块，处理发送验证码邮件的变更请求。
 *
 * 安全性考虑:
 * - 确保请求参数经过验证，防止潜在的安全问题。
 *
 * 示例:
 * mutation {
 *   sendVerifEmail(params: { email: "example@example.com", applicantId: 1, issuerId: 2, expiryTime: 3600000 })
 * }
 *
 * @module graphql/srvOnly/resolver
 */

module.exports = {
  Mutation: {
    /**
     * 将发送验证码邮件的请求转交给 connector。
     *
     * @param {Object} _ - GraphQL根对象（未使用）。
     * @param {Object} args - 包含Mutation输入参数的对象。
     * @param {Object} args.params - 包含验证码发送的所有必要信息的对象。
     * @param {Object} ctx - 上下文对象，包含connector和其他应用相关的对象。
     * @return {Boolean} - 布尔值，表示邮件是否成功发送。
     */
    sendVerifEmail: (_, { params }, ctx) => {
      // 将请求转发给 connector 处理
      return ctx.connector.srvOnly.sendVerifEmail(params);
    },
    checkVerifCode: (_, { params }, ctx) => {
      // 将请求转发给 connector 处理
      return ctx.connector.srvOnly.checkVerifCode(params);
    },
  },
};
