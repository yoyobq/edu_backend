'use strict';

/**
 * @file connector.js
 * @description StaffWorkload 视图查询的数据聚合层（Connector）。
 * @module graphql/staffWorkloadViews/connector
 *
 * # 为什么设计独立的 views 层？
 *
 * - 一直以来，项目中的 GraphQL Connector 层仅作为简单的“跳板”，直接调用 Service 后返回结果，
 *   随着前端页面复杂度增加，出现了大量跨领域、多模块聚合数据的查询需求。
 *
 * - 典型示例：『教师工作量汇总』这种视图需求：
 *    - 跨多个领域（如课程安排、课时定义、教师信息）。
 *    - 输出数据结构专为前端页面服务，无法与某单一领域实体（Entity）直接对应。
 *    - 此类逻辑如果放进原有的领域 service 层，会混淆纯粹领域逻辑与页面视图逻辑的边界。
 *
 * - 因此，为此类专门的“前端视图”数据聚合需求，特别建立了 graphql/views 子模块，
 *   以明确区分“领域层”和“视图查询层”的职责边界。
 *
 * # 为什么选择在 connector 中处理数据聚合？
 *
 * - 根据 Apollo 和 GraphQL 的架构最佳实践，Connector 层本质上担任的是：
 *     - 应用层（Application Layer）的角色，负责跨模块的数据聚合、适配。
 *     - 轻量级的数据组合和视图友好数据结构的生成。
 *
 * - 当前需求（教师工作量）：
 *     - 并不涉及领域的业务逻辑（如课表冲突判断、排课规则校验）。
 *     - 只是从多个表聚合基础数据后，形成一个为前端展示服务的纯查询数据结构。
 *
 * - 因此无需调用原有的领域 Service，而直接使用 Sequelize Model 进行查询聚合即可，
 *   这样既能保持领域 service 层的职责纯净，也能避免引入不必要的抽象层。
 *
 * # 与 Service、Controller 的区别在哪里？
 *
 * - Service：
 *    - 定位于领域逻辑（领域知识核心、业务校验）。
 *    - 一般涉及状态变化、业务规则。
 *
 * - Connector：
 *    - 定位于数据聚合、跨模块数据组合（纯查询）。
 *    - 不涉及业务校验、持久化。
 *    - 在 GraphQL 架构中，充当“数据适配器”的角色。
 *
 *
 * # 本文件设计的关键思想总结：
 * - 不污染领域服务层，保持领域模型干净。
 * - 在 connector 中聚合数据，是 GraphQL 官方和业界的最佳实践。
 * - 在当前需求为只读查询聚合时，connector 直接使用 Sequelize 模型即可，无需调用领域 Service。
 * - 未来若发现聚合逻辑有高复用需求，再考虑进一步抽象聚合逻辑到单独的工具类或 helper。
 *
 */

const _ = require('lodash');
const moment = require('moment');

class StaffWorkLoadViewConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * 获取多个教师的工作量信息
   * @param {Object} input 查询条件（semesterId必传，staffIds/sstsTeacherIds可选）
   * @param {number} input.semesterId - 学期 ID
   * @param {number<Array>} [input.staffIds] - 教师 Id（可选）
   * @param {string<Array>} [input.sstsTeacherIds] - ssts 中教师工号（可选）
   * @return {Promise<Array>} 返回教师工作量视图数据列表
   */
  async getStaffWorkloads({ semesterId, staffIds, sstsTeacherIds }) {
    // 构建 CourseSchedule 的查询条件
    const scheduleWhereCondition = { semesterId };

    // 优先使用 staffIds，只有当 staffIds 不存在时才使用 sstsTeacherIds
    if (staffIds && staffIds.length > 0) {
      scheduleWhereCondition.staffId = staffIds;
    } else if (sstsTeacherIds && sstsTeacherIds.length > 0) {
      scheduleWhereCondition.sstsTeacherId = sstsTeacherIds;
    }

    console.log('查询条件:', scheduleWhereCondition);

    // 先查询 CourseSchedule，然后关联 CourseSlot
    const courseSchedules = await this.ctx.model.Plan.CourseSchedule.findAll({
      where: scheduleWhereCondition,
      include: [{
        model: this.ctx.model.Plan.CourseSlot,
        as: 'slots',
      }],
    });

    // 按 staffId 分组
    const grouped = _.groupBy(courseSchedules, 'staffId');

    return Object.entries(grouped).map(([ staffId, schedules ]) => {
      const staffName = schedules[0].staffName;
      const sstsTeacherId = schedules[0].sstsTeacherId;

      // 临时存储，用于按班级+课程名称合并数据
      const itemsMap = {};

      schedules.forEach(schedule => {
        const slots = schedule.slots || [];

        // 创建唯一键，用于合并相同班级和课程的数据
        const key = `${schedule.teachingClassName}-${schedule.courseName}`;

        // 如果这个键不存在，初始化它
        if (!itemsMap[key]) {
          // 处理课程名称，剔除前8位
          const processedCourseName = schedule.courseName.length > 8
            ? schedule.courseName.substring(8)
            : schedule.courseName;

          itemsMap[key] = {
            courseName: processedCourseName,
            originalCourseName: schedule.courseName, // 保存原始课程名称用于排序
            teachingClassName: schedule.teachingClassName,
            weeklyHours: 0,
            weekCount: schedule.weekCount,
            coefficient: schedule.coefficient,
            workloadHours: 0,
          };
        }

        // 累加该课程的周课时和工作量
        slots.forEach(slot => {
          const slotWeeklyHours = slot.periodEnd - slot.periodStart + 1;
          const slotWorkloadHours = slotWeeklyHours * schedule.weekCount * schedule.coefficient;

          itemsMap[key].weeklyHours += slotWeeklyHours;
          itemsMap[key].workloadHours += slotWorkloadHours;
        });
      });

      // 将 Map 转换为数组并处理数值保留1位小数
      const items = Object.values(itemsMap)
        .map(item => ({
          ...item,
          weeklyHours: parseFloat(item.weeklyHours.toFixed(1)),
          workloadHours: parseFloat(item.workloadHours.toFixed(1)),
        }))
        // 按原始课程名称升序排序
        .sort((a, b) => a.originalCourseName.localeCompare(b.originalCourseName, 'zh-CN'));

      // 计算总工作量并保留1位小数
      const totalHours = parseFloat(items.reduce((acc, item) => acc + item.workloadHours, 0).toFixed(1));

      return {
        staffId: parseInt(staffId, 10),
        sstsTeacherId,
        staffName,
        items,
        totalHours,
      };
    });
  }
  /**
   * 获取单个教师的工作量信息
   * @param {Object} input 查询条件（semesterId + staffId/sstsTeacherId）
   * @return {Object|null} 返回单个教师工作量视图数据或null
   */
  async getStaffWorkload(input) {
    console.log(input);
    const workloads = await this.getStaffWorkloads({
      semesterId: input.semesterId,
      staffIds: input.staffId ? [ input.staffId ] : undefined,
      sstsTeacherIds: input.sstsTeacherId ? [ input.sstsTeacherId ] : undefined,
    });
    return workloads.length ? workloads[0] : null;
  }
  /**
   * 批量获取多个教师的扣课信息
   * @param {Object} param - 参数对象
   * @param {number} param.semesterId - 学期ID
   * @param {Array<number>} [param.staffIds] - 教师ID数组（可选）
   * @param {Array<string>} [param.sstsTeacherIds] - 校园网教师工号数组（可选）
   * @param {Array<number>} [param.weeks] - 周次数组（可选）
   * @return {Promise<Array>} - 返回多个教师的扣课信息
   */
  async getCancelledCoursesForStaffs({ semesterId, staffIds = [], sstsTeacherIds = [], weeks }) {
    const { ctx } = this;
    const results = [];

    // 获取学期信息
    const semester = await ctx.model.Plan.Semester.findByPk(semesterId);
    if (!semester) ctx.throw(404, `未找到 ID 为 ${semesterId} 的学期`);

    // 获取校历事件
    const events = await ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });

    // 确定要查询的教师列表
    let teachers = [];
    if (!staffIds.length && !sstsTeacherIds.length) {
      // 如果未指定教师，获取该学期所有有课程安排的教师
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: { semesterId },
        attributes: [ 'sstsTeacherId', 'staffId', 'staffName' ],
        group: [ 'sstsTeacherId' ], // 主要按sstsTeacherId分组
        raw: true,
      });
    } else if (sstsTeacherIds.length > 0) {
      // 优先按 sstsTeacherIds 查询
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: {
          sstsTeacherId: sstsTeacherIds,
          semesterId,
        },
        attributes: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        group: [ 'sstsTeacherId' ],
        raw: true,
      });
    } else if (staffIds.length > 0) {
      // 其次按 staffIds 查询
      teachers = await ctx.model.Plan.CourseSchedule.findAll({
        where: {
          staffId: staffIds,
          semesterId,
        },
        attributes: [ 'staffId', 'sstsTeacherId', 'staffName' ],
        group: [ 'sstsTeacherId' ], // 仍然按sstsTeacherId分组
        raw: true,
      });
    }

    // 计算每个教师的扣课信息
    for (const teacher of teachers) {
      const { sstsTeacherId, staffId, staffName } = teacher;

      // 直接使用已有的 calculateCancelledCourses 方法获取取消的课程
      const cancelledCourses = await this.ctx.service.plan.courseScheduleManager.calculateCancelledCourses({
        staffId,
        sstsTeacherId,
        semester,
        weeks,
        events,
      });

      // 如果没有取消的课程，跳过
      if (!cancelledCourses.length) continue;

      // 计算总扣课时数并格式化数据
      let totalCancelledHours = 0;
      const formattedCancelledDates = cancelledCourses.map(dateInfo => {
        // 只处理有课程的日期
        if (dateInfo.courses && dateInfo.courses.length > 0) {
          // 为每个课程添加扣课时数字段和教学班级名称
          dateInfo.courses.forEach(course => {
            const hours = (course.periodEnd - course.periodStart + 1) * course.coefficient;
            course.cancelledHours = parseFloat(hours.toFixed(1));
            totalCancelledHours += hours;
          });
          return dateInfo;
        }
        return null;
      }).filter(Boolean); // 过滤掉没有课程的日期

      if (formattedCancelledDates.length > 0) {
        results.push({
          staffId,
          sstsTeacherId,
          staffName,
          cancelledDates: formattedCancelledDates,
          totalCancelledHours: parseFloat(totalCancelledHours.toFixed(1)),
        });
      }
    }

    // 使用格式化方法处理结果，使其更适合前端展示
    return this._formatCancelledCoursesForTable(results);
  }

  /**
   * 格式化扣课数据为表格展示格式
   * @private
   * @param {Array} cancelledCoursesData - 原始扣课数据
   * @return {Array} 格式化后的扣课数据，适合表格展示
   */
  _formatCancelledCoursesForTable(cancelledCoursesData) {
    const tableData = [];

    // 遍历每个教师
    cancelledCoursesData.forEach(staffData => {
      const { staffId, sstsTeacherId, staffName, cancelledDates } = staffData;

      // 用于存储该教师的所有课程-班级组合
      const courseClassMap = new Map();

      // 首先收集所有唯一的课程-班级组合
      cancelledDates.forEach(dateInfo => {
        dateInfo.courses.forEach(course => {
          // 使用课程名称和教学班级作为键
          const key = `${course.courseName}-${course.teachingClassName || ''}`;
          if (!courseClassMap.has(key)) {
            courseClassMap.set(key, {
              courseName: course.courseName,
              teachingClassName: course.teachingClassName || '',
              dates: {},
              totalHours: 0,
            });
          }

          // 添加日期信息
          const dateKey = dateInfo.date;
          const formattedDate = `${moment(dateKey).format('M月D日')}`;
          const weekInfo = `第${dateInfo.weekNumber}周 周${this._getChineseWeekday(dateInfo.weekOfDay)}`;

          if (!courseClassMap.get(key).dates[dateKey]) {
            courseClassMap.get(key).dates[dateKey] = {
              date: formattedDate,
              weekInfo,
              hours: 0,
            };
          }

          // 累加课时
          courseClassMap.get(key).dates[dateKey].hours += course.cancelledHours;
          courseClassMap.get(key).totalHours += course.cancelledHours;
        });
      });

      // 转换为表格行数据
      courseClassMap.forEach(courseData => {
        // 基础行信息
        const baseRow = {
          staffId,
          sstsTeacherId,
          staffName,
          courseName: courseData.courseName,
          teachingClassName: courseData.teachingClassName,
          total: courseData.totalHours,
        };

        // 添加每个日期的扣课信息
        Object.entries(courseData.dates).forEach(([ dateData ]) => {
          // 创建日期列的键名
          const columnKey = `${dateData.date}\n${dateData.weekInfo}`;
          baseRow[columnKey] = -dateData.hours; // 使用负数表示扣课
        });

        tableData.push(baseRow);
      });
    });

    return tableData;
  }

  /**
     * 获取单个教师的扣课信息
     * @param {Object} param - 参数对象
     * @param {number} param.semesterId - 学期ID
     * @param {number} [param.staffId] - 教师ID（可选）
     * @param {string} [param.sstsTeacherId] - 校园网教师工号（可选）
     * @param {Array<number>} [param.weeks] - 周次数组（可选）
     * @return {Promise<Object|null>} - 返回单个教师的扣课信息或null
     */
  async getCancelledCoursesForStaff({ semesterId, staffId, sstsTeacherId, weeks }) {
    const results = await this.getCancelledCoursesForStaffs({
      semesterId,
      staffIds: staffId ? [ staffId ] : [],
      sstsTeacherIds: sstsTeacherId ? [ sstsTeacherId ] : [],
      weeks,
    });

    return results.length ? results[0] : null;
  }


  /**
   * 获取单个教师的扣课课时表
   * @param {Object} input 查询条件
   * @param {number} input.semesterId - 学期 ID
   * @param {number} [input.staffId] - 教师 Id（可选）
   * @param {string} [input.sstsTeacherId] - ssts 中教师工号（可选）
   * @param {number[]} [input.weeks] - 周次数组（可选）
   * @return {Promise<Object|null>} 返回单个教师的扣课课时表数据或null
   */
  async getStaffCancelledCourses(input) {
    const cancelledInfos = await this.getStaffsCancelledCourses({
      semesterId: input.semesterId,
      staffIds: input.staffId ? [ input.staffId ] : undefined,
      sstsTeacherIds: input.sstsTeacherId ? [ input.sstsTeacherId ] : undefined,
      weeks: input.weeks,
    });

    return cancelledInfos.length ? cancelledInfos[0] : null;
  }

  /**
   * 将数字星期几转换为中文
   * @private
   * @param {number} weekday - 星期几 (1-7)
   * @return {string} 中文星期几
   */
  _getChineseWeekday(weekday) {
    const weekdays = [ '一', '二', '三', '四', '五', '六', '日' ];
    return weekdays[weekday - 1] || '';
  }
}

module.exports = StaffWorkLoadViewConnector;
