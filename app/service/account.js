'use strict';

const Service = require('egg').Service;

class Account extends Service {
  async checkLogin(params) {
    // 先析构赋值
    // 如果 params 的值为假值（如 null、undefined、false 等），
    // 则使用一个空对象 {} 作为默认值，以避免后续的代码抛出错误。
    const { loginName, loginPassword, type } = params || {};
    console.log(loginName, loginPassword, type);

    const account = await this.ctx.model.Account.findOne({
      where: {
        loginName,
        loginPassword,
      },
      attributes: [ 'id', 'status' ],
    });

    if (account) {
      // 匹配成功
      console.log(account);
    } else {
      // 匹配失败
      console.log(account);
    }

  }
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
