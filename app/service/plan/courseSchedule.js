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
   * @param {boolean} param.includeSourceMap - 是否加载 SSTS 爬取的 ID 信息
   * @return {Promise<Array>} - 返回课程表列表
   */
  async listCourseSchedules({ semesterId, staffId, includeSlots = false, includeSourceMap = false }) {
    // 构建查询条件
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

    // 查询课程表数据
    const schedules = await this.ctx.model.Plan.CourseSchedule.findAll(queryOptions);

    // 如果不需要 sourceMap，直接返回 schedules
    if (!includeSourceMap) {
      return schedules;
    }

    // 直接查询所有的 sourceMap 数据，避免 hasOne 冗余展开
    const scheduleIds = schedules.map(s => s.id);
    const sourceMaps = await this.ctx.model.Ssts.CourseScheduleSourceMap.findAll({
      where: { courseScheduleId: scheduleIds },
      raw: true, // 直接返回 JSON，避免 Sequelize metadata
    });

    // **用 Map 结构加速匹配**
    const sourceMapMap = new Map(sourceMaps.map(sm => [ sm.courseScheduleId, sm ]));

    // **直接合并数据**
    return schedules.map(schedule => {
      const scheduleData = schedule.get({ plain: true });
      const sourceMapData = sourceMapMap.get(schedule.id) || {}; // 获取对应的 sourceMap，若无则为空对象
      // console.log({ ...scheduleData, ...sourceMapData });
      return { ...scheduleData, ...sourceMapData };
    });
  }
}

module.exports = CourseScheduleService;
