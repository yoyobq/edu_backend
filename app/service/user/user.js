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
   * 为注册新用户做准备，包括创建账号、用户基本信息和角色特定信息（如教师或学生）。
   *
   * @param {object} params - 注册用户的参数对象。
   * @param {string} params.loginName - 用户的登录名，用于登录时的唯一标识。
   * @param {string} params.loginEmail - 用户的邮箱地址，用于联系和身份验证。
   * @param {string} params.loginPassword - 用户的密码，在存储前需要进行加密处理。
   * @param {string} [params.nickname] - 用户的昵称（可选），如果未提供，将使用默认值或真实姓名。
   * @param {string} params.verifCode - 用户的验证字符串，用于验证注册时的身份和获取隐藏信息。
   *
   * @return {Promise<object>} - 返回新创建的用户信息对象，其中包括创建成功后的用户账号和角色特定的信息。
   */
  async registerUser(params) {
    const { loginName, nickname, loginPassword, verifCode, loginEmail } = params;

    // 0.1 检查 verifiCode 是否存在并符合规则
    const verifCodePattern = /^[0-9a-fA-F]{64}$/;
    if (!verifCode || !verifCodePattern.test(verifCode)) {
      this.ctx.status = 400;
      this.ctx.body = {
        message: '非法的注册信息0，已被后台记录，请重新开始注册流程',
      };
      return;
    }

    // 0.0 验证验证码是否仍然有效
    const validRecord = await this.ctx.service.common.verifCode.verifyAndGetRecord(verifCode);
    if (!validRecord) {
      this.ctx.status = 500;
      this.ctx.body = {
        message: '验证码过期，已被后台记录，请重新开始注册流程',
      };
      return;
    }

    // 1. 检查 password 是否符合规则
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d|[!@#$%^&*()_+}{":;'?/>.<,]).{8,}$/;
    if (!loginPassword || !passwordPattern.test(loginPassword)) {
      this.ctx.status = 400;
      this.ctx.body = {
        message: '非法的注册信息1，已被后台记录，请重新开始注册流程',
      };
      return;
    }
    const validatedPassword = loginPassword;

    // 2. 验证 loginEmail 的格式
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!loginEmail || !emailPattern.test(loginEmail)) {
      this.ctx.status = 400;
      this.ctx.body = {
        message: '非法的注册信息2，已被后台记录，请重新开始注册流程',
      };
      return;
    }

    // 3. 验证生成验证码时的 email 格式
    if (validRecord.data.email !== loginEmail || !emailPattern.test(validRecord.data.email)) {
      this.ctx.status = 400;
      this.ctx.body = {
        message: '非法的注册信息3，已被后台记录，请重新开始注册流程',
      };
      return;
    }
    const validatedLoginEmail = validRecord.data.email;

    // 4. 验证 staff 表是否已有此教职工的注册信息
    const validatedJobId = validRecord.data.jobId || null;
    // const validatedStuId = validRecord.data.stuId || null;
    const validatedName = validRecord.data.name;

    // 此处还要考虑 stuId 的情况
    // 使用 jobId 和 name 在 staff 表中查找是否已有匹配的记录
    const existingStaffRecord = await this.ctx.model.Staff.findOne({
      where: {
        jobId: validatedJobId,
        name: validatedName,
      },
    });

    if (existingStaffRecord) {
      // 如果找到匹配的记录，表示该教职工已经注册
      this.ctx.throw(400, '该教职工的注册信息已存在，请勿重复注册。');
    }

    // 5. 检查 loginName 是否存在，不存在则置 null
    const validatedLoginName = loginName?.trim() || null;

    // 6. 检查 nickname 是否存在，不存在则置为真名
    const validatedNickname = nickname?.trim() || validatedName;

    // 使用 nickname 在 userInfo 表中查找是否已有重复的记录
    const existingNicknameRecord = await this.ctx.model.UserInfo.findOne({
      where: {
        nickname: validatedNickname,
      },
    });

    if (existingNicknameRecord) {
      // 如果找到匹配的记录，表示该昵称已被占用
      this.ctx.throw(400, `检测到根据教职工姓名自动生成的昵称 ${validatedNickname} 已被占用，请联系管理员解决。`);
    }

    // console.log(`
    //   Validated Data:
    //   - loginPassword: ${validatedPassword}
    //   - loginEmail: ${validatedLoginEmail}
    //   - loginName: ${validatedLoginName}
    //   - nickname: ${validatedNickname}
    //   - JobId: ${validatedJobId}
    //   - name: ${validatedName}
    // `);

    try {
      // eslint-disable-next-line no-unused-vars
      const result = await this.ctx.service.user.account.create({
        loginPassword: validatedPassword,
        loginEmail: validatedLoginEmail,
        loginName: validatedLoginName,
        nickname: validatedNickname,
        jobId: validatedJobId,
        name: validatedName,
      });

      this.ctx.status = 201;
      this.ctx.body = {
        message: '新用户注册成功',
        // userId: result.id,
      };

      return true;
    } catch (error) {
      this.ctx.status = 500;
      this.ctx.body = {
        message: '非法的注册信息，已被后台记录，请重新开始注册流程',
      };
    }
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
