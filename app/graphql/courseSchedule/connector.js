'use strict';

/**
 * @file connector.js
 * @description 连接器，转发 CourseSchedule 相关的 GraphQL 请求到 service。
 * @module graphql/courseSchedule/connector
 */

class CourseScheduleConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.plan.courseSchedule; // 课程表的 service
  }

  /**
   * 获取单个课程表
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程表 ID
   * @return {Promise<object>} - 返回 CourseSchedule 详情
   */
  async getCourseSchedule({ id }) {
    return await this.service.getCourseSchedule({ id });
  }

  /**
   * 获取课程表列表（按学期、教师筛选，并支持 includeSlots 参数）
   * @param {Object} param - 参数对象
   * @param {number} [param.semesterId] - 学期 ID（可选）
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {boolean} [param.includeSlots=false] - 是否加载课程时间安排 slots
   * @return {Promise<Array>} - 返回课程表列表
   */
  async listCourseSchedules({ semesterId, staffId, includeSlots = false }) {
    return await this.service.listCourseSchedules({ semesterId, staffId, includeSlots });
  }

  /**
   * 创建课程表
   * @param {Object} param - 参数对象
   * @param {object} param.input - 创建课程表的数据
   * @return {Promise<object>} - 返回新创建的 CourseSchedule
   */
  async createCourseSchedule({ input }) {
    return await this.service.createCourseSchedule({ input });
  }

  /**
   * 更新课程表
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程表 ID
   * @param {object} param.input - 课程表更新数据
   * @return {Promise<object>} - 返回更新后的 CourseSchedule
   */
  async updateCourseSchedule({ id, input }) {
    return await this.service.updateCourseSchedule({ id, input });
  }

  /**
   * 删除课程表
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程表 ID
   * @return {Promise<boolean>} - 删除成功返回 true
   */
  async deleteCourseSchedule({ id }) {
    return await this.service.deleteCourseSchedule({ id });
  }

  /**
   * 获取课程时间安排（slots）
   * @param {Object} param - 参数对象
   * @param {number} param.courseScheduleId - 课程表 ID
   * @return {Promise<Array>} - 返回该课程表的所有时间安排
   */
  async getSlotsByCourseScheduleId({ courseScheduleId }) {
    return await this.ctx.service.courseSlot.getSlotsByCourseScheduleId({ courseScheduleId });
  }

  /**
   * 获取爬取的课程映射数据（sourceMap）
   * @param {Object} param - 参数对象
   * @param {number} param.courseScheduleId - 课程表 ID
   * @return {Promise<object>} - 返回 CourseSourceMap 详情
   */
  async getSourceMapByScheduleId({ courseScheduleId }) {
    return await this.service.getSourceMapByScheduleId({ courseScheduleId });
  }
}

module.exports = CourseScheduleConnector;
