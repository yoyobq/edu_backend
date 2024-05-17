'use strict';

class StaffConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.staff;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const staff = await this.service.find(ctx.helper.parseInt(id));

    return staff;
  }

  async fetchByJobId(jobId) {
    const staff = await this.service.findByJobId(jobId);
    return staff;
  }

  async fetchByAccountId(accountId) {
    const staff = await this.service.findByAccountId(accountId);
    return staff;
  }

  // 由 Accout 的 create 触发，无需提供对外接口
  // async create(input) {
  //   const newStaff = await this.service.create(input);
  //   return newStaff;
  // }

  async update(id, input) {
    const { ...updateData } = input;
    const updatedStaff = await this.service.update({ id, updates: updateData });
    return updatedStaff;
  }

  async delete(id) {
    const deleted = await this.service.delete(id);
    return deleted;
  }
}

module.exports = StaffConnector;
