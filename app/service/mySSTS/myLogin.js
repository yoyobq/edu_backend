'use strict';

const Service = require('egg').Service;

class MyLoginService extends Service {

  /**
   * 登录请求
   * @param {object} params - 包含所有参数的对象。
   * @param {string} params.userId - 用户 ID
   * @param {string} params.password - 用户密码
   * @return {Promise<object>} - 返回包含登录状态和 cookie 的对象
   */
  async loginToSSTS({ userId, password }) {
    try {
      // 定义登录请求的 URL 和请求头
      // 生成随机的 `winTemp` 参数，格式为 "整数.小数"
      const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;

      const userAgent = this.ctx.request.headers['user-agent'];

      const loginUrlCurl = `http://2.46.215.2:18000/jgyx-ui//jgyx/login/token.action?frameControlSubmitFunction=getTokenId&winTemp=${winTemp}`;
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        'Content-Type': 'application/json;charset=UTF-8',
        Cookie: 'SzmeSite=None',
        DNT: '1',
        Host: '2.46.215.2:18000',
        Origin: 'http://2.46.215.2:18000',
        Referer: 'http://2.46.215.2:18000/jgyx-ui/login',
        'Service-Type': 'Microservices',
        'User-Agent': userAgent,
      };

      const plainTextData = {
        grant_type: 'password',
        username: {
          loginType: '',
          userId,
          userName: userId,
          loginMethod: '0',
          extUserId: [],
        },
      };

      // 登录请求的负载数据
      const payload = await this.ctx.service.common.sstsCipher.encryptData(password, plainTextData);

      const response = await this.ctx.curl(loginUrlCurl, {
        method: 'POST',
        data: payload, // 请求体内容
        headers, // 自定义请求头
        dataType: 'string', // 设置返回数据类型为 JSON
        withCredentials: true, // 开启跨域时发送凭证
      });

      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
      // 这是解码后的示例
      // {
      //   code: 200,
      //   data: {
      //     expiresIn: 29610,
      //     refreshToken: 'ce2eb60817204004ad499c21e3881f79',
      //     token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaWduIjoie1widG9rZW5JZFwiOlwiNDAzNDlhNTY5MmUyODIzOTAxOTJlNTViOGVjNTE4YTBcIixcInVzZXJJZFwiOlwiMjIyNlwifSIsImV4cCI6MTczMDQ2NzEzNX0.CWoDVz4bPod83YBkTerrnO0D_BomXQdf2i5zllISfz0',
      //     tokenHead: 'Bearer '
      //   },
      //   msg: '操作成功',
      //   success: true
      // }


      const setCookieHeader = response.headers['set-cookie'];
      // 这是一个正确的 set-cookie 字段示例
      // [
      //   'SzmeSite=None',
      //   'JSESSIONID_A=d5gnYegmFDGjObiFg--j1Q7iws9sXGigXc9TXlXu.ecs-b00c-0004; path=/; HttpOnly; Max-Age=3600; Expires=Fri, 01-Nov-2024 02:33:55 GMT'
      // ]

      let jsessionId = '';
      let jsessionCookie = '';
      if (setCookieHeader) {
        jsessionCookie = setCookieHeader.find(cookie => cookie.startsWith('JSESSIONID_A='));
        if (jsessionCookie) {
          jsessionId = jsessionCookie.split(';')[0].split('=')[1]; // 提取 `JSESSIONID_A` 的值
        }
      }

      if (jsessionCookie && data.data.token) {
        console.log('JSESSIONID_A:', jsessionId);
        console.log('token:', data.data.token, '登录成功');
        // 这是一个正确的 session
        //  JSESSIONID_A=PAUvuZrwO1bvH7dI9LGB1k6xHxXu566i4be4vodC.ecs-b00c-0004
        // 根据 graphql 接口定义返回有效数据以便后续使用
        const sstsLoginResponse = {
          success: true,
          cookie: data.data,
          jsessionCookie,
        };
        return sstsLoginResponse;
      }

      console.log('未能从响应中获取有效信息，登录可能失败。');
      return { success: false };


    } catch (error) {
      this.ctx.logger.error('登录请求失败:', error.message);
      throw error;
    }
  }
}

module.exports = MyLoginService;
