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
   * @param {Array} param.events - 校历事件数组
   * @param {string} param.date - 要查询的日期
   * @return {Promise<{ isClassDay: boolean, dayOfWeek: number }>} - 是否上课 + 实际星期几（1~7）
   */
  async _resolveClassDay({ date, events = [] }) {
    const { ctx } = this;

    // 如果没有提供事件数组，则查询数据库
    if (events.length === 0) {
      events = await ctx.model.Plan.CalendarEvent.findAll({
        where: {
          date,
          recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
        },
      });
    }

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
        coefficient,
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
          coefficient,
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
   * 精确列出某教职工在指定学期内实际要上课的所有日期及课程
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {number} param.sstsTeacherId - 校园网教职工ID
   * @param {number} param.semesterId - 学期ID
   * @return {Promise<Array>} - 实际有效的上课日期及课时详情
   */
  async listActualTeachingDates({ staffId = 0, sstsTeacherId, semesterId }) {
    const { ctx } = this;

    // 获取学期信息
    const semester = await ctx.model.Plan.Semester.findByPk(semesterId);
    if (!semester) ctx.throw(404, `未找到ID为${semesterId}的学期信息`);
    if (!semester.firstTeachingDate) ctx.throw(400, '学期信息缺少 firstTeachingDate，请确认数据库数据');

    // 获取该教师在该学期的所有课程安排及其时段
    const schedules = await ctx.model.Plan.CourseSchedule.findAll({
      where: staffId !== 0 ? { staffId, semesterId } : { sstsTeacherId, semesterId },
      include: [{ model: ctx.model.Plan.CourseSlot, as: 'slots' }],
    });
      // 一次性查询学期内所有校历事件
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        date: {
          semesterId,
        },
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
      // 初始化结果数组
    const actualTeachingDates = [];
    // 从学期第一个教学日开始遍历
    const currentDate = new Date(semester.firstTeachingDate);

    // 遍历学期内的每一天，直到学期结束
    while (currentDate <= new Date(semester.endDate)) {
      const dateString = currentDate.toISOString().split('T')[0]; // 格式化日期为 YYYY-MM-DD

      // 检查当天是否为上课日（考虑调休、假期等特殊情况）
      const { isClassDay, dayOfWeek } = await this._resolveClassDay({ date: dateString, events });
      if (!isClassDay) {
        // 如果不是上课日，跳过当天
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 计算当前日期是学期第几周
      // 通过计算与学期第一教学日的差值，除以一周的毫秒数
      const weekDiff = Math.floor((currentDate - new Date(semester.firstTeachingDate)) / (7 * 24 * 60 * 60 * 1000));

      // 收集当天所有课程时段
      const slotsForTheDay = [];
      schedules.forEach(schedule => {
        // 解析周数字符串，确定当前周是否有课
        // weekNumberString 格式如 "1,1,1,0,1,1,0,..."，表示每周是否有课
        const weekNumberArray = schedule.weekNumberString.split(',').map(Number);

        // 检查当前周是否在周数范围内且该周有课 (值为1)
        if (weekDiff >= 0 && weekDiff < weekNumberArray.length && weekNumberArray[weekDiff] === 1) {
          // 筛选出当天星期几对应的课程时段
          schedule.slots
            .filter(slot => slot.dayOfWeek === dayOfWeek)
            .forEach(slot => {
              // 将符合条件的课程时段添加到当天课表中
              slotsForTheDay.push({
                scheduleId: schedule.id,
                courseName: schedule.courseName,
                slotId: slot.id,
                periodStart: slot.periodStart, // 开始节次
                periodEnd: slot.periodEnd, // 结束节次
                weekType: slot.weekType, // 周类型：全周/单周/双周
                coefficient: schedule.coefficient, // 新增系数字段
              });
            });
        }
      });

      // 如果当天有课，添加到结果数组
      if (slotsForTheDay.length > 0) {
        actualTeachingDates.push({
          date: dateString, // 日期
          weekOfDay: dayOfWeek, // 星期几 (1-7)
          weekNumber: weekDiff + 1, // 第几教学周
          courses: slotsForTheDay, // 当天的课程时段列表
        });
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return actualTeachingDates;
  }

  /**
     * 计算教职工在指定日期范围内的实际课时数
     * @param {Object} param - 参数对象
     * @param {number} param.staffId - 教职工ID（优先使用）
     * @param {number} param.sstsTeacherId - 校园网教职工ID（当 staffId 为 0 时使用）
     * @param {number} param.semesterId - 学期ID
     * @return {Promise<number>} - 实际有效的总课时数
     */
  async calculateStaffHours({ staffId = 0, sstsTeacherId, semesterId }) {
    // 根据 staffId 或 sstsTeacherId 查询课程表，获取实际教学日期
    const allDates = await this.listActualTeachingDates({
      staffId: staffId !== 0 ? staffId : undefined,
      sstsTeacherId: staffId === 0 ? sstsTeacherId : undefined,
      semesterId,
    });

    let totalHours = 0;
    // 遍历所有课程日期，计算总课时数
    allDates.forEach(day => {
      day.courses.forEach(course => {
        totalHours += (course.periodEnd - course.periodStart + 1) * course.coefficient;
      });
    });
    return parseFloat(totalHours.toFixed(2)); // 保留两位小数
  }

  /**
     * 批量统计多个教职工在指定日期范围内的课时
     * @param {Object} param - 参数对象
     * @param {Array<number>} param.staffIds - 教职工ID列表，若为空则使用 sstsTeacherId 查询
     * @param {number} param.semesterId - 学期ID
     * @return {Promise<Array>} - 每个教职工的课时统计（包含 staffId, sstsTeacherId, staffName）
     */
  async calculateMultipleStaffHours({ staffIds = [], semesterId }) {
    const { ctx } = this;
    const results = [];

    if (staffIds.length === 0) {
      // 当 staffIds 为空时，查询所有唯一的 sstsTeacherId 及 staffName
      const teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: { semesterId },
        attributes: [ 'sstsTeacherId', 'staffId', 'staffName' ],
        group: [ 'sstsTeacherId', 'staffId', 'staffName' ],
        raw: true,
      });

      // 计算每个教师的课时数
      for (const { sstsTeacherId, staffId, staffName } of teachers) {
        const hours = await this.calculateStaffHours({ sstsTeacherId, semesterId });
        results.push({ staffId, sstsTeacherId, staffName, totalHours: parseFloat(hours.toFixed(2)) });
      }
    } else {
      // 使用 staffId 计算课时数
      for (const staffId of staffIds) {
        const staffData = await ctx.model.Plan.CourseSchedule.findOne({
          where: { staffId },
          attributes: [ 'sstsTeacherId', 'staffName' ],
          raw: true,
        });
        if (!staffData) continue;
        const { sstsTeacherId, staffName } = staffData;
        const hours = await this.calculateStaffHours({ staffId, semesterId });
        results.push({ staffId, sstsTeacherId, staffName, totalHours: parseFloat(hours.toFixed(2)) });
      }
    }
    return results;
  }
}

module.exports = CourseScheduleManagerService;
