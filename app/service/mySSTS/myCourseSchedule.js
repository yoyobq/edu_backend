// 用于爬取单个系、多个系，甚至整个学院的课程数据
'use strict';

const { Service } = require('egg');

class myCourseScheduleService extends Service {

  /**
 * 获取课程表信息（对外暴露的主方法）
 */
  async getCourseScheduleListSSTS() {
  // 1. 获取 SSTS 的 session
    const session = await this._loginAndGetSession();
    const { JSESSIONID_A, token } = session;

    // 2. 获取排课数据
    const planList = await this._fetchPlanList({ JSESSIONID_A, token });

    // 3. 获取 Semester 映射
    const semesterMap = await this._fetchSemesterMap();

    // 4. 获取 Staff 映射
    const staffMap = await this._fetchStaffMap(planList);

    // 5. 数据清洗
    const courseScheduleFiltered = this.cleanCourseSchedule(planList, semesterMap, staffMap);
    const courseScheduleSourceMapFiltered = this.cleanCourseScheduleSourceMap(planList, semesterMap, staffMap);
    const weekNumberSimpstrFiltered = this.cleanWeekNumberSimpstr(planList);

    // 6. 调用封装的函数来检查数组长度并合并数组
    const combinedArray = this._combineCourseData(
      courseScheduleFiltered,
      courseScheduleSourceMapFiltered,
      weekNumberSimpstrFiltered
    );

    // 7. 调用我们实现的“先删再插”逻辑（或其他写库逻辑）
    //    - 因为外部系统是唯一且权威的数据源，我们不需要保留旧数据。
    //      每次发现重复（LECTURE_PLAN_ID 已存在）时，通过在同一个事务中先删除旧记录，再插入新数据，
    //      可确保数据完全覆盖、保持与外部系统的一致性。
    //    - 完整流程简介：
    //       - 遍历 combinedArray，对每条课程记录根据 LECTURE_PLAN_ID 查询是否已有旧数据
    //       - 若已存在，则在同一个事务里删除其关联的主表和子表记录
    //       - 然后插入新的 courseSchedule、courseScheduleSourceMap、courseSlot 等表记录
    //       - 若没有重复记录，则直接新建
    //       - 所有操作在一个事务中，最终一起提交或回滚
    await this._saveCourseDataWithTransaction(combinedArray);

    // last setp. 只返回部分字段供外部快速核查
    // const filtered = this._filterPlanListForCheck(planList);
    return combinedArray;
  }

  /**
   * 1. 登录并获取 SSTS 的 session
   */
  async _loginAndGetSession() {
    const myLoginService = await this.ctx.service.mySSTS.myLogin;
    const session = await myLoginService.loginToSSTS({});
    // session 里包含 { jsessionCookie, refreshedToken } 等
    return {
      JSESSIONID_A: session.jsessionCookie,
      token: session.refreshedToken,
    };
  }

  /**
   * 2. 使用 session 获取排课数据
   * @param {object} param - 包含 session 信息的对象
   * @param {string} param.JSESSIONID_A - 会话ID
   * @param {string} param.token - 认证令牌
   * @param {string} param.userId - 校园网教师 ID
   */
  async _fetchPlanList({ JSESSIONID_A, token, userId }) {
    const myCurriPlanService = await this.ctx.service.mySSTS.myCurriPlan;
    const deptId = 'ORG0302';
    // userId 是临时数据
    const planList = await myCurriPlanService.getCurriPlanListSSTS({
      JSESSIONID_A,
      token,
      deptId,
      userId,
    });
    return planList;
  }

  /**
   * 3. 获取 Semester 映射
   */
  async _fetchSemesterMap() {
    const semesters = await this.ctx.model.Plan.Semester.findAll({
      attributes: [ 'id', 'schoolYear', 'termNumber' ],
    });

    const semesterMap = {};
    semesters.forEach(semester => {
      semesterMap[`${semester.schoolYear}-${semester.termNumber}`] = semester.id;
    });
    return semesterMap;
  }

  /**
   * 4. 获取 Staff 映射（基于 planList 里教职工的 jobId 列表）
   * @param {Array} planList - 原始课程计划列表
   */
  async _fetchStaffMap(planList) {
    const staffIds = planList.map(item => item.TEACHER_IN_CHARGE_ID);
    const staffMembers = await this.ctx.model.Staff.findAll({
      where: { jobId: staffIds },
      attributes: [ 'jobId', 'id' ],
    });

    const staffMap = {};
    staffMembers.forEach(staff => {
      staffMap[staff.jobId] = staff.id;
    });
    return staffMap;
  }

  /**
     * 6 将三个数组合并成一个大数组
     * @param {Array} courseScheduleFiltered - 清洗后的课程表数据
     * @param {Array} courseScheduleSourceMapFiltered - 清洗后的课程表映射数据
     * @param {Array} weekNumberSimpstrFiltered - 清洗后的上课时间表数据
     * @return {Array} 合并后的大数组
     */
  _combineCourseData(courseScheduleFiltered, courseScheduleSourceMapFiltered, weekNumberSimpstrFiltered) {
    // 判断三个数组的长度是否相等
    if (
      courseScheduleFiltered.length !== courseScheduleSourceMapFiltered.length ||
        courseScheduleSourceMapFiltered.length !== weekNumberSimpstrFiltered.length
    ) {
      this.ctx.throw(400, '课程表、课程表映射表、上课时间表不统一，转存将引起数据有效性、完整性问题。');
    }
    // 合并三个数组成一个大数组
    return courseScheduleFiltered.map((courseSchedule, index) => ({
      courseSchedule,
      courseScheduleSourceMap: courseScheduleSourceMapFiltered[index],
      courseSlotArray: weekNumberSimpstrFiltered[index],
    }));
  }

  /**
    * 在插入前检查 LECTURE_PLAN_ID 是否存在，如已存在，则删除旧数据并插入新数据
    * @param {Array} combinedArray - 包含了三表数据的对象数组
    */
  async _saveCourseDataWithTransaction(combinedArray) {
    // 1. 启动事务
    const t = await this.ctx.model.transaction();
    try {
      // 2. 遍历 combinedArray
      for (const item of combinedArray) {
        const newSourceMapData = item.courseScheduleSourceMap;
        const lecturePlanId = newSourceMapData.LECTURE_PLAN_ID;

        // 2.1 先查询是否存在同样的 LECTURE_PLAN_ID
        const existingSourceMap = await this.ctx.model.Ssts.CourseScheduleSourceMap.findOne({
          where: { LECTURE_PLAN_ID: lecturePlanId },
          transaction: t,
        });

        // 2.2 如果存在，则在同一个事务中先删除旧记录
        if (existingSourceMap) {
          // 通过关联拿到旧的 courseSchedule
          const oldSchedule = await existingSourceMap.getCourseSchedule({ transaction: t });
          if (oldSchedule) {
            // 这行操作会触发级联删除, 前提是:
            // 1) 在 model 定义里 hasOne/hasMany 设置了 onDelete: 'CASCADE', hooks: true
            // 2) 数据库中真正有对应的外键 或者 至少启用 Sequelize 级联钩子
            await oldSchedule.destroy({ transaction: t });
          }
        }

        // 2.3 再创建新的 courseSchedule
        const newSchedule = await this.ctx.model.Plan.CourseSchedule.create(item.courseSchedule, { transaction: t });

        // 2.4 创建新的 sourceMap，并关联刚刚创建的 schedule ID
        await this.ctx.model.Ssts.CourseScheduleSourceMap.create({
          ...newSourceMapData,
          courseScheduleId: newSchedule.id,
        }, { transaction: t });

        // 2.5 批量插入 slots
        await Promise.all(item.courseSlotArray.map(async slot => {
          // console.log(slot);
          await this.ctx.model.Plan.CourseSlot.create({
            ...slot,
            courseScheduleId: newSchedule.id,
            staffId: newSchedule.staffId,
            periodStart: slot.period[0],
            periodEnd: slot.period[slot.period.length - 1],
            semesterId: newSchedule.semesterId,
          }, { transaction: t });
        }));
      }

      // 3. 都成功，提交事务
      await t.commit();
    } catch (error) {
      await t.rollback();
      // 1. 打印到 Egg.js 的日志里 (logs目录 or console)
      // this.logger.error('批量插入课程表数据失败，错误信息：', error);

      // 2. 或者直接在 throw 前 console.log
      console.log('真实错误信息：', error);

      this.ctx.throw(500, '批量插入课程表数据失败', { error });
    }
  }

  /**
   * 清洗 CourseSchedule 课程表数据
   * @param {Array} planList - 原始课程计划列表
   * @param {object} semesterMap - 学期映射表
   * @param {object} staffMap - 教师映射表
   * @return {Array} 清洗后的课程计划数据
   */
  cleanCourseSchedule(planList, semesterMap, staffMap) {
    // 根据外部的 COURSE_CATEGORY 映射到模型所需的枚举值
    const categoryMap = {
      1: '理论课',
      2: '实践课',
      3: '一体化',
      4: '社团课',
      5: '班会课',
    };

    return planList.map(item => ({
      staffId: staffMap[item.TEACHER_IN_CHARGE_ID] || 0, // 根据 jobId 查找 staffId
      sstsTeacherId: item.TEACHER_IN_CHARGE_ID, // courseSchedule.sstsTeacherId (string)
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
      credits: item.CREDITS, // courseSchedule.credit (number) 例：6
      isWil: item.COURSE_CATEGORY === '3' ? 1 : 0, // courseSchedule.is_wil (boolean) 例：1
      courseCategory: categoryMap[item.COURSE_CATEGORY] || '其他课程', // courseSchedule.courseCategory
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
      COURSE_ID: item.COURSE_ID || 0, // courseScheduleSourceMap.COURSE_ID (string) 例："FD19C83BBE5F46D8BD60D90C4493A69A"
      TEACHER_IN_CHARGE_ID: item.TEACHER_IN_CHARGE_ID, // courseScheduleSourceMap.TEACHER_IN_CHARGE_ID (string) 例："2226"
      TEACHING_CLASS_ID: item.TEACHING_CLASS_ID, // courseScheduleSourceMap.TEACHING_CLASS_ID (string) 例："40349a5694255a8f019425bb967924ab"
      // SELECTEDKEY: item.SELECTEDKEY, // courseScheduleSourceMap.TEACHING_CLASS_ID (string) 例："40349a5694255a8f019425bb967924ab"
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

  /**
     *  仅针对调试或快速核查用，返回部分字段
     *    逻辑保持原先一致
     * @param {array} planList - 原始课程计划列表
     */
  _filterPlanListForCheck(planList) {
    const filtered = planList.map(item => ({
      TEACHER_NAME: item.TEACHER_NAME,
      CLASS_NAME: item.CLASS_NAME,
      COURSE_NAME: item.COURSE_NAME,
      // BATCH_ID: item.BATCH_ID, // 基于学期的教学计划聚合编号，不转存
      // ROW_NUM: item.ROW_NUM, // SSTS 网站中表单的排序，不转存
      COURSE_CATEGORY: item.COURSE_CATEGORY, // 对应课程类型（理论课1，实践课2，一体化3等）
      COURSE_CLASS: item.COURSE_CLASS, // 同 COURSE_CATEGORY
      WEEK_NUMBER_SIMPSTR: item.WEEK_NUMBER_SIMPSTR, // 课程的周次和时间
    }));

    // console.log(filtered);
    return filtered;
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

