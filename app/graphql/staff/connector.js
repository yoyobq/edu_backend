'use strict';

// app/graphql/staff/connector.js

/**
 * @file connector.js
 * @description Staff 模块的连接器。
 *
 * 目前此模块所有的逻辑和操作均已由 User 聚合根接管。
 * 具体层次结构为 User -> Account -> UserInfo -> Staff
 * 保留此文件是为了保持项目的结构一致性，并为将来可能的扩展留出空间。
 */

class StaffConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.user.staff;
  }

  // async fetchById(id) {
  //   const ctx = this.ctx;
  //   const staff = await this.service.find(ctx.helper.parseInt(id));

  //   return staff;
  // }

  async userStaffByJobId(jobId) {
    const staff = await this.service.findByJobId(jobId);
    return staff;
  }

  // async fetchByAccountId(accountId) {
  //   const staff = await this.service.findByAccountId(accountId);
  //   return staff;
  // }

  // // 由 Accout 的 create 触发，无需提供对外接口
  // // async create(input) {
  // //   const newStaff = await this.service.create(input);
  // //   return newStaff;
  // // }

  // async update(id, input) {
  //   const { ...updateData } = input;
  //   const updatedStaff = await this.service.update({ id, updates: updateData });
  //   return updatedStaff;
  // }

  // async delete(id) {
  //   const deleted = await this.service.delete(id);
  //   return deleted;
  // }
}

module.exports = StaffConnector;
