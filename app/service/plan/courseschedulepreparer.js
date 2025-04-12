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
   * @param {number} param.semesterId - 学期 ID
   * @param {number} [param.staffId] - 教师 ID（可选）
   * @param {string} [param.sstsTeacherId] - SSTS 教师 ID（可选）
   * @param {number[]} [param.weeks] - 周次数组（可选）
   * @return {Promise<Array>} - 返回实际有效的上课日期及课时详情
   */
  async actualTeachingDates({ semesterId, staffId, sstsTeacherId, weeks }) {
    const semester = await this.ctx.model.Plan.Semester.findByPk(semesterId);
    const events = await this.ctx.model.Plan.CalendarEvent.findAll({
      where: {
        semesterId,
        recordStatus: [ 'ACTIVE', 'ACTIVE_TENTATIVE' ],
      },
    });

    const dates = await this.ctx.service.plan.courseScheduleManager.listActualTeachingDates({
      staffId,
      sstsTeacherId,
      semester,
      events,
      weeks,
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
