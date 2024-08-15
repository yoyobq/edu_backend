'use strict';

// 23-3-18 Connector 的职责是处理与数据源的交互，它应该负责编写具体的查询逻辑。
// 因此，如果需要进行个性化的查询，那么将查询条件放在 connector 中是更合适的。
// 这可以使得查询逻辑更加可控和可维护，同时还可以充分利用 Sequelize 提供的高级查询功能。

// 24-5-15 建议 Connector 中的方法名和 service 中的方法名保持一致
// Todo: fetchById，fetchStatus 是历史遗留问题，建议抽空修正

class AccountConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.user.account;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const account = await this.service.fetchById(ctx.helper.parseInt(id));

    return account;
  }

  async findLoginAccount(params) {
    const account = await this.service.findLoginAccount(params);
    return account;
  }

  async update(params) {
    const { id, ...updateData } = params;
    const updatedUserAccount = await this.service.update({ id, updates: updateData });
    return updatedUserAccount;
  }

  async insert(params) {
    const newAccount = await this.service.create(params);
    return newAccount;
  }
}

module.exports = AccountConnector;
