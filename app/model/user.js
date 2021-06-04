'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const User = app.model.define('user', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      // 解决字段名(user_id)与实际名(id)不一致的问题
      // field: 'user_id',
    },
    name: STRING(30),
    age: INTEGER,
    // created_at: DATE,
    // updated_at: DATE,
    // 配合 paranoid 实现软删除
    // deleted_at: DATE,
  }, {
    // 表名不自动转化为复数形式，例如 people 编程 person
    // freezeTableName: true,

    // 指定表名
    // tableName: 'users',

    // 配合 deleted_at 实现软删除
    // paranoid: true,

    // 时间戳 created_at, updated_at 可利用
    timestamps: true,
  });

  // User.prototype.associate = function() {
  //   app.model.User.hasMany(app.model.Post, { as: 'posts' });
  // };

  return User;
};
