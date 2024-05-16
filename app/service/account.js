'use strict';

const Service = require('egg').Service;

/** 23-3-18 Service 的职责是处理业务逻辑，它应该是抽象的，独立于任何数据源。
 *  因此，在 GraphQL + Sequelize 的架构中，
 *  Service 应该将它们的实现与 Sequelize 模型解耦，这样它们就可以处理不同的数据源，
 * 而不仅仅是 Sequelize 模型。
 **/

/** 24-5-15 再次提醒 Sequelize 提供大量操作 model 的方法，
 * 如 findAll，findByPk，findOne 等等，请记得查阅官方文档
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
      this.ctx.throw(404, 'id 为 ' + id + '的账号不存在');
    }
    return account;
  }

  async findLoginAccount(condition) {
    // 如果 params 的值为假值（如 null、undefined、false 等），
    // 则使用一个空对象 {} 作为默认值，以避免后续的代码抛出错误。
    // 此处 type 未使用，但留存备用
    // eslint-disable-next-line no-unused-vars
    const { loginName, loginPassword, type } = condition || {};
    let loginAccount = {};
    const emailRegex = /^\S+@\S+\.\S+$/;

    // 根据用户提交的是用户名还是 Email 生成不同的查询
    if (emailRegex.test(loginName)) {
      loginAccount = {
        where: {
          loginEmail: loginName,
          loginPassword,
        },
        attributes: [ 'id', 'status' ],
      };
    } else {
      loginAccount = {
        where: {
          loginName,
          loginPassword,
        },
        attributes: [ 'id', 'status' ],
      };
    }

    const account = await this.findWithCondition(loginAccount);
    let token;
    // console.log(account);
    if (account) {
      switch (account.dataValues.status) {
        case 1:
          token = await this.ctx.service.token.create(account);
          // console.log(token);
          return { account, token };
        case 2: throw new Error('此账号封禁中，请联系管理员');
        case 3: throw new Error('此账户已被删除');
        default: throw new Error('未知登录错误，请稍后再试');
      }
    }

    throw new Error('用户名密码错或账号不存在');
  }

  async findWithCondition(condition) {
    const account = await this.ctx.model.Account.findOne(condition);
    return account;
  }

  // 根据 schema 定义 account 和 updates 的结构应为
  // {
  //   loginName: 'username',
  //   loginEmail: 'user@example.com',
  //   loginPassword: 'password123',
  // }

  async create(account) {
    const newAccount = await this.ctx.model.Account.create(account);
    return newAccount;
  }

  async update({ id, updates }) {
    const account = await this.ctx.model.Account.findByPk(id);
    console.log(updates);
    if (!account) {
      this.ctx.throw(404, '账号不存在');
    }

    const updatedAccount = await account.update(updates);
    return updatedAccount;
  }
  // async create(account) {
  //   // create 也是
  //   return this.ctx.model.User.create(account);
  // }

  // async update({ id, updates }) {
  //   const account = await this.ctx.model.Account.findByPk(id);
  //   if (!account) {
  //     this.ctx.throw(404, 'account not found');
  //   }

  //   // update 也是
  //   return account.update(updates);
  // }

  // async del(id) {
  //   const user = await this.ctx.model.Account.findByPk(id);
  //   if (!user) {
  //     this.ctx.throw(404, 'Account not found');
  //   }

  //   // destory 也是
  //   return user.destroy();
  // }
}

module.exports = Account;
