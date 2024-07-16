'use strict';

class QubankTableInfoConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetchAll() {
    const ctx = this.ctx;
    const query = {
      // limit: ctx.helper.parseInt(ctx.query.limit),
      // offset: ctx.helper.parseInt(ctx.query.offset),
    };
    const qubankTableInfos = await ctx.service.practice.qubankTableInfo.list(query);
    // 此处返回的数据类型应该与schema中的定义一致
    qubankTableInfos.forEach(element => {
      element.dataValues.testItemStr = element.dataValues.testItemStr.split(',');
    });

    return qubankTableInfos;
  }

  async fetchById(id) {
    const ctx = this.ctx;
    const qubankTableInfo = await ctx.service.practice.qubankTableInfo.find(ctx.helper.parseInt(id));

    return qubankTableInfo;
  }
}

module.exports = QubankTableInfoConnector;

