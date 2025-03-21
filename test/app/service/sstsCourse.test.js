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
    // 变量名改为小写开头
    const courseList = await myCourseScheduleService.getCourseScheduleListSSTS();
    assert(Array.isArray(courseList));
  });
});
