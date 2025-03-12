'use strict';

/**
 * @file resolver.js
 * @description 解析器，处理 CourseSlot 相关的查询和变更。
 * @module graphql/courseSlot/resolver
 */

module.exports = {
  Query: {
    /**
     * 获取单个课程时间安排
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.id - 课程时间安排 ID
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回 CourseSlot 详情
     */
    async getCourseSlot(_, { id }, ctx) {
      return await ctx.connector.courseSlot.getCourseSlot({ id });
    },

    /**
     * 获取课程时间安排列表（支持按学期、教师、星期几筛选）
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} [param.semesterId] - 学期 ID（可选）
     * @param {number} [param.staffId] - 教师 ID（可选）
     * @param {number} [param.dayOfWeek] - 星期几（可选）
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回 CourseSlot 列表
     */
    async listCourseSlots(_, { semesterId, staffId, dayOfWeek }, ctx) {
      return await ctx.connector.courseSlot.listCourseSlots({ semesterId, staffId, dayOfWeek });
    },
  },

  Mutation: {
    /**
     * 创建课程时间安排
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {Object} param.input - 创建 CourseSlot 需要的数据
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回新创建的 CourseSlot
     */
    async createCourseSlot(_, { input }, ctx) {
      return await ctx.connector.courseSlot.createCourseSlot({ input });
    },
  },

  CourseSlot: {
    /**
     * 解析 courseSchedule 关联字段
     * @param {Object} parent - 父级 CourseSlot 对象
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回关联的 CourseSchedule 数据
     */
    async courseSchedule(parent, _, ctx) {
      return await ctx.connector.courseSchedule.getCourseSchedule({ id: parent.courseScheduleId });
    },
  },
};
