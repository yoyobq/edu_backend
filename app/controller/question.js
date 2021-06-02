'use strict';

const Controller = require('egg').Controller;

class QuestionsController extends Controller {
  async index() {
    const ctx = this.ctx;
    console.log('index');

    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
    };

    ctx.body = await ctx.service.question.list(query);
  }

  async show() {
    const ctx = this.ctx;
    ctx.body = await ctx.service.question.find(ctx.helper.parseInt(ctx.params.id));
  }
}

module.exports = QuestionsController;
