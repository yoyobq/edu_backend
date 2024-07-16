'use strict';

const Controller = require('egg').Controller;

class AccountController extends Controller {
  async index() {
    const ctx = this.ctx;

    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
    };
    // console.log(query);
    ctx.body = await ctx.user.service.account.list(query);
  }

  async show() {
    const ctx = this.ctx;
    ctx.body = await ctx.service.user.account.find(ctx.helper.parseInt(ctx.params.id));
  }

  async create() {
    const ctx = this.ctx;
    const account = await ctx.service.user.account.create(ctx.request.body);
    ctx.status = 201;
    ctx.body = account;
  }

  async update() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    const body = ctx.request.body;
    ctx.body = await ctx.service.user.account.update({ id, updates: body });
  }

  async destroy() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    await ctx.service.user.account.del(id);
    ctx.status = 200;
  }
}

module.exports = AccountController;
