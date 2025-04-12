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

    // 查询单个教师的工作量
    async staffWorkload(_, { input }, ctx) {
      return await ctx.connector.staffWorkloadView.getStaffWorkload(input);
    },

    // 查询多个教师的扣课信息
    async staffsCancelledCourses(_, { input }, ctx) {
      return await ctx.connector.staffWorkloadView.getCancelledCoursesForStaffs(input);
    },

    // 查询单个教师的扣课信息
    async staffCancelledCourses(_, { input }, ctx) {
      return await ctx.connector.staffWorkloadView.getCancelledCoursesForStaff(input);
    },
  },
};
