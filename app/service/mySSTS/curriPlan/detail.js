// app/service/mySSTS/curriPlan/detail.js
'use strict';

const Service = require('egg').Service;

/**
 * 教学计划详情服务
 * 获取指定 planId 的课程安排细节
 */
class CurriPlanDetailService extends Service {
  async getCurriPlanDetail({ JSESSIONID_A, planId, token }) {
    const randomHex = Array.from({ length: 9 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomFloat = Math.random().toFixed(13).slice(2);
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Plan_Detail${randomHex}.${randomFloat}`;

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
      Referer: `http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090101/index?lecture_plan_id=${planId}`,
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

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
    // console.log('CurriPlanDetail Response:', decodedData);

    // 加强健壮性：如有返回但为空，不中止流程，但警告日志可加（当前不处理）
    await new Promise(resolve => setTimeout(resolve, Math.floor(100 + Math.random() * 100)));

    return decodedData.data;
  }
}

module.exports = CurriPlanDetailService;
