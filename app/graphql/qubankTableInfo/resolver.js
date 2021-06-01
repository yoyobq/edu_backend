'use strict';

// 解析器
module.exports = {
  Query: {
    qubankTableInfos: (root, _, ctx) => {
      return ctx.connector.qubankTableInfo.fetchAll();
    },

    qubankTableInfo: (root, { id }, ctx) => {
      const res = ctx.connector.qubankTableInfo.fetchById(id);
      return res;
    },
  },
};
