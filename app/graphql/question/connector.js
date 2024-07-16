'use strict';

class QuestionConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll(tableName, type = null) {
    const ctx = this.ctx;
    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),

      // 自定义前缀，防止用户猜测 tableName
      tableName: 'qubank_' + tableName,

      // 规定题型 'sin' 'mul' 'jug'
      type,
    };
    const questions = await ctx.service.practice.question.list(query);
    return questions;
  }

  async fetchById(id, tableName) {
    const ctx = this.ctx;

    tableName = 'qubank_' + tableName;

    const query = {
      id: ctx.helper.parseInt(id),
      tableName,
    };

    const question = await ctx.service.practice.question.find(query);

    return question;
  }
}

module.exports = QuestionConnector;

