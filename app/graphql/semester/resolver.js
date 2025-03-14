'use strict';

/**
 * @file resolver.js
 * @description GraphQL 解析器，用于处理学期相关的查询和变更操作。
 *
 * @module graphql/semester/resolver
 */

module.exports = {
  Query: {
    /**
     * 获取单个学期信息
     * @param {Object} _ - 父级对象（占位）
     * @param {Object} param - 参数对象
     * @param {number} param.id - 学期 ID
     * @param {Object} ctx - Egg.js 上下文
     * @return {Promise<Object>} - 返回学期对象
     */
    async getSemester(_, { id }, ctx) {
      return await ctx.connector.semester.getSemester(id);
    },

    /**
     * 获取学期列表（可筛选学年和当前学期）
     * @param {Object} _ - 父级对象（占位）
     * @param {Object} param - 参数对象
     * @param {number} [param.schoolYear] - 学年（可选）
     * @param {boolean} [param.isCurrent] - 是否当前学期（可选）
     * @param {Object} ctx - Egg.js 上下文
     * @return {Promise<Array>} - 返回学期列表
     */
    async listSemesters(_, { schoolYear, isCurrent }, ctx) {
      return await ctx.connector.semester.listSemesters({ schoolYear, isCurrent });
    },
  },

  Mutation: {
    /**
     * 创建学期
     * @param {Object} _ - 父级对象（占位）
     * @param {Object} param - 参数对象
     * @param {Object} param.input - 学期创建参数
     * @param {Object} ctx - Egg.js 上下文
     * @return {Promise<Object>} - 返回新创建的学期
     */
    async createSemester(_, { input }, ctx) {
      return await ctx.connector.semester.createSemester(input);
    },

    /**
     * 更新学期信息
     * @param {Object} _ - 父级对象（占位）
     * @param {Object} param - 参数对象
     * @param {number} param.id - 学期 ID
     * @param {Object} param.input - 需要更新的字段
     * @param {Object} ctx - Egg.js 上下文
     * @return {Promise<Object>} - 返回更新后的学期对象
     */
    async updateSemester(_, { id, input }, ctx) {
      return await ctx.connector.semester.updateSemester(id, input);
    },

    /**
     * 删除学期
     * @param {Object} _ - 父级对象（占位）
     * @param {Object} param - 参数对象
     * @param {number} param.id - 学期 ID
     * @param {Object} ctx - Egg.js 上下文
     * @return {Promise<boolean>} - 删除成功返回 true，失败返回 false
     */
    async deleteSemester(_, { id }, ctx) {
      return await ctx.connector.semester.deleteSemester(id);
    },
  },
};
