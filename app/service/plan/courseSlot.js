'use strict';

/**
 * @file service/plan/courseSlot.js
 * @description 课程时间安排 Service 层，处理业务逻辑。
 * @module service/plan/courseSlot
 */

const { Service } = require('egg');

class CourseSlotService extends Service {
  /**
   * 获取单个课程时间安排
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程时间安排 ID
   * @return {Promise<object|null>} - 返回 CourseSlot 详情
   */
  async getCourseSlot({ id }) {
    return await this.ctx.model.Plan.CourseSlot.findByPk(id);
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
    const queryOptions = {
      where: {},
    };
    if (semesterId) queryOptions.where.semesterId = semesterId;
    if (staffId) queryOptions.where.staffId = staffId;
    if (dayOfWeek) queryOptions.where.dayOfWeek = dayOfWeek;

    return await this.ctx.model.Plan.CourseSlot.findAll(queryOptions);
  }
}

module.exports = CourseSlotService;
