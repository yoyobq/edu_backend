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
    // 预处理数据后访问 courseScheduleManager
    this.preparerService = ctx.service.plan.courseSchedulePreparer;
    this.managerService = ctx.service.plan.courseScheduleManager;
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
   * 按工号和学期号查询某个教职工对应学期课表（不考虑特殊事件，自动识别所属学期）
   * @param {Object} param - 参数对象
   * @param {object} param.input - 包含查询条件的对象（如  staffId、semesterId 等）
   * @return {Promise<Array>} - 当天有效的课时安排
   */
  async getFullScheduleByStaff({ input }) {
    return await this.managerService.getFullScheduleByStaff(input);
  }

  /**
   * 按日期查询某个教职工当天的课表（考虑特殊事件，自动识别所属学期）
   * @param {Object} param - 参数对象
   * @param {object} param.input - 包含查询条件的对象（如  staffId、date 等）
   * @return {Promise<Array>} - 当天有效的课时安排
   */
  async getDailySchedule({ input }) {
    return await this.managerService.getDailySchedule(input);
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
    return await this.service.listCourseSchedules({ semesterId, staffId, includeSlots, includeSourceMap });
  }

  /**
   * 查询实际教学日期及日期中对应的课程
   * @param {object} param - 输入对象
   * @param {object} param.input - 包含查询条件的对象（如 semesterId、sstsTeacherId, staffId、weeks 等）
   * @return {Promise<Array>} - 返回实际有效的上课日期及课时详情
   */
  async actualTeachingDates({ input }) {
    const result = await this.preparerService.actualTeachingDates(input);
    return result;
  }

  /**
   * 查询因假期取消的课程
   * @param {object} param - 输入对象
   * @param {object} param.input - 包含查询条件的对象（如 semesterId、sstsTeacherId, staffId、weeks 等）
   * @return {Promise<Array>} - 返回取消的课程列表
   */
  async cancelledCourses({ input }) {
    const result = await this.preparerService.cancelledCourses(input);
    return result;
  }

  /**
   * 查询指定范围内实际有效的总课时数
   * @param {object} param - 输入对象
   * @param {object} param.input - 包含查询条件的对象（如 semesterId、sstsTeacherId, staffId、weeks 等）
   * @return {Promise<number>} - 返回有效课时总数
   */
  async teachingHours({ input }) {
    const result = await this.preparerService.teachingHours(input);
    return result;
  }

  /**
   * 批量统计多个教职工指定范围内实际有效的总课时数
   * @param {object} param - 输入对象
   * @param {object} param.input - 包含查询条件的对象（如 semesterId、sstsTeacherIds, staffIds、weeks 等）
   * @return {Promise<Array>} - 返回每个教职工的课时统计
   */
  async batchTeachingHours({ input }) {
    const result = await this.managerService.calculateMultipleTeachingHours(input);
    return result;
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
