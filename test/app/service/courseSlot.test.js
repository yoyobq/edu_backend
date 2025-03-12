'use strict';

/**
 * @file courseSlot.test.js
 * @description 课程时间安排 Service 层测试。
 * @module test/service/courseSlot.test
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('课程时间安排 Service: test/service/courseSlot.test 测试', () => {
  let ctx;

  before(async () => {
    ctx = app.mockContext();
  });

  it('应获取单个课程时间安排', async () => {
    const courseSlot = await ctx.service.plan.courseSlot.getCourseSlot({ id: 1 });
    assert(courseSlot, '应返回有效的课程时间安排');
    assert(courseSlot.id === 1, '课程时间安排 ID 应该匹配');
  });

  it('应按学期获取课程时间安排 (semesterId = 2)', async () => {
    const courseSlots = await ctx.service.plan.courseSlot.listCourseSlots({ semesterId: 2 });
    assert(Array.isArray(courseSlots), '返回的数据应为数组');
    assert(courseSlots.length > 0, '应返回至少一个课程时间安排');
  });

  it('应按教师获取课程时间安排 (staffId = 2)', async () => {
    const courseSlots = await ctx.service.plan.courseSlot.listCourseSlots({ staffId: 2 });
    assert(Array.isArray(courseSlots), '返回的数据应为数组');
    assert(courseSlots.length > 0, '应返回至少一个课程时间安排');
  });

  it('应按学期和教师获取课程时间安排 (semesterId = 2, staffId = 2)', async () => {
    const courseSlots = await ctx.service.plan.courseSlot.listCourseSlots({ semesterId: 2, staffId: 2 });
    assert(Array.isArray(courseSlots), '返回的数据应为数组');
    assert(courseSlots.length > 0, '应返回至少一个课程时间安排');
  });

  it('应按星期几获取课程时间安排 (dayOfWeek = 4)', async () => {
    const courseSlots = await ctx.service.plan.courseSlot.listCourseSlots({ dayOfWeek: 4 });
    assert(Array.isArray(courseSlots), '返回的数据应为数组');
    assert(courseSlots.length > 0, '应返回至少一个课程时间安排');
  });

  it('应成功创建课程时间安排 (courseScheduleId = 1)', async () => {
    const input = {
      courseScheduleId: 1,
      staffId: 2,
      dayOfWeek: 3,
      periodStart: 1,
      periodEnd: 2,
      weekType: 'ALL',
      semesterId: 2,
    };

    const courseSlot = await ctx.service.plan.courseSlot.createCourseSlot({ input });

    assert(courseSlot, '应成功创建课程时间安排');
    assert(courseSlot.id, '新创建的课程时间安排应有 ID');
    assert.strictEqual(courseSlot.courseScheduleId, input.courseScheduleId, 'courseScheduleId 应匹配');
    assert.strictEqual(courseSlot.staffId, input.staffId, 'staffId 应匹配');
    assert.strictEqual(courseSlot.dayOfWeek, input.dayOfWeek, 'dayOfWeek 应匹配');
    assert.strictEqual(courseSlot.periodStart, input.periodStart, 'periodStart 应匹配');
    assert.strictEqual(courseSlot.periodEnd, input.periodEnd, 'periodEnd 应匹配');
    assert.strictEqual(courseSlot.weekType, input.weekType, 'weekType 应匹配');
    assert.strictEqual(courseSlot.semesterId, input.semesterId, 'semesterId 应匹配');
  });
});
