'use strict';

/**
 * @file connector.js
 * @description 用于 SSTS 爬虫服务的数据连接器
 *
 * 该连接器主要负责通过提供的参数模拟登录 SSTS 系统。
 * 模块名：sstsSpider
 */

class SstsSpiderConnector {
  constructor(ctx) {
    this.ctx = ctx;
  }

  /**
   * 登录 SSTS 系统
   * @param {object} params - 登录所需的参数
   * @param {string} params.userId - 用户 ID
   * @param {string} params.password - 用户密码
   * @return {Promise<object>} - 返回登录成功状态和 cookie
   */
  async login({ userId, password }) {
    const response = await this.ctx.service.mySSTS.myLogin.loginToSSTS({ userId, password });
    return response;
  }

  // 注意，由于是教务系统的操作，此处应该传的是教务系统的 token
  async getCurriPlan({ JSESSIONID_A, userId, token }) {
    const response = await this.ctx.service.mySSTS.myCurriPlan.getCurriPlanSSTS({ JSESSIONID_A, userId, token });
    return response;
  }

  async submitTeachingLog(input) {
    const logData = await this.ctx.service.mySSTS.teachingLog.submit.submitTeachingLog(input);
    return logData;
  }

  async submitIntegratedTeachingLog(input) {
    const logData = await this.ctx.service.mySSTS.teachingLog.submit.submitIntegratedTeachingLog(input);
    return logData;
  }

}

module.exports = SstsSpiderConnector;
