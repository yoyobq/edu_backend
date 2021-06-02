'use strict';

class QuestionConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll() {
    const ctx = this.ctx;
    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
      tableName: ctx.query.tableName,
    };
    const questions = await ctx.service.question.list(query);
    // 此处返回的数据类型应该与schema中的定义一致
    return questions;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const question = await ctx.service.question.find(ctx.helper.parseInt(id));
    console.log(question);
    return question;
  }
}

module.exports = QuestionConnector;

