// app/service/mySSTS/teachingLog/list.js
'use strict';

const Service = require('egg').Service;

/**
 * 获取某课程已填写的教学日志记录列表（SSTS 系统）
 *
 * 参数 teachingClassId 表示课程唯一标识，用于查询该课程下的日志条目
 */
class TeachingLogListService extends Service {
  async getTeachingLogList({ JSESSIONID_A, teachingClassId, token }) {
    // 生成 8 位 16 进制随机字符串
    const randomHex = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    // 生成 0 到 1 之间的随机浮点数字符串，并截取小数点后 13 位
    const randomFloat = Math.random().toFixed(13).slice(2); // slice(1) 移除前面的 "0"
    const url = `http://2.46.215.2:18000/jgyx-ui/jgyx/frame/component/pagegrid/pagegrid.action?frameControlSubmitFunction=query&winTemp=Q_EA_Lecture_Journal_List${randomHex}.${randomFloat}`;

    // 设定请求头
    const headers = {
      Accept: 'text/plain, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en,zh-CN;q=0.9',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      // 试验证明 SzmeSite=None; SzmeSite=None; 无意义，此处留作参考
      Cookie: `SzmeSite=None; JSESSIONID_A=${JSESSIONID_A}`,
      DNT: '1',
      Host: '2.46.215.2:18000',
      Origin: 'http://2.46.215.2:18000',
      'Proxy-Connection': 'keep-alive',
      Referer: `http://2.46.215.2:18000/jgyx-ui/CMU09/CMU090201/index?teaching_class_id=${teachingClassId}`,
      'User-Agent': this.ctx.request.headers['user-agent'],
    };

    // 加密前的 payload 信息
    const plainTextData = {
      take: 100,
      skip: 0,
      page: 1,
      pageSize: 100,
      group: [],
      queryNo: 'Q_EA_Lecture_Journal_List',
      queryWindow: '1',
      connectId: '1',
      whereParams: {
        teaching_class_id: teachingClassId,
      },
    };

    // 加密 payload
    const payload = await this.ctx.service.common.sstsCipher.encryptDataNoPasswd(plainTextData);

    let response = {};
    try {
      // 发送 POST 请求
      response = await this.ctx.curl(url, {
        method: 'POST',
        headers, // 设置请求头
        data: payload, // 请求体内容
        dataType: 'string', // 设置返回数据类型为 JSON
        timeout: 30000,
      });
    } catch (error) {
      this.ctx.logger.error('获取单课程日志列表报错:', error.message);
      throw error;
    }

    // 解密 response
    const data = await this.ctx.service.common.sstsCipher.decryptData(response.data.toString());

    // 由于这个函数会在循环中执行
    // 为避免意外并发影响校园网服务器工作，
    // 每次成功查询数据后，随机延时 100 到 200 毫秒
    const delay = Math.floor(100 + Math.random() * 100);
    await new Promise(resolve => setTimeout(resolve, delay));

    return data.data;
  }
}

module.exports = TeachingLogListService;
