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
  },

  Mutation: {
    updateAccount: (_, { params }, ctx) => {
      return ctx.connector.account.update(params);
    },
  },

  DateTime: DateTimeResolver,
};

// module.exports = resolvers;
