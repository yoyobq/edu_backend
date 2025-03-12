'use strict';

/**
 * @file courseSlot.js
 * @description 课程时间段安排表的 Sequelize 模型。
 *
 * 主要功能:
 * - 存储课程具体的上课安排细节，包括上课的星期、节次范围等。
 * - 记录课程每周授课频次（单双周或每周），本校虽无单双周排课，但预留。
 *
 * 数据库表结构说明:
 * - id: 自增主键，用于唯一标识每个课程时间段记录。
 * - course_schedule_id: 外键，关联到课程主表(plan_course_schedule)的ID。
 * - day_of_week: 星期几，取值为1-7（1=星期一，7=星期日）。
 * - period_start 和 period_end: 表示具体课程开始和结束的节次。
 * - week_type: 表示课程上课的单双周情况（all=每周上课，odd=单周上课，even=双周上课）。
 * - created_at, updated_at: 记录创建和最后更新时间。
 *
 * 关联关系:
 * - CourseSlot 属于 CourseSchedule (belongsTo)，即每个课程时间段必须对应一个课程主表记录。
 *
 * 使用场景:
 * - 用于课程详细安排的查询，例如生成课表、学生选课、教师课表查询等。
 *
 * @module model/plan/courseSlot
 */

module.exports = app => {
  const { INTEGER, TINYINT, ENUM } = app.Sequelize;

  const tbn = 'plan_course_slots';

  const CourseSlot = app.model.define(tbn, {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '自动递增的唯一ID，主键',
    },
    courseScheduleId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'course_schedule_id',
      comment: '关联主表 course_schedule 的 ID',
    },
    dayOfWeek: {
      type: TINYINT.UNSIGNED,
      allowNull: false,
      field: 'day_of_week',
      comment: '星期几，1=星期一，7=星期日',
    },
    periodStart: {
      type: TINYINT.UNSIGNED,
      allowNull: false,
      field: 'period_start',
      comment: '课程开始节次，例如1=第一节课',
    },
    periodEnd: {
      type: TINYINT.UNSIGNED,
      allowNull: false,
      field: 'period_end',
      comment: '课程结束节次，例如2=第二节课',
    },
    weekType: {
      type: ENUM('all', 'odd', 'even'),
      allowNull: false,
      defaultValue: 'all',
      field: 'week_type',
      comment: '单双周标识，all=每周，odd=单周，even=双周',
    },
  }, {
    timestamps: true, // 自动管理 createdAt 和 updatedAt 字段
    freezeTableName: true, // 禁止 Sequelize 自动修改表名
    // tableName: tbn,
  });

  // 定义与课程主表(plan_course_schedule)的关联关系
  CourseSlot.associate = function() {
    app.model.Plan.CourseSlot.belongsTo(app.model.Plan.CourseSchedule, {
      // 外键，对应课程主表的主键，由于 Sequelize 会管理表之间的关系，实际上数据库中的外键设置非必要
      // 即：由业务逻辑管理数据, 故删除外键
      // foreignKey: 'course_schedule_id',
      targetKey: 'id', // 目标表（CourseSchedule）中被外键关联的字段，默认是 id，所以此处非必要
      as: 'courseSchedule',
    });
  };

  return CourseSlot;
};
