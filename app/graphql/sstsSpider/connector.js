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
    // {
    //   success: true,
    //   cookie: {
    //     expiresIn: 29610,
    //     refreshToken: 'b001e2f092654a668d06a2dac136f183',
    //     token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaWduIjoie1widG9rZW5JZFwiOlwiNDAzNDlhNTY5MmU2MWMwNTAxOTJlNmIyMzM1NDNiMDFcIixcInVzZXJJZFwiOlwiMjIyNlwifSIsImV4cCI6MTczMDQ4OTU5MX0.7QCWCi_ffdsIOV2Np0nqhfIB7tJp5GyM3JY8Uk4175k',
    //     tokenHead: 'Bearer '
    //   },
    //   jsessionCookie: 'JSESSIONID_A=dJpocT7FWV7yrQj0TYl98ywWSSxoOlLgE04L3XDC.ecs-b00c-0004; path=/; HttpOnly; Max-Age=3600; Expires=Fri, 01-Nov-2024 08:48:11 GMT'
    // }
    // 提取 JSESSIONID_A 的值

    return response;
  }
}

module.exports = SstsSpiderConnector;
