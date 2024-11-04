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
};