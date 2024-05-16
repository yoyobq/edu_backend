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
      this.ctx.throw(404, '工号为 ' + jobId + ' 的员工信息不存在');
    }
    return staff;
  }

  async create(staff) {
    // 根据 accountId 查询是否存在对应的记录
    const existingAccount = await this.ctx.model.Account.findByPk(staff.accountId);
    if (!existingAccount) {
      this.ctx.throw(400, `accountId 为 ${staff.accountId} 的账号不存在。`);
    }

    // 在这里可以添加其他的输入验证逻辑，根据需求进行调整

    const newStaff = await this.ctx.model.Staff.create(staff);
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
