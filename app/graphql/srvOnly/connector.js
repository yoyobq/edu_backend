'use strict';

/**
 * @file connector.js
 * @description 定义发送验证码和邮件的连接器，用于与服务层交互，并处理发送验证码相关的操作。
 *
 * 主要功能:
 * - 将生成验证码的请求转发给 `service.common.verifCode`。
 * - 将发送邮件的请求转发给 `service.common.sendMail`。
 * - 保持 connector 层与 resolver 层的方法名一致，确保一致性和可维护性。
 *
 * @module connector/verification
 */

class VerificationConnector {
  constructor(ctx) {
    this.ctx = ctx;
    this.verifCodeSrv = ctx.service.common.verifCode; // 验证字符串的服务
    this.sendMailSrv = ctx.service.common.sendMail; // 邮件服务
  }

  /**
   * 生成验证码并发送邮件。
   * @param {Object} params - 包含验证码发送的所有必要信息。
   * @param {String} params.applicantType - 验证码类型（如注册、密码重置等）。
   * @param {String} params.email - 收件人的邮箱地址。
   * @param {Number} params.applicantId - 申请者ID。
   * @param {Number} params.issuerId - 发行者ID（响应申请的管理员）。
   * @param {Number} params.expiryTime - 验证码的有效期（毫秒）。
   * @return {Promise<Boolean>} 返回邮件是否成功发送的布尔值。
   */
  async sendVerifEmail(params) {
    const { applicantType, data, email, applicantId, issuerId } = params;
    let subject;
    let content;
    const expiryTime = 60 * 60 * 1000;

    try {
      // 生成验证码
      const verificationCode = await this.verifCodeSrv.getVerifCode({ applicantType, data, applicantId, issuerId, expiryTime, email });

      switch (applicantType) {
        case 'registration':
          // 处理注册类型的验证码
          subject = '欢迎注册 SSTS 智能教辅';
          content = `
            您的注册验证码是
            ${verificationCode}
            请复制将该验证码，并根据注册页面提示填入对话框以继续注册流程。
          `;
          break;

        case 'pwdreset':
        // 处理密码重置类型的验证码
          subject = '密码重置';
          content = `
            您可以通过以下链接重置密码：
            http://192.168.72.55/resetpwd/${verificationCode}
            请点击该链接重置密码`;
          break;


        case 'other':
          // 处理其他类型的验证码
          return false;

        default:
          this.ctx.throw('无效的申请类型');
      }
    } catch (error) {
      this.ctx.throw(`发送验证码邮件失败: ${error.message}`);
    }

    // 发送验证码邮件，测试用，勿忘改回 email
    // const result = await this.sendMailSrv.sendEmail(email, subject, content);
    const result = await this.sendMailSrv.sendEmail('yoyobq@hotmail.com', subject, content);

    // 测试用，勿忘改回 &&
    if (result.accepted.includes(email) || result.response.startsWith('250')) {
    // if (result.accepted.includes(email) && result.response.startsWith('250')) {
      return true;
    }

    return false;
  }

  /**
   * 验证传入的验证码。
   * @param {Object} params - 包含验证所需的所有信息。
   * @param {String} params.applicantType - 验证码类型（如注册、密码重置等）。
   * @param {String} params.verifCode - 待验证的验证码。
   * @param {Number} params.applicantId - 申请者ID。
   * @param {Number} params.issuerId - 发行者ID（响应申请的管理员）。
   * @return {Promise<Boolean>} 返回布尔值，表示验证码是否有效。
   */
  async checkVerifCode({ verifCode }) {
    const res = await this.verifCodeSrv.checkVerifCode(verifCode);

    return res; // 验证码有效
  }
}

module.exports = VerificationConnector;
