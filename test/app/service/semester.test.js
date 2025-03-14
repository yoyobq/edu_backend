'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('学期 Service: test/service/semester.test.js', () => {
  let semesterId;

  it('1.应创建新学期', async () => {
    const ctx = app.mockContext();
    const input = {
      schoolYear: 2023,
      termNumber: 1,
      name: '2025春季学期',
      startDate: '2025-02-20',
      examStartDate: '2025-06-10',
      endDate: '2025-06-30',
      isCurrent: false,
    };

    const semester = await ctx.service.plan.semester.createSemester(input);
    assert(semester, '创建的学期对象不能为空');
    assert(semester.id, '创建的学期应有 ID');
    assert.strictEqual(semester.name, input.name, '学期名称应匹配输入值');

    semesterId = semester.id;
  });

  it('2.应获取单个学期信息', async () => {
    const ctx = app.mockContext();
    const semester = await ctx.service.plan.semester.getSemester({ id: semesterId });

    assert(semester, '学期对象不能为空');
    assert.strictEqual(semester.id, semesterId, '返回的学期 ID 应匹配');
  });

  it('3.应按学年获取学期列表', async () => {
    const ctx = app.mockContext();
    const semesters = await ctx.service.plan.semester.listSemesters({ schoolYear: 2023 });

    assert(Array.isArray(semesters), '返回结果应为数组');
    assert(semesters.length > 0, '应至少返回一个学期');
    assert.strictEqual(semesters[0].schoolYear, 2023, '返回的学年应为 2023');
  });

  it('4.应按当前学期状态获取学期列表', async () => {
    const ctx = app.mockContext();
    const semesters = await ctx.service.plan.semester.listSemesters({ isCurrent: true });

    assert(Array.isArray(semesters), '返回结果应为数组');
    assert(semesters.length > 0, '应至少返回一个当前学期');
    assert.strictEqual(semesters[0].isCurrent, true, '返回的学期应为当前学期');
  });

  it('5.应更新学期信息', async () => {
    const ctx = app.mockContext();
    const updateData = { name: '2025 春季学期（更新）' };

    const updatedSemester = await ctx.service.plan.semester.updateSemester(semesterId, updateData);
    assert(updatedSemester, '更新后的学期对象不能为空');
    assert.strictEqual(updatedSemester.name, updateData.name, '学期名称应更新');
  });

  it('6.应删除学期', async () => {
    const ctx = app.mockContext();
    const result = await ctx.service.plan.semester.deleteSemester(semesterId);

    assert.strictEqual(result, true, '删除操作应成功');

    const deletedSemester = await ctx.service.plan.semester.getSemester({ id: semesterId });
    assert.strictEqual(deletedSemester, null, '删除后的学期对象应为空');
  });
});
