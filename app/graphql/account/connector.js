'use strict';

// 23-3-18 Connector 的职责是处理与数据源的交互，它应该负责编写具体的查询逻辑。
// 因此，如果需要进行个性化的查询，那么将查询条件放在 connector 中是更合适的。
// 这可以使得查询逻辑更加可控和可维护，同时还可以充分利用 Sequelize 提供的高级查询功能。


class AccountConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.account;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const account = await this.service.find(ctx.helper.parseInt(id));

    return account;
  }

  async fetchStatus(params) {
    const account = await this.service.findLoginAccount(params);
    return account;
  }
  // async fetchAll(params) {
  //   const { keyword, pagination } = params || {};
  //   const { current = 1, pageSize = 10 } = pagination || {};

  //   const query = {};
  //   if (keyword) {
  //     query.$or = [
  //       { loginName: { $regex: keyword, $options: 'i' } },
  //       { loginEmail: { $regex: keyword, $options: 'i' } },
  //     ];
  //   }

  //   const total = await AccountModel.countDocuments(query);
  //   const Accounts = await AccountModel.find(query)
  //     .sort({ createdAt: -1 })
  //     .skip((current - 1) * pageSize)
  //     .limit(pageSize)
  //     .lean();

  //   return {
  //     list: Accounts,
  //     pagination: {
  //       current,
  //       pageSize,
  //       total,
  //     },
  //   };

  // async update(params) {
  //   const { id, ...updateData } = params;
  //   const updatedUserAccount = await UserAccountModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
  //   return updatedUserAccount;
  // }
}

module.exports = AccountConnector;
