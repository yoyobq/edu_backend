'use strict';

/**
 * @file resolver.js
 * @description 解析器，处理 CourseSchedule 相关的查询和变更。
 * @module graphql/courseSchedule/resolver
 */

module.exports = {
  Query: {
    /**
     * 获取单个课程表信息
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.id - 课程表 ID
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回 CourseSchedule 详情
     */
    async getCourseSchedule(_, { id }, ctx) {
      return await ctx.connector.courseSchedule.getCourseSchedule(id);
    },

    /**
     * 获取课程表列表（按学期、教师筛选，并支持 includeSlots 参数）
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} [param.semesterId] - 学期 ID（可选）
     * @param {number} [param.staffId] - 教师 ID（可选）
     * @param {boolean} [param.includeSlots=false] - 是否加载课程时间安排 slots
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回 CourseSchedule 列表
     */
    async listCourseSchedules(_, { semesterId, staffId, includeSlots = false }, ctx) {
      return await ctx.connector.courseSchedule.listCourseSchedules(semesterId, staffId, includeSlots);
    },
  },

  Mutation: {
    /**
     * 创建课程表
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {Object} param.input - 创建课程表所需的数据
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回新创建的 CourseSchedule
     */
    async createCourseSchedule(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.createCourseSchedule(input);
    },

    /**
     * 更新课程表信息
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.id - 课程表 ID
     * @param {Object} param.input - 需要更新的数据
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回更新后的 CourseSchedule
     */
    async updateCourseSchedule(_, { id, input }, ctx) {
      return await ctx.connector.courseSchedule.updateCourseSchedule(id, input);
    },

    /**
     * 删除课程表
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.id - 课程表 ID
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<boolean>} - 删除成功返回 true
     */
    async deleteCourseSchedule(_, { id }, ctx) {
      return await ctx.connector.courseSchedule.deleteCourseSchedule(id);
    },
  },

  CourseSchedule: {
    /**
     * 解析 slots 关联字段
     * @param {Object} parent - 父级 CourseSchedule 对象
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回 slots 课程时间安排
     */
    async slots(parent, _, ctx) {
      return await ctx.connector.courseSlot.getSlotsByCourseScheduleId(parent.id);
    },

    /**
     * 解析 sourceMap 关联字段
     * @param {Object} parent - 父级 CourseSchedule 对象
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Object>} - 返回 sourceMap 课程爬取数据映射
     */
    async sourceMap(parent, _, ctx) {
      return await ctx.connector.courseSchedule.getSourceMapByScheduleId(parent.id);
    },
  },
};
