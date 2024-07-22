'use strict';

/**
 * @file verifCode.test.js
 * @description 单元测试文件，用于测试 VerifCode 服务的生成验证字符串和加密/解密功能。
 *
 * 测试目标:
 * - 生成验证字符串并存储到数据库中。
 * - 确保从数据库中成功检索到生成的记录。
 * - 验证 ID 的加密和解密功能是否正常工作。
 *
 * 测试内容:
 * - generateVerificationCode(): 测试生成验证字符串并返回数据表中的对应 ID。
 * - encryptId() and decryptId(): 测试 ID 的加密和解密功能。
 */

const { app, assert } = require('egg-mock/bootstrap');

describe('service/common/verifCode.test.js', () => {
  let ctx;

  before(async () => {
    ctx = app.mockContext();
  });

  it('测试 generateVerificationCode() 生成验证字符串，并返回数据表中的对应 id', async () => {
    const applicantId = 0;
    const issuerId = 2;
    const expiryTime = 1000 * 60 * 60; // 1 hour

    const verifCodeId = await ctx.service.common.verifCode.generateVerificationCode(applicantId, issuerId, expiryTime);
    // 确保从数据库中成功检索到记录。
    assert(verifCodeId);

    const verifCode = await ctx.model.Common.VerifCode.findByPk(verifCodeId);
    assert(verifCode);
    assert.equal(verifCode.applicant_id, applicantId);
    assert.equal(verifCode.issuer_id, issuerId);
    assert(verifCode.token);
    assert(verifCode.salt);
  });


  it('测试 encryptId() and decryptId() 能否正确的把 id 信息编码或解码到字符串', async () => {
    const id = 1;
    const verifCode = await ctx.model.Common.VerifCode.findByPk(id);
    const secretKey = verifCode.token;

    const encryptedId = ctx.service.common.verifCode.encryptId(id, secretKey);
    // console.log(id, secretKey);
    assert(encryptedId);

    const decryptedId = ctx.service.common.verifCode.decryptId(encryptedId, secretKey);
    assert.strictEqual(decryptedId, id);
  });
});
