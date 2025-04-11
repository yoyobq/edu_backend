'use strict';

/**
 * @file resolver.js
 * @description 解析器，处理 StaffWorkload 相关的查询。
 * @module graphql/staffWorkloadViews/resolver
 */

module.exports = {
  Query: {
    // 查询所有或部分教师的工作量（支持多条件）
    async staffWorkloads(_, { input }, ctx) {
      return await ctx.connector.staffWorkloadView.getStaffWorkloads(input);
    },

    //
    async staffWorkload(_, { input }, ctx) {
      return await ctx.connector.staffWorkloadView.getStaffWorkload(input);
    },
  },
};
