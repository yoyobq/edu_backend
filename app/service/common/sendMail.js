'use strict';

/**
 * @file sendMail.js
 * @description 该服务负责发送电子邮件。使用 nodemailer 实现邮件发送功能。
 *
 * 主要功能:
 * - 配置邮件发送器（使用本地 sendmail 或外部 SMTP 服务）。
 * - 发送电子邮件，并记录发送结果。
 *
 * 使用场景:
 * - 该服务可用于发送注册验证邮件、密码重置邮件、通知邮件等。
 *
 * 安全性考虑:
 * - 确保邮件发送器配置安全，不要在源代码中硬编码敏感信息。
 *
 * 示例:
 * await ctx.service.common.sendMail.sendEmail('example@example.com', '测试邮件', '这是一封测试邮件，请勿回复。');
 *
 * @module service/common/sendMail
 */

const nodemailer = require('nodemailer');
const Service = require('egg').Service;

class SendMail extends Service {
  /**
   * 发送电子邮件。
   * @param {string} to - 收件人邮箱地址。
   * @param {string} subject - 邮件主题。
   * @param {string} content - 邮件正文内容。
   */
  async sendEmail(to, subject, content) {
    const transporter = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 25,
      secure: false, // 不使用TLS
    });

    const mailOptions = {
      from: 'no-reply@ssts.fun',
      to,
      subject,
      text: content,
    };

    try {
      const sendResponse = await transporter.sendMail(mailOptions);
      // console.log(sendResponse);
      this.logger.info(`邮件发送到 ${to}，主题 ${subject} 成功: ${sendResponse.messageId}`);
      return sendResponse;
    } catch (error) {
      this.logger.error(`邮件发送到 ${to}，主题 ${subject} 失败: ${error.message}`);
      // console.log(error);
      return error;
    }
  }
}

module.exports = SendMail;
