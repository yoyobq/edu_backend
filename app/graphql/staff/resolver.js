'use strict';

const { DateTimeResolver } = require('graphql-scalars');

module.exports = {
  Query: {
    getStaffById: (_, { id }, ctx) => {
      return ctx.connector.staff.fetchById(id);
    },

    getStaffByJobId: (_, { jobId }, ctx) => {
      return ctx.connector.staff.fetchByJobId(jobId);
    },

    getStaffByAccountId: (_, { accountId }, ctx) => {
      return ctx.connector.staff.fetchByAccountId(accountId);
    },
  },

  Mutation: {
    // createStaff: (_, { input }, ctx) => {
    //   return ctx.connector.staff.create(input);
    // },

    updateStaff: (_, { id, input }, ctx) => {
      return ctx.connector.staff.update(id, input);
    },

    deleteStaff: (_, { id }, ctx) => {
      return ctx.connector.staff.delete(id);
    },
  },

  DateTime: DateTimeResolver,
};
