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
        raw: true,
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
      // 如果停课原因是 SWAP（调课），或者 MAKEUP（节假日补课）
      // 也就意味着另一天会上课，所以需要获取另一天是周几上课

      const swapTarget = events.find(e =>
        (e.teachingCalcEffect === 'SWAP' || e.teachingCalcEffect === 'MAKEUP')
        && e.originalDate === date
      );

      // 一体化课程中，目前是不按照校历来扣课的，所以目前前端不会返回需要处理停课日补课的情况
      // 此处得到的 swapTarget 数据应该都是 undefined（无调课，直接放假）
      // console.log(`停课日: ${date}, 调课上课日：${swapTarget}, 星期几: ${dateObj.isoWeekday()}`);

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
   * @param {number} [param.jobId] - 校园网里的教职工ID
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
  async getFullScheduleByStaff({ staffId, jobId, semesterId }) {
    // 构建查询条件
    const whereCondition = { semesterId };

    // 如果 staffId 不为 0，使用 staffId 查询
    // 否则，如果提供了 jobId，使用 jobId 查询
    if (staffId !== 0) {
      whereCondition.staffId = staffId;
    } else if (jobId) {
      whereCondition.sstsTeacherId = jobId;
    }

    // 查询与条件匹配的所有 CourseSchedule，并关联 slots
    const schedules = await this.ctx.model.Plan.CourseSchedule.findAll({
      where: whereCondition,
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
   * @param {number} [param.scheduleId] - 课程ID
   * @param {boolean} [param.considerMakeup] - 是否计算调课（默认为 true）
   * @param {Array<Object>} param.events - 必传，校历事件列表
   * @param {Array<number>} param.weeks - 要过滤的周数范围，如 [12,16] 表示12周到16周
   * @return {Promise<Array>} - 实际有效的上课日期及课时详情
   */
  async listActualTeachingDates({ staffId = 0, sstsTeacherId, semester, weeks, events, scheduleId, considerMakeup = true }) {
    const { ctx } = this;

    if (!semester || !semester.firstTeachingDate || !semester.endDate || !semester.id) {
      ctx.throw(400, '缺少完整的学期信息（semester）');
    }

    if (!Array.isArray(events)) {
      ctx.throw(400, '必须传入事件列表（events）');
    }

    // 构建查询条件
    const whereCondition = { semesterId: semester.id };

    // 如果提供了 staffId，添加到查询条件
    if (staffId !== 0) {
      whereCondition.staffId = staffId;
    }

    // 如果提供了 sstsTeacherId，添加到查询条件
    if (sstsTeacherId) {
      whereCondition.sstsTeacherId = sstsTeacherId;
    }

    // 如果提供了 scheduleId，添加到查询条件
    if (scheduleId) {
      whereCondition.id = scheduleId;
    }

    // 获取该教师在该学期的所有课程安排及其时段
    const schedules = await ctx.model.Plan.CourseSchedule.findAll({
      where: whereCondition,
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
      const dayDiff = moment(currentDate).diff(moment(semester.firstTeachingDate), 'days');
      const weekDiff = Math.floor(dayDiff / 7) + 1;

      // 收集当天所有课程时段
      const slotsForTheDay = [];
      schedules.forEach(schedule => {
        // 解析周数字符串，确定当前周是否有课
        // weekNumberString 格式如 "1,1,1,0,1,1,0,..."，表示每周是否有课
        const weekNumberArray = schedule.weekNumberString.split(',').map(Number);
        // 检查当前周是否在周数范围内且该周有课 (值为1)
        if (weekDiff >= 0 && weekDiff < weekNumberArray.length && weekNumberArray[weekDiff - 1] === 1) {
          // console.log(`日期: ${dateString}, 星期几: ${dayOfWeek}, 周数: ${weekDiff}, 有课`);
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
          weekNumber: weekDiff, // 第几教学周
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

    // 处理 considerMakeup 为 false 的情况
    // 这是为了处理校园网未按校历计算上课日期的特殊情况，如果将来校园网修正了，直接删除即可
    if (!considerMakeup) {
      actualTeachingDates = this._revertHolidayMakeup(actualTeachingDates, events);
    }

    return actualTeachingDates;
  }

  /**
   * 将补课日期替换为原始日期（用于不考虑补课安排的情况）
   * @private
   * @param {Array} teachingDates - 教学日期数组
   * @param {Array} events - 校历事件数组
   * @return {Array} - 处理后的教学日期数组
   */
  _revertHolidayMakeup(teachingDates, events) {
    // 找出所有 eventType 为 HOLIDAY_MAKEUP 的事件
    const holidayMakeupEvents = events.filter(e => e.eventType === 'HOLIDAY_MAKEUP');

    if (holidayMakeupEvents.length === 0) {
      return teachingDates;
    }

    // 创建一个映射表，用于存储补课日期到原始日期的映射
    const dateMap = {};
    holidayMakeupEvents.forEach(event => {
      if (event.date && event.originalDate) {
        dateMap[event.date] = event.originalDate;
      }
    });

    // 替换日期
    const result = teachingDates.map(item => {
      if (dateMap[item.date]) {
        return { ...item, date: dateMap[item.date] };
      }
      return item;
    });

    // 按日期排序
    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
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
    // 提取所有停课事件，转换为对象格式
    let cancelDates = events.filter(e => e.teachingCalcEffect === 'CANCEL').map(e => ({
      date: e.date,
      type: 'cancel',
    }));

    // 提取所有调课日期
    const makeupDays = events.filter(e => e.teachingCalcEffect === 'MAKEUP').map(e => e.originalDate);

    // 检测异常重复上课情况
    const abnormalMakeups = await this._detectAbnormalMakeups(events, semester);

    // 从 cancelDates 中移除同时存在于 makeupDays 中的日期
    // 因为这些日期的课程已经被调到其他日期上了，不应该计入扣课
    cancelDates = cancelDates.filter(cancelItem => !makeupDays.includes(cancelItem.date));

    // 将异常补课信息添加到扣课列表中（用于扣课补偿）
    const abnormalDates = abnormalMakeups.map(makeup => ({
      makeupDate: makeup.makeupDate,
      originalDate: makeup.originalDate,
      type: 'abnormal',
      makeupEvent: makeup.makeupEvent,
      reason: makeup.reason,
    }));

    cancelDates = [ ...cancelDates, ...abnormalDates ];

    // 调试输出：查看最终的扣课日期数据
    // console.log('🔍 最终扣课日期数据:', {
    //   原始停课日期: events.filter(e => e.teachingCalcEffect === 'CANCEL').map(e => e.date),
    //   调课原始日期: events.filter(e => e.teachingCalcEffect === 'MAKEUP').map(e => e.originalDate),
    //   异常补课情况: JSON.stringify(abnormalMakeups, null, 2),
    //   异常补课对象: abnormalDates,
    //   最终扣课列表: cancelDates,
    // });

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

    // console.dir(results, { depth: null });
    return results;
  }

  /**
   * 处理取消的课程日期（内部辅助方法）
   * @private
   * @param {Object} param - 参数对象
   * @param {Array} param.flatSchedules - 扁平化的课程安排
   * @param {Array} param.cancelDates - 取消日期列表
   * @param {Array} param.events - 校历事件列表
   * @param {Object} param.semester - 学期信息
   * @param {Array} param.weeks - 周数范围
   * @return {Promise<Array>} - 处理后的取消课程信息
   */
  async _processCancelledDates({ flatSchedules, cancelDates, events, semester, weeks }) {
    let cancelledCourses = []; // Change from const to let

    for (const dateItem of cancelDates) {
      let targetDate,
        displayDate,
        dayOfWeek,
        weekDiff;

      if (dateItem.type === 'abnormal') {
        // 异常补课：使用原始日期查找课程，但显示补课日期
        targetDate = dateItem.originalDate;
        displayDate = dateItem.makeupDate;

        // 获取原始日期的星期几（已考虑调休）
        const resolvedDay = await this._resolveClassDay({ date: targetDate, events });
        dayOfWeek = resolvedDay.dayOfWeek;

        // 使用原始日期计算学期第几周
        weekDiff = Math.floor(
          moment(targetDate).diff(moment(semester.firstTeachingDate), 'days') / 7
        );

        // 添加调试信息
        // console.log('🔍 异常补课调试信息:', {
        //   originalDate: targetDate,
        //   makeupDate: displayDate,
        //   dayOfWeek,
        //   weekDiff,
        //   weekNumber: weekDiff + 1,
        //   firstTeachingDate: semester.firstTeachingDate,
        //   flatSchedulesCount: flatSchedules.length,
        //   matchingDaySchedules: flatSchedules.filter(s => s.dayOfWeek === dayOfWeek).length,
        // });

        // 输出匹配星期几的课程详情
        // const daySchedules = flatSchedules.filter(s => s.dayOfWeek === dayOfWeek);
        // if (daySchedules.length > 0) {
        //   console.log('📅 匹配星期几的课程:', daySchedules.map(s => ({
        //     scheduleId: s.scheduleId,
        //     courseName: s.courseName,
        //     dayOfWeek: s.dayOfWeek,
        //     weekNumberString: s.weekNumberString,
        //     weekNumberArray: s.weekNumberString.split(',').map(Number),
        //   })));
        // }
      } else {
        // 普通取消：使用取消日期本身
        targetDate = dateItem.date;
        displayDate = dateItem.date;

        // 获取当天实际的星期几（已考虑调休）
        const resolvedDay = await this._resolveClassDay({ date: targetDate, events });
        dayOfWeek = resolvedDay.dayOfWeek;

        // 使用 moment 计算当前日期是学期第几周
        weekDiff = Math.floor(
          moment(targetDate).diff(moment(semester.firstTeachingDate), 'days') / 7
        );
      }

      // 创建基础日期信息对象（无论是否有课都包含）
      const dateInfo = {
        date: displayDate, // 显示日期（普通取消显示取消日期，异常补课显示补课日期）
        weekOfDay: dayOfWeek,
        weekNumber: weekDiff + 1,
        courses: [], // 初始化为空数组
      };

      // 添加异常补课标记
      if (dateItem.type === 'abnormal') {
        dateInfo.isAbnormalDeduction = true;
        dateInfo.originalDate = dateItem.originalDate;
        dateInfo.reason = dateItem.reason;
      }

      // 首先添加取消事件的备注
      const cancelEvent = events.find(e =>
        e.teachingCalcEffect === 'CANCEL' && e.date === targetDate
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
        const hasClass = weekDiff >= 0 &&
          weekDiff < weekNumberArray.length &&
          weekNumberArray[weekDiff] === 1;

        // 为异常补课添加详细的筛选调试信息
        // if (dateItem.type === 'abnormal') {
        //   console.log('🔍 课程筛选详情:', {
        //     scheduleId: schedule.scheduleId,
        //     courseName: schedule.courseName,
        //     scheduleDayOfWeek: schedule.dayOfWeek,
        //     targetDayOfWeek: dayOfWeek,
        //     dayMatch: schedule.dayOfWeek === dayOfWeek,
        //     weekDiff,
        //     weekNumberArray,
        //     weekNumberArrayLength: weekNumberArray.length,
        //     weekValue: weekNumberArray[weekDiff],
        //     hasClass,
        //   });
        // }

        return hasClass;
      });

      // 为异常补课输出最终筛选结果
      // if (dateItem.type === 'abnormal') {
      //   console.log('🎯 异常补课最终筛选结果:', {
      //     coursesForDayCount: coursesForDay.length,
      //     courses: coursesForDay.map(c => ({ scheduleId: c.scheduleId, courseName: c.courseName })),
      //   });
      // }

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

  /**
 * 检测异常的补课安排（原始日期本身是上课日）
 * @private
 * @param {Array} events - 校历事件列表
 * @param {Object} semester - 学期信息
 * @return {Array} - 异常补课信息列表
 */
  async _detectAbnormalMakeups(events, semester) {
    const abnormalMakeups = [];
    const makeupEvents = events.filter(e => e.teachingCalcEffect === 'MAKEUP');

    for (const makeup of makeupEvents) {
      if (makeup.originalDate) {
        const originalDateMoment = moment(makeup.originalDate);
        const dayOfWeek = originalDateMoment.isoWeekday();

        // 检查原始日期是否在学期范围内且为工作日
        if (originalDateMoment.isBetween(semester.firstTeachingDate, semester.endDate, 'day', '[]') &&
          dayOfWeek >= 1 && dayOfWeek <= 5) {

          // 检查是否有对应的CANCEL事件
          const hasCancel = events.some(e =>
            e.teachingCalcEffect === 'CANCEL' &&
          e.date === makeup.originalDate
          );

          if (!hasCancel) {
            abnormalMakeups.push({
              makeupDate: makeup.date,
              originalDate: makeup.originalDate,
              makeupEvent: makeup,
              reason: '原始日期本身是上课日，存在重复上课',
            });

            // console.warn(`🚨 检测到异常调课：${makeup.originalDate} -> ${makeup.date}，原始日期本身是上课日`);
          }
        }
      }
    }

    return abnormalMakeups;
  }
}

module.exports = CourseScheduleManagerService;

