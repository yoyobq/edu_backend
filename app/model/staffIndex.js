'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const tbn = 'member_staff_index';
  const StaffIndex = app.model.define(tbn, {
    jobId: {
      type: INTEGER,
      primaryKey: true,
      allowNull: false,
      field: 'job_id',
    },
    name: {
      type: STRING(50),
      allowNull: false,
    },
  }, {
    timestamps: false, // 禁用时间戳字段
    freezeTableName: true, // 禁用 Sequelize 的自动表名复数化
  });

  return StaffIndex;
};

