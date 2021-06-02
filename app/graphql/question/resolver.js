'use strict';

// 第三步: 定义解析器
// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves questions from the "questions" array above.
// 解析器定义了用于获取模式中定义的类型的方法。该解析器从返回了数据集中 questions 数组。
// 因为 questions 数组本来就是硬编码，所以这是一个简单解析器示例
module.exports = {
  Query: {
    questions: (root, { tableName }, ctx) => {
      return ctx.connector.question.fetchAll(tableName);
    },

    question: (root, { id, tableName }, ctx) => {
      const res = ctx.connector.question.fetchById(id, tableName);
      return res;
    },
  },
};
