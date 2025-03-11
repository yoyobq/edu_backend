'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('Test plan_calendar_events Model', () => {
  let ctx;
  let event;

  before(async () => {
    ctx = app.mockContext();
  });

  it('是否能创建校历事件 calendar event', async () => {
    event = await ctx.model.Plan.CalendarEvent.create({
      semesterId: 1,
      topic: '期中考试',
      date: new Date('2025-04-15'),
      timeSlot: 'morning',
      eventType: 'exam',
      recordStatus: 'active',
      updatedByAccoutId: 2,
    });

    assert(event.id);
    assert.strictEqual(event.version, 1);
    assert(event.createdAt instanceof Date);
    assert(event.updatedAt instanceof Date);
  });

  it('是否能修改并自动更新事件版本', async () => {
    event.topic = '期末考试';
    await event.save();

    assert.strictEqual(event.version, 2);
  });

  it('是否能删除事件', async () => {
    const id = event.id;
    await ctx.model.Plan.CalendarEvent.destroy({ where: { id } });
    const deletedEvent = await ctx.model.Plan.CalendarEvent.findByPk(id);
    assert.strictEqual(deletedEvent, null);
  });
});
