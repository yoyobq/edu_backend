// app/service/mySSTS/teachingLog/overview.js
'use strict';

const Service = require('egg').Service;

/**
 * 获取教学日志概览信息（课程级别，不含具体节次）
 */
class TeachingLogOverviewService extends Service {
  async getTeachingLogOverview({ JSESSIONID_A, userId, token }) {
    const randomHex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomFloat = Math.random().toFixed(13).slice(2);
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Journal_Course${randomHex}.${randomFloat}`;

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
      Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0902/EA090201',
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    const plainTextData = {
      take: 100,
      skip: 0,
      page: 1,
      pageSize: 100,
      group: [],
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
      headers,
      data: payload,
      dataType: 'string',
      timeout: 30000,
    });

    const decoded = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
    // console.log(decoded.data);
    return decoded.data;
  }
}

module.exports = TeachingLogOverviewService;
