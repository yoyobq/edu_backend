'use strict';

/**
 * @file connector.js
 * @description 用户连接器，处理与用户相关的服务调用。
 * 将 GraphQL 的查询和变更请求转发到对应的 service 方法。
 *
 * @module graphql/user/connector
 */

class UserConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.userService = ctx.service.user.user; // user 聚合的服务
    this.accountService = ctx.service.user.account;
  }

  /**
   * 获取单个用户信息。
   * @param {number} accountId - 用户账户的 ID。
   * @return {Promise<object>} - 用户信息，包括 account, userInfo, staffInfo, studentInfo。
   */
  async getUserDetails(accountId) {
    // 调用 service 层的方法获取用户信息
    return await this.userService.getUserDetails(accountId);
  }

  /**
   * 获取所有用户列表。
   * @return {Promise<Array>} - 返回用户列表。
   */
  async listUsers() {
    // 调用 service 层的方法获取用户列表
    return await this.userService.listUsers();
  }

  /**
   * 创建新用户。
   * @param {object} params - 创建用户的参数。
   * @param {string} params.loginName - 用户登录名。
   * @param {string} params.loginEmail - 用户邮箱。
   * @param {string} params.loginPassword - 用户密码。
   * @param {string} params.nickname - 用户昵称。
   * @param {string} params.role - 用户角色（staff 或 student）。
   * @param {object} params.userInfo - 用户基本信息。
   * @return {Promise<object>} - 返回新创建的用户信息。
   */
  async createUser(params) {
    // 调用 service 层的方法创建用户
    return await this.userService.createUser(params);
  }

  /**
   * 更新用户信息。
   * @param {number} accountId - 用户账户的 ID。
   * @param {object} params - 更新的参数。
   * @return {Promise<object>} - 返回更新后的用户信息。
   */
  async updateUser(accountId, params) {
    // 调用 service 层的方法更新用户信息
    return await this.userService.updateUser(accountId, params);
  }
}

module.exports = UserConnector;
