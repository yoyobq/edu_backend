'use strict';

const { DateTimeResolver } = require('graphql-scalars');

module.exports = {
  Query: {
    userInfo: (_, { id }, ctx) => {
      return ctx.connector.userInfo.fetchById(id);
    },

    userInfoList: (_, { page, pageSize }, ctx) => {
      return ctx.connector.userInfo.fetchList(page, pageSize);
    },
  },

  Mutation: {
    // insertUserInfo: (_, { params }, ctx) => {
    //   return ctx.connector.userInfo.insert(params);
    // },

    updateUserInfo: (_, { params }, ctx) => {
      return ctx.connector.userInfo.update(params);
    },
  },

  DateTime: DateTimeResolver,
};
