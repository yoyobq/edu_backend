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

    // 添加调试日志：查看原始数据
    console.log('=== 原始数据分析 ===');
    console.log('原始 planList 长度:', planList.length);

    if (planList.length > 0) {
      console.log('第一条数据示例:');
      console.log(JSON.stringify(planList[0], null, 2));

      // 统计 LECTURE_PLAN_ID 的情况
      const validIds = planList.filter(item => item.LECTURE_PLAN_ID);
      const nullIds = planList.filter(item => !item.LECTURE_PLAN_ID);

      console.log('有效 LECTURE_PLAN_ID 的数据项数量:', validIds.length);
      console.log('LECTURE_PLAN_ID 为空的数据项数量:', nullIds.length);

      if (nullIds.length > 0) {
        console.log('LECTURE_PLAN_ID 为空的数据项示例:');
        console.log(JSON.stringify(nullIds[0], null, 2));
      }

      if (validIds.length > 0) {
        console.log('有效 LECTURE_PLAN_ID 的数据项示例:');
        console.log(JSON.stringify(validIds[0], null, 2));
      }
    }

    this._filterPlanListForCheck(planList);

    // 3. 获取 Semester 映射
    const semesterMap = await this._fetchSemesterMap();
    console.log('semesterMap:', semesterMap);

    // 4. 获取 Staff 映射
    const staffMap = await this._fetchStaffMap(planList);
    console.log('staffMap 键数量:', Object.keys(staffMap).length);

    // 5. 数据清洗
    const courseScheduleFiltered = this.cleanCourseSchedule(planList, semesterMap, staffMap);
    const courseScheduleSourceMapFiltered = this.cleanCourseScheduleSourceMap(planList, semesterMap, staffMap);
    const weekNumberSimpstrFiltered = this.cleanWeekNumberSimpstr(planList);

    console.log('=== 清洗后数据分析 ===');
    console.log('courseScheduleFiltered 长度:', courseScheduleFiltered.length);
    console.log('courseScheduleSourceMapFiltered 长度:', courseScheduleSourceMapFiltered.length);
    console.log('weekNumberSimpstrFiltered 长度:', weekNumberSimpstrFiltered.length);

    // 6. 调用封装的函数来检查数组长度并合并数组
    const combinedArray = this._combineCourseData(
      courseScheduleFiltered,
      courseScheduleSourceMapFiltered,
      weekNumberSimpstrFiltered
    );

    console.log('合并后 combinedArray 长度:', combinedArray.length);

    // 7. 调用我们实现的"先删再插"逻辑（或其他写库逻辑）
    await this._saveCourseDataWithTransaction(combinedArray);

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
    const deptId = 'ORG0302';
    // 直接调用 curriPlan.list 服务获取原始课程计划数据
    const planList = await this.ctx.service.mySSTS.curriPlan.list.getCurriPlanList({
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
    console.log('开始保存数据，combinedArray 长度:', combinedArray.length);

    if (combinedArray.length === 0) {
      console.log('没有数据需要保存');
      return;
    }

    // 1. 启动事务
    const t = await this.ctx.model.transaction();
    try {
      // 2. 遍历 combinedArray
      for (const item of combinedArray) {
        const newSourceMapData = item.courseScheduleSourceMap;
        const lecturePlanId = newSourceMapData.LECTURE_PLAN_ID;

        console.log('处理 LECTURE_PLAN_ID:', lecturePlanId);

        // 2.1 只有当 LECTURE_PLAN_ID 不为 null 时才检查重复
        if (lecturePlanId) {
          const existingSourceMap = await this.ctx.model.Ssts.CourseScheduleSourceMap.findOne({
            where: { LECTURE_PLAN_ID: lecturePlanId },
            transaction: t,
          });

          // 2.2 如果存在，则在同一个事务中先删除旧记录
          if (existingSourceMap) {
            console.log('找到已存在的记录，准备删除');
            const oldSchedule = await existingSourceMap.getCourseSchedule({ transaction: t });
            if (oldSchedule) {
              await oldSchedule.destroy({ transaction: t });
            }
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
        if (item.courseSlotArray && item.courseSlotArray.length > 0) {
          const chineseNumbers = [ '', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十' ];

          await Promise.all(item.courseSlotArray.map(async slot => {
            const numericPeriods = slot.periods
              .filter(p => p && p.trim() !== '') // 过滤掉空字符串
              .map(p => chineseNumbers.indexOf(p) || parseInt(p) || 0)
              .filter(p => p > 0); // 过滤掉转换失败的0值

            if (numericPeriods.length === 0) {
              return; // 跳过无效的 slot
            }

            await this.ctx.model.Plan.CourseSlot.create({
              ...slot,
              courseScheduleId: newSchedule.id,
              staffId: newSchedule.staffId,
              periodStart: numericPeriods[0],
              periodEnd: numericPeriods[numericPeriods.length - 1],
              semesterId: newSchedule.semesterId,
            }, { transaction: t });
          }));
        }
      }

      // 3. 都成功，提交事务
      console.log('准备提交事务');
      await t.commit();
      console.log('事务提交成功');
    } catch (error) {
      console.log('事务回滚，错误信息:', error);
      await t.rollback();
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
      1: 'THEORY',
      2: 'PRACTICE',
      3: 'INTEGRATED',
      4: 'CLUB',
      5: 'CLASS_MEETING',
    };

    return planList
      .map(item => ({
        staffId: staffMap[item.TEACHER_IN_CHARGE_ID] || 0,
        sstsTeacherId: item.TEACHER_IN_CHARGE_ID,
        staffName: item.TEACHER_NAME,
        teachingClassName: item.CLASS_NAME,
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
        coefficient: item.CLASS_NAME.includes(',') ? 1.6 : 1.0, // courseSchedule.is_wil (boolean) 例：1
        courseCategory: categoryMap[item.COURSE_CATEGORY] || 'OTHER', // courseSchedule.courseCategory
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
    return planList
      .map(item => ({
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
    return planList
      .map(item => {
        let weekNumberSimpStr = item.WEEK_NUMBER_SIMPSTR;

        // 只有当 WEEK_NUMBER_SIMPSTR 为空、存在 WEEK_NUMBER_STRING 时，才根据规则生成
        if (!weekNumberSimpStr && item.WEEK_NUMBER_STRING) {
          const weekArray = item.WEEK_NUMBER_STRING.split(',').map(Number);
          const activeWeeks = [];

          // 找出所有有课的周次
          weekArray.forEach((hasClass, index) => {
            if (hasClass === 1) {
              activeWeeks.push(index + 1); // 周次从1开始
            }
          });

          if (activeWeeks.length > 0) {
            // 生成周次范围
            const weekRange = this._generateWeekRange(activeWeeks);

            // 根据规则生成完整的课程安排
            const scheduleSegments = [];

            // 星期一到星期五的课程安排
            const weekdays = [ '一', '二', '三', '四', '五' ];
            weekdays.forEach(day => {
              let periods;
              if (day === '三') {
                // 星期三只有4节课
                periods = '第一节,第二节,第三节,第四节';
              } else {
                // 其他工作日都是7节课
                periods = '第一节,第二节,第三节,第四节,第五节,第六节,第七节';
              }
              scheduleSegments.push(`${weekRange} 星期${day} ${periods}`);
            });

            weekNumberSimpStr = scheduleSegments.join(',');
            console.log(`从 WEEK_NUMBER_STRING 推导出 WEEK_NUMBER_SIMPSTR: ${weekNumberSimpStr}`);
          }
        }

        // 如果仍然没有有效的 WEEK_NUMBER_SIMPSTR，返回空数组
        if (!weekNumberSimpStr) {
          console.log('跳过无效的课程数据项：', JSON.stringify(item, null, 2));
          return []; // 返回空数组而不是 null
        }

        // 继续处理有效的 WEEK_NUMBER_SIMPSTR 数据
        const dayInfo = (weekNumberSimpStr.match(/]([^[]+)/g) || [])
          .map(str => str.slice(1).trim());

        const charNumberMap = {
          一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7,
        };

        const result = [];
        dayInfo.forEach(info => {
          const parts = info.split(' ');
          if (parts.length >= 2) {
            const dayStr = parts[0].replace('星期', '');
            const dayOfWeek = charNumberMap[dayStr];
            const periodsStr = parts.slice(1).join(' ');

            const periods = periodsStr.split(',').map(p => {
              const match = p.match(/第(\S+)节/);
              return match ? match[1] : p;
            }).filter(p => p && p.trim() !== ''); // 过滤掉空字符串和只包含空白字符的字符串

            result.push({
              LECTURE_PLAN_ID: item.LECTURE_PLAN_ID,
              dayOfWeek,
              periods,
              timeSlot: `${dayStr} ${periodsStr}`,
            });
          }
        });

        return result; // 返回数组，每个原始项对应一个数组
      }); // 不再使用 .flat()，保持与其他方法相同的结构
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
      FLAG1: item.FLAG1,
      SCHEDULING_FLAG: item.SCHEDULING_FLAG,
      // BATCH_ID: item.BATCH_ID, // 基于学期的教学计划聚合编号，不转存
      // ROW_NUM: item.ROW_NUM, // SSTS 网站中表单的排序，不转存
      COURSE_CATEGORY: item.COURSE_CATEGORY, // 对应课程类型（理论课1，实践课2，一体化3等）
      COURSE_CLASS: item.COURSE_CLASS, // 同 COURSE_CATEGORY
      WEEK_NUMBER_SIMPSTR: item.WEEK_NUMBER_SIMPSTR, // 课程的周次和时间
    }));

    console.log(filtered);
  }

  // 辅助方法：生成周次范围字符串
  _generateWeekRange(weeks) {
    if (weeks.length === 0) return '';

    // 找到连续的周次范围
    const ranges = [];
    let start = weeks[0];
    let end = weeks[0];

    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i] === end + 1) {
        end = weeks[i];
      } else {
        ranges.push(start === end ? `[${start}]` : `[${start}-${end}]`);
        start = end = weeks[i];
      }
    }

    ranges.push(start === end ? `[${start}]` : `[${start}-${end}]`);
    return ranges.join(',');
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

