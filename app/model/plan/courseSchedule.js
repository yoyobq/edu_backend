'use strict';

/**
 * @file courseSchedule.js
 * @description 课程表的 Sequelize 模型。
 *
 * 主要功能:
 * - 存储课程安排相关信息，包括教师、班级、学期等。
 * - 存储课程的学时、学分和课程类别。
 *
 * @module model/plan/courseSchedule
 */

module.exports = app => {
  const { DECIMAL, INTEGER, STRING, TINYINT, ENUM } = app.Sequelize;

  const tbn = 'plan_course_schedule';

  const CourseSchedule = app.model.define(tbn, {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '课程主键ID',
    },
    staffId: {
      type: INTEGER,
      allowNull: false,
      field: 'staff_id',
      comment: '教师ID',
    },
    sstsTeacherId: {
      type: STRING(32),
      allowNull: false,
      field: 'ssts_teacher_id',
      comment: '冗余数据，教务系统中的授课教师 ID',
    },
    staffName: {
      type: STRING(64),
      allowNull: false,
      field: 'staff_name',
      comment: '教师姓名',
    },
    teachingClassName: {
      type: STRING(64),
      allowNull: false,
      field: 'teaching_class_name',
      comment: '教学班名字',
    },
    classroomId: {
      type: INTEGER,
      allowNull: true,
      field: 'classroom_id',
      comment: '教室ID',
    },
    classroomName: {
      type: STRING(64),
      allowNull: true,
      field: 'classroom_name',
      comment: '教室名称',
    },
    courseId: {
      type: INTEGER,
      allowNull: true,
      field: 'course_id',
      comment: '课程ID',
    },
    courseName: {
      type: STRING(128),
      allowNull: true,
      field: 'course_name',
      comment: '课程名称',
    },
    semesterId: {
      type: INTEGER,
      allowNull: false,
      field: 'semester_id',
      comment: '学期ID, 对应 semesters 表 id 字段',
    },
    weekCount: {
      type: TINYINT,
      allowNull: true,
      field: 'week_count',
      comment: '周数',
    },
    weeklyHours: {
      type: TINYINT.UNSIGNED,
      allowNull: true,
      field: 'weekly_hours',
      comment: '每周课时数',
    },
    credits: {
      type: TINYINT.UNSIGNED,
      allowNull: true,
      comment: '学分',
    },
    coefficient: {
      type: DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.0,
      field: 'coefficient',
      comment: '课程系数，用于计算课时权重',
    },
    courseCategory: {
      type: ENUM('理论课', '实践课', '一体化', '社团课', '班会课', '其他课程'),
      allowNull: false,
      defaultValue: '其他课程',
      field: 'course_category',
      comment: '课程类别',
    },
    weekNumberString: {
      type: STRING(64),
      allowNull: true,
      field: 'week_number_string',
      comment: '周次信息',
    },
  }, {
    timestamps: true,
    freezeTableName: true,
  });

  CourseSchedule.associate = function() {
    app.model.Plan.CourseSchedule.hasOne(app.model.Ssts.CourseScheduleSourceMap, {
      // foreignKey 只是告诉 Sequelize，在关联查询时，它应该使用哪个字段来进行数据关联。
      // 并不意味着数据库里需要建立这个外键
      foreignKey: 'course_schedule_id',
      as: 'sourceMap',
      onDelete: 'CASCADE',
      hooks: true, // 确保 Sequelize 触发级联删除逻辑
    });

    app.model.Plan.CourseSchedule.hasMany(app.model.Plan.CourseSlot, {
      foreignKey: 'course_schedule_id',
      as: 'slots',
      onDelete: 'CASCADE', // 删除课程表时，同时删除课程时间安排
      hooks: true, // 确保 Sequelize 触发级联删除逻辑
    });
  };

  return CourseSchedule;
};
