'use strict';

/**
 * @file resolver.js
 * @description 定义GraphQL解析器，用于处理用户账户相关的查询和变更操作。
 *
 * 主要功能:
 * - 处理查询请求，如查询用户账户信息列表、查询单个用户账户信息。
 * - 处理变更请求，如更新用户账户信息、插入新的用户账户信息。
 * - 通过调用连接器与数据库进行交互，并返回查询或变更结果。
 *
 * 使用场景:
 * - 该解析器用于GraphQL API的用户账户模块，处理前端发送的查询和变更请求。
 *
 * 安全性考虑:
 * - 确保查询和变更操作的参数经过验证，防止SQL注入等安全问题。
 *
 * 示例:
 * query {
 *   account(id: 1) {
 *     id
 *     loginName
 *     loginEmail
 *     status
 *   }
 * }
 *
 * mutation {
 *   updateAccount(params: { id: 1, loginName: "newName" }) {
 *     id
 *     loginName
 *     loginEmail
 *     status
 *   }
 * }
 *
 * @module graphql/account/resolver
 */


const { DateTimeResolver } = require('graphql-scalars');

module.exports = {
  Query: {
    // 检查用户登录账户密码
    async userLoginCheck(_, { params }, ctx) {
      return await ctx.connector.account.userLoginCheck(params);
    },
    // accounts: (_, { params }, ctx) => {
    //   const res = ctx.connector.account.fetchAll(params);
    //   return res;
    // },

    // account: (_, { id }, ctx) => {
    //   const res = ctx.connector.account.fetchById(id);
    //   return res;
    // },

    accountByLoginEmail: (_, { loginEmail }, ctx) => {
      const res = ctx.connector.account.fetchByLoginEmail(loginEmail);
      return res;
    },

    // 此处函数名应遵照 schema 中的定义
    // checkAccount: (_, { params }, ctx) => {
    //   const res = ctx.connector.account.findLoginAccount(params);
    //   return res;
    // },
  },

  // Mutation: {
  //   updateAccount: (_, { params }, ctx) => {
  //     return ctx.connector.account.update(params);
  //   },

  //   insertAccount: (_, { params }, ctx) => {
  //     return ctx.connector.account.insert(params);
  //   },
  // },

  DateTime: DateTimeResolver,
};

// module.exports = resolvers;
