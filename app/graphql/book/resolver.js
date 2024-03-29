'use strict';

// module.exports = {
//   Query: {
//     book(root, { id }, ctx) {
//       return ctx.connector.user.fetchById(id);
//     },
//   },
// };


// 第三步: 定义解析器
// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
// 解析器定义了用于获取模式中定义的类型的方法。该解析器从返回了数据集中 books 数组。
// 因为 books 数组本来就是硬编码，所以这是一个简单解析器示例
module.exports = {
  Query: {
    books: (root, _, ctx) => {
      return ctx.connector.book.fetchAll();
    },

    book: (root, { title }, ctx) => {
      const res = ctx.connector.book.fetchByTitle(title);
      return res[0];
    },
  },
};
