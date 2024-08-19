'use strict';

const Service = require('egg').Service;

class StaffIndexService extends Service {
  // 查询员工列表，由于接口中未提供这个 list，所以此处代码无用
  // async list({ offset = 0, limit = 10 }) {
  //   const res = await this.ctx.model.StaffIndex.findAndCountAll({
  //     offset,
  //     limit,
  //   });
  //   return res.rows;
  // }

  // 通过 job_Id 查询员工信息
  async findByJobId(jobId) {
    const staff = await this.ctx.model.StaffIndex.findOne({ where: { jobId } });
    if (!staff) {
      this.ctx.throw(404, `工号为 ${jobId} 的员工信息不存在`);
    }
    return staff;
  }

  // 通过姓名查询员工信息
  async findByName(name) {
    const staff = await this.ctx.model.StaffIndex.findOne({ where: { name } });
    if (!staff) {
      this.ctx.throw(404, `姓名为 ${name} 的员工信息不存在`);
    }
    return staff;
  }

  // 检查是否存在指定的 job_Id 和 name
  async exists(jobId, name) {
    const count = await this.ctx.model.StaffIndex.count({ where: { jobId, name } });
    return count > 0;
  }

  // 创建新的员工信息
  async create({ jobId, name }) {
    const staff = await this.ctx.model.StaffIndex.create({ jobId, name });
    return staff;
  }

  // 更新员工信息
  async update({ jobId, name }) {
    const [ affectedRows ] = await this.ctx.model.StaffIndex.update({ name }, { where: { jobId } });
    if (affectedRows === 0) {
      this.ctx.throw(404, `工号为 ${jobId} 的员工信息不存在`);
    }
    return await this.findByJobId(jobId);
  }

  // 删除员工信息
  async delete(jobId) {
    const affectedRows = await this.ctx.model.StaffIndex.destroy({ where: { jobId } });
    if (affectedRows === 0) {
      this.ctx.throw(404, `工号为 ${jobId} 的员工信息不存在`);
    }
    return !!affectedRows;
  }
}

module.exports = StaffIndexService;
