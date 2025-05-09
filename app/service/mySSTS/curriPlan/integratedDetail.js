// mySSTS/curriPlan/integratedDetail.js
const Service = require('egg').Service;

/**
 * 获取一体化课程的教学计划详情
 */
class IntegratedPlanService extends Service {
  // 顶层函数
  async getIntegratedPlanDetail({ JSESSIONID_A, planId, token, userId, scheduleId }) {
    // 第一步.1 获取一体化课程教学计划的原始数据
    const originalData = await this.getIntegratedPlanDetailOrigin({ JSESSIONID_A, planId, token });
    // console.log('获取到的一体化教学计划数据:');
    // console.dir(originalData, { depth: null });
    // 第一步.2 获取一体化课程考试的原始数据（未使用）
    // console.dir(originalData.checkDTOList, { depth: null });

    // 第二步 对数据进行扁平化处理
    const flattenedData = this._flattenIntegratedPlanData(originalData.dataList);
    // console.log('扁平化后的一体化教学计划数据:', flattenedData);

    // 第三步 排序并检查数据
    const sortedPlanData = this._sortAndCheckPlanData(flattenedData);
    // console.log('排序后的一体化教学计划数据:', sortedPlanData);

    // 第四步 获取上课的日期和节数
    const dateList = await this.ctx.service.plan.courseSchedulePreparer.actualTeachingDates({
      userId,
      scheduleId,
      // 照道理说是不应该提供这个选项的，当然要计算所有的日程更动
      // 但校园网一体化课程计划里，居然没有考虑这个问题，所以这里也不考虑，防止不一致
      considerMakeup: false,
    });
    // console.log('获取到的上课日期和节数:');
    // console.dir(dateList, { depth: null });

    // 第五步 扁平化上课的日期和节数数据(和课程暂不相关，需要进一步匹配)
    const flattenedDateList = this._flattenDateList(dateList);
    // console.log('扁平化后的数据:', flattenedDateList);

    // 第六步 合并课程计划和上课日期数据
    const mergedData = this._mergePlanAndDateData(sortedPlanData, flattenedDateList);
    // console.dir(mergedData, { depth: null });

    // 返回扁平化后的数据
    return mergedData;
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
        console.log(`实际课时无法与计划课时匹配，计划课时还需要${requiredHours}课时，但实际课时只有${accumulatedHours}课时`);
      }

      // 创建结果项
      if (usedDates.length > 0) {
        result.push({
          ...planItem,
          teachingDate: usedDates[0].date, // 使用首次开课日期日期作为完成日期
          // teachingDateEnd: usedDates[usedDates.length - 1].date, // 使用最后一次开课日期日期作为完成日期
          section_id: this._generateSectionId(usedDates), // 调用新函数生成 section_id,这是一个方便排序的项，提交时应该清空内容s
          usedDates,
        });
      } else {
        // 如果没有可用日期，仍然添加计划项，但不包含日期信息
        result.push({
          ...planItem,
          teachingDate: null,
          section_id: '',
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
    // 按照 week_number 为主，task_no 为次，session_no 为第三优先级进行排序
    dataArray.sort((a, b) => {
      // 首先按 week_number 排序
      if (a.week_number !== b.week_number) {
        return a.week_number - b.week_number;
      }
      // 如果 week_number 相同，则按 task_no 排序
      if (a.task_no !== b.task_no) {
        return a.task_no - b.task_no;
      }
      // 如果 task_no 相同，则按 session_no 排序
      return a.session_no - b.session_no;
    });

    // 不再需要检查 week_number 是否按升序排列，因为排序已经保证了这一点
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

  /**
   * 根据使用的日期生成节次ID
   * @param {Array} usedDates - 使用的日期数组
   * @return {string} - 生成的节次ID字符串
   */
  _generateSectionId(usedDates) {
    if (!usedDates || usedDates.length === 0) {
      return '';
    }

    const sectionIdArray = [];

    // 检查是否所有日期都在同一天且节次连续
    const allSameDay = usedDates.every(date => date.date === usedDates[0].date);
    let isConsecutive = true;

    if (allSameDay && usedDates.length > 1) {
      // 按 periodStart 排序
      usedDates.sort((a, b) => a.periodStart - b.periodStart);

      // 检查是否连续
      for (let i = 1; i < usedDates.length; i++) {
        const prevEnd = usedDates[i - 1].periodStart + usedDates[i - 1].lessons_hours - 1;
        if (usedDates[i].periodStart !== prevEnd + 1) {
          isConsecutive = false;
          break;
        }
      }
    } else if (usedDates.length > 1) {
      // 多个不同日期，不连续
      isConsecutive = false;
    }

    // 根据连续性生成 section_id
    if (allSameDay && isConsecutive) {
      // 所有日期同一天且连续，生成完整的节次数组
      const firstStart = usedDates[0].periodStart;
      const totalHours = usedDates.reduce((sum, date) => sum + date.lessons_hours, 0);
      for (let i = 0; i < totalHours; i++) {
        sectionIdArray.push(firstStart + i);
      }
    } else {
      // 不连续或不同天，只使用第一项
      const firstStart = usedDates[0].periodStart;
      const firstHours = usedDates[0].lessons_hours;
      for (let i = 0; i < firstHours; i++) {
        sectionIdArray.push(firstStart + i);
      }
    }

    return sectionIdArray.join(',');
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
