'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async index() {
    const ctx = this.ctx;

    const query = {
      limit: ctx.helper.parseInt(ctx.query.limit),
      offset: ctx.helper.parseInt(ctx.query.offset),
    };
    console.log(query);
    ctx.body = await ctx.service.user.list(query);
  }

  async show() {
    const ctx = this.ctx;
    ctx.body = await ctx.service.user.find(ctx.helper.parseInt(ctx.params.id));
  }

  async create() {
    const ctx = this.ctx;
    const user = await ctx.service.user.create(ctx.request.body);
    ctx.status = 201;
    ctx.body = user;
  }

  async update() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    const body = ctx.request.body;
    ctx.body = await ctx.service.user.update({ id, updates: body });
  }

  async destroy() {
    const ctx = this.ctx;
    const id = ctx.helper.parseInt(ctx.params.id);
    await ctx.service.user.del(id);
    ctx.status = 200;
  }
}

module.exports = UserController;
// app/controller/users.js
// const Controller = require('egg').Controller;

// function toInt(str) {
//   if (typeof str === 'number') return str;
//   if (!str) return str;
//   return parseInt(str, 10) || 0;
// }

// class UserController extends Controller {
//   async index() {
//     const ctx = this.ctx;
//     const query = { limit: toInt(ctx.query.limit), offset: toInt(ctx.query.offset) };
//     console.log(query);
//     ctx.body = await ctx.model.User.findAll(query);
//   }

//   async show() {
//     const ctx = this.ctx;
//     ctx.body = await ctx.model.User.findByPk(toInt(ctx.params.id));
//   }

//   async create() {
//     const ctx = this.ctx;
//     const { name, age } = ctx.request.body;
//     const user = await ctx.model.User.create({ name, age });
//     ctx.status = 201;
//     ctx.body = user;
//   }

//   async update() {
//     const ctx = this.ctx;
//     const id = toInt(ctx.params.id);
//     const user = await ctx.model.User.findByPk(id);
//     if (!user) {
//       ctx.status = 404;
//       return;
//     }

//     const { name, age } = ctx.request.body;
//     await user.update({ name, age });
//     ctx.body = user;
//   }

//   async destroy() {
//     const ctx = this.ctx;
//     const id = toInt(ctx.params.id);
//     const user = await ctx.model.User.findByPk(id);
//     if (!user) {
//       ctx.status = 404;
//       return;
//     }

//     await user.destroy();
//     ctx.status = 200;
//   }
// }

// module.exports = UserController;
