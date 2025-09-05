'use strict';

module.exports = app => {
  const { STRING, INTEGER, JSON, ENUM } = app.Sequelize;

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
      allowNull: true, // DDL中是DEFAULT NULL
      field: 'login_email',
    },
    loginPassword: {
      type: STRING(255), // 修正：从30改为255
      allowNull: false,
      field: 'login_password',
    },
    status: {
      type: ENUM('ACTIVE', 'BANNED', 'DELETED', 'PENDING', 'SUSPENDED', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'status',
    },
    recentLoginHistory: {
      type: JSON,
      allowNull: true,
      field: 'recent_login_history',
    },
    identityHint: { // 新增字段
      type: STRING(30),
      allowNull: true,
      field: 'identity_hint',
    },
  }, {
    timestamps: true,
  });

  return Account;
};
