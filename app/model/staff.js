'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const tbn = 'member_staff';
  const Staff = app.model.define(tbn, {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accountId: {
      type: INTEGER,
      allowNull: false,
      field: 'account_id',
    },
    jobId: {
      type: INTEGER,
      allowNull: false,
      field: 'job_id',
    },
    name: {
      type: STRING(50),
      allowNull: true,
    },
    age: {
      type: INTEGER,
      allowNull: true,
    },
    departmentId: {
      type: INTEGER,
      allowNull: true,
      field: 'department_id',
    },
  }, {
    freezeTableName: true,
    timestamps: true,
  });

  return Staff;
};
