'use strict';

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

  async checkLogin(params) {
    const account = await this.service.checkLogin(params);
    console.log(account);
    return true;
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
