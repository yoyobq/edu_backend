// app/service/mySSTS/curriPlan/list.js
'use strict';

const Service = require('egg').Service;

/**
 * 教学计划列表服务
 * 负责访问校园网，获取教师对应的课程计划列表。
 */
class CurriPlanListService extends Service {
  async getCurriPlanList({ JSESSIONID_A, userId = '', token, deptId = '' }) {
    // 一个新的后缀形式 f7bd74325.472074168508
    const randomHex = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const randomFloat = Math.random().toFixed(13).slice(2);
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Plan_Edit${randomHex}.${randomFloat}`;

    const headers = {
      Accept: 'text/plain, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      // 'Proxy-Connection': 'keep-alive',
      Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0901/EA090102',
      'Service-Type': 'Microservices',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

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
        userId,
        school_year: '2025',
        semester: '1',
        orgid: deptId, // string
        course_id: '',
      },
    };

    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

    let response = {};
    try {
      // console.log('请求URL:', url);
      // console.log('请求Headers:', headers);
      // console.log('请求Payload:', JSON.stringify(plainTextData));
      // console.log('加密Payload:', payload);
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers,
        data: payload,
        dataType: 'string',
        timeout: 30000,
      });
      // console.log('CurriPlanList Response:', response.data.toString());
    } catch (err) {
      throw err;
    }

    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
    // 此处的错误不能像登录功能一样，简单的用 decodedCode.code  来判断是否成功反馈
    // 因为反馈信息中根本不包含这一项，这是由于校园网没有一套统一的错误报告和处理流程造成的
    // 我这里选择用 decodedData.data[] 这个保存了教学计划信息的数组是否存在
    // 存在的话，长度是否大于 0 来判断返回是否正确

    if (!decodedData.data || decodedData.data.length < 1) {
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      const errorResponse = { code: 400, msg: '教学计划为空或学期设置有误，获取计划列表失败' };
      await errorHandler.handleScrapingError(errorResponse);
    }

    return decodedData.data;
  }
}

module.exports = CurriPlanListService;
