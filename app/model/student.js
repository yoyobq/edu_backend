'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const tbn = 'member_students';
  const Student = app.model.define(tbn, {
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
    stuId: {
      type: INTEGER,
      allowNull: false,
      field: 'stu_id',
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
    classId: {
      type: INTEGER,
      allowNull: true,
      field: 'class_id',
    },
    clubId: {
      type: INTEGER,
      allowNull: true,
      field: 'club_id',
    },
  }, {
    freezeTableName: true,
    timestamps: true,
  });

  return Student;
};
