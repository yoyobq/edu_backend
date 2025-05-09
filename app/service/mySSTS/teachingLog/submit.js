/* eslint-disable no-unused-vars */
// app/service/mySSTS/teachingLog/submit.js
'use strict';

const Service = require('egg').Service;

/**
 * 提交教学日志表单（SSTS 系统）
 */
class TeachingLogSubmitService extends Service {
  /**
  * WARNING: 看似和一体化一样，不要合并！不要合并！不要合并
  * 本函数将模板字段与用户输入合并后，发起加密请求。
  * 成功时返回数据，失败时抛出错误供上层捕获处理。
  *
  * @param {Object} param  - 参数对象
  * @param {Object} param.teachingLogData  - 日志数据主体
  * @param {string} param.JSESSIONID_A  - 会话 cookie
  * @param {string} param.token  - 教务系统授权 token
  */
  async submitTeachingLog({ teachingLogData, JSESSIONID_A, token }) {
    // 教务系统需要提交完整字段，因此预填所有字段模板
    const templateData = {
      absenceList: [],
      teaching_class_id: '',
      teaching_date: '',
      week_number: '',
      day_of_week: '',
      listening_teacher_id: '',
      guidance_teacher_id: '',
      listening_teacher_name: '',
      lesson_hours: null,
      minSectionId: '',
      course_content: '',
      homework_assignment: '',
      topic_record: '',
      section_id: '',
      section_name: '节',
      journal_type: '',
      student_number: '',
      shift: '',
      problem_and_solve: '',
      complete_and_summary: '',
      discipline_situation: '',
      security_and_maintain: '',
      lecture_plan_detail_id: '',
      lecture_journal_detail_id: '',
      production_project_title: '',
      lecture_lessons: 0,
      training_lessons: 0,
      example_lessons: 0,
      production_name: '',
      production_plan_num: 0,
      production_qualified_num: 0,
      production_back_num: 0,
      production_waste_num: 0,
    };

    // 合并用户输入数据与模板字段
    const completeTeachingLogData = {};
    for (const key in templateData) {
      completeTeachingLogData[key] = teachingLogData.hasOwnProperty(key) ? teachingLogData[key] : templateData[key];
    }

    // 动态构造 URL（含随机 winTemp 参数，避免请求重复缓存）
    const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/educationaffairsmgmt/teachingdailymgmt/lectureJournalDetail.action?frameControlSubmitFunction=saveLectureJournalDetail&winTemp=${winTemp}`;

    // 构造请求头
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
      Referer: 'http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090201/index',
      'Service-Type': 'Microservices',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 加密日志数据
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(completeTeachingLogData);

    let response;
    try {
      // 发送 POST 请求提交日志
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers,
        data: payload,
        dataType: 'string',
        timeout: 30000,
      });
    } catch (error) {
      // 网络异常或服务端连接失败
      throw error;
    }

    // 解密返回内容
    const decoded = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    // 统一错误处理逻辑
    if (!decoded.success) {
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      const errorResponse = decoded.msg
        ? decoded
        : { code: 400, msg: '教学日志提交时出错，成因复杂，请联系管理员排错。', success: false };
      await errorHandler.handleScrapingError(errorResponse);
    }

    return decoded.data;
  }
  // 一体化日志提交
  async submitIntegratedTeachingLog({ teachingLogData, JSESSIONID_A, token }) {
    // 引入清洗工具
    const cleaner = this.ctx.service.mySSTS.curriPlan.cleaner;

    // 教务系统需要提交完整字段，因此预填所有字段模板
    const templateData = {
      absenceList: [],
      teaching_class_id: '',
      teaching_date: '',
      week_number: '',
      day_of_week: '',
      listening_teacher_id: '',
      guidance_teacher_id: '',
      listening_teacher_name: '',
      lesson_hours: null,
      minSectionId: '',
      course_content: '',
      homework_assignment: '',
      topic_record: '',
      section_id: '',
      section_name: '',
      journal_type: '',
      student_number: '',
      shift: '',
      problem_and_solve: '',
      complete_and_summary: '',
      discipline_situation: '',
      security_and_maintain: '',
      lecture_plan_detail_id: '',
      lecture_journal_detail_id: '',
      production_project_title: '',
      lecture_lessons: 0,
      training_lessons: 0,
      example_lessons: 0,
      production_name: '',
      production_plan_num: 0,
      production_qualified_num: 0,
      production_back_num: 0,
      production_waste_num: 0,
    };

    // 合并用户输入数据与模板字段
    const completeTeachingLogData = {};
    for (const key in templateData) {
      // 对 section_id 字段进行特殊处理，始终设置为空字符串
      if (key === 'section_id') {
        completeTeachingLogData[key] = '';
      } else {
        completeTeachingLogData[key] = teachingLogData.hasOwnProperty(key) ? teachingLogData[key] : templateData[key];
      }
    }

    // 动态构造 URL（含随机 winTemp 参数，避免请求重复缓存）
    const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/educationaffairsmgmt/teachingdailymgmt/lectureJournalDetail.action?frameControlSubmitFunction=saveLectureJournalDetail&winTemp=${winTemp}`;

    // 构造请求头
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      Dnt: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      Referer: 'http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090201/index',
      'Service-Type': 'Microservices',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    console.log(completeTeachingLogData);
    // 加密日志数据
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(completeTeachingLogData);

    let response;
    try {
      // 发送 POST 请求提交日志
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers,
        data: payload,
        dataType: 'string',
        timeout: 30000,
      });
    } catch (error) {
      // 网络异常或服务端连接失败
      throw error;
    }

    // 解密返回内容
    const decoded = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    // 统一错误处理逻辑
    if (!decoded.success) {
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      const errorResponse = decoded.msg
        ? decoded
        : { code: 400, msg: '一体化教学日志提交时出错，成因复杂，请联系管理员排错。', success: false };
      await errorHandler.handleScrapingError(errorResponse);
    }

    return decoded.data;
  }
}

module.exports = TeachingLogSubmitService;

// 普通课程提交实例
// {
//   data: {
//     sstsSubmitTeachingLog: {
//       absenceList: [],
//       checkSql: null,
//       comments: null,
//       complete_and_summary: '',
//       course_content: '固定定位和 CSS 动画',
//       day_of_week: 2,
//       discipline_situation: '',
//       example_lessons: 0,
//       flag: null,
//       frameControlBackMessage: null,
//       frameControlErrorMessage: null,
//       frameControlIsBack: null,
//       frameControlIsError: null,
//       frameControlOption: null,
//       frameControlSubmitFunction: null,
//       frameprocessinstanceid: null,
//       guidance_teacher_id: '',
//       guidance_teacher_name: null,
//       homework_assignment: '页面制作',
//       journal_type: '1',
//       lecture_journal_detail_id: '40349a56965ccc3e01966659cf477433',
//       lecture_journal_id: null,
//       lecture_lessons: 0,
//       lecture_plan_detail_id: '',
//       lesson_hours: 2,
//       listening_teacher_id: '',
//       listening_teacher_name: '',
//       problem_and_solve: '',
//       production_back_num: 0,
//       production_name: '',
//       production_plan_num: 0,
//       production_project_title: '',
//       production_qualified_num: 0,
//       production_waste_num: 0,
//       section_id: '5,6',
//       section_name: '第五节,第六节',
//       security_and_maintain: '',
//       shift: '',
//       spjd: null,
//       sss002: null,
//       teaching_class_id: '40349a5694255a8f019425bb9a2524fb',
//       teaching_date: '2025-04-22 00:00:00',
//       topic_record: '优',
//       training_lessons: 0,
//       week_number: 10,
//       workItemId: null
//     }
//   }
// }

// 一体化课程首次提交实例
// {"absenceList":[],"teaching_class_id":"40349a5694255a8f019425bb965a24a9","teaching_date":"2025-05-05","week_number":"12","day_of_week":"1","listening_teacher_id":"3236","guidance_teacher_id":"","listening_teacher_name":"3236徐洋","lesson_hours":4,"minSectionId":"","course_content":"","homework_assignment":"","topic_record":"","section_id":"","section_name":"","journal_type":"3","student_number":"","shift":"3","problem_and_solve":"掌握局域网和广域网的基础知识，学会接入Internet","complete_and_summary":"学生能够掌握局域网和广域网的基础知识，学会接入Internet","discipline_situation":"纪律良好","security_and_maintain":"已完成保养","lecture_plan_detail_id":"40349a56951709900195181f430e1827","lecture_journal_detail_id":"","production_project_title":"","lecture_lessons":0,"training_lessons":0,"example_lessons":0,"production_name":"","production_plan_num":0,"production_qualified_num":0,"production_back_num":0,"production_waste_num":0}

