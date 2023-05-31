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

    const headers = ctx.service.mySSTS.getSession.index();
    console.log(headers);
  }
}


module.exports = CrawlController;
