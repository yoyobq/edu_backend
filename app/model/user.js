'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const User = app.model.define('base_user_info', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    account_id: { type: INTEGER, allowNull: false },
    name: { type: STRING(50), allowNull: false },
    avatar: { type: STRING(255), allowNull: true },
    email: { type: STRING(50), allowNull: false },
    signature: { type: STRING(100), allowNull: true },
    accessGroup: { type: STRING(255), allowNull: true },
    address: { type: STRING(255), allowNull: true },
    phone: { type: STRING(20), allowNull: true },
    tags: { type: JSON, allowNull: true },
    geographic: { type: JSON, allowNull: true },
    notifyCount: { type: INTEGER, allowNull: true },
    unreadCount: { type: INTEGER, allowNull: true },
  }, {
    tableName: 'base_user_info',
    // underscored: true, // 自动把驼峰命名转为下划线命名
    comment: '用户基本信息表',
  });

  // User.prototype.associate = function() {
  //   app.model.User.hasMany(app.model.Post, { as: 'posts' });
  // };

  return User;
};
