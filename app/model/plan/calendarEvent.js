'use strict';

/**
 * @file calendarEvent.js
 * @description 校历事件表的 Sequelize 模型。
 *
 * 主要功能:
 * - 存储学期相关的事件，如假期、考试、活动等。
 * - 记录修改时间和修改人。
 * - 提供索引优化查询。
 *
 * ## 关于索引定义
 * Sequelize 允许在模型中定义索引，以确保数据库结构与代码逻辑保持一致。
 * 这样可以避免数据库迁移时索引丢失，并提升查询优化效果。
 * 即使索引已在数据库中手动创建，仍建议在 Sequelize 中定义，确保:
 * - **数据库 & 代码保持一致**，防止索引丢失。
 * - **支持 Sequelize `sync()` & 迁移机制**，避免手动维护索引。
 * - **提高查询优化效果**，让 Sequelize 更智能地利用索引。
 * - **保证多数据库兼容**，适配 MySQL、PostgreSQL、SQLite 等不同数据库。
 * 若数据库由 DBA 维护且不会变更，手动创建索引也是可行的。
 *
 * @module model/plan/calendarEvent
 */

module.exports = app => {
  const { INTEGER, STRING, ENUM, DATE, DATEONLY, NOW } = app.Sequelize;

  const CalendarEvent = app.model.define('plan_calendar_events', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键 (Primary Key)',
    },
    semesterId: {
      type: INTEGER,
      allowNull: false,
      field: 'semester_id',
      comment: '关联学期ID (Related Semester ID)',
    },
    topic: {
      type: STRING(100),
      allowNull: false,
      comment: '事件主题 (Event Topic)',
    },
    date: {
      type: DATEONLY,
      allowNull: false,
      comment: '事件日期 (Event Date)',
    },
    timeSlot: {
      type: ENUM('ALL_DAY', 'MORNING', 'AFTERNOON'),
      allowNull: false,
      defaultValue: 'ALL_DAY',
      field: 'time_slot',
      comment: '时间段: all_day/全天, morning/上午, afternoon/下午',
    },
    eventType: {
      type: ENUM('HOLIDAY', 'EXAM', 'ACTIVITY', 'HOLIDAY_MAKEUP', 'WEEKDAY_SWAP', 'SPORTS_MEET'),
      allowNull: false,
      field: 'event_type',
      comment: '事件类型: 假期、考试、活动等 (Event Type)',
    },
    teachingCalcEffect: {
      type: ENUM('NO_CHANGE', 'CANCEL', 'MAKEUP', 'SWAP'),
      allowNull: false,
      defaultValue: 'NO_CHANGE',
      field: 'teaching_calc_effect',
      comment: '对课程的课时计算影响：NO_CHANGE/无影响, CANCEL/停课, MAKEUP/补课, SWAP/调休',
    },
    originalDate: {
      type: DATEONLY,
      allowNull: true,
      field: 'original_date',
      comment: '调课或休假的原始日期 (Original Date)',
    },
    recordStatus: {
      type: ENUM('ACTIVE', 'ACTIVE_TENTATIVE', 'EXPIRY'),
      allowNull: false,
      defaultValue: 'active',
      field: 'record_status',
      comment: '记录状态: active/有效, active_tentative/临时生效, expiry/失效',
    },
    version: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '版本号 (Version)，每次记录更新时自动加 1',
    },
    createdAt: {
      type: DATE,
      allowNull: false,
      defaultValue: NOW,
      field: 'created_at',
      comment: '创建时间 (Created At)',
    },
    updatedAt: {
      type: DATE,
      allowNull: false,
      defaultValue: NOW,
      field: 'updated_at',
      comment: '最后修改时间 (Last Modified)',
    },
    updatedByAccoutId: {
      type: INTEGER,
      allowNull: true,
      field: 'updated_by_accout_id',
      comment: '修改人的 accounts.id (Modified By)',
    },
  }, {
    timestamps: true, // 启用 createdAt 和 updatedAt
    freezeTableName: true, // 禁止 Sequelize 自动复数化表名
    indexes: [
      {
        name: 'idx_semester_date',
        fields: [ 'semester_id', 'date' ],
        comment: '学期ID与日期的组合索引 (Index for Semester ID and Date)',
      },
      {
        name: 'idx_event_type',
        fields: [ 'event_type' ],
        comment: '事件类型索引 (Index for Event Type)',
      },
    ],
    hooks: {
      beforeUpdate: instance => {
        instance.version += 1;
      },
    },
  });

  return CalendarEvent;
};
