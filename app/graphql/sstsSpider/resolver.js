'use strict';

module.exports = {
  Query: {
    // 登录 SSTS 智慧校园
    sstsLogin: async (_, { input }, ctx) => {
      const res = await ctx.connector.sstsSpider.login(input);
      return res;
    },

    sstsGetCurriPlan: async (_, { input }, ctx) => {
      const res = await ctx.connector.sstsSpider.getCurriPlan(input);
      return res;
    },
  },

  Mutation: {
    sstsSubmitTeachingLog: async (_, { input }, ctx) => {
      const res = await ctx.connector.sstsSpider.submitTeachingLog(input);
      return res;
    },

    sstsSubmitIntegratedTeachingLog: async (_, { input }, ctx) => {
      const res = await ctx.connector.sstsSpider.submitIntegratedTeachingLog(input);
      return res;
    },
  },
};
