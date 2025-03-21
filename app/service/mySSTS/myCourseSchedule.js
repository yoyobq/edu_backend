// 用于爬取单个系、多个系，甚至整个学院的课程数据
'use strict';

const { Service } = require('egg');

class myCourseScheduleService extends Service {

  // 登录并获取课程列表
  async getCourseScheduleListSSTS() {
    const myLoginService = await this.ctx.service.mySSTS.myLogin;
    const myCurriPlanService = await this.ctx.service.mySSTS.myCurriPlan;

    const session = await myLoginService.loginToSSTS({});
    const JSESSIONID_A = session.jsessionCookie;
    const token = session.refreshedToken;
    const deptId = 'ORG0302';
    // userId 是临时数据
    const planList = await myCurriPlanService.getCurriPlanListSSTS({ JSESSIONID_A, token, deptId, userId: '' });

    // 获取学期 id 信息
    const semesters = await this.ctx.model.Plan.Semester.findAll({
      attributes: [ 'id', 'schoolYear', 'termNumber' ],
    });
    const semesterMap = {};
    semesters.forEach(semester => {
      semesterMap[`${semester.schoolYear}-${semester.termNumber}`] = semester.id;
    });

    // 获取 staffId 信息
    const staffIds = planList.map(item => item.TEACHER_IN_CHARGE_ID);
    const staffMembers = await this.ctx.model.Staff.findAll({
      where: {
        jobId: staffIds,
      },
      attributes: [ 'jobId', 'id' ],
    });
    const staffMap = {};
    staffMembers.forEach(staff => {
      staffMap[staff.jobId] = staff.id;
    });


    // 使用清洗函数
    const courseScheduleFiltered = this.cleanCourseSchedule(planList, semesterMap, staffMap);
    const courseScheduleSourceMapFiltered = this.cleanCourseScheduleSourceMap(planList, semesterMap, staffMap);
    const weekNumberSimpstrFiltered = this.cleanWeekNumberSimpstr(planList);

    console.log(courseScheduleFiltered);
    console.log(courseScheduleSourceMapFiltered);
    console.log(weekNumberSimpstrFiltered);

    /**
     * 需保留这段 filter 代码，
     * 用于测试时快速核查 SSTS 网站的改动
     */
    const filtered = planList.map(item => ({
      TEACHER_NAME: item.TEACHER_NAME,
      CLASS_NAME: item.CLASS_NAME,
      COURSE_NAME: item.COURSE_NAME,
      // BATCH_ID: item.BATCH_ID, // 基于学期的教学计划聚合编号，不转存
      // ROW_NUM: item.ROW_NUM, // SSTS 网站中表单的排序，不转存
      COURSE_CATEGORY: item.COURSE_CATEGORY, // 对应着课程的类型（理论课1，实践课2，一体化3等）
      COURSE_CLASS: item.COURSE_CLASS, // 同 COURSE_CATEGORY
      WEEK_NUMBER_SIMPSTR: item.WEEK_NUMBER_SIMPSTR, // 课程的周次和时间
    }));
    // console.log(filtered);
    return filtered; // 添加返回语句
  }

  /**
   * 清洗 CourseSchedule 课程表数据
   * @param {Array} planList - 原始课程计划列表
   * @param {object} semesterMap - 学期映射表
   * @param {object} staffMap - 教师映射表
   * @return {Array} 清洗后的课程计划数据
   */
  cleanCourseSchedule(planList, semesterMap, staffMap) {
    return planList
      .map(item => ({
        staffId: staffMap[item.TEACHER_IN_CHARGE_ID] || 0, // 根据 jobId 查找 staffId
        staffName: item.TEACHER_NAME, // courseSchedule.name (string) 例："张三"
        teachingClassName: item.CLASS_NAME, // courseSchedule.teachingClassName (string) 例："信科2021班"
        classroomId: null,
        classroomName: '未记录',
        courseId: null,
        courseName: item.COURSE_NAME, // courseSchedule.courseName (string) 例："1031304G窗帘设计与制作"
        // semester: item.SEMESTER, // courseSchedule.semesterId => semesters.termNumber (string) 例："2"
        // schoolYear: item.SCHOOL_YEAR, // courseSchedule.semesterId => semesters.schoolYear (string) 例："2024"
        semesterId: semesterMap[`${item.SCHOOL_YEAR}-${item.SEMESTER}`] || null, // 使用预加载的学期映射表
        weekCount: item.WEEK_COUNT, // courseSchedule.weekCount (number) 例：16
        weeklyHours: item.WEEKLY_HOURS, // courseSchedule.weeklyHours (number) 例：4
        credit: item.CREDITS, // courseSchedule.credit (number) 例：6
        is_wil: item.COURSE_CATEGORY === '3' ? 1 : 0, // courseSchedule.is_wil (boolean) 例：1
        courseCategory: [ '1', '2', '3' ].includes(item.COURSE_CATEGORY) ? parseInt(item.COURSE_CATEGORY, 10) : 0, // courseSchedule.courseCategory (string) 例："1" - 课程类型（理论课1，实践课2，一体化等）
        weekNumberSimpstr: item.WEEK_NUMBER_SIMPSTR,
        weekNumberString: item.WEEK_NUMBER_STRING, // courseSchedule.weekNumberString (string) 例："1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0"
      }));
  }

  /**
   * 清洗 CourseScheduleSourceMap 数据
   * @param {Array} planList - 原始课程计划列表
   * @param {object} semesterMap - 学期映射表
   * @param {object} staffMap - 教师映射表
   * @return {Array} 清洗后的课程计划数据
   */
  cleanCourseScheduleSourceMap(planList, semesterMap, staffMap) {
    return planList.map(item => ({
      LECTURE_PLAN_ID: item.LECTURE_PLAN_ID, // courseScheduleSourceMap.LECTURE_PLAN_ID (string) 例："40349a56953b8b2001953fba54572e78"
      COURSE_ID: item.COURSE_ID, // courseScheduleSourceMap.COURSE_ID (string) 例："FD19C83BBE5F46D8BD60D90C4493A69A"
      TEACHER_IN_CHARGE_ID: item.TEACHER_IN_CHARGE_ID, // courseScheduleSourceMap.TEACHER_IN_CHARGE_ID (string) 例："2226"
      TEACHING_CLASS_ID: item.TEACHING_CLASS_ID, // courseScheduleSourceMap.TEACHING_CLASS_ID (string) 例："40349a5694255a8f019425bb967924ab"
      SELECTEDKEY: item.SELECTEDKEY, // courseScheduleSourceMap.TEACHING_CLASS_ID (string) 例："40349a5694255a8f019425bb967924ab"
      staffId: staffMap[item.TEACHER_IN_CHARGE_ID] || 0, // 根据 jobId 查找 staffId
      semesterId: semesterMap[`${item.SCHOOL_YEAR}-${item.SEMESTER}`] || null, // 使用预加载的学期映射表
    }));
  }

  /**
   * 清洗 WeekNumberSimpstr 数据
   * @param {Array} planList - 原始课程计划列表
   * @return {Array} 清洗后的课程计划数据
   */
  cleanWeekNumberSimpstr(planList) {
    // const result = [];
    return planList.map(item => {

      const weekNumberSimpStr = item.WEEK_NUMBER_SIMPSTR;

      const dayInfo = (weekNumberSimpStr.match(/]([^[]+)/g) || [])
        .map(str => str.slice(1).trim());
      // console.log(dayInfo);

      const charNumberMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

      const dayInfoFormatted = dayInfo.flatMap(info => {
        // 1) 匹配出「星期几 + 余下所有节次字符串」
        const dayOfWeekMatch = info.match(/星期([一二三四五六日])\s*(.+)/);
        // 2) dayOfWeek 数字化
        const dayOfWeek = charNumberMap[dayOfWeekMatch[1]];
        // 3) 提取所有 "第X节" 并转换为数字数组
        const periodsMatch = (dayOfWeekMatch && dayOfWeekMatch[2].match(/第([一二三四五六七八九十\d]+)节/g))
          // 从 "第X节" 截取中间的 X
          .map(item => item.match(/第([一二三四五六七八九十\d]+)节/)[1])
          // 将中文数字（或偶尔出现的阿拉伯数字）转换成纯数字
          .map(ch => charNumberMap[ch] || Number(ch));

        // 4) 按「上午(1-4) / 下午(5-6)」切分
        // 如果 periodsMatch 同时有 [1,2,3,4] 与 [5,6]，就拆分为两条
        const morning = periodsMatch.filter(p => p <= 4);
        const afternoon = periodsMatch.filter(p => p >= 5);

        // 5) 组装返回结果：可能是一条，也可能是两条
        const periods = [];
        if (morning.length > 0) {
          // 处理四节连排一分为二
          if (morning.length === 4 && morning.join() === '1,2,3,4') {
            // 特殊拆分
            periods.push(
              { dayOfWeek, period: [ 1, 2 ] },
              { dayOfWeek, period: [ 3, 4 ] }
            );
          } else {
            // 切割上午
            periods.push({ dayOfWeek, period: morning });
          }
        }
        if (afternoon.length > 0) {
          // 切割下午
          periods.push({ dayOfWeek, period: afternoon });
        }
        return periods;
      }).filter(Boolean);
      return dayInfoFormatted.length > 0 ? dayInfoFormatted : []; // 确保返回非空数组或 null
    });
  }
}


module.exports = myCourseScheduleService;


// const example = {
//   LECTURE_PLAN_ID: '40349a56953b8b2001953fba54572e78', /* courseScheduleSourceMap.LECTURE_PLAN_ID */
//   TEACHER_NAME: '卜强', // courseSchedule.name
//   SSS002: '7', // 无对应，审核状态 id（猜测）
//   WEEKLY_HOURS: 4, // courseSchedule.weeklyHours
//   EXPORT: '学生记分册', // 无对应，这是一个超链接文字，无需处理
//   COURSE_ID: 'FD19C83BBE5F46D8BD60D90C4493A69A', /* courseScheduleSourceMap.COURSE_ID */
//   SCHEDULING_FLAG: '1', // 是否排课？？课表生效？？
//   BATCH_ID: '40349a5694a188450194f3d3fef20176', // 目前看是按学期的全校编号
//   CLASS_NAME: '信息2401班', // courseSchedule.teachingClassName
//   COURSE_NAME: '1031303G网页设计与制作', // courseSchedule.courseName
//   SEMESTER: '2', // courseSchedule.semesterId => semesters.termNumber
//   TEACHER_IN_CHARGE_ID: '2226', /* courseScheduleSourceMap.TEACHER_IN_CHARGE_ID */
//   SCHOOL_YEAR: '2024', // courseSchedule.semesterId => semesters.schoolYear
//   SSS002NAME: '审核通过', // 审核状态
//   FRAMEPROCESSINSTANCEID: '43d070d810884ac48d80d354d04118be', // 无从猜测
//   WEEK_COUNT: 16, // courseSchedule.weekCount
//   ORGID: 'ORG0302', // 猜想是系部的编号 ORG0302 是信息工程系
//   CREDITS: 6, // courseSchedule.credit
//   ROW_NUM: 1, // 表单中的排序位置
//   COURSE_CATEGORY: '1', // courseSchedule.courseCategory 猜想应该对应着课程的类型（理论课1，实践课2，一体化等）
//   WEEK_NUMBER_SIMPSTR: '[1-16] 星期二 第一节,第二节,第三节,第四节', // 在 courseSlots 中拆分
//   COURSE_CLASS: '1', // 未知
//   WEEK_NUMBER_STRING: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0', // courseSchedule.weekNumberString
//   FLAG1: '1', // 无从猜测
//   GRADE: '2024', // 年级
//   TEACHING_CLASS_ID: '40349a5694255a8f019425bb967924ab', /* courseScheduleSourceMap.TEACHING_CLASS_ID */
//   UPDATEFLAG: null, // 是否更新
//   SELECTEDKEY: '40349a5694255a8f019425bb967924ab', /* courseScheduleSourceMap.TEACHING_CLASS_ID */
// };

// [
//   { weekNumberSimpStr: '[1-16] 星期二 第一节,第二节,第三节,第四节' },
//   {
//     weekNumberSimpStr: '[1-16] 星期一 第一节,第二节,第三节,第四节,[1-16] 星期四 第五节,第六节'
//   },
//   {
//     weekNumberSimpStr: '[1-16] 星期二 第五节,第六节,[1-16] 星期四 第一节,第二节,第三节,第四节'
//   }
// ]
