'use strict';

/**
 * @file courseSchedule.test.js
 * @description 课程表 Service 层测试。
 * @module test/service/courseSchedule.test
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('课程表 Service: test/service/courseSchedule.test 测试', () => {
  let ctx;

  before(async () => {
    ctx = app.mockContext();
  });

  it('1.应获取单个课程表', async () => {
    const courseSchedule = await ctx.service.plan.courseSchedule.getCourseSchedule({ id: 1 });
    assert(courseSchedule, '应返回有效的课程表');
    assert(courseSchedule.id === 1, '课程表 ID 应该匹配');
  });

  it('2.应按学期获取课程表 (semesterId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ semesterId: 2 });
    assert(Array.isArray(courseSchedules), '返回的数据应为数组');
    assert(courseSchedules.length > 0, '应返回至少一个课程表');
  });

  it('3.应按教师获取课程表 (staffId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ staffId: 2 });
    assert(Array.isArray(courseSchedules), '返回的数据应为数组');
    assert(courseSchedules.length > 0, '应返回至少一个课程表');
  });

  it('4.应按学期和教师获取课程表 (semesterId = 2, staffId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ semesterId: 2, staffId: 2 });
    assert(Array.isArray(courseSchedules), '返回的数据应为数组');
    assert(courseSchedules.length > 0, '应返回至少一个课程表');
  });

  it('5.应按学期获取课程表并合并 sourceMap (semesterId = 2, includeSourceMap = true)', async () => {
    const courseSchedule = await ctx.service.plan.courseSchedule.listCourseSchedules({ semesterId: 2, includeSourceMap: true });
    // console.log(courseSchedule);
    assert(courseSchedule, '应返回有效的课程表');
    assert(typeof courseSchedule === 'object', '返回的课程表应是对象');
    assert(courseSchedule[0].lecturePlanId, '应包含 sourceMap 数据字段 lecturePlanId');
    assert(courseSchedule[0].courseId, '应包含 sourceMap 数据字段 courseId');
  });
});
