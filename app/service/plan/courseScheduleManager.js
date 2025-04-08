'use strict';

/**
 * @file service/plan/courseScheduleManager.js
 * @description 课时计算及课表综合管理服务层，涉及课程表、课程时段和校历事件。
 * @module service/plan/courseScheduleManager
 */

const { Service } = require('egg');
const moment = require('moment');

class CourseScheduleManagerService extends Service {
  /**
   * 判断某日期是否上课日，并返回实际的上课 weekday（考虑调休）
   * 并未考虑非上课周的情况
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

    // 提前创建日期对象并标准化星期几 (0=周日→7)
    const dateObj = new Date(date);
    const normalizeWeekday = day => (day === 0 ? 7 : day);

    // 查找相关事件
    const weekdaySwap = events.find(e => e.eventType === 'WEEKDAY_SWAP' && e.date === date);
    const holidayMakeup = events.find(e => e.eventType === 'HOLIDAY_MAKEUP' && e.date === date);
    const isHoliday = events.some(e => e.eventType === 'HOLIDAY' && e.date === date);

    // 处理调课日/补课日
    if (weekdaySwap || holidayMakeup) {
      const { originalDate } = weekdaySwap || holidayMakeup;
      return {
        isClassDay: true,
        dayOfWeek: normalizeWeekday(new Date(originalDate).getDay()),
      };
    }

    // 处理假期
    if (isHoliday) {
      const swapTarget = events.find(e =>
        (e.eventType === 'WEEKDAY_SWAP' || e.eventType === 'HOLIDAY_MAKEUP') &&
        e.originalDate === date
      );

      return {
        isClassDay: false,
        dayOfWeek: swapTarget
          ? normalizeWeekday(new Date(swapTarget.date).getDay())
          : normalizeWeekday(dateObj.getDay()),
      };
    }

    // 默认情况
    return {
      isClassDay: true,
      dayOfWeek: normalizeWeekday(dateObj.getDay()),
    };
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
    * 按教学周过滤日期数据
   * 需注意的是，此操作必须基于按学期计算出来的结果，否则会有边界错误
   * @private
   * @param {Array} data - 要过滤的数据数组（包含date字段的对象数组）
   * @param {Object} semester - 学期对象，包含 firstTeachingDate、endDate、id 等
   * @param {Array(number)} weeks - 要过滤的月份，格式为"YYYY-MM"
   * @return {Array} - 过滤后的数据
   */
  _filterByTeachingWeek(data, semester, weeks) {
    if (!weeks || weeks.length !== 2 || weeks[0] > weeks[1]) {
      throw new Error('无效的周数范围参数，必须提供包含起始周和结束周的数组且第一个数字不大于第二个');
    }

    const [ startWeek, endWeek ] = weeks;
    const firstTeachingDate = new Date(semester.firstTeachingDate);

    return data.filter(item => {
      // 计算当前日期是学期第几周
      const currentDate = new Date(item.date);
      const weekDiff = Math.floor(
        (currentDate - firstTeachingDate) / (7 * 24 * 60 * 60 * 1000)
      ) + 1; // 转换为1-based周数

      return weekDiff >= startWeek && weekDiff <= endWeek;
    });
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

    // const result = this._flattenSchedules(schedules);

    return schedules;
  }

  /**
   * 按日期查询某个教职工当天的课表（考虑特殊事件，自动识别所属学期）
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {string} param.date - 查询的日期
   * @return {Promise<Array>} - 当天有效的课时安排
   */
  async getDailySchedule({ staffId, date }) {
    const { ctx } = this;

    const { isClassDay, dayOfWeek } = await this._resolveClassDay({ date });
    if (!isClassDay) return [];

    /**
     * 魔法偏移天数（用于判断是否属于教学期）：默认考试周开始前两天即视为教学期结束。
     * 说明：
     * - 考试周在一月或六月，有可能遇到端午或元旦这种一日的国假
     * - 通常考试周从周一开始，此时偏移 2 天落在周六，属于休息日，不影响判断。
     * - 若考试周周一为国假，偏移 2 天后也可落在周日，同属休息日，不影响判断。
     */
    const OFFSET_DAYS = 2;
    const teachingEnd = moment(date).add(OFFSET_DAYS, 'days').format('YYYY-MM-DD');
    // 查找当前日期所属的学期
    const semester = await ctx.model.Plan.Semester.findOne({
      where: {
        firstTeachingDate: { [ctx.app.Sequelize.Op.lte]: date },
        examStartDate: { [ctx.app.Sequelize.Op.gt]: teachingEnd },
      },
    });
    if (!semester) return [];

    // 仅查询该学期内的课程安排
    const schedules = await ctx.model.Plan.CourseSchedule.findAll({
      where: { staffId, semesterId: semester.id },
      include: [{
        model: ctx.model.Plan.CourseSlot,
        as: 'slots',
      }],
    });
    // 扁平化并筛选当天实际应上的课程（考虑调休）
    const allSlots = this._flattenSchedules(schedules);
    return allSlots.filter(s => s.dayOfWeek === dayOfWeek);
  }

  /**
   * 精确列出某教职工在指定学期内实际要上课的所有日期及课程
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {number} param.sstsTeacherId - 校园网教职工ID
   * @param {Object} param.semester - 学期对象，包含 firstTeachingDate、endDate、id 等
   * @param {Array<Object>} param.events - 必传，校历事件列表
   * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @return {Promise<Array>} - 实际有效的上课日期及课时详情
   */
  async listActualTeachingDates({ staffId = 0, sstsTeacherId, semester, weeks, events }) {
    const { ctx } = this;

    if (!semester || !semester.firstTeachingDate || !semester.endDate || !semester.id) {
      ctx.throw(400, '缺少完整的学期信息（semester）');
    }

    if (!Array.isArray(events)) {
      ctx.throw(400, '必须传入事件列表（events）');
    }

    // 获取该教师在该学期的所有课程安排及其时段
    const schedules = await ctx.model.Plan.CourseSchedule.findAll({
      where: staffId !== 0 ? { staffId, semesterId: semester.id } : { sstsTeacherId, semesterId: semester.id },
      include: [{ model: ctx.model.Plan.CourseSlot, as: 'slots' }],
    });

    // 初始化结果数组
    let actualTeachingDates = [];
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

    // 如果指定了月份，则进行过滤
    if (weeks) {
      actualTeachingDates = this._filterByTeachingWeek(actualTeachingDates, semester, weeks);
    }
    return actualTeachingDates;
  }

  /**
   * 计算教职工在指定学期内因假期取消的课程
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID（优先使用）
   * @param {number} [param.sstsTeacherId] - 校园网教职工ID（当 staffId 为 0 时使用）
   * @param {Object} param.semester - 学期对象，包含 firstTeachingDate、endDate、id 等
   * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @param {Array<Object>} param.events - 必传，校历事件列表
   * @return {Promise<Object>} - 取消的课程信息及统计
   */
  async calculateCancelledCourses({ staffId = 0, sstsTeacherId, semester, weeks, events }) {
    // 提取所有假期事件
    const holidays = events.filter(e => e.eventType === 'HOLIDAY').map(e => e.date);

    // 提取调课上课（从假期调为上课）的原始日并从 holidays 中剔除
    const makeupDays = events.filter(e => e.eventType === 'HOLIDAY_MAKEUP').map(e => e.originalDate);

    // 如果指定了周数，输出中保留 makeupDays 中对应的日期和相关信息，避免因数据不全引起的误会
    const finalHolidays = Array.isArray(weeks) && weeks.length > 0 ?
      holidays :
      holidays.filter(date => !makeupDays.includes(date));

    // 获取该教师在该学期的所有课程安排及其时段
    const schedules = await this.ctx.model.Plan.CourseSchedule.findAll({
      where: {
        semesterId: semester.id,
        ...(staffId ? { staffId } : { sstsTeacherId }),
      },
      include: [{
        model: this.ctx.model.Plan.CourseSlot,
        as: 'slots',
      }],
    });

    // 先扁平化处理，以便正确处理周数判断
    const flatSchedules = this._flattenSchedules(schedules);
    let cancelledCourses = [];

    for (const date of finalHolidays) {
      // 获取当天实际的星期几（已考虑调休）
      const { dayOfWeek } = await this._resolveClassDay({ date, events });
      // 计算当前日期是学期第几周
      const weekDiff = Math.floor(
        (new Date(date) - new Date(semester.firstTeachingDate)) /
        (7 * 24 * 60 * 60 * 1000)
      );
      // 创建基础日期信息对象（无论是否有课都包含）
      const dateInfo = {
        date,
        weekOfDay: dayOfWeek,
        weekNumber: weekDiff + 1,
        courses: [], // 初始化为空数组
      };

      let coursesForDay = [];
      if (!makeupDays.includes(date)) {
        // 筛选出当天应该上的课程（考虑周数和星期几）
        coursesForDay = flatSchedules.filter(schedule => {
          // 检查是否是当天的课程（星期几匹配）
          if (schedule.dayOfWeek !== dayOfWeek) return false;

          // 检查当前周是否有课
          const weekNumberArray = schedule.weekNumberString.split(',').map(Number);
          return weekDiff >= 0 &&
            weekDiff < weekNumberArray.length &&
            weekNumberArray[weekDiff] === 1;
        });
      } else {
        const makeupEvent = events.find(e =>
          e.eventType === 'HOLIDAY_MAKEUP' && e.originalDate === date
        );
        dateInfo.note = `该日课程已调至 ${makeupEvent.date}，相关课时和费用都计入实际上课日期 `;
      }

      // 格式化返回数据，与 listActualTeachingDates 保持一致
      if (coursesForDay.length > 0) {
        // 转换为前端需要的格式
        dateInfo.courses = coursesForDay.map(course => ({
          scheduleId: course.scheduleId,
          courseName: course.courseName,
          slotId: course.slotId,
          periodStart: course.periodStart,
          periodEnd: course.periodEnd,
          weekType: course.weekType,
          coefficient: course.coefficient,
        }));
      }
      // 无论是否有课，都添加到结果中
      cancelledCourses.push(dateInfo);
    }

    if (weeks) {
      cancelledCourses = this._filterByTeachingWeek(cancelledCourses, semester, weeks);
    }
    return cancelledCourses;
  }

  /**
   * 计算教职工在指定日期范围内的实际课时数
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID（优先使用）
   * @param {number} param.sstsTeacherId - 校园网教职工ID（当 staffId 为 0 时使用）
   * @param {Object} param.semester - 学期数据
   * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @param {Object} param.events - 学期事件数据
   * @return {Promise<number>} - 实际有效的总课时数
   */
  async calculateTeachingHours({ staffId = 0, sstsTeacherId, semester, weeks, events }) {
    const allDates = await this.listActualTeachingDates({
      staffId,
      sstsTeacherId,
      semester,
      weeks,
      events,
    });
    let totalHours = 0;
    allDates.forEach(day => {
      day.courses.forEach(course => {
        totalHours += (course.periodEnd - course.periodStart + 1) * course.coefficient;
      });
    });

    return parseFloat(totalHours.toFixed(2));
  }

  /**
     * 批量统计多个教职工在指定日期范围内的课时
     * @param {Object} param - 参数对象
     * @param {Array<number>} [param.staffIds] - 教职工ID列表，若为空则使用 sstsTeacherId 查询
     * @param {Array<string>} [param.sstsTeacherIds] - 校园网教职工ID
     * @param {number} param.semesterId - 学期ID
     * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
     * @return {Promise<Array>} - 每个教职工的课时统计（包含 staffId, sstsTeacherId, staffName）
     */
  async calculateMultipleTeachingHours({ staffIds = [], sstsTeacherIds = [], semesterId, weeks }) {
    const { ctx } = this;
    const results = [];

    const semester = await ctx.model.Plan.Semester.findByPk(semesterId);
    if (!semester) ctx.throw(404, `未找到 ID 为 ${semesterId} 的学期`);

    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
    let teachers = [];
    // console.log(sstsTeacherIds);
    if (!staffIds.length && !sstsTeacherIds.length) {
      // 如果既没有传递 staffIds 也不传递 sstsTeacherId，查询所有唯一的 sstsTeacherId 及 staffName
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: { semesterId },
        attributes: [ 'sstsTeacherId', 'staffId', 'staffName' ],
        group: [ 'sstsTeacherId', 'staffId', 'staffName' ],
        raw: true,
      });
    } else if (staffIds.length > 0) {
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: {
          staffId: staffIds,
          semesterId,
        },
        attributes: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        group: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        raw: true,
      });
    } else if (sstsTeacherIds.length > 0) {
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: {
          sstsTeacherId: sstsTeacherIds,
          semesterId,
        },
        attributes: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        group: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        raw: true,
      });
    }

    // 计算每个教师的课时数
    for (const { sstsTeacherId, staffId, staffName } of teachers) {
      const hours = await this.calculateTeachingHours({
        staffId,
        sstsTeacherId,
        semester,
        weeks,
        events,
      });
      results.push({
        staffId,
        sstsTeacherId,
        staffName,
        totalHours: parseFloat(hours.toFixed(2)) });
    }

    return results;
  }
}

module.exports = CourseScheduleManagerService;
