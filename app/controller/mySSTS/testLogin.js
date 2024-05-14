'use strict';
const Service = require('egg').Service;

// const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };

class getSessionController extends Service {
  async index() {
    const { ctx } = this;

    // const isLogin = await ctx.service.mySSTS.myLogin.getWelcomeStr(ctx, headers);

    // if (!isLogin) {
    try {
      /**
       * 利用固定账号登录校园网，并获取 cookie session 等一些列信息，
       * 为进一步查找数据做准备
      */
      // let headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };
      // let headers = await ctx.service.mySSTS.myLogin.login(ctx, '2226', 'alex2ssts');
      const headers = await ctx.service.mySSTS.getSession.index();
      // headers = await ctx.service.mySSTS.myLogin.getSessionId(ctx, headers);
      this.ctx.body = {
        success: true,
        data: {
          message: '/chat say hi',
          headers,
        },
        host: ctx.request.header.host,
      };
    } catch (error) {
      console.log(error);
    }

    // const res = await ctx.service.mySSTS.myLogin.getWelcomeStr(ctx, headers);
    // const res = await ctx.service.mySSTS.myLogin.queryClassroomIdByStr(ctx, headers);

    // formatAllPlanTable(html);

    // const html = await ctx.service.mySSTS.myLogin.queryClassroomIdByStr(ctx, headers);
    // const $ = cheerio.load(html, { decodeEntities: false });
    // console.log(html.toString());
    // ctx.body = {
    //   success: true,
    //   data: 'hi',
    // };
  }
}


module.exports = getSessionController;
