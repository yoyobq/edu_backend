'use strict';

const Service = require('egg').Service;

class MyCurriPlanService extends Service {
  // 获取需填写日志的总控方法
  async getCurriPlanSSTS({ JSESSIONID_A, userId, token }) {
    // 剔除还未到上课日期的课程（不需要填写日志）
    function filterPastDateCurriculums({ tomorrow, planDetail }) {
      // 按日期升序排序，优先使用 THEORY_TEACHING_DATE，如果不存在则使用 PRACTICE_TEACHING_DATE
      planDetail.sort(function(a, b) {
        const dateA = a.THEORY_TEACHING_DATE || a.PRACTICE_TEACHING_DATE;
        const dateB = b.THEORY_TEACHING_DATE || b.PRACTICE_TEACHING_DATE;
        return new Date(dateA) - new Date(dateB);
      });
      // 查找第一个晚于或等于明天的日期项
      const cutoffIndex = planDetail.findIndex(function(item) {
        const date = item.THEORY_TEACHING_DATE || item.PRACTICE_TEACHING_DATE;
        return new Date(date) >= tomorrow;
      });
      // 如果找到了符合条件的索引，则移除从该项到数组末尾的所有项
      const pastDateCurriculums = cutoffIndex >= 0 ? planDetail.slice(0, cutoffIndex) : planDetail;
      return pastDateCurriculums;
    }

    // 剔除已经填写过日志的记录（不需要重复填写）
    function removeDuplicates(pastItemsOnlyPlanDetail, completedLogs) {
      // 用来比较两个对象是否重复的辅助函数
      const isDuplicate = (planItem, logItem) => {
        // 判断 planItem.THEORY_TEACHING_DATE 是否存在
        if (planItem.THEORY_TEACHING_DATE) {
          return planItem.THEORY_TEACHING_DATE === logItem.TEACHING_DATE && planItem.SECTION_ID === logItem.SECTION_ID;
        }

        // 如果 THEORY_TEACHING_DATE 不存在，则比较 PRACTICE_TEACHING_DATE
        if (planItem.PRACTICE_TEACHING_DATE) {
          return planItem.PRACTICE_TEACHING_DATE === logItem.TEACHING_DATE && planItem.SECTION_ID === logItem.SECTION_ID;
        }
        // 如果两个都不存在，抛出错误
        throw new Error('抓取的数据未提供理论课程日期或实训课程日期，流程中止。');
      };


      // 遍历 completedLogs 并检查是否在 pastItemsOnlyPlanDetail 中有对应项
      for (let i = completedLogs.length - 1; i >= 0; i--) {
        const logItem = completedLogs[i];
        const index = pastItemsOnlyPlanDetail.findIndex(planItem => isDuplicate(planItem, logItem));

        if (index !== -1) {
          pastItemsOnlyPlanDetail.splice(index, 1); // 从 pastItemsOnlyPlanDetail 删除对应项
          completedLogs.splice(i, 1); // 从 completedLogs 删除当前项
        }
      }

      return pastItemsOnlyPlanDetail;
    }

    // 将数组的每一项中的 SECTION_ID 中的每个数字按从小到大的顺序排列，并保持字符串格式
    function sortSectionIds(array) {
      return array.map(item => {
        const sectionId = item.SECTION_ID;

        // 如果 SECTION_ID 为 null 或 undefined，直接返回
        if (sectionId == null) {
          return { ...item, SECTION_ID: sectionId };
        }

        // 如果 SECTION_ID 只有一个值，不进行排序，原样返回
        const sectionIdArray = sectionId.split(',');
        if (sectionIdArray.length === 1) {
          return { ...item, SECTION_ID: sectionId };
        }

        // 如果有多个值，进行排序并拼接成字符串
        const sortedSectionId = sectionIdArray
          .map(Number) // 转为数字
          .sort((a, b) => a - b) // 从小到大排序
          .map(String) // 转回字符串
          .join(','); // 拼接成逗号分隔的字符串

        return { ...item, SECTION_ID: sortedSectionId };
      });
    }

    // 将 SECTION_NAME 中的每个中文数字，按从小到大排序
    function sortSectionName(sectionName) {
      // 将 section_name 转换成数组
      // console.log(sectionName);
      const names = sectionName.split(',');

      // 定义中文数字的顺序
      const chineseNumbers = [ '一', '二', '三', '四', '五', '六', '七', '八', '九', '十' ];

      // 按中文数字顺序对 names 进行排序
      names.sort((a, b) => {
        const indexA = chineseNumbers.indexOf(a[1]); // 获取中文数字的位置（跳过"第"字）
        const indexB = chineseNumbers.indexOf(b[1]);
        return indexA - indexB;
      });

      // 将排序后的 names 合并回字符串
      const sortedSectionName = names.join(',');

      return sortedSectionName;
    }

    // 清理教学计划列表 curriPlanList
    function cleanCurriPlanListData(dataArray) {
      return dataArray.map(curriPlanList => ({
        curriPlanId: curriPlanList.LECTURE_PLAN_ID,
        weeklyHours: curriPlanList.WEEKLY_HOURS,
        className: curriPlanList.CLASS_NAME,
        courseName: curriPlanList.COURSE_NAME,
        schoolYear: curriPlanList.SCHOOL_YEAR,
        semester: curriPlanList.SEMESTER,
        teachingWeeksCount: curriPlanList.WEEK_COUNT,
        teachingWeeksRange: curriPlanList.WEEK_NUMBER_SIMPSTR,
        reviewStatus: curriPlanList.SSS002NAME,
      }));
    }

    function cleanCurriDetailsData(dataArray) {
      return dataArray.map(curriDetails => ({
        teaching_class_id: curriDetails.teaching_class_id,
        // 理论教学时间，实践教学时间
        teaching_date: curriDetails.THEORY_TEACHING_DATE || curriDetails.PRACTICE_TEACHING_DATE,
        week_number: curriDetails.WEEK_NUMBER.toString(),
        day_of_week: curriDetails.DAY_OF_WEEK.toString(),
        lesson_hours: curriDetails.LESSON_HOURS,
        course_content: curriDetails.TEACHING_CHAPTER_CONTENT,
        homework_assignment: curriDetails.HOMEWORK,
        topic_record: '良好',
        section_id: curriDetails.SECTION_ID,
        section_name: curriDetails.SECTION_NAME !== null ? sortSectionName(curriDetails.SECTION_NAME) : curriDetails.SECTION_NAME,
        // 理论是1，实践是2，如果得不到准确的值，就主动报错
        journal_type: curriDetails.THEORY_TEACHING_DATE ? 1 : (curriDetails.PRACTICE_TEACHING_DATE ? 2 : null),
        className: curriDetails.className,
        courseName: curriDetails.courseName,
      }));
    }

    try {
      const curriPlanList = await this.getCurriPlanListSSTS({ JSESSIONID_A, userId, token });

      const delay = Math.floor(100 + Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, delay));

      const teachingLogOverview = await this.getTeachingLogOverviewSSTS({ JSESSIONID_A, userId, token });

      // 清洗计划列表数据，仅保留有效数据后排序
      // LECTURE_PLAN_ID    被后台接口用于获取计划详情时区分课程
      // 下面这个神奇的字段按照分析也能用于区分课程，计划、日志中均有出现，但不知为何仅提交不使用
      // TEACHING_CLASS_ID
      const curriPlanIds = curriPlanList
        .map(item => ({
          planId: item.LECTURE_PLAN_ID,
          teachingClassId: item.TEACHING_CLASS_ID,
          className: item.CLASS_NAME,
          courseName: item.COURSE_NAME,
        }))
        .sort((a, b) =>
          a.teachingClassId.localeCompare(b.teachingClassId)
        );

      // 清洗日志列表数据，仅保留有效数据后排序
      // 后台接口用于获取日志详情时区分课程，！需要特别注意的是！如果从未填过日志，值是 null
      // LECTURE_JOURNAL_ID
      // 下面这个神奇的字段按照分析也能用于区分课程，计划、日志中均有出现，但不知为何仅提交不使用
      // TEACHING_CLASS_ID
      const teachingLogIds = teachingLogOverview
        .map(item => ({
          logId: item.LECTURE_JOURNAL_ID,
          teachingClassId: item.TEACHING_CLASS_ID,
        }))
        .sort((a, b) =>
          a.teachingClassId.localeCompare(b.teachingClassId)
        );

      // 一个存放所有需填写日志的计划详情列表
      const allCurriDetails = [];

      // 获取 yyyy-mm-dd 格式的时间对象，并设置为东八区 0 点
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // 按课程取出计划，并进一步清洗无效数据
      for (const [ index, planIds ] of curriPlanIds.entries()) {
        // 临时代码，查看指定课程
        // if (planIds.planId !== '40349a5691c17ed70191c4c3ee1e036a') {
        //   continue;
        // }

        // 首先获取的是对应 planIds 这门课的所有的教学计划详情
        const planDetail = await this.getCurriPlanDetailSSTS({ JSESSIONID_A, planId: planIds.planId, token });
        // console.log(planDetail);
        // 把详情中包含了当天的所有已经上过的课程都选出来
        let pastItemsOnlyPlanDetail = filterPastDateCurriculums({ tomorrow, planDetail });
        pastItemsOnlyPlanDetail = sortSectionIds(pastItemsOnlyPlanDetail);
        // 继续剔除已经填过日志的课程
        // 如果没写过日志，当然不用剔除任何内容
        // console.log(pastItemsOnlyPlanDetail.length);
        let cleanedData = [];
        if (teachingLogIds[index].logId != null) {
          // 否则，根据 teaching_class_id 获取日志内容
          const teachingClassId = teachingLogIds[index].teachingClassId;
          let completedLogs = await this.getTeachingLogListSSTS({ JSESSIONID_A, teachingClassId, token });
          completedLogs = sortSectionIds(completedLogs);

          // console.log('仅保留已经上过课的 json 数组');
          // console.log(pastItemsOnlyPlanDetail[0]);
          // console.log('已完成日志填写的 json 数组');
          // console.log(completedLogs);
          // 继续清洗只保留了上过课的日志详情列表，将已经填写过的日志剔除
          cleanedData = removeDuplicates(pastItemsOnlyPlanDetail, completedLogs);
        } else {
          cleanedData = pastItemsOnlyPlanDetail;
        }

        // console.log(planIds);
        // 为清洗后的数组的每一项都加上 teaching_class_id 以及课程名，班级名等冗余数据。
        cleanedData.forEach(item => {
          item.teaching_class_id = planIds.teachingClassId;
          item.className = planIds.className;
          item.courseName = planIds.courseName;
        });

        // console.log(index, cleanedData.length);
        allCurriDetails.push(...cleanedData);

        // break;
      }
      // 将需要填写的日志，按 THEORY_TEACHING_DATE 进行升序排序
      allCurriDetails.sort(function(a, b) {
        // 首先按 THEORY_TEACHING_DATE 升序排序
        const dateDifference = new Date(a.THEORY_TEACHING_DATE) - new Date(b.THEORY_TEACHING_DATE);
        if (dateDifference !== 0) {
          return dateDifference;
        }

        // 如果 THEORY_TEACHING_DATE 相同，则按 SECTION_ID 首位字符进行排序
        const sectionA = parseInt(a.SECTION_ID.split(',')[0], 10);
        const sectionB = parseInt(b.SECTION_ID.split(',')[0], 10);

        return sectionA - sectionB;
      });
      // console.log('清理数据后，需要填写日志的 json 数组');
      // console.log(allCurriDetails[0]);
      const planList = cleanCurriPlanListData(curriPlanList);
      const curriDetails = cleanCurriDetailsData(allCurriDetails);
      const curriPlan = {
        planList,
        curriDetails,
      };

      return curriPlan;
    } catch (error) {
      // 上述操作的任何一步出错都会被这里收纳
      this.ctx.throw(error);
    }

    // 这个 return 不会被访问，仅保留做若有后续修改必要的提示
    // return false;
  }

  // 第一步: 获取计划列表
  async getCurriPlanListSSTS({ JSESSIONID_A, userId = '', token, deptId = '' }) {
    // console.log(JSESSIONID_A, userId);
    // 教务系统需要单独的 token
    // eslint-disable-next-line no-unused-vars
    // const jiaoWuToken = await this.ctx.service.mySSTS.myLogin.getRefreshToken({ token, JSESSIONID_A, refreshToken });
    // 一个新的后缀形式 f7bd74325.472074168508
    // 生成 8 位 16 进制随机字符串
    const randomHex = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
      // 生成 0 到 1 之间的随机浮点数字符串，并截取小数点后 13 位
    const randomFloat = Math.random().toFixed(13).slice(2); // slice(1) 移除前面的 "0"
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Plan_Edit${randomHex}.${randomFloat}`;

    // 设定请求头
    const headers = {
      Accept: 'text/plain, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      Authorization: `Bearer ${token}`,
      'Content-Length': '320',
      'Content-Type': 'application/json;charset=UTF-8',
      // 试验证明 SzmeSite=None; SzmeSite=None; 无意义，此处留作参考
      Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      'Proxy-Connection': 'keep-alive',
      Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0901/EA090102',
      'Service-Type': 'Microservices',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };
      // console.log(userId);
      // 加密前的 payload 信息
    const plainTextData = {
      take: 100,
      skip: 0,
      page: 1,
      pageSize: 300,
      group: [],
      // 可笑，这个字段是无效的
      queryNo: 'Q_EA_Lecture_Plan_Edit',
      queryWindow: '1',
      connectId: '1',
      whereParams: {
        number: '1',
        /** 注意此处的 teacher_id 和 userId，
         *  都可以从 SSTS 获得数据
         *  显然是存放了冗余数据的不同字段
         */
        // teacher_id: '2304',
        userId,
        school_year: '2024',
        semester: '2',
        orgid: deptId, // string
        course_id: '',
      },
    };

    // 加密 payload
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);
    // console.log(payload);
    // const payload2 = 'hTcOK7xIDf4AKm1YZzIgjScs91EN0Ry5DOLrTDVQleiMycZKiOcymG85digViykkHomhpIW4gbmG1VinPEOZcXZtY/A0LK2HhXavtYK2YkunidQ3uteIYNhFeQJsl6E587vot4y5H5cp/w5ouWQMCCllI2MmewFV/FSjb0vA3qEF1KENZ3Igi8qATI7keV4rKp9vpJ+2t6+htprUDHVkFdOE8EwULaA2tURvLPgb40ZzViJN+eWReT1+gYt4G6YnTn9ydyJRK6W8lpdi6shI5/OomMkKqbPcmSA8tS/T2nMzIDjXhHpAAzl0BvNi9U96';
    // console.log(payload2);

    let response = {};
    try {
      // 发送请求
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
        timeout: 30000,
      });
      // console.log(response.data.toString());
    } catch (error) {
      // this.ctx.logger.error('token 刷新:', error.message);
      throw error;
    }

    // response 是校园网的反馈
    // decodedData 是 reponse 中有效数据解码后的内容
    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
    // console.log(decodedData.data);
    // 此处的错误不能像登录功能一样，简单的用 decodedCode.code  来判断是否成功反馈
    // 因为反馈信息中根本不包含这一项，这是由于校园网没有一套统一的错误报告和处理流程造成的
    // 我这里选择用 decodedData.data[] 这个保存了教学计划信息的数组是否存在
    // 存在的话，长度是否大于 0 来判断返回是否正确

    if (decodedData.data.length < 1) {
      // this.ctx.throw(500, '教学计划为空或学期设置有误，计划获取失败');
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      // 解码后的数据中，也会包含错误，这就是一个==解码后==的错误示例
      const errorResponse = { code: 400, msg: '教学计划为空或学期设置有误，获取计划列表失败' };
      // 但也要考虑不符合上述示例的校园网错误反馈
      await errorHandler.handleScrapingError(errorResponse);
    }

    return decodedData.data;
  }

  // 第二步： 获取计划详情
  async getCurriPlanDetailSSTS({ JSESSIONID_A, planId, token }) {
    const randomHex = Array.from({ length: 9 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    // 生成 0 到 1 之间的随机浮点数字符串，并截取小数点后 13 位
    const randomFloat = Math.random().toFixed(13).slice(2); // slice(1) 移除前面的 "0"
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Plan_Detail${randomHex}.${randomFloat}`;

    // 设定请求头
    const headers = {
      Accept: 'text/plain, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      Authorization: `Bearer ${token}`,
      'Content-Length': '280',
      'Content-Type': 'application/json;charset=UTF-8',
      // 试验证明 SzmeSite=None; SzmeSite=None; 无意义，此处留作参考
      Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      'Proxy-Connection': 'keep-alive',
      Referer: `http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090101/index?lecture_plan_id=${planId}`, // &course_category=1&course_name=1031114G%E4%BF%A1%E6%81%AF%E6%A3%80%E7%B4%A2&class_name=%E4%BF%A1%E6%81%AF2404%E7%8F%AD,%E4%BF%A1%E6%81%AF2405%E7%8F%AD&teacher_name=%E5%8D%9C%E5%BC%BA&course_class=1`,
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 加密前的 payload 信息
    const plainTextData = {
      take: 100,
      skip: 0,
      page: 1,
      pageSize: 100,
      group: [],
      queryNo: 'Q_EA_Lecture_Plan_Detail',
      queryWindow: '1',
      connectId: '1',
      whereParams: {
        lecture_plan_id: planId,
      },
    };

    // 加密 payload
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);
    let response = {};
    try {
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
        timeout: 30000,
      });
    } catch (error) {
      // 仅反应网络或服务器错误
      throw error;
    }

    // 解密 response
    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    // 由于这个函数会在循环中执行
    // 为避免意外并发影响校园网服务器工作，
    // 每次成功查询数据后，随机延时 100 到 200 毫秒
    const delay = Math.floor(100 + Math.random() * 100);
    await new Promise(resolve => setTimeout(resolve, delay));

    // 此处应有更多的健壮性设计，如读取日志详情从校园网端返回了非正常数据的处理
    // 但由于校园网端从未在此处返回过非正常数据，样本太少，暂时留空
    // this.ctx.logger.error('获取日志详情报错:', error.message);

    return decodedData.data;
  }

  // 第三步：获取可填写日志概览
  async getTeachingLogOverviewSSTS({ JSESSIONID_A, userId, token }) {
    try {
      // 生成 8 位 16 进制随机字符串
      const randomHex = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      // 生成 0 到 1 之间的随机浮点数字符串，并截取小数点后 13 位
      const randomFloat = Math.random().toFixed(13).slice(2); // slice(1) 移除前面的 "0"
      const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Journal_Course${randomHex}.${randomFloat}`;

      // 设定请求头
      const headers = {
        Accept: 'text/plain, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        Authorization: `Bearer ${token}`,
        'Content-Length': '280',
        'Content-Type': 'application/json;charset=UTF-8',
        // 试验证明 SzmeSite=None; SzmeSite=None; 无意义，此处留作参考
        Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
        DNT: '1',
        Host: '2.46.215.2:18000',
        Origin: 'http://2.46.215.2:18000',
        'Proxy-Connection': 'keep-alive',
        Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0902/EA090201',
        // 'Service-Type': 'Microservices',
        'User-Agent': this.ctx.request.headers['user-agent'],
      };
      // 加密前的 payload 信息
      const plainTextData = {
        take: 100,
        skip: 0,
        page: 1,
        pageSize: 100,
        group: [],
        // 可笑，这个字段是无效的
        queryNo: 'Q_EA_Lecture_Journal_Course',
        queryWindow: '1',
        connectId: '1',
        whereParams: {
          userId,
          school_year: '2024',
          semester: '2',
        },
      };

      const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

      const response = await this.ctx.curl(url, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
        timeout: 30000,
      });

      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
      return data.data;
    } catch (error) {
      // this.ctx.logger.error('token 刷新:', error.message);
      throw error;
    }
  }

  // 第四步：获取某课程已填写日志详情
  async getTeachingLogListSSTS({ JSESSIONID_A, teachingClassId, token }) {

    const randomHex = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    // 生成 0 到 1 之间的随机浮点数字符串，并截取小数点后 13 位
    const randomFloat = Math.random().toFixed(13).slice(2); // slice(1) 移除前面的 "0"
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Journal_List${randomHex}.${randomFloat}`;

    // 设定请求头
    const headers = {
      Accept: 'text/plain, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      Authorization: `Bearer ${token}`,
      'Content-Length': '280',
      'Content-Type': 'application/json;charset=UTF-8',
      // 试验证明 SzmeSite=None; SzmeSite=None; 无意义，此处留作参考
      Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      'Proxy-Connection': 'keep-alive',
      Referer: `http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090201/index?teaching_class_id=${teachingClassId}`,
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 加密前的 payload 信息
    const plainTextData = {
      take: 100,
      skip: 0,
      page: 1,
      pageSize: 100,
      group: [],
      queryNo: 'Q_EA_Lecture_Journal_List',
      queryWindow: '1',
      connectId: '1',
      whereParams: {
        teaching_class_id: teachingClassId,
      },
    };

    try {
      // 加密 payload
      const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

      const response = await this.ctx.curl(url, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
        timeout: 30000,
      });

      // 解密 response
      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

      // 由于这个函数会在循环中执行
      // 为避免意外并发影响校园网服务器工作，
      // 每次成功查询数据后，随机延时 100 到 200 毫秒
      const delay = Math.floor(100 + Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, delay));

      return data.data;
    } catch (error) {
      this.ctx.logger.error('获取单课程日志列表报错:', error.message);
      throw error;
    }
  }

  // 第五步：把计划保存到校园网, 参数太多了，就不直接析构了
  async submitTeachingLog(teachingLogInput) {
    const { teachingLogData, JSESSIONID_A, token } = teachingLogInput;
    console.log(teachingLogInput);

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

    const completeTeachingLogData = {};
    for (const key in templateData) {
      completeTeachingLogData[key] = teachingLogData.hasOwnProperty(key) ? teachingLogData[key] : templateData[key];
    }
    // console.log(completeTeachingLogData);
    // console.log(JSESSIONID_A, token);

    const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
    const saveLectureJournalDetailUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/educationaffairsmgmt/teachingdailymgmt/lectureJournalDetail.action?frameControlSubmitFunction=saveLectureJournalDetail&winTemp=${winTemp}`;

    // 设定请求头
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      Authorization: `Bearer ${token}`,
      // 'Content-Length': '24',
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      'Proxy-Connection': 'keep-alive',
      Referer: 'http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090201/index',
      'Service-Type': 'Microservices',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 加密 payload
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(completeTeachingLogData);

    let response = {};
    try {
      response = await this.ctx.curl(saveLectureJournalDetailUrl, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
        timeout: 30000,
      });
    } catch (error) {
      // this.ctx.logger.error('提交日志出错:', error.message);
      // 仅处理服务器或网络连接出错
      throw error;
    }

    // 解密 response
    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    const { success, msg } = decodedData;
    const errorResponse = msg ?
      decodedData :
      { code: 400, msg: '教学日志提交时出错，成因复杂，请联系管理员排错。', success: false };

    if (!success) {
      console.log('---------教学日志提交出错---------');
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      await errorHandler.handleScrapingError(errorResponse);
    }

    return decodedData.data;

  }
}

module.exports = MyCurriPlanService;
