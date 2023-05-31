'use strict';
const Controller = require('egg').Controller;
// const { HttpClient } = require('egg');
// const cheerio = require('cheerio');

let headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' };


// 未完成，与 queryAllPlan 配合，用于查询教学计划总表后生成表格
// function formatAllPlanTable(html) {
//   // Load the HTML string into a Cheerio object
//   const $ = cheerio.load(html);

//   // Find all "查看" links
//   const links = $('a:contains("查看")');

//   // Find all "教学班编号" hidden inputs and extract their values
//   const jxbValues = $('input[type="hidden"].mytip').map((_, input) => $(input).attr('value')).get();

//   // Extract class time information from the HTML string
//   const classTimeList = [];
//   const pattern = /^.*sksjmsMap\[\".*$/gm;
//   const result = $.html().match(pattern);
//   if (result) {
//     for (const item of result) {
//       const matches = item.match(/\[(.+?)\]星期(\S+?)\((\S+?)\)/g);
//       const classTime = matches ? matches.map(match => [ match.match(/星期(\S+?)\(/)[1], match.match(/\((\S+?)\)/)[1].replace('第', '').replace('节', '') ]) : [];
//       classTimeList.push(classTime);
//     }
//   }

//   // 上课地点
//   const classLocate = result ? result.map(item => item.match(/\)([^,]*)[,"]/)[1].trim()) : [];

//   // Find the table with id "queryGridf1987"
//   const table = $('#queryGridf1987');

//   // Find all tr elements within the table
//   const tr = table.find('tr');

//   // Find all th elements within the first tr element
//   const th = tr.first().find('th');

//   // Create an info_list array to store the extracted data
//   const infoList = [];

//   console.log(links.html());
//   console.log(jxbValues);
//   console.log(classLocate);
//   console.log(classTimeList);
//   console.log(th.html());
//   // ... (add your logic for processing the table data here)

//   // Return the info_list array or perform other desired operations
//   return infoList;
// }


class getSessionController extends Controller {
  async index() {
    const { ctx } = this;

    // const isLogin = await ctx.service.mySSTS.myLogin.getWelcomeStr(ctx, headers);

    // if (!isLogin) {
    try {
      /**
       * 利用固定账号登录校园网，并获取 cookie session 等一些列信息，
       * 为进一步查找数据做准备
      */
      headers = await ctx.service.mySSTS.myLogin.login(ctx, '2226', 'alex2ssts');
      headers = await ctx.service.mySSTS.myLogin.getSessionId(ctx, headers);
      return headers;
    } catch (error) {
      console.log(error);
    }

    // const res = await ctx.service.mySSTS.myLogin.getWelcomeStr(ctx, headers);
    // const res = await ctx.service.mySSTS.myLogin.queryClassroomIdByStr(ctx, headers);
    const res = await ctx.service.mySSTS.myLogin.queryNameByJobID(ctx, headers, '2230');
    console.log(res);
    return res;
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
