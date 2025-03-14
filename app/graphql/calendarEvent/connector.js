'use strict';

/**
 * @file connector.js
 * @description 处理校历事件 (Calendar Event) 的数据库连接逻辑。
 */

class CalendarEventConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.calendarEventModel = ctx.model.Plan.CalendarEvent;
  }

  /**
   * 获取单个校历事件
   * @param {Object} param - 参数对象
   * @param {number} param.id - 事件 ID
   * @return {Promise<Object|null>} 返回校历事件
   */
  async getCalendarEvent({ id }) {
    return await this.calendarEventModel.findByPk(id);
  }

  /**
   * 获取某个学期的所有校历事件
   * @param {Object} param - 参数对象
   * @param {number} param.semesterId - 学期 ID
   * @return {Promise<Array>} 校历事件列表
   */
  async listCalendarEvents({ semesterId }) {
    return await this.calendarEventModel.findAll({
      where: { semesterId },
      order: [[ 'date', 'ASC' ]], // 按日期排序
    });
  }

  /**
   * 创建校历事件
   * @param {Object} input - 事件输入参数
   * @return {Promise<Object>} 创建的校历事件
   */
  async createCalendarEvent(input) {
    return await this.calendarEventModel.create(input);
  }

  /**
   * 更新校历事件
   * @param {number} id - 事件 ID
   * @param {Object} input - 需要更新的字段
   * @return {Promise<Object|null>} 更新后的事件
   */
  async updateCalendarEvent(id, input) {
    const event = await this.calendarEventModel.findByPk(id);
    if (!event) return null;
    return await event.update(input);
  }

  /**
   * 删除校历事件
   * @param {number} id - 事件 ID
   * @return {Promise<boolean>} 是否成功删除
   */
  async deleteCalendarEvent(id) {
    const event = await this.calendarEventModel.findByPk(id);
    if (!event) return false;
    await event.destroy();
    return true;
  }
}

module.exports = CalendarEventConnector;
