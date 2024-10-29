'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');

/** 23-3-18 Service 的职责是处理业务逻辑，它应该是抽象的，独立于任何数据源。
 *  因此，在 GraphQL + Sequelize 的架构中，
 *  Service 应该将它们的实现与 Sequelize 模型解耦，这样它们就可以处理不同的数据源，
 * 而不仅仅是 Sequelize 模型。
 **/

/** 24-5-15 再次提醒 Sequelize 提供大量操作 model 的方法，
 * 如 findAll，findByPk，findOne 等等，请记得查阅官方文档
 **/

class Account extends Service {
  async list({ offset = 0, limit = 10 }) {
    // 21-5-20 此处的 findAndCountAll 是 sequelize 中的查询方法
    const res = await this.ctx.model.Account.findAll({
      offset,
      limit,
      order: [[ 'created_at', 'desc' ], [ 'id', 'desc' ]],
    });
    // return this.ctx.model.User.findAll();
    return res.rows;
  }

  async findById(id) {
    // findByPk 也是
    const account = await this.ctx.model.Account.findByPk(id);
    if (!account) {
      this.ctx.throw(404, 'id 为 ' + id + '的账号不存在');
    }
    return account;
  }

  async userLoginCheck(loginParams) {
    // 如果 params 的值为假值（如 null、undefined、false 等），
    // 则使用一个空对象 {} 作为默认值，以避免后续的代码抛出错误。
    // 此处 type 未使用，但留存备用
    // eslint-disable-next-line no-unused-vars
    const { loginName, loginPassword, type } = loginParams || {};

    let loginAccount = {};
    const emailRegex = /^\S+@\S+\.\S+$/;

    // 根据用户提交的是用户名还是 Email 生成不同的查询
    if (emailRegex.test(loginName)) {
      loginAccount = {
        where: {
          loginEmail: loginName,
          loginPassword,
        },
        attributes: [ 'id', 'status' ],
      };
    } else {
      loginAccount = {
        where: {
          loginName,
          loginPassword,
        },
        attributes: [ 'id', 'status' ],
      };
    }

    const account = await this.findWithCondition(loginAccount);
    let token;
    if (account) {
      switch (account.dataValues.status) {
        case 'ACTIVE':
          token = await this.ctx.service.auth.token.create(account);
          return { account, token };
        case 'BANNED':
          throw new Error('此账号封禁中，请联系管理员');
        case 'DELETED':
          throw new Error('此账户已被删除');
        case 'PENDING':
          throw new Error('此账户尚未激活，请检查您的邮箱以激活账号');
        case 'SUSPENDED':
          throw new Error('此账户已被暂停，请联系管理员');
        case 'INACTIVE':
          throw new Error('此账户不活跃，请联系管理员');
        default:
          throw new Error('未知登录错误，请稍后再试');
      }
    }

    throw new Error('用户名密码错或账号不存在');
  }

  async findByLoginEmail(loginEmail) {
    const account = await this.ctx.model.Account.findOne({
      where: {
        loginEmail,
      },
      // attributes: [ 'id', 'status' ],
    });
    return account;
  }

  /**
 * 根据传入的密码和盐值生成哈希字符串。
 * @param {string} password - 用户的密码。
 * @param {string} salt - 用于加密的盐值。
 * @return {string} - 返回加密后的哈希字符串。
 */
  hashPassword(password, salt) {
    const hash = crypto.pbkdf2Sync(password, salt, 5000, 64, 'sha256').toString('hex');
    return hash;
  }

  async create({
    loginPassword,
    loginEmail,
    loginName,
    nickname,
    jobId,
    name,
  }) {
    // console.log('create:', loginPassword, loginEmail, loginName, nickname, jobId, name);
    let transaction;
    try {
      transaction = await this.ctx.model.transaction();

      if (loginEmail) {
        // 如果提供的参数中包含 loginEmail，则检查是否已经存在相同的 loginEmail
        const existingAccount = await this.ctx.model.Account.findOne({ where: { loginEmail } }, { transaction });
        if (existingAccount) {
          this.ctx.throw(403, `${loginEmail} 该邮箱已存在。`);
        }
      }

      const newAccount = await this.ctx.model.Account.create({
        loginName,
        loginEmail,
        loginPassword,
      }, { transaction });

      // 计算哈希密码
      const salt = newAccount.createdAt.toString();
      const hashedPassword = await this.hashPassword(newAccount.loginPassword, salt);
      // 更新账户记录中的密码字段
      newAccount.loginPassword = hashedPassword;
      // 保存更新后的账户记录
      await newAccount.save({ transaction });

      // 获取新创建账号的 ID
      const accountId = newAccount.id;
      // 创建账号基本信息 写入 user_accounts 表
      const userInfoData = {
        accountId,
        nickname,
        // TODO: 此处要考虑下默认用户头像的生成
        // avatar: 'http://example.com/avatar.jpg',
        email: loginEmail,
        signature: 'Hello, world!',
        accessGroup: [ 'teacher' ],
      };

      // const newUserInfo =
      await this.ctx.service.user.userInfo.create({ userInfoData, transaction });
      // const newUserInfo = await this.ctx.model.UserInfo.create(userInfoData, { transaction });
      // console.log(newUserInfo);

      // 创建员工数据，写入 staff 表
      const staffData = {
        accountId,
        jobId,
        name,
        // 其他相关字段的赋值
      };

      // const newStaff =
      await this.ctx.service.user.staff.create({ staffData, transaction });
      // const newStaff = await this.ctx.model.Staff.create(staffData, { transaction });
      // console.log(newStaff);

      // 提交事务
      await transaction.commit();

      return newAccount;
    } catch (error) {
      // 如果发生错误，回滚事务
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update({ id, updates }) {
    const account = await this.ctx.model.Account.findByPk(id);
    if (!account) {
      this.ctx.throw(404, '账号不存在');
    }

    const updatedAccount = await account.update(updates);
    return updatedAccount;
  }

}

module.exports = Account;
