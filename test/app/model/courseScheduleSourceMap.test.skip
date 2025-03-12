'use strict';

/**
 * @file courseScheduleSourceMap.test.js
 * @description 课程表 (PlanCourseSchedule) 与 SSTS 课程数据映射 (SstsCourseScheduleSourceMap) 的单元测试。
 *
 * 主要测试内容：
 * - 课程表的创建与存储。
 * - SSTS 爬取数据映射的创建与存储。
 * - 课程表与 SSTS 数据的关联查询。
 * - SSTS 数据删除时，不应该影响课程表。
 * - 课程表删除时的影响（是否级联删除 SSTS 中的数据映射）。
 *
 * @module test/app/model/courseScheduleSourceMap.test.js
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('测试 PlanCourseSchedule 与 SstsCourseScheduleSourceMap 关联', () => {
  let ctx;
  let CourseSchedule;
  let CourseScheduleSourceMap;
  let schedule;
  let sourceMap;

  before(async () => {
    ctx = app.mockContext();
    CourseSchedule = ctx.model.Plan.CourseSchedule;
    CourseScheduleSourceMap = ctx.model.Ssts.CourseScheduleSourceMap;
    assert(CourseSchedule, '课程表模型未正确加载');
    assert(CourseScheduleSourceMap, 'SSTS 课程数据映射模型未正确加载');
  });

  it('应当成功创建新的课程表', async () => {
    schedule = await CourseSchedule.create({
      staffId: 101,
      staffName: '张老师',
      teachingClassName: '计算机科学1班',
      semesterId: 1,
      weekCount: 16,
      weeklyHours: 4,
      credits: 3,
      isWil: 0,
      courseCategory: '必修课',
    });
    assert(schedule.id, '课程表创建失败');
  });

  it('应当成功创建对应的 SSTS 课程数据映射', async () => {
    sourceMap = await CourseScheduleSourceMap.create({
      courseScheduleId: schedule.id,
      lecturePlanId: 'LP1234567890',
      courseId: 'C123456',
      teacherInChargeId: 'T987654',
      teachingClassId: 'TC654321',
      staffId: schedule.staffId,
      semesterId: schedule.semesterId,
    });
    assert(sourceMap.id, 'SSTS 课程数据映射创建失败');
  });

  it('应当成功查询课程表及其 SSTS 课程数据映射', async () => {
    const fetchedSchedule = await CourseSchedule.findOne({
      where: { id: schedule.id },
      include: [{ model: CourseScheduleSourceMap, as: 'sourceMap' }],
    });
    assert(fetchedSchedule, '未找到课程表');
    assert(fetchedSchedule.sourceMap, '未找到相关的 SSTS 课程数据映射');
  });

  it('删除 SSTS 数据后应当确保课程表仍然存在', async () => {
    await sourceMap.destroy();
    const deletedSourceMap = await CourseScheduleSourceMap.findByPk(sourceMap.id);
    assert.strictEqual(deletedSourceMap, null, 'SSTS 课程数据映射删除失败');

    const remainingSchedule = await CourseSchedule.findByPk(schedule.id);
    assert(remainingSchedule, '课程表不应被删除');
  });

  it('删除课程表后应当同时删除 SSTS 数据映射', async () => {
    sourceMap = await CourseScheduleSourceMap.create({
      courseScheduleId: schedule.id,
      lecturePlanId: 'LP9876543210',
      courseId: 'C654321',
      teacherInChargeId: 'T123456',
      teachingClassId: 'TC123456',
      staffId: schedule.staffId,
      semesterId: schedule.semesterId,
    });
    await schedule.destroy();
    const deletedSourceMap = await CourseScheduleSourceMap.findByPk(sourceMap.id);
    assert.strictEqual(deletedSourceMap, null, 'SSTS 课程数据映射应该被删除');
  });
});
