'use strict';

/**
 * @file resolver.js
 * @description 解析器，处理 CourseSchedule 相关的查询和变更。
 * @module graphql/courseSchedule/resolver
 */

module.exports = {
  Query: {
    // /**
    //  * 获取单个课程表信息
    //  * @param {Object} _ - 占位符，GraphQL 约定，未使用
    //  * @param {Object} param - 参数对象
    //  * @param {number} param.id - 课程表 ID
    //  * @param {Object} ctx - Egg.js 上下文对象
    //  * @return {Promise<Object>} - 返回 CourseSchedule 详情
    //  */
    // async getCourseSchedule(_, { id }, ctx) {
    //   return await ctx.connector.courseSchedule.getCourseSchedule(id);
    // },

    // /**
    //  * 获取课程表列表（按学期、教师筛选，并支持 includeSlots 参数）
    //  * @param {Object} _ - 占位符，GraphQL 约定，未使用
    //  * @param {Object} param - 参数对象
    //  * @param {number} [param.semesterId] - 学期 ID（可选）
    //  * @param {number} [param.staffId] - 教师 ID（可选）
    //  * @param {boolean} [param.includeSlots=false] - 是否加载课程时间安排 slots
    //  * @param {Boolean} param.includeSourceMap - 是否加载 SSTS 爬取的 ID 信息
    //  * @param {Object} ctx - Egg.js 上下文对象
    //  * @return {Promise<Array>} - 返回 CourseSchedule 列表
    //  */
    // async listCourseSchedules(_, { semesterId, staffId, includeSlots = false, includeSourceMap = false }, ctx) {
    //   return await ctx.connector.courseSchedule.listCourseSchedules(semesterId, staffId, includeSlots, includeSourceMap);
    // },

    // 获取教职工完整课表
    async getFullScheduleByStaff(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.getFullScheduleByStaff({ input });
    },

    // 按日期查询教职工当天课表
    async getDailySchedule(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.getDailySchedule({ input });
    },

    // 查询实际教学日期及日期中对应的课程
    async actualTeachingDates(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.actualTeachingDates({ input });
    },

    // 查询因假期等事件取消的课程
    async cancelledCourses(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.cancelledCourses({ input });
    },

    // 查询指定范围内实际有效的总课时数
    async teachingHours(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.calculateTeachingHours(input);
    },

    // 批量统计多个教职工指定范围内实际有效的总课时数
    async batchTeachingHours(_, { input }, ctx) {
      return await ctx.connector.courseSchedule.calculateMultipleTeachingHours(input);
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
  /**
   * CourseSchedule 类型下 slots 与 sourceMap 字段的解析函数，
   * 是我用 AI 快速生成 resolver 时根据数据表的 DDL 自动添加的代码。
   *
   * 但这些 resolver 被我注释掉了，原因如下：
   *
   * - 本项目中，slots 和 sourceMap 字段的数据是通过 Sequelize 的关联查询（include）一次性预加载完成，
   *    无需再通过 GraphQL 字段 resolver 进行二次查询。
   * - GraphQL 在解析某字段时，如果父级对象（即 parent）中已包含对应字段值，且无 resolver 覆盖，
   *    则会自动返回该字段，无需显式声明 resolver。
   *
   * 之所以是注释保留代码，而不是完全删除，这是因为：
   *
   * - GraphQL 支持为任意字段定义 resolver，这使得我们可以精确控制每一个字段的数据来源，
   *    这种机制赋予了 GraphQL 极大的灵活性，尤其在处理**复杂关联查询**时，体现出以下优势
   * - 按需懒加载
   * - 支持分层解耦
   * - 更清晰的声明数据结构
   *
   *  如需未来支持懒加载或独立调用，可再为相关字段取消下来注释。
  */
  // CourseSchedule: {
  //   /**
  //    * 解析 slots 关联字段
  //    * @param {Object} parent - 父级 CourseSchedule 对象
  //    * @param {Object} _ - 占位符，GraphQL 约定，未使用
  //    * @param {Object} ctx - Egg.js 上下文对象
  //    * @return {Promise<Array>} - 返回 slots 课程时间安排
  //    */
  //   async slots(parent, _, ctx) {
  //     return await ctx.connector.courseSlot.getSlotsByCourseScheduleId(parent.id);
  //   },

  //   /**
  //    * 解析 sourceMap 关联字段
  //    * @param {Object} parent - 父级 CourseSchedule 对象
  //    * @param {Object} _ - 占位符，GraphQL 约定，未使用
  //    * @param {Object} ctx - Egg.js 上下文对象
  //    * @return {Promise<Object>} - 返回 sourceMap 课程爬取数据映射
  //    */
  //   async sourceMap(parent, _, ctx) {
  //     return await ctx.connector.courseSchedule.getSourceMapByScheduleId(parent.id);
  //   },
  // },
};
