'use strict';

/**
 * @file service/plan/courseSchedule.js
 * @description 课程表 Service 层，处理业务逻辑。
 * @module service/plan/courseSchedule
 */

const { Service } = require('egg');

class CourseScheduleService extends Service {
  /**
   * 获取单个课程表
   * @param {Object} param - 参数对象
   * @param {number} param.id - 课程表 ID
   * @return {Promise<object|null>} - 返回 CourseSchedule 详情
   */
  async getCourseSchedule({ id }) {
    return await this.ctx.model.Plan.CourseSchedule.findByPk(id);
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
    const queryOptions = {
      where: {},
    };
    if (semesterId) queryOptions.where.semesterId = semesterId;
    if (staffId) queryOptions.where.staffId = staffId;

    if (includeSlots) {
      queryOptions.include = [{
        model: this.ctx.model.Plan.CourseSlot,
        as: 'slots',
      }];
    }

    return await this.ctx.model.Plan.CourseSchedule.findAll(queryOptions);
  }
}

module.exports = CourseScheduleService;
