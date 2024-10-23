'use strict';

/**
 * @file user.js
 * @description 负责用户的业务逻辑，包括账户、用户基本信息、教师信息和学生信息的操作。
 *
 * @module service/user
 */

const Service = require('egg').Service;

class UserService extends Service {
  /**
   * 获取用户信息，包括账户、用户基本信息以及角色特定信息（教师或学生）。
   * @param {number} id - 用户账户的 ID。
   * @return {Promise<object>} - 返回包含账户信息、用户基本信息、教师或学生信息的对象。
   */
  async getUserDetails(id) {
    console.log(`用户 ${id} 登录`);
    const realId = this.ctx.state.user.id;
    const account = await this.ctx.model.Account.findByPk(realId);
    if (!account) {
      this.ctx.throw(404, 'Account not found');
    }

    const userInfo = await this.ctx.model.UserInfo.findOne({ where: { account_id: realId } });
    if (!userInfo) {
      this.ctx.throw(404, 'User info not found');
    }

    // 获取角色信息
    let role = 'GUEST';
    let roleInfo = null;

    // 根据 account_id 查询 staff 或 student 表信息
    const staff = await this.ctx.model.Staff.findOne({ where: { account_id: realId } });
    if (staff) {
      role = 'STAFF';
      roleInfo = staff;
    } else {
      const student = await this.ctx.model.Student.findOne({ where: { account_id: realId } });
      if (student) {
        role = 'STUDENT';
        roleInfo = student;
      }
    }

    // 整合所有信息返回
    return {
      id: account.id,
      loginName: account.loginName,
      loginEmail: account.loginEmail,
      status: account.status,
      nickname: userInfo.nickname,
      avatar: userInfo.avatar,
      email: userInfo.email,
      signature: userInfo.signature,
      accessGroup: userInfo.accessGroup,
      address: userInfo.address,
      phone: userInfo.phone,
      tags: userInfo.tags,
      notifyCount: userInfo.notifyCount,
      unreadCount: userInfo.unreadCount,
      gender: userInfo.gender,
      role,
      staffInfo: role === 'STAFF' ? roleInfo : null,
      studentInfo: role === 'STUDENT' ? roleInfo : null,
    };
  }

  /**
   * 获取所有用户的信息列表。
   * @return {Promise<Array>} - 返回用户列表。
   */
  async listUsers() {
    const accounts = await this.ctx.model.Account.findAll();
    return Promise.all(accounts.map(account => this.getUserDetails(account.id)));
  }

  /**
   * 创建用户，包括账号、用户基本信息和角色特定信息（教师或学生）。
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
    const { loginName, loginEmail, loginPassword, role, nickname, ...userInfoParams } = params;

    // 创建 account 和 userInfo 记录
    const account = await this.ctx.model.Account.create({
      login_name: loginName,
      login_email: loginEmail,
      login_password: loginPassword,
    });

    // eslint-disable-next-line no-unused-vars
    const userInfo = await this.ctx.model.UserInfo.create({
      account_id: account.id,
      nickname,
      ...userInfoParams,
    });

    // 创建角色特定的记录
    if (role === 'staff') {
      await this.ctx.model.Staff.create({
        account_id: account.id,
        name: nickname,
        ...params.staffInfo,
      });
    } else if (role === 'student') {
      await this.ctx.model.Student.create({
        account_id: account.id,
        name: nickname,
        ...params.studentInfo,
      });
    }

    // 返回创建的用户信息
    return this.getUserDetails(account.id);
  }

  /**
   * 更新用户基本信息。
   * @param {number} accountId - 用户账户的 ID。
   * @param {object} params - 更新的参数。
   * @return {Promise<object>} - 返回更新后的用户信息。
   */
  async updateUser(accountId, params) {
    // 更新 userInfo 信息
    const userInfo = await this.ctx.model.UserInfo.findOne({ where: { account_id: accountId } });
    if (userInfo) {
      await userInfo.update(params);
    }

    // 更新账户状态等其他信息（如 email 或状态）
    const account = await this.ctx.model.Account.findByPk(accountId);
    if (account) {
      const accountUpdateData = {};
      if (params.loginEmail) {
        accountUpdateData.login_email = params.loginEmail;
      }
      if (params.status) {
        accountUpdateData.status = params.status;
      }
      await account.update(accountUpdateData);
    }

    return this.getUserDetails(accountId);
  }
}

module.exports = UserService;
