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
    // 如果 params 的值为假值（如 null、undefined、false 等），
    // 则使用一个空对象 {} 作为默认值，以避免后续的代码抛出错误。
    // 此处 type 备用
    // eslint-disable-next-line no-unused-vars
    const { loginName, loginPassword, type } = params || {};

    // 在 connector 中处理 req 中的提交的内容，并生成查询条件
    // 先按 email 查询
    let condition = {
      where: {
        loginEmail: loginName,
        loginPassword,
      },
      attributes: [ 'id', 'status' ],
    };

    let account = await this.service.findWithCondition(condition);

    if (account === null) {
      // 再按用户名查询
      condition = {
        where: {
          loginName,
          loginPassword,
        },
        attributes: [ 'id', 'status' ],
      };
      account = await this.service.findWithCondition(condition);
    }

    if (account !== null) {
      switch (account.dataValues.status) {
        case 1: return account;
        case 2: throw new Error('此账号封禁中，请联系管理员');
        case 3: throw new Error('此账户已被删除');
        default: throw new Error('未知登录错误，请稍后再试');
      }
    }

    throw new Error('用户名密码错或账号不存在');
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
