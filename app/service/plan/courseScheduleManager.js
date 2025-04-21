'use strict';

/**
 * @file service/plan/courseScheduleManager.js
 * @description 课时计算及课表综合管理服务层，涉及课程表、课程时段和校历事件。
 * @module service/plan/courseScheduleManager
 */

const { Service } = require('egg');
const moment = require('moment');
const _ = require('lodash');

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

    // 使用 moment 获取星期几 (1-7，周一为1，周日为7)
    const dateObj = moment(date);

    // 查找相关事件，使用 teachingCalcEffect 字段而不是 eventType 来判断
    const swapEvent = events.find(e => e.teachingCalcEffect === 'SWAP' && e.date === date);
    const makeupEvent = events.find(e => e.teachingCalcEffect === 'MAKEUP' && e.date === date);
    const cancelEvent = events.some(e => e.teachingCalcEffect === 'CANCEL' && e.date === date);

    // 处理调课日/补课日
    if (swapEvent || makeupEvent) {
      const { originalDate } = swapEvent || makeupEvent;
      return {
        isClassDay: true,
        dayOfWeek: moment(originalDate).isoWeekday(), // 使用 isoWeekday 获取周一为1的星期几
      };
    }

    // 处理停课日
    if (cancelEvent) {
      const swapTarget = events.find(e =>
        (e.teachingCalcEffect === 'SWAP' || e.teachingCalcEffect === 'MAKEUP') &&
        e.originalDate === date
      );

      return {
        isClassDay: false,
        dayOfWeek: swapTarget
          ? moment(swapTarget.date).isoWeekday()
          : dateObj.isoWeekday(),
      };
    }

    // 默认情况
    return {
      isClassDay: true,
      dayOfWeek: dateObj.isoWeekday(),
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
   * @param {Array(number)} weeks - 要过滤的周数范围
   * @return {Array} - 过滤后的数据
   */
  _filterByTeachingWeek(data, semester, weeks) {
    if (!weeks || weeks.length !== 2 || weeks[0] > weeks[1]) {
      throw new Error('无效的周数范围参数，必须提供包含起始周和结束周的数组且第一个数字不大于第二个');
    }

    const [ startWeek, endWeek ] = weeks;
    const firstTeachingDate = moment(semester.firstTeachingDate);

    return data.filter(item => {
      // 使用 moment 计算当前日期是学期第几周
      const currentDate = moment(item.date);
      const dayDiff = currentDate.diff(firstTeachingDate, 'days');
      const weekDiff = Math.floor(dayDiff / 7) + 1; // 转换为1-based周数

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
    const result = this._flattenSchedules(schedules);
    return result;
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
   * 精确列出某staffId在指定学期内实际要上课的所有日期及课程
   * @param {Object} param - 参数对象
   * @param {number} param.staffId - 教职工ID
   * @param {number} param.sstsTeacherId - 校园网taffId
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
      // 使用 moment 计算周数
      const weekDiff = Math.floor(
        moment(currentDate).diff(moment(semester.firstTeachingDate), 'days') / 7
      );

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
   * 获取教师在指定学期的简化课程安排
   * @param {Object} param - 参数对象
   * @param {number|Array<number>} param.staffId - 教职工ID（优先使用），可以是单个ID或ID数组
   * @param {string|Array<string>} [param.sstsTeacherId] - 校园网taffId，可以是单个ID或ID数组
   * @param {Object} param.semester - 学期对象，包含id等信息
   * @param {Array<number>} [param.weeks] - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @return {Promise<Object>} - 按教师ID分组的简化课程安排，包含扁平化的课表和简化的课表
   */
  async getSimpleTeacherSchedules({ staffId = 0, sstsTeacherId, semester, weeks = [] }) {
    // 构建查询条件
    const whereCondition = { semesterId: semester.id };

    // 处理查询条件，确保正确处理 staffId 和 sstsTeacherId
    const isStaffIdArray = Array.isArray(staffId);
    const isSstsTeacherIdArray = Array.isArray(sstsTeacherId);

    // 如果有 staffId，添加到查询条件
    if (staffId && (isStaffIdArray ? staffId.length > 0 : staffId !== 0)) {
      whereCondition.staffId = isStaffIdArray ? staffId : staffId;
    }

    // 如果有 sstsTeacherId，添加到查询条件（不再使用 else if，确保即使有 staffId 也能处理 sstsTeacherId）
    if (sstsTeacherId && (isSstsTeacherIdArray ? sstsTeacherId.length > 0 : sstsTeacherId)) {
      whereCondition.sstsTeacherId = isSstsTeacherIdArray ? sstsTeacherId : sstsTeacherId;
    }

    // 获取教师在该学期的所有课程安排及其时段
    const schedules = await this.ctx.model.Plan.CourseSchedule.findAll({
      where: whereCondition,
      include: [{
        model: this.ctx.model.Plan.CourseSlot,
        as: 'slots',
      }],
    });

    // 按教师ID分组并处理数据
    const result = {};
    schedules.forEach(schedule => {
      const key = staffId ? schedule.staffId : schedule.sstsTeacherId;
      if (!result[key]) {
        result[key] = {
          staffId: schedule.staffId,
          sstsTeacherId: schedule.sstsTeacherId,
          staffName: schedule.staffName,
          schedules: [],
          flatSchedules: [],
          simplifiedSchedules: [],
        };
      }
      result[key].schedules.push(schedule);
    });

    // 为每个教师处理扁平化和简化的课表
    for (const teacherId in result) {
      const teacherData = result[teacherId];
      // 扁平化处理该教师的课程安排
      const flatSchedules = this._flattenSchedules(teacherData.schedules);
      teacherData.flatSchedules = flatSchedules;

      // 使用 lodash 整合相同 scheduleId 的数据
      teacherData.simplifiedSchedules = _(flatSchedules)
        .groupBy('scheduleId')
        .map(group => {
          // 取第一个元素的基本信息
          const first = group[0];
          // 处理课程名称：去除前缀编码
          let processedCourseName = first.courseName;
          if (processedCourseName && processedCourseName.length > 10) {
            const dashIndex = processedCourseName.substring(0, 10).indexOf('-');

            if (dashIndex > 0) {
              // 如果前10位中有'-'
              if (/[a-zA-Z]/.test(processedCourseName.charAt(dashIndex - 1))) {
                // 如果'-'前是字母，删除前10位
                processedCourseName = processedCourseName.substring(10);
              } else {
                // 否则删除前9位
                processedCourseName = processedCourseName.substring(9);
              }
            } else {
              // 如果前10位没有'-'
              if (processedCourseName.charAt(7) === 'G' || processedCourseName.charAt(7) === 'B') {
                // 如果第8位是'G'，删除前8位
                processedCourseName = processedCourseName.substring(8);
              } else {
                // 否则删除前7位
                processedCourseName = processedCourseName.substring(7);
              }
            }
          }

          // 计算实际教学周数
          let actualWeekCount = first.weekCount;

          // 如果提供了周数范围，计算该范围内的实际教学周数
          if (weeks && weeks.length === 2) {
            const [ startWeek, endWeek ] = weeks;
            // 解析周数字符串，确定指定周数范围内有多少周有课
            const weekNumberArray = first.weekNumberString.split(',').map(Number);

            // 计算指定周数范围内有课的周数
            let weeksWithClasses = 0;
            for (let i = startWeek - 1; i < endWeek && i < weekNumberArray.length; i++) {
              if (i >= 0 && weekNumberArray[i] === 1) {
                weeksWithClasses++;
              }
            }

            // 更新实际教学周数
            actualWeekCount = weeksWithClasses;
          }

          return {
            scheduleId: first.scheduleId,
            courseName: processedCourseName,
            teachingClassName: first.teachingClassName,
            weekCount: actualWeekCount, // 使用计算后的实际教学周数
            weeklyHours: first.weeklyHours,
            coefficient: first.coefficient, // 添加系数字段
          };
        })
        .value();
    }

    return result;
  }

  /**
   * 计算教职工在指定学期内因假期取消的课程
   * @param {Object} param - 参数对象
   * @param {number|Array<number>} param.staffId - 教职工ID（优先使用），可以是单个ID或ID数组
   * @param {string|Array<string>} [param.sstsTeacherId] - 校园网taffId，可以是单个ID或ID数组
   * @param {Object} param.semester - 学期对象，包含 firstTeachingDate、endDate、id 等
   * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @param {Array<Object>} param.events - 必传，校历事件列表
   * @return {Promise<Object|Array<Object>>} - 取消的课程信息及统计，如果传入数组则返回数组
   */
  async calculateCancelledCourses({ staffId = 0, sstsTeacherId, semester, weeks, events }) {
    // 提取所有停课事件
    let cancelDates = events.filter(e => e.teachingCalcEffect === 'CANCEL').map(e => e.date);

    // 提取所有调课日期
    const makeupDays = events.filter(e => e.teachingCalcEffect === 'MAKEUP').map(e => e.originalDate);

    // 从 cancelDates 中移除同时存在于 makeupDays 中的日期
    // 因为这些日期的课程已经被调到其他日期上了，不应该计入扣课
    cancelDates = cancelDates.filter(date => !makeupDays.includes(date));
    console.log('cancelDates', cancelDates);
    // 获取教师课程安排（已包含扁平化和简化的数据）
    const teacherSchedulesData = await this.getSimpleTeacherSchedules({
      staffId,
      sstsTeacherId,
      semester,
      weeks,
    });

    // 为每个教师计算取消的课程
    const results = [];

    for (const teacherId in teacherSchedulesData) {
      const teacherData = teacherSchedulesData[teacherId];
      const { staffId: tStaffId, sstsTeacherId: tSstsTeacherId, staffName, flatSchedules, simplifiedSchedules } = teacherData;

      // 如果指定了周数范围，过滤掉在该范围内没有课的课程
      let filteredFlatSchedules = flatSchedules;
      let filteredSimplifiedSchedules = simplifiedSchedules;

      if (weeks && weeks.length === 2) {
        const [ startWeek, endWeek ] = weeks;

        // 过滤扁平化的课程列表
        filteredFlatSchedules = flatSchedules.filter(schedule => {
          // 解析周数字符串
          const weekNumberArray = schedule.weekNumberString.split(',').map(Number);

          // 检查在指定周数范围内是否有课
          for (let i = startWeek - 1; i < endWeek && i < weekNumberArray.length; i++) {
            if (i >= 0 && weekNumberArray[i] === 1) {
              return true; // 只要在范围内有一周有课，就保留这门课
            }
          }
          return false; // 在指定范围内没有任何一周有课，过滤掉
        });

        // 过滤简化的课程列表，只保留在指定周数范围内有课的课程
        filteredSimplifiedSchedules = simplifiedSchedules.filter(course => course.weekCount > 0);
      }

      const teacherCancelledCourses = await this._processCancelledDates({
        flatSchedules: filteredFlatSchedules,
        cancelDates,
        // makeupDays,
        // holidayMakeupDates, // 传入补课日期
        events,
        semester,
        weeks,
      });

      // 添加教师信息
      results.push({
        staffId: tStaffId,
        sstsTeacherId: tSstsTeacherId,
        staffName,
        cancelledCourses: teacherCancelledCourses,
        flatSchedules: filteredSimplifiedSchedules,
      });
    }

    return results;
  }

  /**
   * 处理取消的课程日期（内部辅助方法）
   * @private
   * @param {Object} param - 参数对象
   * @param {Array} param.flatSchedules - 扁平化的课程安排
   * @param {Array} param.cancelDates - 取消日期列表
   * @param {Array} param.makeupDays - 调课日期列表
   * @param {Array} param.holidayMakeupDates - 补课日期列表（被调入课程的日期）
   * @param {Array} param.events - 校历事件列表
   * @param {Object} param.semester - 学期信息
   * @param {Array} param.weeks - 周数范围
   * @return {Promise<Array>} - 处理后的取消课程信息
   */
  async _processCancelledDates({ flatSchedules, cancelDates, events, semester, weeks }) {
    let cancelledCourses = [];

    // 处理常规取消日期
    for (const date of cancelDates) {
      // 获取当天实际的星期几（已考虑调休）
      const { dayOfWeek } = await this._resolveClassDay({ date, events });

      // 使用 moment 计算当前日期是学期第几周
      const weekDiff = Math.floor(
        moment(date).diff(moment(semester.firstTeachingDate), 'days') / 7
      );

      // 创建基础日期信息对象（无论是否有课都包含）
      const dateInfo = {
        date,
        weekOfDay: dayOfWeek,
        weekNumber: weekDiff + 1,
        courses: [], // 初始化为空数组
      };

      // 首先添加取消事件的备注
      const cancelEvent = events.find(e =>
        e.teachingCalcEffect === 'CANCEL' && e.date === date
      );
      if (cancelEvent && cancelEvent.topic) {
        dateInfo.note = cancelEvent.topic;
      }

      // 筛选出当天应该上的课程（考虑周数和星期几）
      const coursesForDay = flatSchedules.filter(schedule => {
        // 检查是否是当天的课程（星期几匹配）
        if (schedule.dayOfWeek !== dayOfWeek) return false;

        // 检查当前周是否有课
        const weekNumberArray = schedule.weekNumberString.split(',').map(Number);
        return weekDiff >= 0 &&
          weekDiff < weekNumberArray.length &&
          weekNumberArray[weekDiff] === 1;
      });

      // 格式化返回数据
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
   * @param {number} param.sstsTeacherId - 校园网taffId（当 staffId 为 0 时使用）
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
     * 批量统计多个taffId在指定日期范围内的课时
     * @param {Object} param - 参数对象
     * @param {Array<number>} [param.staffIds] - taffId列表，若为空则使用 sstsTeacherId 查询
     * @param {Array<string>} [param.sstsTeacherIds] - 校园网taffId
     * @param {number} param.semesterId - 学期ID
     * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
     * @return {Promise<Array>} - 每个taffId的课时统计（包含 staffId, sstsTeacherId, staffName）
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
    } else {
      // 构建查询条件
      const whereCondition = { semesterId };

      // 如果有 staffIds，添加到查询条件
      if (staffIds.length > 0) {
        whereCondition.staffId = staffIds;
      }

      // 如果有 sstsTeacherIds，添加到查询条件
      if (sstsTeacherIds.length > 0) {
        whereCondition.sstsTeacherId = sstsTeacherIds;
      }

      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: whereCondition,
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
