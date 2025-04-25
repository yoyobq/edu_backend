/* eslint-disable no-unused-vars */
'use strict';

/**
 * @file service/plan/courseSchedulePreparer.js
 * @description
 * 本模块用于为 courseScheduleManager 中的统计类接口统一准备所需的上下文数据（如学期信息、校历事件等）。
 *
 * 当前设计的补充说明：
 * - 本项目从 courseSchedule 这个 Service 开始有了较大的改变，
 *   围绕着同名 Model 第一次有了好几个不同的侧重的 Service
 * - 初期以 CourseSchedule 为中心，
 *   划分出 courseScheduleService（基础 CRUD）、courseScheduleManager（统计/分析）、
 *   以及本模块 courseSchedulePreparer（准备上下文数据）；
 * - 但这种“按模型划分 service”的思想并不符合最佳实践，
 *   更合理的做法应是**按职责命名 service**，避免所有 service 都围绕 model 命名，职责不清。
 *
 * 真正的命名建议：
 * - 当前模块建议未来重命名为：`teachingContextService`
 *   更准确表达其“准备教学相关上下文”的职责， context 即上下文；
 * - `courseScheduleManager` 模块建议未来重命名为：
 *   `teachingStatsService` 或 `scheduleStatsService`
 *   更清晰地表达“课程表数据的课时统计与分析”等纯逻辑处理；
 *
 * 当前版本保留原命名结构，作为代码演进过程的一部分，作为了解架构如何逐步拆解和优化的示例。
 * 新增模块时，建议优先采用“按职责命名”方式。
 */


const { Service } = require('egg');

class courseSchedulePreparerService extends Service {
  /**
   * 查询实际教学日期及日期中对应的课程
   * @param {Object} param - 参数对象
   * @param {number} [param.semesterId] - 学期 ID
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {string} [param.sstsTeacherId] - SSTS 教师 ID（可选）
   * @param {number} [param.scheduleId] - 课程ID
   * @param {number[]} [param.weeks] - 周次数组（可选）
   * @return {Promise<Array>} - 返回实际有效的上课日期及课时详情
   */
  async actualTeachingDates({ semesterId, staffId, sstsTeacherId, weeks, scheduleId }) {
    let semester;

    // 如果未提供 semesterId，则查询当前学期
    if (!semesterId) {
      semester = await this.ctx.model.Plan.Semester.findOne({
        where: { isCurrent: true },
      });

      if (!semester) {
        this.ctx.throw(404, '未找到当前学期信息，请明确指定 semesterId');
      }
    } else {
      semester = await this.ctx.model.Plan.Semester.findByPk(semesterId);
    }

    if (!semester) {
      this.ctx.throw(404, `未找到ID为 ${semesterId} 的学期信息`);
    }

    const events = await this.ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId: semester.id,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });

    const dates = await this.ctx.service.plan.courseScheduleManager.listActualTeachingDates({
      staffId,
      sstsTeacherId,
      semester,
      events,
      weeks,
      scheduleId,
    });

    return dates;
  }

  /**
   * 查询因假期取消的课程
   * 若提供 weeks 即查询局部数据，则周末调课会显示 note 说明
   * 否则，不提供 weeks 即查询全局数据，
   * 则因周末调课和被调休日期一定会同时出现，不会引起误解，顾不显示 note 说明
   * @param {Object} param - 参数对象
   * @param {number} param.semesterId - 学期 ID
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {string} [param.sstsTeacherId] - SSTS 教师 ID（可选）
   * @param {number[]} [param.weeks] - 周次数组（可选）
   * @return {Promise<Array>} - 返回取消的课程列表
   */
  async cancelledCourses({ semesterId, staffId, sstsTeacherId, weeks }) {
    const semester = await this.ctx.model.Plan.Semester.findByPk(semesterId);
    const events = await this.ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
    const dates = await this.ctx.service.plan.courseScheduleManager.calculateCancelledCourses({
      semester,
      events,
      staffId,
      sstsTeacherId,
      weeks,
    });
    return dates;
  }

  /**
   * 查询指定范围内实际有效的总课时数
   * @param {Object} param - 参数对象
   * @param {number} param.semesterId - 学期 ID
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {string} [param.sstsTeacherId] - SSTS 教师 ID（可选）
   * @param {number[]} [param.weeks] - 周次数组（可选）
   * @return {Promise<number>} - 返回有效课时总数
   */
  async teachingHours({ semesterId, staffId, sstsTeacherId, weeks }) {
    const semester = await this.ctx.model.Plan.Semester.findByPk(semesterId);
    const events = await this.ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });
    const hours = await this.ctx.service.plan.courseScheduleManager.calculateTeachingHours({
      semester,
      events,
      staffId,
      sstsTeacherId,
      weeks,
    });

    return hours;
  }

  /**
   * 根据学期信息和周数范围获取具体的时间范围
   * @private
   * @param {Object} param - 参数对象
   * @param {Object} param.semester - 学期对象，包含 firstTeachingDate 和 examStartDate
   * @param {Array<number>} param.weeks - 周数范围，如 [1, 16] 表示第1周到第16周
   * @return {Object} - 返回时间范围对象，包含 startDate 和 endDate
   */
  getTeachingWeekDateRange({ semester, weeks }) {
    if (!semester || !semester.firstTeachingDate) {
      throw new Error('缺少有效的学期信息');
    }

    if (!Array.isArray(weeks) || weeks.length !== 2 || weeks[0] > weeks[1]) {
      throw new Error('无效的周数范围参数，必须提供包含起始周和结束周的数组且第一个数字不大于第二个');
    }

    const [ startWeek, endWeek ] = weeks;

    // 计算学期的最大教学周数（不包括考试周）
    const firstTeachingDate = new Date(semester.firstTeachingDate);
    const examStartDate = new Date(semester.examStartDate);

    // 计算考试周开始前的最后一天（即最后一个教学周的结束）
    const lastTeachingDay = new Date(examStartDate);
    lastTeachingDay.setDate(lastTeachingDay.getDate() - 1);

    // 计算总教学周数（向下取整，因为可能不是整数周）
    const totalTeachingWeeks = Math.floor(
      (lastTeachingDay - firstTeachingDate) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;

    // 确保请求的周数不超过总教学周数
    const validEndWeek = Math.min(endWeek, totalTeachingWeeks);

    // 计算起始日期：第一教学日 + (startWeek - 1) * 7天
    const startDate = new Date(firstTeachingDate);
    startDate.setDate(startDate.getDate() + (startWeek - 1) * 7);

    // 计算结束日期：第一教学日 + (validEndWeek * 7 - 1)天
    const endDate = new Date(firstTeachingDate);
    endDate.setDate(endDate.getDate() + validEndWeek * 7 - 1);

    // 确保结束日期不超过最后一个教学日
    if (endDate > lastTeachingDay) {
      endDate.setTime(lastTeachingDay.getTime());
    }

    // 格式化日期为 YYYY-MM-DD
    const formatDate = date => date.toISOString().split('T')[0];

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      totalTeachingWeeks,
    };
  }

  // 单纯跳板无必要
  // /**
  //  * 批量统计多个教职工课时
  //  * @param {Object} param - 参数对象
  //  * @param {number} param.semesterId - 学期 ID
  //  * @param {number[]} param.staffIds - 教职工 ID 数组
  //  * @param {string[]} [param.sstsTeacherIds] - SSTS 教师 ID 数组（可选）
  //  * @param {number[]} [param.weeks] - 周次数组（可选）
  //  * @return {Promise<Array>} - 返回每个教职工的课时统计
  //  */
  // async batchTeachingHours({ semesterId, staffIds, sstsTeacherIds, weeks }) {
  //   const result = await this.ctx.service.plan.courseScheduleManager.calculateMultipleTeachingHours({
  //     staffIds,
  //     // [ '3617', '3592', '3618', '3497', '3552', '3553', '3593', '3616', '3556' ],
  //     sstsTeacherIds,
  //     semesterId,
  //     weeks,
  //   });

  //   return result;
  // }
}

module.exports = courseSchedulePreparerService;
