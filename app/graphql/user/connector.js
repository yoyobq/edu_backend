'use strict';

class UserConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll() {
    const ctx = this.ctx;
    const query = {
      // limit: ctx.helper.parseInt(ctx.query.limit),
      // offset: ctx.helper.parseInt(ctx.query.offset),
    };
    const users = await ctx.service.user.list(query);
    // 此处返回的数据类型应该与schema中的定义一致
    return users;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const user = await ctx.service.user.find(ctx.helper.parseInt(id));

    return user;
  }

  async fetchByAccountId(accountId) {
    const ctx = this.ctx;
    const user = await ctx.service.user.findWithCondition({
      where: { accountId },
    });

    if (user !== null) {
      return user;
    }

    throw new Error('account_id 为' + accountId + '的用户信息不存在');
  }
}

module.exports = UserConnector;

