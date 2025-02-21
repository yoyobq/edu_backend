'use strict';

const Service = require('egg').Service;
// GraphQL 的错误生成已交给 errorHandler
// const { GraphQLError } = require('graphql');

class MyLoginService extends Service {
  /**
   * 登录请求
   * @param {object} params - 包含所有参数的对象。
   * @param {string} params.userId - 用户 ID
   * @param {string} params.password - 用户密码
   * @return {Promise<object>} - 返回包含登录状态和 cookie 的对象
   */
  async loginToSSTS({ userId, password }) {

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
    // console.log(typeof payload);
    // console.log(payload);
    // console.log(payload.length);

    let response = {};

    try {
      response = await this.ctx.curl(loginUrlCurl, {
        method: 'POST',
        data: payload, // 请求体内容
        headers, // 自定义请求头
        dataType: 'string', // 设置返回数据类型为
        timeout: 10000,
        // withCredentials: true, // 开启跨域时发送凭证
      });
    } catch (error) {
      // 这个 try catch 结构，只负责处理对方服务器失效时的错误处理，
      // 可能的错误种类很多，但我们这里不继续甄别了，向用户统一报错
      this.ctx.throw(502, '校园网宕机，或网络错误，请稍后再试');
    }

    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());
    // 这是解码后的正确数据示例
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

    if (decodedData.code !== 200) {
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      // 解码后的数据中，也会包含错误，这就是一个==解码后==的错误示例
      // { code: 400, msg: '用户名密码错！', success: false }
      // 但也要考虑不符合上述示例的校园网错误反馈
      await errorHandler.handleScrapingError(decodedData);
    }

    if (decodedData.code === 200) {
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

      // console.log(data.data);

      if (jsessionCookie && decodedData.data.token) {
        console.log('JSESSIONID_A:', jsessionId);
        console.log('token:', decodedData.data.token, '登录成功');
        // 这是一个正确的 session
        //  JSESSIONID_A=PAUvuZrwO1bvH7dI9LGB1k6xHxXu566i4be4vodC.ecs-b00c-0004

        const userInfo = await this.getUserInfoSSTS({
          token: decodedData.data.token,
          JSESSIONID_A: jsessionId,
        });

        // console.log(data.data);
        const jiaoWuToken = await this.getRefreshToken({
          token: decodedData.data.token,
          JSESSIONID_A: jsessionId,
          refreshToken: decodedData.data.refreshToken,
        });

        // 根据 graphql 接口定义返回有效数据以便后续使用
        const sstsLoginResponse = {
          success: true,
          cookie: decodedData.data,
          jsessionCookie,
          userInfo,
          refreshedToken: jiaoWuToken,
        };

        return sstsLoginResponse;
      }
    }

    // 这是旧的处理机制，现在已经交给了 this.ctx.service.mySSTS.errorHandler
    // 保留一段时间后再删除
    // switch (data.code) {
    //   case 400:
    //   default: throw new GraphQLError(`校园网反馈错误：${data.msg}`, {
    //     extensions: {
    //       code: 'SSTS_SUCCESS_ERROR',
    //       showType: 2,
    //     },
    //   });
    // }
  }

  /**
   * 获取用户信息请求
   * @param {object} params - 包含所有参数的对象。
   * @param {string} params.token - Bearer Token
   * @param {string} params.JSESSIONID_A - JSESSIONID_A Cookie
   * @return {Promise<object>} - 返回原始响应数据
   */
  async getUserInfoSSTS({ token, JSESSIONID_A }) {
    try {
      // 定义获取用户信息的 URL 和请求头
      const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
      const userInfoUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/systemmanagement/usermanagement/user/usermanagement.action?frameControlSubmitFunction=getUserInfo&winTemp=${winTemp}`;

      // 设定请求头
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        Authorization: `Bearer ${token}`,
        'Content-Length': '24',
        'Content-Type': 'application/json;charset=UTF-8',
        Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
        DNT: '1',
        Host: '2.46.215.2:18000',
        Origin: 'http://2.46.215.2:18000',
        'Proxy-Connection': 'keep-alive',
        Referer: 'http://2.46.215.2:18000/jgyx-ui/login',
        'Service-Type': 'Microservices',
        'User-Agent': this.ctx.request.headers['user-agent'],
      };

      const payload = 'gnTbJES+r4H6qtFUmlSzpw==';

      // 发送请求
      const response = await this.ctx.curl(userInfoUrl, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'json', // 设置返回数据类型为 JSON
        withCredentials: true, // 发送凭证（Cookie）
      });

      const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

      return data.data;
    } catch (error) {
      this.ctx.logger.error('获取用户信息请求失败:', error.message);
      throw error;
    }
  }

  /**
   * refresh token 请求
   * @param {object} params - 包含所有参数的对象。
   * @param {string} params.token - Bearer Token
   * @param {string} params.JSESSIONID_A - JSESSIONID_A Cookie
   * @param {string} params.refreshToken - 请求刷新 token 的 refreshToken
   * @return {Promise<object>} - token 字符串
   */
  async getRefreshToken({ token, JSESSIONID_A, refreshToken }) {

    const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
    const userAgent = this.ctx.request.headers['user-agent'];

    // 严格的说，目前只支持登录【教务系统】这个分支时候的 refresh token
    // 后期只要替换这个 Url 或某个其他关键信息，就可以解锁其他分支，目前懒得分析
    const refreshUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/login/loginByRefreshToken.action?frameControlSubmitFunction=getTokenId&winTemp=${winTemp}`;
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
      Authorization: `Bearer ${token}`,
      'Content-Length': 108,
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      Referer: `http://2.46.215.2:18000/jgyx-ui//wel/index?refreshToken=${refreshToken}&systemType=menu-root&rootMenuNo=EA`,
      'Service-Type': 'Microservices',
      'User-Agent': userAgent,
    };

    // 加密前的 payload 信息
    const plainTextData = {
      grant_type: 'refreshtoken',
      refreshToken, // Use the provided refreshToken variable here
    };

    // 加密 payload
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

    let response = {};
    try {
      // 获取数据
      response = await this.ctx.curl(refreshUrl, {
        method: 'POST',
        data: payload,
        headers,
        dataType: 'string',
        withCredentials: true,
        timeout: 10000,
      });
    } catch (error) {
      this.ctx.throw(502, '校园网宕机，或网络错误，请稍后再试');
    }

    const decodedData = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    if (decodedData.code !== 200) {
      const errorHandler = this.ctx.service.mySSTS.errorHandler;
      await errorHandler.handleScrapingError(decodedData);
    }

    if (decodedData.code === 200) {
      // refresh toekn 不更新 cookie
      console.log('token:', decodedData.data.token, '教务页面 token 刷新成功');
      return decodedData.data.token;
    }
  }


  /**
   * !!!!! 此代码作废 refresh session 并不是一个主动操作
   * !!!!! 而是服务器发现携带的 session 过期就会触发的更新
   * refresh session 请求
   * @param {object} params - 包含所有参数的对象。
   * @param {string} params.token - Bearer Token
   * @param {string} params.JSESSIONID_A - JSESSIONID_A Cookie
   * @return {Promise<object>} - token 字符串
   */
  async getRefreshSession({ token, JSESSIONID_A }) {
    console.log('开始获取  session -----------------------------------session');
    console.log(token);
    console.log(JSESSIONID_A);
    try {
      const winTemp = `${Math.floor(Math.random() * 100000)}.${(Math.random()).toFixed(13).slice(2)}`;
      const userAgent = this.ctx.request.headers['user-agent'];

      // 严格的说，目前只支持登录【教务系统】这个分支时候的 refresh token
      // 后期只要替换这个 Url 或某个其他关键信息，就可以解锁其他分支，目前懒得分析
      const refreshUrl = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=config&winTemp=${winTemp}`;
      const headers = {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5',
        Authorization: `Bearer ${token}`,
        'Content-Length': 236,
        'Content-Type': 'application/json;charset=UTF-8',
        Cookie: `SzmeSite=None; SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
        DNT: '1',
        Host: '2.46.215.2:18000',
        Origin: 'http://2.46.215.2:18000',
        'Proxy-Connection': 'keep-alive',
        Referer: 'http://2.46.215.2:18000/jgyx-ui/EA09/EA0901/EA090102',
        'Service-Type': 'Microservices',
        'User-Agent': userAgent,
      };

      const payload = 'eaZ4oUMbgx6/8IrBiMNzTwurVNfFHPpcqlmoOZZURb7PeMxUXs4pxTpS6IMU4vT3xeiCiBt7fQELyySoR5rXLiu6DKaUb7z/nmjeQfFy2ASqO3n6VtRhVLRRWgQQqPRslilkBwNJOgetxlKo9ofbgo3vH6VDUp5DPyVDfO6SHmX1JVcNCK8RWqi2j/ZyI6w3+qvpaSlZQaVoRWeVjpRwwk5vlPgkGIAmj2BiEpZR6mY=';
      // 负载解码示例，是一段固定数据
      // {"widgetUid":"EF_PageGrid_Q_EA_Lecture_Plan_Edit_1_0","queryNo":"Q_EA_Lecture_Plan_Edit","queryWindow":"1","connectId":"1","showType":"0","pageSize":20,"editable":false}

      const response = await this.ctx.curl(refreshUrl, {
        method: 'POST',
        data: payload,
        headers,
        dataType: 'string',
        withCredentials: true,
        timeout: 10000,
      });
      console.log(response.headers['set-cookie']);
      console.log(response);

      return false;
    } catch (error) {
      console.log(error);
      this.ctx.logger.error('refresh token 失败:', error.message);
      throw error;
    }
  }
}

module.exports = MyLoginService;


// 1 访问页面 http://2.46.215.2:18000/jgyx-ui//wel/index?refreshToken=c556c4ca67d2495794dfa8e3e5c259b7&systemType=menu-root&rootMenuNo=EA
// 2 访问页面 http://2.46.215.2:18000/jgyx-ui/jgyx/login/loginByRefreshToken.action?frameControlSubmitFunction=getTokenId&winTemp=7771.126528272789
//   payload: {"grant_type":"refreshtoken","refreshToken":"1ad6d9b7b34d4877835118432e9b55b5"}
//   respone: {"code":200,"data":{"expiresIn":29610,"refreshToken":"f1fd9001f0fd46f9ab4b69be395fff3d","token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaWduIjoie1widG9rZW5JZFwiOlwiNDAzNDlhNTY5MmVjMGEwYjAxOTJlZDlhNDM0YTAwOTlcIixcInVzZXJJZFwiOlwiMjIyNlwifSIsImV4cCI6MTczMDYwNTQ2Mn0.A2LyaU56CtMRekt6yJmkScK9Vy8TfAtTSDuB2c14V20","tokenHead":"Bearer "},"msg":"操 作成功","success":true}
// 3 再去要了一次 userInfo
// 4

// {
//   "expiresIn": 29610,
//   "refreshToken": "6a1a814160564814abdabed6934e5a1f",
//   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaWduIjoie1widG9rZW5JZFwiOlwiNDAzNDlhNTY5MmVjMGEwYjAxOTJlZGEwMTY3NDAwOWNcIixcInVzZXJJZFwiOlwiMjIyNlwifSIsImV4cCI6MTczMDYwNTg0NH0.REB_5W2KT-kJ4cjGlxlv3CAKhgfj-ENBTyPdjzRWyao",
//   "tokenHead": "Bearer "
// }


// 3 问这个页面要 session 更新 http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=config&winTemp=8187.329293712982
//   拿着新拿到的 token 找这个站点要 set-cookie:
//  JSESSIONID_A=cMhpdxQj3dU6-K-RTyGDzJPI6L5VsPSH-27PzxNs.ecs-b00c-0004; path=/; HttpOnly; Max-Age=3600; Expires=Sat, 02-Nov-2024 19:12:38 GMT
// tmd 这个站点一文不值
