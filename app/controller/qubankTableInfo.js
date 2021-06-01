'use strict';

const Controller = require('egg').Controller;

class QubankTableInfoController extends Controller {
  async index() {
    const ctx = this.ctx;

    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
    };
    // console.log(query);
    ctx.body = await ctx.service.qubankTableInfo.list(query);
  }

  async show() {
    const ctx = this.ctx;
    ctx.body = await ctx.service.qubankTableInfo.find(ctx.helper.parseInt(ctx.params.id));
  }

  async create() {
    const ctx = this.ctx;
    const user = await ctx.service.qubankTableInfo.create(ctx.request.body);
    ctx.status = 201;
    ctx.body = user;
  }

  async update() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    const body = ctx.request.body;
    ctx.body = await ctx.service.qubankTableInfo.update({ id, updates: body });
  }

  async destroy() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    await ctx.service.qubankTableInfo.del(id);
    ctx.status = 200;
  }
}

module.exports = QubankTableInfoController;
