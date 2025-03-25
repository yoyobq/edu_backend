'use strict';

/**
 * @file courseScheduleSourceMap.js
 * @description SSTS 爬取数据与系统课程表的映射表 Sequelize 模型。
 *
 * 主要功能:
 * - 存储爬取的课程计划数据，并与系统内部 `plan_course_schedule` 进行**一对一**关联。
 * - 记录教务系统中的唯一标识 (LECTURE_PLAN_ID) 及相关课程、教师、教学班 ID。
 * - 通过 `course_schedule_id` 关联到系统内部课程表数据。
 *
 * 关系说明:
 * - **一对一 (1:1)**: `ssts_course_schedule_source_map` 仅对应 `plan_course_schedule` 中的一条记录。
 * - `course_schedule_id` 为 `plan_course_schedule.id` 的外键。
 * - 采用 `belongsTo` 进行关联，同时 `plan_course_schedule` 需 `hasOne` 反向关联。
 *
 * @module model/ssts/courseScheduleSourceMap
 */

module.exports = app => {
  const { INTEGER, STRING } = app.Sequelize;

  const tbn = 'ssts_course_schedule_source_map';

  const CourseScheduleSourceMap = app.model.define(tbn, {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键 ID',
    },
    courseScheduleId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'course_schedule_id',
      comment: '关联到 plan_course_schedule 表的 ID',
    },
    LECTURE_PLAN_ID: {
      type: STRING(32),
      allowNull: false,
      field: 'LECTURE_PLAN_ID',
      comment: '教务系统的教学计划 ID，唯一标识',
    },
    COURSE_ID: {
      type: STRING(32),
      allowNull: false,
      field: 'COURSE_ID',
      comment: '教务系统的课程 ID',
    },
    TEACHER_IN_CHARGE_ID: {
      type: STRING(32),
      allowNull: false,
      field: 'TEACHER_IN_CHARGE_ID',
      comment: '教务系统中的授课教师 ID',
    },
    TEACHING_CLASS_ID: {
      type: STRING(32),
      allowNull: false,
      field: 'TEACHING_CLASS_ID',
      comment: '教务系统的教学班 ID',
    },
    staffId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'staff_id',
      comment: '系统内部教职工 (staff) ID，匹配后填充',
    },
    semesterId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'semester_id',
      comment: '学期 ID，用于数据查询和匹配',
    },
    createdAt: {
      type: 'TIMESTAMP',
      allowNull: true,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at',
      comment: '记录创建时间',
    },
  }, {
    timestamps: false, // 不需要 updatedAt
    freezeTableName: true,
    tableName: tbn,
  });

  // 添加一对一关系
  CourseScheduleSourceMap.associate = function() {
    app.model.Ssts.CourseScheduleSourceMap.belongsTo(app.model.Plan.CourseSchedule, {
      foreignKey: 'course_schedule_id',
      targetKey: 'id',
      as: 'courseSchedule',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return CourseScheduleSourceMap;
};
