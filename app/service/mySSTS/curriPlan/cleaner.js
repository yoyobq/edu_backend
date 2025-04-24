// app/service/mySSTS/curriPlan/cleaner.js
'use strict';

// cleaner.js
// 教学计划与日志数据的清洗与辅助处理工具集合。
// 包括：排序、剔除、结构重组等操作。

const chineseNumbers = [ '一', '二', '三', '四', '五', '六', '七', '八', '九', '十' ];

module.exports = {
  // 清洗教学计划列表简略信息
  cleanPlanList(planList) {
    return planList.map(item => ({
      curriPlanId: item.LECTURE_PLAN_ID,
      courseCategory: item.COURSE_CATEGORY,
      weeklyHours: item.WEEKLY_HOURS,
      className: item.CLASS_NAME,
      courseName: item.COURSE_NAME,
      schoolYear: item.SCHOOL_YEAR,
      semester: item.SEMESTER,
      teachingWeeksCount: item.WEEK_COUNT,
      teachingWeeksRange: item.WEEK_NUMBER_SIMPSTR,
      reviewStatus: item.SSS002NAME,
    }));
  },

  // 提取教学计划关键字段用于日志明细匹配
  extractPlanIdentifiers(planList) {
    return planList.map(item => ({
      planId: item.LECTURE_PLAN_ID,
      teachingClassId: item.TEACHING_CLASS_ID,
      className: item.CLASS_NAME,
      courseName: item.COURSE_NAME,
    })).sort((a, b) => a.teachingClassId.localeCompare(b.teachingClassId));
  },

  // 提取日志摘要中的教学班 ID 与日志 ID
  extractLogIdentifiers(logList) {
    return logList.map(item => ({
      logId: item.LECTURE_JOURNAL_ID,
      teachingClassId: item.TEACHING_CLASS_ID,
    })).sort((a, b) => a.teachingClassId.localeCompare(b.teachingClassId));
  },

  // 仅保留理论或实践教学日期早于明日的记录
  filterPastDateCurriculums({ tomorrow, planDetail }) {
    planDetail.sort((a, b) => {
      const dateA = a.THEORY_TEACHING_DATE || a.PRACTICE_TEACHING_DATE;
      const dateB = b.THEORY_TEACHING_DATE || b.PRACTICE_TEACHING_DATE;
      return new Date(dateA) - new Date(dateB);
    });
    const cutoffIndex = planDetail.findIndex(item => {
      const date = item.THEORY_TEACHING_DATE || item.PRACTICE_TEACHING_DATE;
      return new Date(date) >= tomorrow;
    });
    return cutoffIndex >= 0 ? planDetail.slice(0, cutoffIndex) : planDetail;
  },

  // 对 SECTION_ID 字段排序（多个节次合并时使用）
  sortSectionIds(array) {
    return array.map(item => {
      if (!item.SECTION_ID) return item;
      const sectionIdArray = item.SECTION_ID.split(',');
      if (sectionIdArray.length === 1) return item;
      item.SECTION_ID = sectionIdArray.map(Number).sort((a, b) => a - b).map(String)
        .join(',');
      return item;
    });
  },

  // 剔除已完成日志的教学明细
  removeDuplicates(detailList, completedLogs) {
    const isDuplicate = (planItem, logItem) => {
      const date = planItem.THEORY_TEACHING_DATE || planItem.PRACTICE_TEACHING_DATE;
      return date === logItem.TEACHING_DATE && planItem.SECTION_ID === logItem.SECTION_ID;
    };
    for (let i = completedLogs.length - 1; i >= 0; i--) {
      const index = detailList.findIndex(planItem => isDuplicate(planItem, completedLogs[i]));
      if (index !== -1) {
        detailList.splice(index, 1);
        completedLogs.splice(i, 1);
      }
    }
    return detailList;
  },

  // 最终排序规则：按日期优先，再按节次升序
  sortFinalDetails(a, b) {
    const dateDiff = new Date(a.THEORY_TEACHING_DATE) - new Date(b.THEORY_TEACHING_DATE);
    if (dateDiff !== 0) return dateDiff;
    const sectionA = parseInt(a.SECTION_ID.split(',')[0], 10);
    const sectionB = parseInt(b.SECTION_ID.split(',')[0], 10);
    return sectionA - sectionB;
  },

  // 对 SECTION_NAME 中中文节次顺序排序（第X节）
  sortSectionName(sectionName) {
    const names = sectionName.split(',');
    names.sort((a, b) => chineseNumbers.indexOf(a[1]) - chineseNumbers.indexOf(b[1]));
    return names.join(',');
  },

  // 清洗教学日志明细（格式标准化，转换字段名）
  cleanCurriDetailsData(dataArray) {
    return dataArray.map(item => ({
      teaching_class_id: item.teaching_class_id,
      teaching_date: item.THEORY_TEACHING_DATE || item.PRACTICE_TEACHING_DATE,
      week_number: String(item.WEEK_NUMBER),
      day_of_week: String(item.DAY_OF_WEEK),
      lesson_hours: item.LESSON_HOURS,
      course_content: item.TEACHING_CHAPTER_CONTENT,
      homework_assignment: item.HOMEWORK,
      topic_record: '良好',
      section_id: item.SECTION_ID,
      section_name: item.SECTION_NAME !== null ? module.exports.sortSectionName(item.SECTION_NAME) : item.SECTION_NAME,
      journal_type: item.THEORY_TEACHING_DATE ? 1 : (item.PRACTICE_TEACHING_DATE ? 2 : null),
      className: item.className,
      courseName: item.courseName,
    }));
  },
};
