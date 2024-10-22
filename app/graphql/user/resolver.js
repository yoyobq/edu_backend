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
    // 创建新用户
    async createUser(_, { params }, ctx) {
      return await ctx.connector.user.createUser(params);
    },

    // 更新用户信息
    async updateUser(_, { id, params }, ctx) {
      return await ctx.connector.user.updateUser(id, params);
    },
  },
};
