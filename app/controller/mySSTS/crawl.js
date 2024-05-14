'use strict';
const Controller = require('egg').Controller;

class CrawlController extends Controller {
  async sayhi() {
    console.log('hi');
    this.ctx.body = 'hi';
  }
  // 根据工号爬取姓名
  async crawlNameByJobId() {
    const { ctx } = this;

    const headers = await ctx.service.mySSTS.getSession.index();
    const res = await ctx.service.mySSTS.myLogin.queryNameByJobID(ctx, headers, '2230');
    console.log('res' + res);
    return res;
  }
}


module.exports = CrawlController;
