'use strict';

const Service = require('egg').Service;

class QubankTableInfo extends Service {
  async list({ offset = 0, limit = 10 }) {
    // 21-5-20 此处的 findAndCountAll 是 sequelize 中的查询方法
    const res = await this.ctx.model.QubankTableInfo.findAndCountAll({
      offset,
      limit,
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
    });
    // return this.ctx.model.User.findAll();
    return res.rows;
  }

  async find(id) {
    // findByPk 也是
    const tableInfo = await this.ctx.model.QubankTableInfo.findByPk(id);
    if (!tableInfo) {
      this.ctx.throw(404, 'QubankTableInfo not found');
    }
    return tableInfo;
  }

  async create(user) {
    // create 也是
    return this.ctx.model.QubankTableInfo.create(user);
  }

  async update({ id, updates }) {
    const user = await this.ctx.model.QubankTableInfo.findByPk(id);
    if (!user) {
      this.ctx.throw(404, 'QubankTableInfo not found');
    }

    // update 也是
    return user.update(updates);
  }

  async del(id) {
    const user = await this.ctx.model.QubankTableInfo.findByPk(id);
    if (!user) {
      this.ctx.throw(404, 'QubankTableInfo not found');
    }

    // destory 也是
    return user.destroy();
  }
}

module.exports = QubankTableInfo;
