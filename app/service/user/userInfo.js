'use strict';

const Service = require('egg').Service;

class UserInfoService extends Service {
  async list({ offset = 0, limit = 10 }) {
    const res = await this.ctx.model.UserInfo.findAndCountAll({
      offset,
      limit,
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
    });
    return res.rows;
  }

  async find(id) {
    const userInfo = await this.ctx.model.UserInfo.findByPk(id);
    if (!userInfo) {
      this.ctx.throw(404, 'id 为 ' + id + ' 的用户信息不存在');
    }
    return userInfo;
  }

  // 此表不需要来自于外部的 create 操作，
  // 该方法仅会由 Account 中的 create 关联触发
  async create({ userInfoData, transaction }) {
    // 根据 accountId 查询是否存在对应的记录
    // 由于是事务操作，这条验证已经没有必要了
    // const existingAccount = await this.ctx.model.Account.findByPk(userInfo.accountId);
    // if (!existingAccount) {
    //   this.ctx.throw(400, `accountId 为 ${userInfo.accountId} 的账号不存在。`);
    // }

    if (!userInfoData.email && !userInfoData.nickname) {
      this.ctx.throw(400, '请提供用户 nickname 和 email 字段。');
    }

    if (userInfoData.email) {
      // 检查是否已存在相同的邮箱
      const existingUserInfo = await this.ctx.model.UserInfo.findOne(
        { where: { email: userInfoData.email } },
        { transaction }
      );
      if (existingUserInfo) {
        this.ctx.throw(400, `${userInfoData.email} 该邮箱已存在。现存用户 accountId 为，${existingUserInfo.accountId}。`);
      }
    }

    // 无论前端如何提供 accessGroup 字段，账号初始都强制为 guest 权限
    // 请注意这里的处理方式，因为 schema 定义该字段 accessGroup: [String]
    // 所以直接提交数组，而不是提交拼接好的字符串。
    userInfoData.accessGroup = [ 'guest' ];

    const newUserInfo = await this.ctx.model.UserInfo.create(userInfoData, { transaction });
    return newUserInfo;
  }

  async update({ id, updates }) {
    const userInfo = await this.ctx.model.UserInfo.findByPk(id);
    if (!userInfo) {
      this.ctx.throw(404, '用户信息不存在');
    }

    const updatedUserInfo = await userInfo.update(updates);
    return updatedUserInfo;
  }
}

module.exports = UserInfoService;
