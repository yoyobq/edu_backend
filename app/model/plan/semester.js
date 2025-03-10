'use strict';

/**
 * @file semester.js
 * @description 学期信息表的 Sequelize 模型。
 *
 * 主要功能:
 * - 存储学年、学期相关信息。
 * - 记录每学期的开始日期、考试周和结束日期。
 * - 维护当前学期标识。
 *
 * @module model/plan/semester
 */

module.exports = app => {
  const { INTEGER, STRING, DATE, TINYINT } = app.Sequelize;

  const Semester = app.model.define('plan_semesters', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键 (Primary Key)',
    },
    schoolYear: {
      type: INTEGER,
      allowNull: false,
      field: 'school_year',
      validate: {
        min: 1900, // 限制范围，避免无效年份
        max: 2100,
      },
      comment: '学年',
    },
    termNumber: {
      type: TINYINT,
      allowNull: false,
      field: 'term_number',
      comment: '第一学期，第二学期',
    },
    name: {
      type: STRING(50),
      allowNull: false,
      comment: '学期名称 (Semester Name) - 如: 2024春季学期',
    },
    startDate: {
      type: DATE,
      allowNull: false,
      field: 'start_date',
      comment: '开始日期 (Start Date)',
    },
    examStartDate: {
      type: DATE,
      allowNull: false,
      field: 'exam_start_date',
      comment: '考试周开始日期（通常为周一）',
    },
    endDate: {
      type: DATE,
      allowNull: false,
      field: 'end_date',
      comment: '结束日期 (End Date)',
    },
    isCurrent: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      field: 'is_current',
      comment: '是否为当前学期 (Is Current Semester)',
    },
  }, {
    timestamps: false, // 该表不需要 createdAt 和 updatedAt
    freezeTableName: true, // 禁止 Sequelize 自动复数化表名，确保使用 plan_semesters
  });

  return Semester;
};
