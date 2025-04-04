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
     * @param {Boolean} param.includeSourceMap - 是否加载 SSTS 爬取的 ID 信息
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回 CourseSchedule 列表
     */
    async listCourseSchedules(_, { semesterId, staffId, includeSlots = false, includeSourceMap = false }, ctx) {
      return await ctx.connector.courseSchedule.listCourseSchedules(semesterId, staffId, includeSlots, includeSourceMap);
    },

    /**
     * 获取教职工完整课表
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.staffId - 教职工ID
     * @param {number} param.semesterId - 学期ID
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回扁平化的排课数组
     */
    async getFullScheduleByStaff(_, { staffId, semesterId }, ctx) {
      return await ctx.service.plan.courseScheduleManager.getFullScheduleByStaff({ staffId, semesterId });
    },

    /**
     * 按日期查询教职工当天课表
     * @param {Object} _ - 占位符，GraphQL 约定，未使用
     * @param {Object} param - 参数对象
     * @param {number} param.staffId - 教职工ID
     * @param {string} param.date - 查询日期
     * @param {Object} ctx - Egg.js 上下文对象
     * @return {Promise<Array>} - 返回当天有效的课时安排
     */
    async getDailySchedule(_, { staffId, date }, ctx) {
      return await ctx.service.plan.courseScheduleManager.getDailySchedule({ staffId, date });
    },

    // 查询实际教学日期及日期中对应的课程
    async actualTeachingDates(_, { input }, ctx) {
      return await ctx.service.plan.courseScheduleManager.listActualTeachingDates(input);
    },

    // 查询因假期等事件取消的课程
    async cancelledCourses(_, { input }, ctx) {
      return await ctx.service.plan.courseScheduleManager.calculateCancelledCourses(input);
    },

    // 查询指定范围内实际有效的总课时数
    async teachingHours(_, { input }, ctx) {
      return await ctx.service.plan.courseScheduleManager.calculateTeachingHours(input);
    },

    // 批量统计多个教职工指定范围内实际有效的总课时数
    async batchTeachingHours(_, { input }, ctx) {
      return await ctx.service.plan.courseScheduleManager.calculateMultipleTeachingHours(input);
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
