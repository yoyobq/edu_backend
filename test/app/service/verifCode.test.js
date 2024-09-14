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

  // it('测试 generateVerificationCode() 生成验证字符串，并返回数据表中的对应 id', async () => {
  //   const applicantId = 0;
  //   const issuerId = 2;
  //   const expiryTime = 1000 * 60 * 60; // 1 hour

  //   // 返回的是新生成的数据在 common_verif_code 表中的 id
  //   const verifCodeId = await ctx.service.common.verifCode.generateVerificationRecord(applicantId, issuerId, expiryTime);
  //   // 若存在 id 表示从数据库中成功检索到新增记录。
  //   assert(verifCodeId);

  //   // 根据 id 从数据库调取数据，验证是否与定义内容一致，是否正确生成 token 和 salt
  //   const verifCode = await ctx.model.Common.VerifCode.findByPk(verifCodeId);
  //   assert(verifCode);
  //   assert.equal(verifCode.applicantId, applicantId);
  //   assert.equal(verifCode.issuerId, issuerId);
  //   assert(verifCode.token);
  //   assert(verifCode.salt);
  // });


  it('测试重新生成的 token 字符串是否与数据表中记录的一致', async () => {
    // 此处强耦合数据库中 id 为 1 的行，此行是用于单元测试的模拟数据。！！请自行生成！！
    const id = 1;
    const verifData = await ctx.model.Common.VerifCode.findByPk(id);
    const { applicantId, issuerId, expiry, salt, token } = verifData;
    const genCode = await ctx.service.common.verifCode.generateVerifCode(applicantId, issuerId, expiry, salt);

    assert.strictEqual(genCode, token);
    // const encryptedId = ctx.service.common.verifCode.encryptId(id, secretKey);
    // assert(encryptedId);

    // const decryptedId = ctx.service.common.verifCode.decryptId(encryptedId, secretKey);
    // assert.strictEqual(decryptedId, id);
  });
});
