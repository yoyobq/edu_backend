'use strict';

// 解析器
module.exports = {
  Query: {
    users: (root, _, ctx) => {
      return ctx.connector.user.fetchAll();
    },

    user: (root, { id, accountId }, ctx) => {
      let res = {};
      if (id) {
        res = ctx.connector.user.fetchById(id);
      } else {
        res = ctx.connector.user.fetchByAccountId(accountId);
      }
      return res;
    },
  },
};
