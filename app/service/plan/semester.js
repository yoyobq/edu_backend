'use strict';

/**
 * @file service/plan/semester.js
 * @description 处理学期的业务逻辑
 *
 * @module service/plan/semester
 */

const { Service } = require('egg');

class SemesterService extends Service {
  /**
   * 获取单个学期信息
   * @param {Object} param - 参数对象
   * @param {number} param.id - 学期 ID
   * @return {Promise<Object|null>} - 返回学期对象或 null
   */
  async getSemester({ id }) {
    return await this.ctx.model.Plan.Semester.findByPk(id);
  }

  /**
   * 获取学期列表
   * @param {Object} param - 查询参数
   * @param {number} [param.schoolYear] - 学年（可选）
   * @param {boolean} [param.isCurrent] - 是否当前学期（可选）
   * @return {Promise<Array>} - 返回学期列表
   */
  async listSemesters({ schoolYear, isCurrent }) {
    const queryOptions = { where: {} };

    if (schoolYear) queryOptions.where.schoolYear = schoolYear;
    if (typeof isCurrent !== 'undefined') queryOptions.where.isCurrent = isCurrent;

    return await this.ctx.model.Plan.Semester.findAll(queryOptions);
  }

  /**
   * 创建新学期
   * @param {Object} input - 学期创建参数
   * @return {Promise<Object>} - 返回新创建的学期对象
   */
  async createSemester(input) {
    return await this.ctx.model.Plan.Semester.create(input);
  }

  /**
   * 更新学期信息
   * @param {number} id - 学期 ID
   * @param {Object} input - 需要更新的字段
   * @return {Promise<Object|null>} - 返回更新后的学期对象
   */
  async updateSemester(id, input) {
    const semester = await this.ctx.model.Plan.Semester.findByPk(id);
    if (!semester) return null;

    return await semester.update(input);
  }

  /**
   * 删除学期
   * @param {number} id - 学期 ID
   * @return {Promise<boolean>} - 返回是否删除成功
   */
  async deleteSemester(id) {
    const semester = await this.ctx.model.Plan.Semester.findByPk(id);
    if (!semester) return false;

    await semester.destroy();
    return true;
  }
}

module.exports = SemesterService;
