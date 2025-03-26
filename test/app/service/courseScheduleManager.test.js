'use strict';

/**
 * @file test/service/courseScheduleManager.test.js
 * @description 课程表管理服务层单元测试
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('课程表管理服务: test/service/courseScheduleManager.test.js', () => {
  const testSemesterId = 2;
  const testStaffId = 2;
  // before(async () => {
  //   const ctx = app.mockContext();
  //   // 创建预设课程安排
  //   const schedule = await ctx.model.Plan.CourseSchedule.create({
  //     staffId: testStaffId,
  //     semesterId: testSemesterId,
  //     courseName: '单元测试课程',
  //     teachingClassName: '测试班级',
  //   });
  //   presetScheduleId = schedule.id;
  // });

  // after(async () => {
  //   const ctx = app.mockContext();
  //   await ctx.model.Plan.CourseSchedule.destroy({ where: { id: presetScheduleId } });
  // });

  it('1. 应获取教职工完整课表', async () => {
    const ctx = app.mockContext();
    const schedules = await ctx.service.plan.courseScheduleManager.getFullScheduleByStaff({
      staffId: testStaffId,
      semesterId: testSemesterId,
    });
    // console.log(staffId, semesterId);
    // console.log(schedules);
    assert(Array.isArray(schedules), '应返回数组类型');
  });

  it('2. 应按日期查询某个教职工当天的课表', async () => {
    const ctx = app.mockContext();
    const schedules = await ctx.service.plan.courseScheduleManager.getDailySchedule({
      staffId: testStaffId,
      date: '2025-03-27',
    });

    // console.log(schedules);
    assert(Array.isArray(schedules), '应返回数组类型');
    // assert(typeof hours === 'number', '应返回数字类型');
    // assert(hours >= 0, '课时数不应为负数');
  });

  it('3. 应按日期查询调课课表', async () => {
    const ctx = app.mockContext();
    const schedules = await ctx.service.plan.courseScheduleManager.getDailySchedule({
      staffId: testStaffId,
      date: '2025-04-27',
    });

    // console.log(schedules);
    assert(Array.isArray(schedules), '应返回数组类型');
  });

  it('4. 应按日期查询调休课表，返回空列表', async () => {
    const ctx = app.mockContext();
    const schedules = await ctx.service.plan.courseScheduleManager.getDailySchedule({
      staffId: testStaffId,
      date: '2025-05-02',
    });

    assert(Array.isArray(schedules) && schedules.length === 0, '应返空回数组');
    // assert(hours >= 0, '课时数不应为负数');
  });

  it('2. 应计算单个教职工课时', async () => {
    const ctx = app.mockContext();
    const hours = await ctx.service.plan.courseScheduleManager.calculateStaffHours({
      staffId: testStaffId,
      startDate: '2025-02-14',
      endDate: '2025-6-29',
    });

    console.log(hours);
    //   assert(typeof hours === 'number', '应返回数字类型');
    //   assert(hours >= 0, '课时数不应为负数');
  });

  // it('3. 应批量统计教职工课时', async () => {
  //   const ctx = app.mockContext();
  //   const result = await ctx.service.plan.courseScheduleManager.calculateMultipleStaffHours({
  //     staffIds: [ testStaffId, 9999 ], // 包含无效ID测试容错
  //     startDate: '2024-03-01',
  //     endDate: '2024-03-31',
  //   });

  //   assert(Array.isArray(result), '应返回数组类型');
  //   assert(result.length === 2, '应保持输入ID数量一致');
  //   assert(result.some(r => r.staffId === testStaffId), '应包含有效教职工数据');
  // });

  // it('4. 应列出实际授课日期', async () => {
  //   const ctx = app.mockContext();
  //   const dates = await ctx.service.plan.courseScheduleManager.listActualTeachingDates({
  //     staffId: testStaffId,
  //     semesterId: testSemesterId,
  //   });

  //   assert(Array.isArray(dates), '应返回数组类型');
  //   dates.forEach(date => {
  //     assert(date.date instanceof Date, '应包含有效日期对象');
  //     assert(typeof date.hours === 'number', '应包含课时数');
  //   });
  // });
});
