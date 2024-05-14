'use strict';
const Service = require('egg').Service;

// const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };

class getSessionController extends Service {
  index() {

    return new Promise(async (resolve, reject) => {
      const { ctx } = this;

      // const isLogin = await ctx.service.mySSTS.myLogin.getWelcomeStr(ctx, headers);

      // if (!isLogin) {
      try {
        /**
         * 利用固定账号登录校园网，并获取 cookie session 等一些列信息，
         * 为进一步查找数据做准备
        */
        // let headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };
        let headers = await ctx.service.mySSTS.myLogin.login(ctx, '2226', 'alex2ssts');
        headers = await ctx.service.mySSTS.myLogin.getSessionId(ctx, headers);
        resolve(headers);
      } catch (error) {
        console.log(error);
        reject(new Error('登录失败'));
      }
    });
  }
}


module.exports = getSessionController;
