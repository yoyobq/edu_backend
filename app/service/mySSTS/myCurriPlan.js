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
    const logList = await this.ctx.service.mySSTS.teachingLog.list.getTeachingLogList({ JSESSIONID_A, userId, token });

    // 第三步：清洗教学计划数据、提取 planId 与 teachingClassId 标识符
    const cleaner = this.ctx.service.mySSTS.curriPlan.cleaner;
    const planList = cleaner.cleanPlanList(planListRaw);
    const curriPlanIds = cleaner.extractPlanIdentifiers(planListRaw);
    // console.log('PlanList:', planList);
    console.log('CurriPlanIds:', curriPlanIds);
    const logIds = cleaner.extractLogIdentifiers(logList);

    const allCurriDetails = [];

    for (let i = 0; i < curriPlanIds.length; i++) {
      const { planId, teachingClassId, className, courseName, courseCategory } = curriPlanIds[i];
      let detail = [];
      if (courseCategory === '3') {
        const integratedDetail = await this.ctx.service.mySSTS.curriPlan.integratedDetail.getIntegratedPlanDetail({ JSESSIONID_A, planId, token });
        // console.dir(integratedDetail, { depth: null });
        console.log(integratedDetail);
      } else {
        detail = await this.ctx.service.mySSTS.curriPlan.detail.getCurriPlanDetail({ JSESSIONID_A, planId, token });
        // [{
        //   SECTION_NAME: '第二节,第一节',
        //   UPDATE_USER_ID: '3236',
        //   LECTURE_PLAN_ID: '40349a569512fa36019516ffdfd13ab3',
        //   PRACTICE_HOURS: null,
        //   ROW_NUM: 1,
        //   TEACHING_CHAPTER_CONTENT: '安全教育',
        //   TOPIC_NUMBER: null,
        //   HOMEWORK: '无',
        //   TOPIC_NAME: null,
        //   UPDATE_TIME: '2025-02-28 12:54:02',
        //   LECTURE_PLAN_DETAIL_ID: '40349a56954ac28101954ae7879a17de',
        //   PRACTICE_TEACHING_DATE: null,
        //   TEACHING_METHOD: '2',
        //   RNUM: 857,
        //   LESSON_HOURS: 2,
        //   LECTURE_HOURS: null,
        //   DAY_OF_WEEK: 4,
        //   UPDATE_USER_NAME: '徐洋',
        //   SELECTEDKEY: '40349a56954ac28101954ae7879a17de',
        //   WEEK_NUMBER: 1,
        //   SECTION_ID: '2,1',
        //   THEORY_TEACHING_DATE: '2025-02-20',
        //   TEACHING_LOCATION: '5402',
        //   DEMONSTRATION_HOURS: null
        // }]
        console.log('Detail:', detail[0]);
      }
      detail = cleaner.filterPastDateCurriculums({ tomorrow, planDetail: detail });
      // console.log('Filtered Detail:', detail[0]);
      detail = cleaner.sortSectionIds(detail);
      // console.log('Sorted Detail:', detail[0]);

      let cleanedData = [];
      if (logIds[i]?.logId) {
        let completedLogs = await this.ctx.service.mySSTS.teachingLog.detail.getTeachingLogDetail({ JSESSIONID_A, teachingClassId, token });
        console.log('Completed Logs:', completedLogs[0]);
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
