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

  it('测试 generateVerifCode() 生成验证字符串，并返回数据表中的对应 id', async () => {
    const applicantType = 'registration';
    const applicantId = 0;
    const issuerId = 2;
    const expiryTime = 1000 * 60 * 60; // 1 hour

    // 返回的是新生成的数据在 common_verif_code 表中的 id
    const verifCode = await ctx.service.common.verifCode.generateVerifCode(applicantType, applicantId, issuerId, expiryTime);
    // 若存在 id 表示从数据库中成功检索到新增记录。
    assert(verifCode);
  });


  it('测试生成的 verifCode 包含的验证信息否与数据表中记录的一致', async () => {
    // 此处强耦合数据库中 id 为 2 的行，此行是用于单元测试的模拟数据。！！请自行生成！！
    const verifCode = 'cf8541a2a379c2cea07c8d0e59d4459a9a1d6cabcc864a04275054b005d91bd0';
    const applicantType = 'registration';
    const applicantId = 0;
    const issuerId = 2;
    // const expiryTime = 1000 * 60 * 60; // 1 hour
    const encryptedId = verifCode.slice(56, 64);
    const decryptedId = ctx.service.common.verifCode.decryptId(encryptedId);

    const verifData = await ctx.model.Common.VerifCode.findByPk(decryptedId);

    assert.equal(verifData.applicantType, applicantType);
    assert.equal(verifData.applicantId, applicantId);
    assert.equal(verifData.issuerId, issuerId);
    assert(verifData.token);
    assert(verifData.salt);
    assert.strictEqual(verifData.token.slice(0, 56), verifCode.slice(0, 56));
  });


  // it('测试 encryptedId() / decryptedId() 是否能够编码 / 解码加密字符串', async () => {
  //   const id = 1;
  //   const encryptedId = ctx.service.common.verifCode.encryptId(id);
  //   console.log(encryptedId);
  //   assert(encryptedId);

  //   const decryptedId = ctx.service.common.verifCode.decryptId(encryptedId);
  //   console.log(decryptedId);
  //   assert.strictEqual(decryptedId, id);
  // });
});
