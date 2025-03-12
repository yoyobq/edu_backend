'use strict';

/**
 * @file courseSchedule.test.js
 * @description 课程表 Service 层测试。
 * @module test/service/courseSchedule.test
 */

const { app } = require('egg-mock/bootstrap');

describe('课程表 Service 测试', () => {
  let ctx;

  before(async () => {
    ctx = app.mockContext();
  });

  it('应获取单个课程表', async () => {
    const courseSchedule = await ctx.service.plan.courseSchedule.getCourseSchedule({ id: 1 });
    console.log('单个课程表:', courseSchedule);
  });

  it('应按学期获取课程表 (semesterId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ semesterId: 2 });
    console.log('按学期获取的课程表:', courseSchedules);
  });

  it('应按教师获取课程表 (staffId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ staffId: 2 });
    console.log('按教师获取的课程表:', courseSchedules);
  });

  it('应按学期和教师获取课程表 (semesterId = 2, staffId = 2)', async () => {
    const courseSchedules = await ctx.service.plan.courseSchedule.listCourseSchedules({ semesterId: 2, staffId: 2 });
    console.log('按学期和教师获取的课程表:', courseSchedules);
  });
});
