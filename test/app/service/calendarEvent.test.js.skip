'use strict';

/**
 * @file test/service/calendarEvent.test.js
 * @description 校历事件 Service 层单元测试。
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('校历事件 Service: test/service/calendarEvent.test.js', () => {
  const testSemesterId = 2;
  let presetEventId;

  before(async () => {
    const ctx = app.mockContext();
    const presetEvent = await ctx.service.plan.calendarEvent.createCalendarEvent({
      semesterId: testSemesterId,
      topic: '预设测试事件',
      date: '2025-01-01',
      timeSlot: 'afternoon',
      eventType: 'exam',
    });
    presetEventId = presetEvent.toJSON().id; // 修复变量名拼写
  });

  after(async () => {
    const ctx = app.mockContext();
    await ctx.service.plan.calendarEvent.deleteCalendarEvent({ id: presetEventId });
  });

  it('1. 应获取指定ID的校历事件', async () => {
    const ctx = app.mockContext();
    const event = await ctx.service.plan.calendarEvent.getCalendarEvent({ id: presetEventId });
    assert.strictEqual(event.id, presetEventId, '事件ID应该匹配');
  });

  it('2. 应获取指定学期的校历事件', async () => {
    const ctx = app.mockContext();
    const events = await ctx.service.plan.calendarEvent.listCalendarEvents({
      semesterId: testSemesterId,
    });
    assert(events.some(e => e.id === presetEventId), '应包含预创建事件');
  });

  // 移动测试用例到嵌套块内
  it('3. 应成功获取动态创建的事件', async () => {
    const ctx = app.mockContext();
    const event = await ctx.service.plan.calendarEvent.getCalendarEvent({ id: presetEventId });
    assert.strictEqual(event.id, presetEventId, '事件 ID 应该匹配');
  });

  it('4. 应更新事件主题', async () => {
    const ctx = app.mockContext();

    // 先执行更新操作
    await ctx.service.plan.calendarEvent.updateCalendarEvent({
      id: presetEventId,
      topic: '更新主题',
    });
    // 重新获取最新数据验证
    const freshData = await ctx.service.plan.calendarEvent.getCalendarEvent({ id: presetEventId });
    assert.strictEqual(freshData.toJSON().topic, '更新主题', '主题更新应生效'); // 断言最新数据
  });

  it('5. 应删除事件', async () => {
    const ctx = app.mockContext();

    // 删除前验证存在性
    const preDeleteData = await ctx.service.plan.calendarEvent.getCalendarEvent({ id: presetEventId });
    assert(preDeleteData, '删除前事件应存在');

    // 执行删除
    const deleteResult = await ctx.service.plan.calendarEvent.deleteCalendarEvent({ id: presetEventId });
    assert.strictEqual(deleteResult, true, '应返回删除成功状态');
  });
});
