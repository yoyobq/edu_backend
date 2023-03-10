'use strict';

// 解析器
module.exports = {
  Query: {
    qubankTableInfos: (root, _, ctx) => {
      const res = ctx.connector.qubankTableInfo.fetchAll();
      return res;
    },

    qubankTableInfo: (root, { id }, ctx) => {
      const res = ctx.connector.qubankTableInfo.fetchById(id);
      return res;
    },
  },
};
