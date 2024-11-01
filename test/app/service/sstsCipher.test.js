'use strict';

/**
 * @file ssts_cipher.test.js
 * @description 单元测试文件，用于测试 SstsCipher 服务的加密和解密功能。
 *
 * 测试目标:
 * - 确保加密功能能够正确加密输入字符串。
 * - 确保解密功能能够成功还原加密内容。
 *
 * 测试内容:
 * - encryptData(): 测试加密功能。
 * - decrypt(): 测试解密功能，确保与原始内容一致。
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('service/common/sstsCipher.test.js', () => {
  let ctx;

  before(async () => {
    ctx = app.mockContext();
  });

  it('测试 encryptData() 方法正确加密输入字符串', async () => {
    const password = 'alex2alex';
    const plainTextData = {
      grant_type: 'password',
      username: {
        loginType: '',
        userId: '2226',
        userName: '2226',
        loginMethod: '0',
        extUserId: [],
      },
    };

    const encryptedData = await ctx.service.common.sstsCipher.encryptData(password, plainTextData);

    // 确保返回值是一个字符串并且与原始密码不同
    assert(encryptedData);
    assert(typeof encryptedData === 'string');
    assert.notStrictEqual(encryptedData, password);
  });

  it('测试 decrypt() 方法能够还原加密内容', async () => {
    const password = 'alex2alex';
    const plainTextData = {
      grant_type: 'password',
      username: {
        loginType: '',
        userId: '2227',
        userName: '2227',
        loginMethod: '0',
        extUserId: [],
      },
    };

    const encryptedData = await ctx.service.common.sstsCipher.encryptData(password, plainTextData);
    const decryptedData = await ctx.service.common.sstsCipher.decryptData(encryptedData);

    // console.log('1111', JSON.stringify(decryptedData));
    // console.log('2222', JSON.stringify(plainTextData));
    // 确保解密后的数据与原始输入相同
    assert.strictEqual(JSON.stringify(decryptedData), JSON.stringify(plainTextData));
  });
});
