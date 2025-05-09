// app/service/mySSTS/curriPlan/cleaner.js
'use strict';

// cleaner.js
// 教学计划与日志数据的清洗与辅助处理工具集合。
// 包括：排序、剔除、结构重组等操作。

const chineseNumbers = [ '一', '二', '三', '四', '五', '六', '七', '八', '九', '十' ];

module.exports = {
  // 清洗教学计划列表简略信息
  cleanPlanList(planList) {
    // 使用 Set 和 Map 进行去重
    const uniquePlans = new Map();

    // 遍历原始数据，以 LECTURE_PLAN_ID 为键进行去重
    planList.forEach(item => {
      uniquePlans.set(item.LECTURE_PLAN_ID, item);
    });

    // 将 Map 转换回数组并进行数据转换
    return Array.from(uniquePlans.values()).map(item => ({
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
      courseCategory: item.COURSE_CATEGORY,
      teachingClassId: item.TEACHING_CLASS_ID,
      className: item.CLASS_NAME,
      courseName: item.COURSE_NAME,
    })).sort((a, b) => a.teachingClassId.localeCompare(b.teachingClassId));
  },

  // 提取日志摘要中的教学班 ID 与日志 ID 和课程性质
  extractLogIdentifiers(logList) {
    return logList.map(item => ({
      logId: item.LECTURE_JOURNAL_ID,
      teachingClassId: item.TEACHING_CLASS_ID,
      courseCategory: item.COURSE_CATEGORY,
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

  // 仅保留一体化课程教学日期早于明日的记录
  filterPastDateIntegratedPlans({ tomorrow, integratedPlans }) {
    if (!integratedPlans || !Array.isArray(integratedPlans) || integratedPlans.length === 0) {
      return [];
    }

    // 按照教学日期排序
    integratedPlans.sort((a, b) => {
      const dateA = a.teachingDate ? new Date(a.teachingDate) : new Date(0);
      const dateB = b.teachingDate ? new Date(b.teachingDate) : new Date(0);
      return dateA - dateB;
    });

    // 找到第一个教学日期大于等于明日的记录的索引
    const cutoffIndex = integratedPlans.findIndex(item => {
      if (!item.teachingDate) return false;
      return new Date(item.teachingDate) >= tomorrow;
    });

    // 如果找到了这样的记录，则返回截断后的数组，否则返回原数组
    return cutoffIndex >= 0 ? integratedPlans.slice(0, cutoffIndex) : integratedPlans;
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
    // console.log('Detail:', detailList[0]);
    // console.log('Completed Logs:', completedLogs[0]);

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

  // 剔除已完成日志的一体化教学明细
  removeIntegratedDuplicates(detailList, completedLogs) {
    // 判断计划项和日志项是否重复（更严格地匹配）
    const isDuplicate = (planItem, logItem) => {
    // 核心对比逻辑：
      return (
        planItem.teachingDate === logItem.TEACHING_DATE && // 1. 日期相同
      planItem.lessons_hours === logItem.LESSON_HOURS // 2. 课时数也相同
      // （如果未来补充更多字段，比如教学单元ID、教学段落ID，也可以继续加到这里）
      );
    };

    // 倒序遍历 completedLogs，为了删除时索引不会错乱
    for (let i = completedLogs.length - 1; i >= 0; i--) {
    // 找到第一个匹配的计划项
      const index = detailList.findIndex(planItem => isDuplicate(planItem, completedLogs[i]));
      if (index !== -1) {
      // 如果找到了，说明日志已经完成了对应的计划，需要从待处理列表中剔除
        detailList.splice(index, 1); // 删除计划项
        completedLogs.splice(i, 1); // 删除日志项（因为它已经配对成功了）
      }
    }

    // 返回剩余未完成的计划项
    return detailList;
  },

  // 最终排序规则：按日期优先，再按节次升序
  sortFinalDetails(a, b) {
    // 获取对象a的日期，优先级：THEORY_TEACHING_DATE > PRACTICE_TEACHING_DATE > teachingDate
    const dateA = a.THEORY_TEACHING_DATE || a.PRACTICE_TEACHING_DATE || a.teaching_date || '2070-01-01';
    // 获取对象b的日期，优先级：THEORY_TEACHING_DATE > PRACTICE_TEACHING_DATE > teachingDate
    const dateB = b.THEORY_TEACHING_DATE || b.PRACTICE_TEACHING_DATE || b.teaching_date || '2070-01-01';

    const dateDiff = new Date(dateA) - new Date(dateB);
    if (dateDiff !== 0) return dateDiff;

    // 处理节次ID，考虑可能不存在的情况
    const sectionIdA = a.SECTION_ID || a.section_id || '';
    const sectionIdB = b.SECTION_ID || b.section_id || '';

    // 如果节次ID不存在，则返回0（保持原顺序）
    if (!sectionIdA || !sectionIdB) return 0;

    const sectionA = parseInt(sectionIdA.split(',')[0], 10) || 0;
    const sectionB = parseInt(sectionIdB.split(',')[0], 10) || 0;
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
    return dataArray.map(item => {
      // 如果是一体化课程（journal_type 为 3），则原样返回
      if (item.journal_type === '3' || item.journal_type === 3) {
        return item;
      }

      return {
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
      };
    });
  },

  // 准备一体化教学日志数据
  prepareIntegratedTeachingLogData(planData) {
    if (!planData) return null;
    // console.log('准备一体化教学日志数据', planData);

    // 获取日期对象，用于提取星期几
    const teachingDate = planData.teachingDate;
    const dateObj = new Date(teachingDate);
    const dayOfWeek = dateObj.getDay() || 7; // 将周日(0)转换为7，与系统保持一致

    // 构建教学日志预提交数据
    return {
      teaching_date: teachingDate,
      week_number: String(planData.week_number),
      day_of_week: String(dayOfWeek),
      listening_teacher_id: planData.update_user_id,
      guidance_teacher_id: '',
      listening_teacher_name: `${planData.update_user_id}${planData.update_user_name}`,
      lesson_hours: planData.lessons_hours,
      section_id: planData.section_id, // 一体化课程不需要
      journal_type: 3, // 一体化课程固定为3
      shift: '3', // 常日班
      problem_and_solve: planData.learn_target, // 使用学习目标作为问题与解决措施
      complete_and_summary: `学生能够\n${planData.learn_target}`, // 在学习目标前加"学生能够"
      discipline_situation: '纪律良好',
      security_and_maintain: '已完成保养',
      lecture_plan_detail_id: planData.session_detail_id, // 使用session_detail_id作为lecture_plan_detail_id
      lecture_journal_detail_id: '',
      production_project_title: '',
      teaching_class_id: planData.teaching_class_id,
      className: planData.className,
      courseName: planData.courseName,
    };
  },
};

// 一体化课程的教学计划 {
//   task_name: '计算机组装基础',
//   task_no: 1,
//   lecture_plan_id: '40349a569512fa360195170437473b92',
//   session_id: '40349a5695170990019517ffefad110d',
//   session_no: 1,
//   session_target: '认识主机外观、内部结构和常见外围设备',
//   session_content: '获取任务、任务准备、任务实施',
//   update_time: '2025-02-18 16:16:04',
//   update_user_id: '3236',
//   update_user_name: '徐洋',
//   session_detail_id: '40349a56951709900195181f435c1840',
//   teaching_unit: '计算机组装基础',
//   learn_target: '认识主机外观、内部结构和常见外围设备',
//   learn_content: '认识主机外观、内部结构和常见外围设备',
//   learn_achievement: '认识主机外观、内部结构和常见外围设备',
//   lessons_hours: 4,
//   week_number: 1
// }

// 提交日志数据
// {
//   "teaching_class_id": "40349a5694255a8f019425bb965a24a9",
//   "teaching_date": "2025-02-17 00:00:00",
//   "week_number": "1",
//   "day_of_week": "1",
//   "listening_teacher_id": "3236",
//   "guidance_teacher_id": "",
//   "listening_teacher_name": "3236徐洋",//
//   "lesson_hours": "4",
//   "minSectionId": "",
//   "course_content": null,
//   "homework_assignment": null,
//   "topic_record": null,
//   "section_id": null,
//   "section_name": null,
//   "journal_type": "3",
//   "student_number": "",
//   "shift": "3",
//   "problem_and_solve": "对主机外观、内部结构的和常见外围设备的认识",
//   "complete_and_summary": "认识主机外观、内部结构和常见外围设备",
//   "discipline_situation": "纪律良好",
//   "security_and_maintain": "已完成保养",
//   // "lecture_plan_detail_id": "40349a56951709900195181f435c1840", session_detail_id
//   "lecture_journal_detail_id": "40349a56956ecb8f01956f8f87c85b08",
//   "production_project_title": null,
//   "lecture_lessons": 0,
//   "training_lessons": 0,
//   "example_lessons": 0,
//   "production_name": null,
//   "production_plan_num": 0,
//   "production_qualified_num": 0,
//   "production_back_num": 0,
//   "production_waste_num": 0
// }

// 首次提交真正要准备的数据
//   "teaching_class_id": "40349a5694255a8f019425bb970724b7",
//   "teaching_date": "2025-04-07",  //！！！时间如何计算
//   "week_number": "8", // 通过日期直接得到 / 教学计划得到
//   "day_of_week": "1", // 通过日期直接得到
//   "listening_teacher_id": "2230", // 教学计划得到
//   "listening_teacher_name": "2230金正", // 教学计划得到
//   "lesson_hours": 4,    // 教学计划得到，后台验证项，一定要一致
//   "journal_type": "3", // 固定值 3
//   "problem_and_solve": "无",
//   "complete_and_summary": "佳",
//   "discipline_situation": "纪律良好", // 固定值 / 选单
//   "security_and_maintain": "已完成保养", // 固定值 / input
//   "lecture_plan_detail_id": "40349a56953b8b2001953ba92c5c032d",  session_detail_id


// 一体化日志
// {
//   SECTION_NAME: null,
//   SSS002: '7',
//   ROW_NUM: 9,
//   TEACHING_DATE: '2025-02-17',
//   LECTURE_JOURNAL_ID: '40349a56956ecb8f01956f8f87c85b07',
//   TOPIC_RECORD: null,
//   HOMEWORK_ASSIGNMENT: null,
//   SSS002NAME: '审核通过',
//   LESSON_HOURS: 4,
//   FRAMEPROCESSINSTANCEID: '0207e2a2149a4d82b068621fb80e51a4',
//   DAY_OF_WEEK: 1,
//   LECTURE_JOURNAL_DETAIL_ID: '40349a56956ecb8f01956f8f87c85b08',
//   TEACHING_CLASS_ID: '40349a5694255a8f019425bb965a24a9',
//   JOURNAL_TYPE: '3',
//   WEEK_NUMBER: 1,
//   COURSE_CONTENT: null,
//   SECTION_ID: null
// }
