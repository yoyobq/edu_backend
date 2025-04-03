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
      staffId: 2,
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
      date: '2024-12-27',
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

  it('5. 应计算单个教职工实际上课日期和完整的课程', async () => {
    const semesterId = 2;
    const ctx = app.mockContext();
    const semester = await ctx.model.Plan.Semester.findByPk(2);
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
    const dates = await ctx.service.plan.courseScheduleManager.listActualTeachingDates({
      staffId: 2,
      semester,
      events,
      weeks: [ 12, 16 ],
    });

    // console.dir(dates, { depth: null });
    // console.log(dates);
    assert(Array.isArray(dates), '应返回数组类型');
  });

  it('6.1 应计算教职工在指定学期内因假期取消的课程（全局数据周末调课不显示）', async () => {
    const semesterId = 2;
    const ctx = app.mockContext();
    const semester = await ctx.model.Plan.Semester.findByPk(2);
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
      raw: true,
    });
    const dates = await ctx.service.plan.courseScheduleManager.calculateCancelledCourses({
      staffId: 2,
      semester,
      events,
    });

    // console.dir(dates, { depth: null });
    // console.log(dates);
    assert(Array.isArray(dates), '应返回数组类型');
  });

  it('6.2 应计算教职工在指定学期指定周范围内因假期取消的课程（局部数据周末调课要说明）', async () => {
    const semesterId = 2;
    const ctx = app.mockContext();
    const semester = await ctx.model.Plan.Semester.findByPk(2);
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
      raw: true,
    });
    const dates = await ctx.service.plan.courseScheduleManager.calculateCancelledCourses({
      staffId: 2,
      semester,
      events,
      weeks: [ 10, 16 ],
    });

    // console.dir(dates, { depth: null });
    // console.log(dates);
    assert(Array.isArray(dates), '应返回数组类型');
  });

  it('7. 应列出单个教职工、指定学期(或学期中的月份)实际授课课时', async () => {
    const ctx = app.mockContext();
    const semester = await ctx.model.Plan.Semester.findByPk(2);
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId: 2,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
    const hours = await ctx.service.plan.courseScheduleManager.calculateTeachingHours({
      staffId: 2,
      semester,
      weeks: [ 12, 12 ],
      events,
    });

    assert(typeof hours === 'number' && hours > 0, '应返回数组类型');
    // console.log(hours);
  });

  it('8. 应批量按学期或学期中的月份统计全体教职工课时', async () => {
    const ctx = app.mockContext();
    const result = await ctx.service.plan.courseScheduleManager.calculateMultipleTeachingHours({
      // staffIds: [ 8, 2 ],
      sstsTeacherIds: [ '3617', '3592', '3618', '3497', '3552', '3553', '3593', '3616', '3556' ],
      semesterId: 2,
      // weeks: [ 12, 16 ],
    });

    assert(Array.isArray(result), '应返回数组类型');
    // console.log(result);
  });
});
