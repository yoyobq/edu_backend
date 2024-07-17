'use strict';

/**
 * @file verifCode.js
 * @description 该服务负责生成和处理验证代码。
 * 采用异或（XOR）混淆来隐藏ID，并使用十六进制编码进一步模糊数据。
 * 这种方法确保生成的验证字符串安全且难以逆向工程。
 *
 * 主要功能:
 * - 通过异或混淆ID并进行十六进制编码来生成验证代码。
 * - 解码和去混淆验证代码以进行验证。
 * - 使用SHA-256算法生成验证字符串并存储到数据库中。
 *
 * 使用场景:
 * - 该服务可用于生成安全的验证链接，用于邮件确认、密码重置和其他用户身份验证任务。
 *
 * 安全性考虑:
 * - 异或混淆结合十六进制编码通过使得难以从验证代码推断出原始ID来增强安全性。
 * - 确保用于异或操作的密钥安全存储，不要在源代码中硬编码。
 *
 * 示例:
 * const encryptedId = encryptId(12345, 'your_secret_key');
 * console.log('加密后的ID:', encryptedId);
 *
 * const decryptedId = decryptId(encryptedId, 'your_secret_key');
 * console.log('解密后的ID:', decryptedId);
 *
 * @module service/common/verifCode
 */

const crypto = require('crypto');
const Service = require('egg').Service;

class VerifCode extends Service {
  /**
   * 生成验证代码。
   * @param {number} applicantId - 申请者ID。
   * @param {number} issuerId - 发行者ID（响应申请的管理员）。
   * @param {number} expiryTime - 验证代码的有效期（毫秒）。
   * @return {number} - 生成的验证代码记录的ID。
   */
  async generateVerificationCode(applicantId, issuerId, expiryTime) {
    // 生成盐
    const salt = crypto.randomBytes(8).toString('hex');

    // 生成验证字符串
    const data = JSON.stringify({ applicantId, issuerId, timestamp: Date.now(), expiryTime });
    const token = crypto.createHmac('sha256', salt).update(data).digest('hex');

    // 计算过期时间
    const expiry = new Date(Date.now() + expiryTime);

    // 存储到数据库
    const verifRecord = await this.ctx.model.Common.VerifCode.create({
      applicant_id: applicantId,
      issuer_id: issuerId,
      expiry,
      token,
      salt,
    });

    return verifRecord.id;
  }

  /**
   * 异或混淆函数，用于使用提供的密钥加密/解密输入。
   * @param {number} input - 要混淆的输入 id。
   * @param {string} key - 用于异或操作的密钥。
   * @return {string} - 混淆后的字符串。
   */
  xorEncryptDecrypt(input, key) {
    input = input.toString(); // 将 input 转换为字符串
    const output = [];
    for (let i = 0; i < input.length; i++) {
      // eslint-disable-next-line no-bitwise
      output.push(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }

    return String.fromCharCode.apply(String, output);
  }

  /**
   * 将字符串转换为十六进制编码。
   * @param {string} str - 要编码的字符串。
   * @return {string} - 编码后的十六进制字符串。
   */
  toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
  }

  /**
   * 将十六进制编码转换为字符串。
   * @param {string} hex - 要解码的十六进制字符串。
   * @return {string} - 解码后的字符串。
   */
  fromHex(hex) {
    return Buffer.from(hex, 'hex').toString('utf8');
  }

  /**
   * 加密ID。
   * @param {string} id - 要加密的ID。
   * @param {string} key - 用于异或操作的密钥。
   * @return {string} - 加密后的ID。
   */
  encryptId(id, key) {
    const xorResult = this.xorEncryptDecrypt(id, key);
    return this.toHex(xorResult);
  }

  /**
   * 解密ID。
   * @param {string} encodedId - 要解密的ID。
   * @param {string} key - 用于异或操作的密钥。
   * @return {string} - 解密后的ID。
   */
  decryptId(encodedId, key) {
    const hexDecoded = this.fromHex(encodedId);
    const decCodeId = this.xorEncryptDecrypt(hexDecoded, key);
    // console.log(decCodeId, typeof decCodeId);
    return parseInt(decCodeId, 10);
  }
}


module.exports = VerifCode;
