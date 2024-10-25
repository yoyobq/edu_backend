'use strict';

/**
 * @file resolver.js
 * @description 定义 GraphQL 解析器，用于处理用户相关的查询和变更操作。
 *
 * @module graphql/user/resolver
 */

module.exports = {
  Query: {
    // 获取单个用户信息
    async getUserDetails(_, { id }, ctx) {
      return await ctx.connector.user.getUserDetails(id);
    },

    // 获取所有用户列表
    async listUsers(_, __, ctx) {
      return await ctx.connector.user.listUsers();
    },
  },

  Mutation: {
    // 注册流程，整合注册信息后创建新用户
    registerUser: (_, { input }, ctx) => {
      return ctx.connector.user.registerUser(input);
    },

    // 更新用户信息
    updateUser: (_, { id, params }, ctx) => {
      return ctx.connector.user.updateUser(id, params);
    },
  },
};
