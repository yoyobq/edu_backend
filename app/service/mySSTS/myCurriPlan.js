'use strict';

const Service = require('egg').Service;

class MyCurriPlanService extends Service {
  async getCurriPlanSSTS({ token, JSESSIONID_A, refreshToken }) {
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


    // try {
    //   console.log(token, JSESSIONID_A);
    //   // 定义获取用户信息的 URL 和请求头

    //   return data;
    // } catch (error) {
    //   this.ctx.logger.error('获取信息请求失败:', error.message);
    //   throw error;
    // }
  }
}

module.exports = MyCurriPlanService;
