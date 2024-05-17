'use strict';

const Service = require('egg').Service;

class StaffIndexService extends Service {
  async list({ offset = 0, limit = 10 }) {
    const res = await this.ctx.model.StaffIndex.findAndCountAll({
      offset,
      limit,
    });
    return res.rows;
  }

  async findByJobId(jobId) {
    console.log(jobId);
    const staff = await this.ctx.model.StaffIndex.findOne({ where: { job_Id: jobId } });
    if (!staff) {
      this.ctx.throw(404, '工号为 ' + jobId + ' 的员工信息不存在');
    }
    return staff;
  }

  async findByName(name) {
    const staff = await this.ctx.model.StaffIndex.findOne({ where: { name } });
    if (!staff) {
      this.ctx.throw(404, '姓名为 ' + name + ' 的员工信息不存在');
    }
    return staff;
  }

}

module.exports = StaffIndexService;
