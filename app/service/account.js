'use strict';

const Service = require('egg').Service;

/** 23-3-18 Service 的职责是处理业务逻辑，它应该是抽象的，独立于任何数据源。
 *  因此，在 GraphQL + Sequelize 的架构中，
 *  Service 应该将它们的实现与 Sequelize 模型解耦，这样它们就可以处理不同的数据源，
 * 而不仅仅是 Sequelize 模型。
**/

class Account extends Service {
  async list({ offset = 0, limit = 10 }) {
    // 21-5-20 此处的 findAndCountAll 是 sequelize 中的查询方法
    const res = await this.ctx.model.Account.findAndCountAll({
      offset,
      limit,
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
    });
    // return this.ctx.model.User.findAll();
    return res.rows;
  }

  async find(id) {
    // findByPk 也是
    const account = await this.ctx.model.Account.findByPk(id);
    if (!account) {
      this.ctx.throw(404, 'account not found');
    }
    return account;
  }

  async findWithCondition(condition) {
    const account = await this.ctx.model.Account.findOne(condition);
    return account;
  }

  async create(account) {
    // create 也是
    return this.ctx.model.User.create(account);
  }

  async update({ id, updates }) {
    const account = await this.ctx.model.Account.findByPk(id);
    if (!account) {
      this.ctx.throw(404, 'account not found');
    }

    // update 也是
    return account.update(updates);
  }

  async del(id) {
    const user = await this.ctx.model.Account.findByPk(id);
    if (!user) {
      this.ctx.throw(404, 'Account not found');
    }

    // destory 也是
    return user.destroy();
  }
}

module.exports = Account;