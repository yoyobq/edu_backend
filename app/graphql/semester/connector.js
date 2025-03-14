'use strict';

/**
 * @file connector.js
 * @description 学期连接器，处理与数据库的交互。
 *
 * @module graphql/semester/connector
 */

class SemesterConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.semesterService = ctx.service.plan.semester;
  }

  /**
   * 获取单个学期信息
   * @param {number} id - 学期 ID
   * @return {Promise<object|null>} - 返回 Semester 详情
   */
  async getSemester(id) {
    return await this.semesterService.getSemester({ id });
  }

  /**
   * 获取学期列表
   * @param {Object} param - 查询参数
   * @param {number} [param.schoolYear] - 学年（可选）
   * @param {boolean} [param.isCurrent] - 是否当前学期（可选）
   * @return {Promise<Array>} - 返回学期列表
   */
  async listSemesters(param) {
    return await this.semesterService.listSemesters(param);
  }

  /**
   * 创建新学期
   * @param {Object} input - 创建学期的参数
   * @return {Promise<object>} - 返回新创建的学期信息
   */
  async createSemester(input) {
    return await this.semesterService.createSemester(input);
  }

  /**
   * 更新学期信息
   * @param {number} id - 学期 ID
   * @param {Object} input - 需要更新的字段
   * @return {Promise<object>} - 返回更新后的学期对象
   */
  async updateSemester(id, input) {
    return await this.semesterService.updateSemester(id, input);
  }

  /**
   * 删除学期
   * @param {number} id - 学期 ID
   * @return {Promise<boolean>} - 删除成功返回 true，失败返回 false
   */
  async deleteSemester(id) {
    return await this.semesterService.deleteSemester(id);
  }
}

module.exports = SemesterConnector;
