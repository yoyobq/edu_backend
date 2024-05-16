'use strict';

const { DateTimeResolver } = require('graphql-scalars');

module.exports = {
  Query: {
    accounts: (_, { params }, ctx) => {
      return ctx.connector.account.fetchAll(params);
    },

    account: (_, { id }, ctx) => {
      const res = ctx.connector.account.fetchById(id);
      return res;
    },

    // 此处函数名应遵照 schema 中的定义
    checkAccount: (_, { params }, ctx) => {
      const res = ctx.connector.account.fetchStatus(params);
      return res;
    },
  },

  Mutation: {
    updateAccount: (_, { params }, ctx) => {
      return ctx.connector.account.update(params);
    },

    insertAccount: (_, { params }, ctx) => {
      return ctx.connector.account.insert(params);
    },
  },

  DateTime: DateTimeResolver,
};

// module.exports = resolvers;
