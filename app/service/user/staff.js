// TODO: 优化数据添加，修改逻辑，优化反馈前台的信息

'use strict';

const Service = require('egg').Service;

class StaffService extends Service {
  async list({ offset = 0, limit = 10 }) {
    const res = await this.ctx.model.Staff.findAndCountAll({
      offset,
      limit,
      order: [[ 'createdAt', 'DESC' ], [ 'id', 'DESC' ]],
    });
    return res.rows;
  }

  async find(id) {
    const staff = await this.ctx.model.Staff.findByPk(id);
    if (!staff) {
      this.ctx.throw(404, 'id 为 ' + id + ' 的员工信息不存在');
    }
    return staff;
  }

  async findByAccountId(accountId) {
    const staff = await this.ctx.model.Staff.findOne({ where: { accountId } });
    if (!staff) {
      this.ctx.throw(404, 'accountId 为 ' + accountId + ' 的员工信息不存在');
    }
    return staff;
  }

  async findByJobId(jobId) {
    const staff = await this.ctx.model.Staff.findOne({ where: { jobId } });
    if (!staff) {
      return null;
      // this.ctx.throw(404, '工号为 ' + jobId + ' 的员工信息不存在');
      // 前端会主动处理后台抛出的异常，
      // 如果我这里抛出异常，前端调用他的函数就接收到具体异常反馈前就会被自动程序拦截
      // 然而，用户不存在是个“有效信息”，后续还有操作，不能因为抛出异常而终止
      // 所以做这个临时处理。
    }
    return staff;
  }

  async create({ staffData, transaction }) {
    // 根据 accountId 查询是否存在对应的记录
    const existingAccount = await this.ctx.model.Account.findByPk(staffData.accountId, { transaction });
    if (!existingAccount) {
      this.ctx.throw(400, `accountId 为 ${staffData.accountId} 的账号不存在。`);
    }

    // 在这里可以添加其他的输入验证逻辑，根据需求进行调整
    const newStaff = await this.ctx.model.Staff.create(staffData, { transaction });
    return newStaff;
  }

  async update({ id, updates }) {
    const staff = await this.ctx.model.Staff.findByPk(id);
    if (!staff) {
      this.ctx.throw(404, '员工信息不存在');
    }

    const updatedStaff = await staff.update(updates);
    return updatedStaff;
  }

  async delete(id) {
    const staff = await this.ctx.model.Staff.findByPk(id);
    if (!staff) {
      this.ctx.throw(404, '员工信息不存在');
    }

    await staff.destroy();
    return true;
  }

}

module.exports = StaffService;
