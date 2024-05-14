'use strict';

const Service = require('egg').Service;
const cheerio = require('cheerio');
/* 23-3-18 Service 的职责是处理业务逻辑，它应该是抽象的，独立于任何数据源。 */
/* header 中合法的 cookie 是有字符串拼接的：
  headers {
    ...，
    cookie: 'iPlanetDirectoryPro=AQIC5wM2LY4Sfcxx5MK5Djqw2RSr0vLP8JtQK4hhxfc0L8o%3D%40AAJTSQACMDE%3D%23'
  }
*/

class myLogin extends Service {
  // 登录 my.ssts 获取 cookies
  login(ctx, user, password) {
    return new Promise(async (resolve, reject) => {
      // 登录接口地址
      const loginUrl = 'http://my.ssts.cn/userPasswordValidate.portal';
      let headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };
      // 登录表单数据
      const loginData = {
        'Login.Token1': user,
        'Login.Token2': password,
        goto: 'http://my.ssts.cn/loginSuccess.portal',
        gotoOnFail: 'http://my.ssts.cn/loginFailure.porta',
      };

      try {
        // 发送登录请求
        const response = await ctx.curl(loginUrl, {
          method: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          data: loginData,
          headers,
        });

        // 登录成功
        if (response.status === 200) {
          const cookies = response.headers['set-cookie'][0];
          headers = {
            ...headers,
            cookie: cookies.split(';')[0],
          };
          console.log('登录成功');
          resolve(headers);
        }
      } catch (error) {
        console.log(error);
        reject(new Error('获取cookie出错'));
      }
    });
  }

  // 测试是否登录成功
  getSessionId(ctx, headers) {
    return new Promise(async (resolve, reject) => {
      // const url = 'http://my.ssts.cn/index.portal';
      const url = 'http://my.ssts.cn/detachPage.portal?.pn=p52969_p52970';

      try {
        // 发送数据抓取请求
        const response = await ctx.curl(url, {
          method: 'GET',
          headers,
        });
        let newSession = response.headers['set-cookie'][0];
        if (newSession.startsWith('JSESSIONID')) {
          newSession = newSession.split(';')[0];
        }
        headers = {
          ...headers,
          cookie: newSession + ';' + headers.cookie,
        };
        console.log('Session 获取成功');
        resolve(headers);
      } catch (error) {
        console.log(error);
        reject(new Error('获取session出错'));
      }
    });
  }

  // 测试是否登录成功
  async getWelcomeStr(ctx, headers) {
    // 首页上获取欢迎字符串
    const url = 'http://my.ssts.cn/index.portal';
    try {
      console.log(headers);
      // 发送数据抓取请求
      const res = await ctx.curl(url, {
        method: 'GET',
        headers,
      });
      // 保留一个不使用 cheerio 时显示页面的方法
      // data: <Buffer 3c 21 44 4f 43 54 59 50 45 20 68 74 6d 6c 20 50 55 42 4c 49 43 20 22 2d 2f 2f 57 33 43 2f 2f 44 54 44 20 58 48 54 4d 4c 20 31 2e 30 20 54 72 61 6e 73 ... 19763 more bytes>,
      // console.log(res.data.toString());

      // 使用 Cheerio 进行解析，并保留实体编码的原始形式
      const $ = cheerio.load(res.data, { decodeEntities: false });
      const text = $('#welcomeMsg').text().trim();
      return text;
    } catch (error) {
      console.log(error);
    }
  }

  // 查询教学计划总表
  async queryAllPlan(ctx, headers) {
    // 授课计划录入（新）
    // url = 'http://my.ssts.cn/detachPage.portal?.pn=p6884_p115256'
    const url = 'http://my.ssts.cn/pnull.portal?.pen=f1987&.f=f1987&.pmn=view&action=getkfrq';
    try {
      // 发送数据抓取请求
      const res = await ctx.curl(url, {
        method: 'GET',
        headers,
      });

      return res.data;
      // const $ = cheerio.load(res.data, { decodeEntities: false });
      // console.log(res.data.toString());
    } catch (error) {
      console.log(error);
    }

    return;
  }

  // 根据工号查姓名，此类查询不会刷新 session
  async queryNameByJobID(ctx, headers, jobId) {
    return new Promise(async (resolve, reject) => {
      const url = 'http://my.ssts.cn/pnull.portal?.pen=jxfw.qxjskbcx&.pmn=view&action=optionsRetrieve&className=com.wisedu.app.w3.jxfw.domain.Rkjs&namedQueryId=rkjs.yxQuery&displayFormat=[{jsdm}]{jsmc}&useBaseFilter=true';
      const queryData = {
        start: '0',
        limit: '10',
        query: jobId,
        fullEntity: false,
        selectedItems: '',
        dwdm: '',
        jyzdm: '',
      };

      try {
        // 发送查询请求
        const response = await ctx.curl(url, {
          // response = session.post(login_url, data=login_data, headers=headers)
          method: 'POST',
          contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
          data: queryData,
          headers,
        });

        // 如果返回成功
        if (response.status === 200) {
          // console.log(response.headers);
          const data = JSON.parse(response.data.toString());
          const str = data.options[0].value;
          const name = str.match(/[\u4e00-\u9fa5]+/g)[0];
          resolve(name);
        }
      } catch (error) {
        console.log('查询出错', error);
        reject(new Error('姓名查询出错'));
      }
    });
  }

  async queryClassroomIdByStr(ctx, headers) {
    const url = 'http://my.ssts.cn/pnull.portal?.pen=jxrz.jxrztx&.pmn=view&action=optionsRetrieve&className=com.wisedu.app.w3.jxfw.domain.Kcjc&namedQueryId=&displayFormat=[{jcdm}]{jcmc}&useBaseFilter=true';

    // const queryData = {
    //   // start: 0,
    //   // limit: 10,
    //   query: '5102',
    //   fullEntity: false,
    //   selectedItems: '',
    // };

    // const queryParams = {
    //   '.pen': 'jxrz.jxrztx',
    //   '.pmn': 'view',
    //   action: 'optionsRetrieve',
    //   className: 'com.wisedu.app.w3.jxfw.domain.Kcjc',
    //   namedQueryId: '',
    //   displayFormat: '[{jcdm}]{jcmc}',
    //   useBaseFilter: 'true',
    // };
    console.log(headers);
    const res = await ctx.curl(url, {
      method: 'GET',
      contentType: 'text/html;charset=utf-8',
      // dataType: 'json',
      headers,
      timeout: 20000,
    });
    console.log('------');
    console.log(res.data.toString());
    console.log('------');
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      // console.log(cookies[0].split(';')[0] + ';' + headers.Cookie ); // .toString());
      headers.Cookie = cookies[0].split(';')[0] + ';' + headers.Cookie;
      console.log(headers.Cookie);
    }

    const res2 = await ctx.curl(url, {
      method: 'GET',
      contentType: 'text/html;charset=utf-8',
      // dataType: 'json',
      headers,
      timeout: 20000,
    });

    console.log(res2.data.toString());
    console.log(res.headers['set-cookie']);
  }

}
module.exports = myLogin;
