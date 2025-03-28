/* 此测试会造成数据库的修改，是一个临时方案，请勿随意启用 */

'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/service/myCourses.test.js', () => {
  // eslint-disable-next-line no-unused-vars
  let myCourseScheduleService;

  before(async () => {
    const ctx = app.mockContext();
    myCourseScheduleService = ctx.service.mySSTS.myCourseSchedule; // 修正服务名
  });

  it('should fetch course schedules', async () => {
    // 从校园网抓取特定学期的课程数据并存入本地数据库（临时方案，谨慎操作）
    const courseList = await myCourseScheduleService.getCourseScheduleListSSTS();
    // console.log(courseList);
    assert(Array.isArray(courseList));
  });
});
