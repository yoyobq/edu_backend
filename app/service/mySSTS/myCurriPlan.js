'use strict';

const Service = require('egg').Service;

class MyCurriPlanService extends Service {
  // 测试页面，仅用于测试获取数据是否正常
  async tryToGetCurriPlanSSTS({ token, JSESSIONID_A, refreshToken }) {
    try {
      // 教务系统需要单独的 token
      const jiaoWuToken = await this.ctx.service.mySSTS.myLogin.getRefreshToken({ token, JSESSIONID_A, refreshToken });
      console.log(token);
      console.log(JSESSIONID_A);
      console.log(jiaoWuToken);

      const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
      const userInfoUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/wechat/common/dictionary.action?frameControlSubmitFunction=loadDicItem&winTemp=${winTemp}`;
      console.log(winTemp);
      // 设定请求头
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        Authorization: `Bearer ${jiaoWuToken}`,
        'Content-Length': '88',
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
      console.log(headers);

      //  {"dicId":"DIC_SCHOOL_YEAR","dicListGroup":"","language":"1"} 测试用固定值
      const payload = 'MGgh34eOwjWzuq5uRDrwjxfXhWu2J88s4D6OGGda+K/okUNZ9lK5Q+jfNC1OAGO/IoIMbs5nVivliaq789u6eQ==';

      // 发送请求
      const response = await this.ctx.curl(userInfoUrl, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
      });

      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
      console.log(data);
      return false;
    } catch (error) {
      this.ctx.logger.error('token 刷新:', error.message);
      throw error;
    }
  }

  // eslint-disable-next-line no-unused-vars
  async getCurriPlanSSTS({ token, JSESSIONID_A, refreshToken, userId }) {
    console.log(JSESSIONID_A, userId);
    try {
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
      const userInfoUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Plan_Edit${randomHex}.${randomFloat}`;

      // 设定请求头
      const headers = {
        Accept: 'text/plain, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        // Authorization: `Bearer ${jiaoWuToken}`,
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
      console.log(userId);
      // 加密前的 payload 信息
      const plainTextData = {
        take: 100,
        skip: 0,
        page: 1,
        pageSize: 100,
        group: [],
        queryNo: 'Q_EA_Lecture_Plan_Edit',
        queryWindow: '1',
        connectId: '1',
        whereParams: {
          number: '1',
          userId,
          school_year: '2024',
          semester: '1',
          orgid: '',
          course_id: '',
        },
      };
      console.log(plainTextData);
      // 加密 payload
      const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);
      console.log(payload);
      const payload2 = 'hTcOK7xIDf4AKm1YZzIgjScs91EN0Ry5DOLrTDVQleiMycZKiOcymG85digViykkHomhpIW4gbmG1VinPEOZcXZtY/A0LK2HhXavtYK2YkunidQ3uteIYNhFeQJsl6E587vot4y5H5cp/w5ouWQMCCllI2MmewFV/FSjb0vA3qEF1KENZ3Igi8qATI7keV4rKp9vpJ+2t6+htprUDHVkFdOE8EwULaA2tURvLPgb40ZzViJN+eWReT1+gYt4G6YnTn9ydyJRK6W8lpdi6shI5/OomMkKqbPcmSA8tS/T2nMzIDjXhHpAAzl0BvNi9U96';
      console.log(payload2);
      // 发送请求
      const response = await this.ctx.curl(userInfoUrl, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        // withCredentials: true, // 发送凭证（Cookie）
      });

      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
      return data.data;
    } catch (error) {
      this.ctx.logger.error('token 刷新:', error.message);
      throw error;
    }
  }
}

module.exports = MyCurriPlanService;
