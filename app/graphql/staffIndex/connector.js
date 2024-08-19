'use strict';

class StaffIndexConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.service = ctx.service.user.staffIndex; // 绑定到 staffIndex service
  }

  async getByJobId(jobId) {
    return await this.service.findByJobId(jobId); // 调用 service 层的方法
  }

  async getByName(name) {
    return await this.service.findByName(name); // 调用 service 层的方法
  }

  async exists({ jobId, name }) {
    return await this.service.exists(jobId, name); // 调用 service 层的方法
  }

  async create({ jobId, name }) {
    return await this.service.create({ jobId, name }); // 调用 service 层的方法
  }

  async update({ jobId, name }) {
    return await this.service.update({ jobId, name }); // 调用 service 层的方法
  }

  async delete(jobId) {
    return await this.service.delete(jobId); // 调用 service 层的方法
  }
}

module.exports = StaffIndexConnector;
