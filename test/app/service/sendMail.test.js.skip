'use strict';

/**
 * @file sendMail.test.js
 * @description 该文件包含对发送邮件服务的测试，使用 nodemailer 进行实际邮件发送和模拟测试。
 *
 * 测试内容:
 * - 实际发送邮件给 hotmail 和 foxmail 邮箱。
 * - 实际发送有邮件功能呢默认被注释，需要的时候请手动解除。
 * - 模拟发送邮件以测试邮件发送功能。
 *
 * 主要功能:
 * - 确保发送邮件服务的功能正常。
 * - 使用模拟发送邮件来验证服务的逻辑。
 *
 * 安全性考虑:
 * - 确保不在测试中发送真实邮件到外部邮件地址。

 */

const { app, assert } = require('egg-mock/bootstrap');
const nodemailer = require('nodemailer');
const mm = require('egg-mock');

describe('service/common/sendMail.js', () => {
  let ctx;

  // 通过在 before 钩子中设置上下文，你可以在测试用例中使用 ctx 来调用服务和其他依赖于上下文的功能，确保测试的独立性和可靠性。
  before(async () => {
    ctx = app.mockContext();
  });

  // it('实际发送邮件给 hotmail 邮箱', async () => {
  //   const to = 'yoyobq@hotmail.com';
  //   const subject = '测试邮件';
  //   const content = '这是一封测试邮件，请勿回复。';

  //   const sendResponse = await ctx.service.common.sendMail.sendEmail(to, subject, content);
  //   assert(sendResponse);
  //   assert(sendResponse.messageId);
  // });

  // it('实际发送邮件给 foxmail 邮箱', async () => {
  //   const to = 'yoyobq@foxmail.com';
  //   const subject = '测试邮件';
  //   const content = '这是一封测试邮件，请勿回复。';

  //   const sendResponse = await ctx.service.common.sendMail.sendEmail(to, subject, content);
  //   assert(sendResponse);
  //   assert(sendResponse.messageId);
  // });

  it('模拟发送给不存在的模拟邮箱，若要实际发送邮件，请到测试文件取消部分注释', async () => {
    const to = 'mock@mock.mm';
    const subject = '模拟发送';
    const content = '此用例是模拟发送，不触发 sendmail 服务器';

    // Mock nodemailer transporter
    mm(nodemailer, 'createTransport', () => {
      return {
        sendMail: async options => {
          assert(options.to === to);
          assert(options.subject === subject);
          assert(options.text === content);
          return Promise.resolve({ messageId: 'test-message-id' });
        },
      };
    });
    const sendResponse = await ctx.service.common.sendMail.sendEmail(to, subject, content);
    assert(sendResponse);
    assert(sendResponse.messageId === 'test-message-id');
  });
});
