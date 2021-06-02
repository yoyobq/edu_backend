'use strict';

class QuestionConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll(tableName) {
    const ctx = this.ctx;
    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
      tableName,
    };
    const questions = await ctx.service.question.list(query);
    // 此处返回的数据类型应该与schema中的定义一致
    return questions;
  }

  async fetchById(id, tableName) {
    const ctx = this.ctx;
    const question = await ctx.service.question.find(ctx.helper.parseInt(id), tableName);

    return question;
  }
}

module.exports = QuestionConnector;

