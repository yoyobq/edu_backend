'use strict';

// app/graphql/userInfo/connector.js

/**
 * @file connector.js
 * @description UserInfo 模块的连接器。
 *
 * 目前此模块所有的逻辑和操作均已由 User 聚合根接管。
 * 具体层次结构为 User -> Account -> UserInfo。
 * 保留此文件是为了保持项目的结构一致性，并为将来可能的扩展留出空间。
 *
 * 未来的可能扩展场景：
 * - 如果需要对 UserInfo 数据进行特殊的转换或处理，可以在此文件中添加相关方法。
 * - 如果需要在 UserInfo 与其他数据之间增加缓存、日志记录等逻辑，也可以在此处进行。
 */

class UserInfoConnector {
  // constructor(ctx) {
  //   this.ctx = ctx;
  //   this.service = ctx.service.user.userInfo;
  // }

  // async fetchById(id) {
  //   const userInfo = await this.service.find(id);
  //   return userInfo;
  // }

  // async fetchList(page, pageSize) {
  //   const offset = (page - 1) * pageSize;
  //   const limit = pageSize;
  //   const userInfoList = await this.service.list({ offset, limit });
  //   return userInfoList;
  // }

  // // 存在事务操作，不会被主动触发
  // // async insert(params) {
  // //   const newUserInfo = await this.service.create(params);
  // //   return newUserInfo;
  // // }

  // async update(params) {
  //   const { id, ...updateData } = params;
  //   const updatedUserInfo = await this.service.update({ id, updates: updateData });
  //   return updatedUserInfo;
  // }
}

module.exports = UserInfoConnector;
