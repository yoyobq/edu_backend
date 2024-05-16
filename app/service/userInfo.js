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

  async create(userInfo) {
    // 根据 accountId 查询是否存在对应的记录
    const existingAccount = await this.ctx.model.Account.findByPk(userInfo.accountId);
    if (!existingAccount) {
      this.ctx.throw(400, `accountId 为 ${userInfo.accountId} 的账号不存在。`);
    }

    if (!userInfo.email && !userInfo.name) {
      this.ctx.throw(400, '请提供用户 name 和 email 字段。');
    }

    if (userInfo.email) {
      // 检查是否已存在相同的邮箱
      const existingUserInfo = await this.ctx.model.UserInfo.findOne({ where: { email: userInfo.email } });
      if (existingUserInfo) {
        this.ctx.throw(400, `${userInfo.email} 该邮箱已存在。现存用户 accountId 为，${existingUserInfo.accountId}。`);
      }
    }

    // 无论前端如何提供 accessGroup 字段，账号初始都强制为 guest 权限
    // 请注意这里的处理方式，因为 schema 定义该字段 accessGroup: [String]
    // 所以直接提交数组，而不是提交拼接好的字符串。
    userInfo.accessGroup = [ 'guest' ];

    const newUserInfo = await this.ctx.model.UserInfo.create(userInfo);
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
