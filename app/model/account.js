'use strict';

module.exports = app => {
  const { STRING, INTEGER, JSON } = app.Sequelize;

  const tbn = 'base_user_accounts';
  const Account = app.model.define(tbn, {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    loginName: {
      type: STRING(30),
      allowNull: true,
      field: 'login_name',
    },
    loginEmail: {
      type: STRING(100),
      allowNull: false,
      field: 'login_email',
    },
    loginPassword: {
      type: STRING(30),
      allowNull: false,
      field: 'login_password',
    },
    recentLoginHistory: {
      type: JSON,
      field: 'recent_login_history',
    },
    status: {
      type: INTEGER,
      field: 'status',
    },
  }, {
    // freezeTableName: true,
    timestamps: true,
    // tableName: tbn,
    // underscored: true,
  });

  // User.prototype.associate = function() {
  //   app.model.User.hasMany(app.model.Post, { as: 'posts' });
  // };
  return Account;
};
