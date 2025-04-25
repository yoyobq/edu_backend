// mySSTS/curriPlan/integratedDetail.js
const Service = require('egg').Service;

/**
 * 获取一体化课程的教学计划详情
 */
class IntegratedPlanService extends Service {
  // 顶层函数
  async getIntegratedPlanDetail({ JSESSIONID_A, planId, token, userId, scheduleId }) {
    // 第一步 调用原始方法获取数据
    const originalData = await this.getIntegratedPlanDetailOrigin({ JSESSIONID_A, planId, token });

    // 第二步 对数据进行扁平化处理
    const flattenedData = this._flattenIntegratedPlanData(originalData.dataList);

    // 第三步 排序并检查数据
    const sortedData = this._sortAndCheckPlanData(flattenedData);
    // console.log('排序后的数据:', sortedData);

    // 第四步 获取上课的日期和节数
    const dateList = await this.ctx.service.plan.courseSchedulePreparer.actualTeachingDates({ userId, scheduleId });

    // 第五步 扁平化上课的日期和节数数据
    const flattenedDateList = this._flattenDateList(dateList);
    console.log('扁平化后的数据:', flattenedDateList);

    // 第六步 合并课程计划和上课日期数据
    const mergedData = this._mergePlanAndDateData(sortedData, flattenedDateList);
    console.dir(mergedData, { depth: null });

    // 返回扁平化后的数据
    return sortedData;
  }


  /**
   * 将课程计划数组和上课日期数组，根据教学周（week_number）和课时数（lessons_hours）
   * 进行匹配，最终输出完成每个计划所需的日期。
   * @param {Array} sortedPlanData - 排序后的课程计划数据
   * @param {Array} flattenedDateList - 扁平化后的上课日期数据
   * @return {Array} - 合并后的数据，包含计划信息和对应的上课日期
   */
  _mergePlanAndDateData(sortedPlanData, flattenedDateList) {
    if (!sortedPlanData || !flattenedDateList || !Array.isArray(sortedPlanData) || !Array.isArray(flattenedDateList)) {
      return [];
    }

    const result = [];

    // 按日期排序所有可用日期，不再按周次分组
    const allAvailableDates = [ ...flattenedDateList ].sort((a, b) =>
      new Date(a.date) - new Date(b.date) || a.periodStart - b.periodStart
    );

    // 遍历课程计划
    for (const planItem of sortedPlanData) {
      const requiredHours = planItem.lessons_hours;

      let accumulatedHours = 0;
      const usedDates = [];

      // 累计课时直到满足计划要求
      while (accumulatedHours < requiredHours && allAvailableDates.length > 0) {
        const dateItem = allAvailableDates.shift(); // 取出第一个可用日期

        if (dateItem) {
          usedDates.push(dateItem);
          accumulatedHours += dateItem.lessons_hours;
        } else {
          break; // 没有更多可用日期
        }
      }

      // 记录警告日志，但不抛出异常
      if (accumulatedHours !== requiredHours) {
        console.log(`课时不足以完成计划，需要${requiredHours}课时，但只有${accumulatedHours}课时`);
      }

      // 创建结果项
      if (usedDates.length > 0) {
        result.push({
          ...planItem,
          teachingDate: usedDates[usedDates.length - 1].date, // 使用最后一个日期作为完成日期
          usedDates,
        });
      } else {
        // 如果没有可用日期，仍然添加计划项，但不包含日期信息
        result.push({
          ...planItem,
          teachingDate: null,
          usedDates: [],
        });
      }
    }

    return result;
  }


  /**
   * 扁平化处理日期列表，将每个日期的课程信息展开
   * @param {Array} dateList - 日期列表数组
   * @return {Array} - 扁平化后的数组，每项包含日期信息和单个课程信息
   */
  _flattenDateList(dateList) {
    if (!dateList || !Array.isArray(dateList) || dateList.length === 0) {
      return [];
    }

    const flattenedList = [];

    // 遍历每个日期项
    dateList.forEach(dateItem => {
      // 确保有课程数组
      if (dateItem.courses && Array.isArray(dateItem.courses) && dateItem.courses.length > 0) {
        // 遍历该日期下的每个课程
        dateItem.courses.forEach(course => {
          // 计算课时数（结束节次 - 开始节次 + 1）
          const lessonsHours = course.periodEnd - course.periodStart + 1;

          // 创建扁平化的项目
          const flatItem = {
            date: dateItem.date,
            weekOfDay: dateItem.weekOfDay,
            weekNumber: dateItem.weekNumber,
            // scheduleId: course.scheduleId,
            // courseName: course.courseName,
            // slotId: course.slotId,
            periodStart: course.periodStart,
            // periodEnd: course.periodEnd,
            // weekType: course.weekType,
            // coefficient: course.coefficient,
            lessons_hours: lessonsHours,
          };

          flattenedList.push(flatItem);
        });
      }
    });

    return flattenedList;
  }

  // 排序并检查数据函数
  _sortAndCheckPlanData(dataArray) {
    // 按照 session_no 为主，task_no 为次进行排序
    dataArray.sort((a, b) => {
      // 首先按 session_no 排序
      if (a.session_no !== b.session_no) {
        return a.session_no - b.session_no;
      }
      // 如果 session_no 相同，则按 task_no 排序
      return a.task_no - b.task_no;
    });

    // 检查 week_number 是否按升序排列
    if (dataArray && dataArray.length > 1) {
      let lastWeekNumber = dataArray[0].week_number;

      for (let i = 1; i < dataArray.length; i++) {
        const currentWeekNumber = dataArray[i].week_number;

        // 检查当前的 week_number 是否小于前一个，如果是则抛出错误
        if (currentWeekNumber < lastWeekNumber) {
          // this.ctx.throw(500, '校园网中的一体化计划有错误：教学任务的顺序与上课周的顺序不符');
          return [];
        }

        lastWeekNumber = currentWeekNumber;
      }
    }

    return dataArray;
  }

  // 扁平化处理函数
  _flattenIntegratedPlanData(dataList) {
    const flattenedData = [];

    // 遍历每个任务项
    for (const item of dataList) {
      const taskName = item.task_name;
      const taskNo = item.task_no;

      // 遍历每个会话配置
      if (item.sessionCfgDTOList && item.sessionCfgDTOList.length > 0) {
        for (const sessionCfg of item.sessionCfgDTOList) {
          // 获取会话配置的基本信息
          const sessionInfo = {
            task_name: taskName,
            task_no: taskNo,
            lecture_plan_id: sessionCfg.lecture_plan_id,
            session_id: sessionCfg.session_id,
            session_no: sessionCfg.session_no,
            session_target: sessionCfg.session_target,
            session_content: sessionCfg.session_content,
            update_time: sessionCfg.update_time,
            update_user_id: sessionCfg.update_user_id,
            update_user_name: sessionCfg.update_user_name,
          };

          // 如果有会话列表，则遍历并添加到扁平化数组
          if (sessionCfg.sessionListDTOList && sessionCfg.sessionListDTOList.length > 0) {
            for (const sessionDetail of sessionCfg.sessionListDTOList) {
              // 合并会话信息和详细信息
              flattenedData.push({
                ...sessionInfo,
                session_detail_id: sessionDetail.session_detail_id,
                teaching_unit: sessionDetail.teaching_unit,
                learn_target: sessionDetail.learn_target,
                learn_content: sessionDetail.learn_content,
                learn_achievement: sessionDetail.learn_achievement,
                lessons_hours: sessionDetail.lessons_hours,
                week_number: sessionDetail.week_number,
              });
            }
          } else {
            // 如果没有会话列表，则直接添加会话信息
            flattenedData.push(sessionInfo);
          }
        }
      }
    }

    return flattenedData;
  }

  // 获取校园网的原始数据
  async getIntegratedPlanDetailOrigin({ JSESSIONID_A, planId, token }) {
    const randomHex = Array.from({ length: 9 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomFloat = Math.random().toFixed(13).slice(2);
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/educationaffairsmgmt/teachingdailymgmt/LectureSession.action?frameControlSubmitFunction=load&winTemp=${randomHex}.${randomFloat}`;

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0901/EA090104',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 一体化负载  {"lecture_plan_id":"40349a569512fa360195170437473b92"}
    const plainTextData = {
      lecture_plan_id: planId,
    };

    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

    let response = {};
    try {
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers,
        data: payload,
        dataType: 'string',
        timeout: 30000,
      });
    } catch (err) {
      throw err;
    }

    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    // 返回原始数据
    return decodedData;
  }
}
module.exports = IntegratedPlanService;


// 首次提交真正要准备的数据
//   "teaching_class_id": "40349a5694255a8f019425bb970724b7",
//   "teaching_date": "2025-04-07",  //！！！时间如何计算
//   "week_number": "8",
//   "day_of_week": "1",
//   "listening_teacher_id": "2230",
//   "listening_teacher_name": "2230金正",
//   "lesson_hours": 0,
//   "journal_type": "3",
//   "problem_and_solve": "无",
//   "complete_and_summary": "佳",
//   "lecture_plan_detail_id": "40349a56953b8b2001953ba92c5c032d",


// 首次提交
// {
//   "absenceList": [],
//   "teaching_class_id": "40349a5694255a8f019425bb970724b7",
//   "teaching_date": "2025-04-07",
//   "week_number": "8",
//   "day_of_week": "1",
//   "listening_teacher_id": "2230",
//   "guidance_teacher_id": "",
//   "listening_teacher_name": "2230金正",
//   "lesson_hours": 0,
//   "minSectionId": "",
//   "course_content": "",
//   "homework_assignment": "",
//   "topic_record": "",
//   "section_id": "",
//   "section_name": "",
//   "journal_type": "3",
//   "student_number": "",
//   "shift": "",
//   "problem_and_solve": "无",
//   "complete_and_summary": "佳",
//   "discipline_situation": "",
//   "security_and_maintain": "",
//   "lecture_plan_detail_id": "40349a56953b8b2001953ba92c5c032d",
//   "lecture_journal_detail_id": "",
//   "production_project_title": "",
//   "lecture_lessons": 0,
//   "training_lessons": 0,
//   "example_lessons": 0,
//   "production_name": "",
//   "production_plan_num": 0,
//   "production_qualified_num": 0,
//   "production_back_num": 0,
//   "production_waste_num": 0
// }


// 这是一体化提交的数据格式
// {
//   "absenceList":[{"student_name":"丁国梁","student_number":"324010101","attendance_status":"0","absence_section_id":"","absence_id":"40349a569648326701964bb8796902dd","remarks":null,"lecture_journal_detail_id":"40349a569648326701964bb8793a02c8"},],
//   "teaching_class_id": "40349a5694255a8f019425bb965a24a9", //plan
//   "teaching_date": "2025-04-14", // none
//   "week_number": "9", // plan
//   "day_of_week": "1",                     // 星期一（可能需映射） // plan
//   "lesson_hours": "4",  // plan
//   "section_id": null,
//   "section_name": null,
//   "shift": "3",                           // 班次（如有含义可枚举化） // ！！！！

//   "lecture_plan_detail_id": "40349a56951709900195181f434c183d", // plan
//   "lecture_journal_detail_id": "40349a569648326701964bb8793a02c8", // plan

//   "journal_type": "3",                    // 教学日志类型（可对应说明类型） // 固定值
//   "student_number": "",                   // 学生人数
//   "course_content": null,                 // 教学内容
//   "homework_assignment": null,           // 布置作业
//   "topic_record": null,                  // 专题记录

//   "listening_teacher_id": "3236",                                          // 本人
//   "guidance_teacher_id": "",             // 指导教师未填写
//   "listening_teacher_name": "3236徐洋",

//   "problem_and_solve": "组装计算机整机",        // 问题与解决措施
//   "complete_and_summary": "掌握标准化的装机流程、学会组装计算机", // 总结与收获
//   "discipline_situation": "纪律良好",             // 纪律情况
//   "security_and_maintain": "正常保养",            // 安全与设备维护

//   "lecture_lessons": 0,                  // 理论课时
//   "training_lessons": 0,                 // 实训课时
//   "example_lessons": 0,                  // 示范课时

//   "production_project_title": null,      // 生产项目标题（如适用）
//   "production_name": null,               // 产品名称
//   "production_plan_num": 0,              // 计划数
//   "production_qualified_num": 0,         // 合格数
//   "production_back_num": 0,              // 返工数
//   "production_waste_num": 0              // 报废数
// }

