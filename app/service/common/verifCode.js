'use strict';

/**
 * @file verifCode.js
 * @description 该服务负责生成和处理验证代码。
 * 采用异或（XOR）混淆来隐藏ID，并使用十六进制编码进一步模糊数据。
 * 这种方法确保生成的验证字符串安全且难以逆向工程。
 *
 * 主要功能:
 * - 使用SHA-256算法生成哈希字符串并存储到数据库中。
 * - 通过异或混淆ID并进行十六进制编码来生成验证代码的后 8 位。
 * - 哈希代码的前 56 位与混淆后的 8 位 id 合并成公开的验证代码
 * - 解码和去混淆验证代码以进行验证。
 *
 * 使用场景:
 * - 该服务可用于生成安全的验证链接，用于邮件确认、密码重置和其他用户身份验证任务。
 *
 * 安全性考虑:
 * - 异或混淆结合十六进制编码通过使得难以从验证代码推断出原始ID来增强安全性。
 * - 确保用于异或操作的密钥安全存储，不要在源代码中硬编码。
 *
 * @module service/common/verifCode
 */

const crypto = require('crypto');
const Service = require('egg').Service;

class VerifCode extends Service {
  /**
   * 生成验证字符串并生成数据库记录，根据字符串和返回的记录 id，生成最终的 VerifCode
   * @param {number} applicantId - 申请者ID。
   * @param {number} issuerId - 发行者ID（响应申请的管理员）。
   * @param {number} expiryTime - 验证代码的有效期（毫秒）。
   * @return {number} - 生成的验证字符串在数据表中的ID。
   */
  async generateVerifCode(applicantId, issuerId, expiryTime) {
    // 生成盐
    const salt = crypto.randomBytes(8).toString('hex');

    // 计算过期时间
    const expiry = Date.now() + expiryTime;

    // 生成 hash 字符串
    const hashStr = this.generateHashStr(applicantId, issuerId, expiry, salt);

    // 存储到数据库
    const id = await this.storeVeriCode(applicantId, issuerId, expiry, salt, hashStr);

    // 加密混淆 ID
    const encryptedId = this.encryptId(id);

    return hashStr.slice(0, 56) + encryptedId;
  }


  async storeVeriCode(applicantId, issuerId, expiry, salt, token) {
    // 存储到数据库
    const verifRecord = await this.ctx.model.Common.VerifCode.create({
      applicantId,
      issuerId,
      expiry,
      token, // token 其实已经不需要，但仍然保留，方便调试
      salt,
    });

    return verifRecord.id;
  }


  /**
 * 生成哈希字符串
 * @param {number} applicantId - 申请者的唯一标识 ID。
 * @param {number} issuerId - 发行者（通常是管理员）的唯一标识 ID。
 * @param {number} expiry - 验证代码的到期时间，作为 Unix 时间戳（以毫秒为单位）。
 * @param {string} salt - 8 位 16 进制字符串作随机盐。
 * @return {string} - 生成的 64 个字符长度的 16 进制哈希验证字符串。
 */
  generateHashStr(applicantId, issuerId, expiry, salt) {
    const data = JSON.stringify({ applicantId, issuerId, expiry });
    const hashStr = crypto.createHmac('sha256', salt).update(data).digest('hex');

    return hashStr;
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
   * 对 32 位整数 ID 进行加密。
   *
   * 传入的 ID 应为 32 位整数。考虑到实际使用中的 ID 增长情况，
   * 学院每年 6000 人全部计入，每人每年申请 5 次验证码，
   * 也无法达到 43 亿的最大值，所以是安全的。
   * 该函数将使用特定的加密算法对其进行处理。
   *
   * @param {string} id - 要加密的ID。
   * @return {string} - 加密后的ID。
   */
  encryptId(id) {
    // 用于混淆的常量
    const skr = 98114514;

    // 确保 ID 在 32 位范围内
    if (id < 0 || id > 0xFFFFFFFF) {
      this.ctx.throw('数据库返回的新纪录 ID 超出 32 位整数范围，此错误不应该发生，及时报告管理员有奖励');
    }
    // 进行 Xor 混淆
    // eslint-disable-next-line no-bitwise
    const xorResult = id ^ skr;
    // 将混淆后的 id 转为 16 进制，并补齐 8 位
    const hexStr = xorResult.toString(16).padStart(8, '0');
    return hexStr;
  }

  /**
   * 解密ID。
   * @param {string} encodedId - 要解密的ID。
   * @return {string} - 解密后的ID。
   */
  decryptId(encodedId) {
    // 用于混淆的常量
    const skr = 98114514;
    const hexDecoded = parseInt(encodedId, 16);
    // eslint-disable-next-line no-bitwise
    const id = hexDecoded ^ skr;
    return id;
  }
}


module.exports = VerifCode;
