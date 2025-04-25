// mySSTS/curriPlan/integratedRecord.js
const Service = require('egg').Service;

/**
 * 获取一体化课程的教学记录初始化数据
 */
class IntegratedRecordService extends Service {
  // 获取记录初始化数据
  async getRecordInitData({ JSESSIONID_A, planId, token }) {
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
  // // 第三步 构建初始化数据
  // const initData = {
  //   // 基本信息
  //   lecture_plan_id: targetPlan.lecture_plan_id,
  //   lecture_plan_detail_id: targetPlan.session_detail_id,
  //   session_id: targetPlan.session_id,

  //   // 教学内容信息
  //   task_name: targetPlan.task_name,
  //   task_no: targetPlan.task_no,
  //   session_no: targetPlan.session_no,
  //   session_target: targetPlan.session_target,
  //   session_content: targetPlan.session_content,

  //   // 学习目标和内容
  //   teaching_unit: targetPlan.teaching_unit,
  //   learn_target: targetPlan.learn_target,
  //   learn_content: targetPlan.learn_content,
  //   learn_achievement: targetPlan.learn_achievement,

  //   // 课时和周次信息
  //   lessons_hours: targetPlan.lessons_hours,
  //   week_number: targetPlan.week_number,

  //   // 默认值
  //   journal_type: '3', // 教学日志类型
  //   student_number: '', // 学生人数
  //   course_content: targetPlan.learn_content, // 默认使用学习内容
  //   homework_assignment: null, // 布置作业
  //   topic_record: null, // 专题记录

  //   // 教师信息
  //   listening_teacher_id: targetPlan.update_user_id,
  //   listening_teacher_name: `${targetPlan.update_user_id}${targetPlan.update_user_name}`,
  //   guidance_teacher_id: '',

  //   // 教学情况记录（默认值）
  //   problem_and_solve: '', // 问题与解决措施
  //   complete_and_summary: targetPlan.learn_achievement, // 默认使用学习成果
  //   discipline_situation: '纪律良好', // 纪律情况
  //   security_and_maintain: '正常保养', // 安全与设备维护

  //   // 课时统计（默认为0）
  //   lecture_lessons: 0, // 理论课时
  //   training_lessons: 0, // 实训课时
  //   example_lessons: 0, // 示范课时

  //   // 生产项目相关（默认为null或0）
  //   production_project_title: null,
  //   production_name: null,
  //   production_plan_num: 0,
  //   production_qualified_num: 0,
  //   production_back_num: 0,
  //   production_waste_num: 0,
  // };

  // return initData;

}

module.exports = IntegratedRecordService;
