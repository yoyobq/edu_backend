'use strict';

/**
 * @file service/plan/calendarEvent.js
 * @description 处理校历事件的业务逻辑。
 * @module service/plan/calendarEvent
 */

const { Service } = require('egg');

class CalendarEventService extends Service {
  /**
   * 获取单个校历事件
   * @param {Object} param - 参数对象
   * @param {number} param.id - 事件 ID
   * @return {Promise<object|null>} - 返回校历事件详情
   */
  async getCalendarEvent({ id }) {
    return await this.ctx.model.Plan.CalendarEvent.findByPk(id);
  }

  /**
   * 获取校历事件列表（可选按学期查询）
   * @param {Object} param - 参数对象
   * @param {number} [param.semesterId] - 学期 ID（可选）
   * @return {Promise<Array>} - 返回校历事件列表
   */
  async listCalendarEvents({ semesterId }) {
    const queryOptions = { where: {} };
    if (semesterId) queryOptions.where.semesterId = semesterId;
    return await this.ctx.model.Plan.CalendarEvent.findAll(queryOptions);
  }

  /**
   * 创建校历事件
   * @param {Object} input - 事件数据
   * @return {Promise<object>} - 返回新创建的事件
   */
  async createCalendarEvent(input) {
    return await this.ctx.model.Plan.CalendarEvent.create(input);
  }

  /**
   * 更新校历事件
   * @param {Object} param - 参数对象
   * @param {number} param.id - 事件 ID
   * @param {Object} param.input - 需要更新的数据
   * @return {Promise<object|null>} - 返回更新后的事件
   */
  async updateCalendarEvent({ id, ...input }) {
    const event = await this.ctx.model.Plan.CalendarEvent.findByPk(id);
    if (!event) return null;
    await event.update(input);
    return event;
  }

  /**
   * 删除校历事件
   * @param {Object} param - 参数对象
   * @param {number} param.id - 事件 ID
   * @return {Promise<boolean>} - 返回是否删除成功
   */
  async deleteCalendarEvent({ id }) {
    const event = await this.ctx.model.Plan.CalendarEvent.findByPk(id);
    if (!event) return false;
    await event.destroy();
    return true;
  }
}

module.exports = CalendarEventService;
