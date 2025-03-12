'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('Test plan_semesters Model', () => {
  let ctx;
  let Semester;

  before(async () => {
    ctx = app.mockContext();
    Semester = ctx.model.Plan.Semester;
    assert(Semester, 'plan_semesters 模型未正确加载');
  });

  it('能否更新 plan_semesters 表中的首行记录', async () => {
    const semester = await Semester.findByPk(1);
    assert(semester, '数据库中 ID 为 1 的学期记录不存在');

    semester.name = '2024-2025第三学期';
    semester.isCurrent = 1;
    await semester.save();

    const updatedSemester = await Semester.findByPk(1);
    assert.strictEqual(updatedSemester.name, '2024-2025第三学期');
    assert.strictEqual(updatedSemester.isCurrent, 1);
  });
});
