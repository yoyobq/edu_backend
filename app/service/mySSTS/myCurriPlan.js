// app/service/mySSTS/myCurriPlan.js
'use strict';

const Service = require('egg').Service;

/** MyCurriPlanService
 * 教学日志填写主控服务
 * 本模块负责调度获取教学计划、日志概览、教学日志详情，并剔除已填写日志，最终返回需填写的课程列表。
 * 原始功能繁杂，现已拆分为多个子模块，仅保留核心调度逻辑，方便教学展示与后期维护。
 */
class MyCurriPlanService extends Service {
  // 获取需填写教学日志的总控方法
  async getCurriPlanSSTS({ JSESSIONID_A, userId, token }) {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 第一步：获取教学计划摘要数据
    const planListRaw = await this.ctx.service.mySSTS.curriPlan.list.getCurriPlanList({ JSESSIONID_A, userId, token });

    // 第二步：获取已填写教学日志的概览数据
    const logOverview = await this.ctx.service.mySSTS.teachingLog.overview.getTeachingLogOverview({ JSESSIONID_A, userId, token });

    // 第三步：清洗教学计划数据、提取 planId 与 teachingClassId 标识符
    const cleaner = this.ctx.service.mySSTS.curriPlan.cleaner;
    const planList = cleaner.cleanPlanList(planListRaw);
    const curriPlanIds = cleaner.extractPlanIdentifiers(planListRaw);
    // console.log('PlanList:', planList);
    console.log('CurriPlanIds:', curriPlanIds);
    const logIds = cleaner.extractLogIdentifiers(logOverview);

    const allCurriDetails = [];

    for (let i = 0; i < curriPlanIds.length; i++) {
      const { planId, teachingClassId, className, courseName } = curriPlanIds[i];

      let detail = await this.ctx.service.mySSTS.curriPlan.detail.getCurriPlanDetail({ JSESSIONID_A, planId, token });
      console.log('Detail:', detail);
      detail = cleaner.filterPastDateCurriculums({ tomorrow, planDetail: detail });
      detail = cleaner.sortSectionIds(detail);

      let cleanedData = [];
      if (logIds[i]?.logId) {
        let completedLogs = await this.ctx.service.mySSTS.teachingLog.list.getTeachingLogList({ JSESSIONID_A, teachingClassId, token });
        completedLogs = cleaner.sortSectionIds(completedLogs);
        cleanedData = cleaner.removeDuplicates(detail, completedLogs);
      } else {
        cleanedData = detail;
      }

      cleanedData.forEach(item => {
        item.teaching_class_id = teachingClassId;
        item.className = className;
        item.courseName = courseName;
      });

      allCurriDetails.push(...cleanedData);
    }

    // 第五步：排序和格式化数据
    allCurriDetails.sort(cleaner.sortFinalDetails);
    const curriDetails = cleaner.cleanCurriDetailsData(allCurriDetails);

    return {
      planList,
      curriDetails,
    };
  }
}

module.exports = MyCurriPlanService;
