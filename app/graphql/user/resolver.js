'use strict';

// 解析器
module.exports = {
  Query: {
    users: (root, _, ctx) => {
      return ctx.connector.user.fetchAll();
    },

    user: (root, { id }, ctx) => {
      const res = ctx.connector.user.fetchById(id);
      return res;
    },
  },
};
