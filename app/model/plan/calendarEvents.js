'use strict';

/**
 * @file calendarEvents.js
 * @description 校历事件表的 Sequelize 模型。
 *
 * 主要功能:
 * - 存储学期相关的事件，如假期、考试、活动等。
 * - 记录修改时间和修改人。
 * - 提供索引优化查询。
 *
 * @module model/plan/calendarEvents
 */

module.exports = app => {
  const { INTEGER, STRING, ENUM, DATE, NOW } = app.Sequelize;

  const CalendarEvents = app.model.define('plan_calendar_events', {
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
      type: DATE,
      allowNull: false,
      comment: '事件日期 (Event Date)',
    },
    timeSlot: {
      type: ENUM('all_day', 'morning', 'afternoon'),
      allowNull: false,
      defaultValue: 'all_day',
      field: 'time_slot',
      comment: '时间段: all_day/全天, morning/上午, afternoon/下午',
    },
    eventType: {
      type: ENUM('holiday', 'exam', 'activity', 'holiday_makeup', 'weekday_swap', 'sports_meet'),
      allowNull: false,
      field: 'event_type',
      comment: '事件类型: 假期、考试、活动等 (Event Type)',
    },
    originalDate: {
      type: DATE,
      allowNull: true,
      field: 'original_date',
      comment: '调课或休假的原始日期 (Original Date)',
    },
    recordStatus: {
      type: ENUM('active', 'active_tentative', 'expiry'),
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

  return CalendarEvents;
};
