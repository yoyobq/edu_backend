/* eslint-disable no-unused-vars */
'use strict';

/**
 * @file service/plan/courseScheduleManager.js
 * @description 课时计算及课表综合管理服务层，涉及课程表、课程时段和校历事件。
 * @module service/plan/courseScheduleManager
 */

const { Service } = require('egg');

class CourseScheduleManagerService extends Service {
  /**
   * 判断某日期是否上课日，并返回实际的上课 weekday（考虑调休）
   * @private
   * @param {Object} param - 参数对象
   * @param {string} param.date - 要查询的日期
   * @return {Promise<{ isClassDay: boolean, dayOfWeek: number }>} - 是否上课 + 实际星期几（1~7）
   */
  async _resolveClassDay({ date }) {
    const { ctx } = this;

    // 查询当天所有相关事件（包括调休目标日和原始日）
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        date,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });

    // 检查是否为调课日（当天为调课后的上课日）
    const weekdaySwap = events.find(e => e.eventType === 'WEEKDAY_SWAP' && e.date === date);

    // 检查是否为假期上课（当天原本假期，但现调为休息）
    const holidayMakeup = events.find(e => e.eventType === 'HOLIDAY_MAKEUP' && e.date === date);

    // 检查是否为国定假日
    const isHoliday = events.some(e => e.eventType === 'HOLIDAY' && e.date === date);

    if (weekdaySwap || holidayMakeup) {
      // 是调课后的上课日，取调课的那一天以确定星期
      const changedDay = weekdaySwap || holidayMakeup;
      const resolvedWeekday = new Date(changedDay.originalDate).getDay();
      return { isClassDay: true, dayOfWeek: resolvedWeekday === 0 ? 7 : resolvedWeekday };
    }

    if (isHoliday) {
      // 当天是调休原始日或假日，不上课
      return { isClassDay: false, dayOfWeek: null };
    }

    // 默认情况，当天正常上课
    const weekday = new Date(date).getDay();
    return { isClassDay: true, dayOfWeek: weekday === 0 ? 7 : weekday };
  }

  /**
   * 扁平化课表数据 (CourseSchedule + CourseSlot)
   * @private
   * @param {Array} schedules - 包含 slots 的课程表数组
   * @return {Array} - 扁平化后的课表数据
   */
  _flattenSchedules(schedules) {
    const result = [];
    for (const schedule of schedules) {
      const {
        id,
        courseName,
        staffId: sId,
        staffName,
        teachingClassName,
        classroomName,
        semesterId,
        courseCategory,
        credits,
        weekCount,
        weeklyHours,
        isWil,
        weekNumberString,
        slots,
      } = schedule.get({ plain: true });

      if (!slots || slots.length === 0) {
        this.ctx.throw(404, `无法根据课程信息找到对应的上课时间 courseSlot 信息: ${id}`);
      }

      for (const slot of slots) {
        result.push({
          scheduleId: id,
          courseName,
          staffId: sId,
          staffName,
          teachingClassName,
          classroomName,
          semesterId,
          courseCategory,
          credits,
          weekCount,
          weeklyHours,
          isWil,
          weekNumberString,
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek,
          periodStart: slot.periodStart,
          periodEnd: slot.periodEnd,
          weekType: slot.weekType,
        });
      }
    }

    return result;
  }

  /**
   * 查询某个教职工完整课表
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {number} param.semesterId - 学期ID
   * @return {Promise<Array<{
   *  scheduleId: number,
   *  courseName: string,
   *  staffId: number,
   *  staffName: string,
   *  teachingClassName: string,
   *  classroomName: string,
   *  semesterId: number,
   *  slotId: number,
   *  dayOfWeek: number,
   *  periodStart: number,
   *  periodEnd: number,
   *  weekType: 'all' | 'odd' | 'even',
   * }>>} 返回一个扁平化的排课数组，每个元素包含主表信息与 slot 信息。
   */
  async getFullScheduleByStaff({ staffId, semesterId }) {
    // 查询与 staffId、semesterId 匹配的所有 CourseSchedule，并关联 slots
    const schedules = await this.ctx.model.Plan.CourseSchedule.findAll({
      where: { staffId, semesterId },
      include: [{
        model: this.ctx.model.Plan.CourseSlot,
        as: 'slots',
      }],
    });

    const result = this._flattenSchedules(schedules);

    return result;
  }

  /**
   * 按日期查询某个教职工当天的课表（考虑特殊事件）
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {string} param.date - 查询的日期
   * @return {Promise<Array>} - 当天有效的课时安排，同 getFullScheduleByStaff
   */
  async getDailySchedule({ staffId, date }) {
    const { ctx } = this;

    const { isClassDay, dayOfWeek } = await this._resolveClassDay({ date });
    console.log(date, isClassDay, dayOfWeek);

    if (!isClassDay) return [];

    const schedules = await ctx.model.Plan.CourseSchedule.findAll({
      where: { staffId },
      include: [{
        model: ctx.model.Plan.CourseSlot,
        as: 'slots',
        where: { dayOfWeek },
      }],
    });

    return this._flattenSchedules(schedules);
  }


  /**
   * 计算教职工在指定日期范围内的实际课时数
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {string|Date} param.startDate - 开始日期
   * @param {string|Date} param.endDate - 结束日期
   * @return {Promise<number>} - 实际有效的总课时数
   */
  async calculateStaffHours({ staffId, startDate, endDate }) {
    let totalHours = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const slots = await this.getDailySchedule({ staffId, date: dateStr });

      for (const slot of slots) {
        totalHours += slot.periodEnd - slot.periodStart + 1;
      }

      current.setDate(current.getDate() + 1);
    }

    return totalHours;
  }


  /**
   * 批量统计多个教职工在指定日期范围内的课时
   * @param {Object} param - 参数对象
   * @param {Array<number>} param.staffIds - 教职工ID列表
   * @param {string|Date} param.startDate - 开始日期
   * @param {string|Date} param.endDate - 结束日期
   * @return {Promise<Array>} - 每个教职工的课时统计
   */
  async calculateMultipleStaffHours({ staffIds, startDate, endDate }) {
    // TODO: 批量调用 calculateStaffHours 方法，返回汇总结果
  }

  /**
   * 精确列出某教职工在指定学期内实际要上课的所有日期及课时
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {number} param.semesterId - 学期ID
   * @return {Promise<Array>} - 实际有效的上课日期及课时详情
   */
  async listActualTeachingDates({ staffId, semesterId }) {
    // TODO: 根据 semester 和 calendarEvent 表，精准确定实际教学日期
  }
}

module.exports = CourseScheduleManagerService;
