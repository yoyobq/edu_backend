'use strict';

/**
 * @file connector.js
 * @description 连接器，转发 CourseSlot 相关的 GraphQL 请求到 service。
 * @module graphql/courseSlot/connector
 */

class CourseSlotConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.plan.courseSlot; // 课程时间安排的 service
  }

  /**
   * 获取单个课程时间安排
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程时间安排 ID
   * @return {Promise<object>} - 返回 CourseSlot 详情
   */
  async getCourseSlot({ id }) {
    return await this.service.getCourseSlot({ id });
  }

  /**
   * 获取课程时间安排列表（按学期、教师、星期筛选）
   * @param {Object} param - 参数对象
   * @param {number} [param.semesterId] - 学期 ID（可选）
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {number} [param.dayOfWeek] - 星期几（可选）
   * @return {Promise<Array>} - 返回 CourseSlot 列表
   */
  async listCourseSlots({ semesterId, staffId, dayOfWeek }) {
    return await this.service.listCourseSlots({ semesterId, staffId, dayOfWeek });
  }

  /**
   * 创建课程时间安排
   * @param {Object} param - 参数对象
   * @param {Object} param.input - 创建 CourseSlot 需要的数据
   * @return {Promise<object>} - 返回新创建的 CourseSlot
   */
  async createCourseSlot({ input }) {
    return await this.service.createCourseSlot({ input });
  }
}

module.exports = CourseSlotConnector;
