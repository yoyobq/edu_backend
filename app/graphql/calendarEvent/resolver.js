'use strict';

/**
 * @file resolver.js
 * @description 处理校历事件 (Calendar Event) 的 GraphQL 解析器。
 */

module.exports = {
  Query: {
    /**
     * 获取单个校历事件
     * @param {Object} _ - 根对象
     * @param {Object} param - 参数对象
     * @param {number} param.id - 事件 ID
     * @param {Object} ctx - 上下文
     * @return {Promise<Object>} 校历事件对象
     */
    async getCalendarEvent(_, { id }, ctx) {
      return await ctx.connector.calendarEvent.getCalendarEvent({ id });
    },

    /**
     * 获取学期的所有校历事件
     * @param {Object} _ - 根对象
     * @param {Object} param - 参数对象
     * @param {number} param.semesterId - 学期 ID
     * @param {Object} ctx - 上下文
     * @return {Promise<Array>} 校历事件数组
     */
    async listCalendarEvents(_, { semesterId }, ctx) {
      return await ctx.connector.calendarEvent.listCalendarEvents({ semesterId });
    },
  },

  Mutation: {
    /**
     * 创建校历事件
     * @param {Object} _ - 根对象
     * @param {Object} param - 参数对象
     * @param {Object} param.input - 创建事件的输入数据
     * @param {Object} ctx - 上下文
     * @return {Promise<Object>} 创建的校历事件
     */
    async createCalendarEvent(_, { input }, ctx) {
      return await ctx.connector.calendarEvent.createCalendarEvent(input);
    },

    /**
     * 更新校历事件
     * @param {Object} _ - 根对象
     * @param {Object} param - 参数对象
     * @param {number} param.id - 事件 ID
     * @param {Object} param.input - 更新的字段
     * @param {Object} ctx - 上下文
     * @return {Promise<Object>} 更新后的校历事件
     */
    async updateCalendarEvent(_, { id, input }, ctx) {
      return await ctx.connector.calendarEvent.updateCalendarEvent(id, input);
    },

    /**
     * 删除校历事件
     * @param {Object} _ - 根对象
     * @param {Object} param - 参数对象
     * @param {number} param.id - 事件 ID
     * @param {Object} ctx - 上下文
     * @return {Promise<boolean>} 是否成功删除
     */
    async deleteCalendarEvent(_, { id }, ctx) {
      return await ctx.connector.calendarEvent.deleteCalendarEvent(id);
    },
  },
};
