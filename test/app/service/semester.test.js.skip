'use strict';

/**
 * @file test/service/semester.test.js
 * @description 学期管理 Service 层单元测试
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('学期管理 Service: test/service/semester.test.js', () => {
  let testSemesterId;

  // 测试数据配置
  const semesterData = {
    schoolYear: 2023,
    termNumber: 1,
    name: '2025春季学期',
    startDate: '2025-03-01',
    examStartDate: '2025-06-15',
    endDate: '2025-07-15',
    isCurrent: false,
  };

  before(async () => {
    const ctx = app.mockContext();
    // 创建预设学期
    const created = await ctx.service.plan.semester.createSemester(semesterData);
    testSemesterId = created.id;
  });

  after(async () => {
    const ctx = app.mockContext();
    // 清理测试数据
    await ctx.service.plan.semester.deleteSemester({ id: testSemesterId });
  });


  it('1. 应正确获取学期详情', async () => {
    const ctx = app.mockContext();
    const semester = await ctx.service.plan.semester.getSemester({ id: testSemesterId });
    assert.strictEqual(semester.name, semesterData.name, '学期名称应匹配');
  });

  it('3. 应更新学期信息', async () => {
    const ctx = app.mockContext();
    const updatedName = '更新后的学期名';

    await ctx.service.plan.semester.updateSemester({
      id: testSemesterId,
      name: updatedName,
    });

    const freshData = await ctx.service.plan.semester.getSemester({ id: testSemesterId });
    assert.strictEqual(freshData.name, updatedName, '名称更新应生效');
  });

  it('4. 应删除学期', async () => {
    const ctx = app.mockContext();

    // 删除前验证存在性
    const preDeleteCheck = await ctx.service.plan.semester.getSemester({ id: testSemesterId });
    assert.ok(preDeleteCheck, '删除前应存在数据');

    // 执行删除
    const result = await ctx.service.plan.semester.deleteSemester({ id: testSemesterId });
    assert.strictEqual(result, true, '应返回true表示删除成功');
  });
});
