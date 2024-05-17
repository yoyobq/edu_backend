'use strict';

class UserInfoConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.userInfo;
  }

  async fetchById(id) {
    const userInfo = await this.service.find(id);
    return userInfo;
  }

  async fetchList(page, pageSize) {
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
    const userInfoList = await this.service.list({ offset, limit });
    return userInfoList;
  }

  // 存在事务操作，不会被主动触发
  // async insert(params) {
  //   const newUserInfo = await this.service.create(params);
  //   return newUserInfo;
  // }

  async update(params) {
    const { id, ...updateData } = params;
    const updatedUserInfo = await this.service.update({ id, updates: updateData });
    return updatedUserInfo;
  }
}

module.exports = UserInfoConnector;
