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
 * 获取验证码。如果已存在未过期的验证码则返回该验证码，否则生成新的验证码。
 * @param {object} params - 包含所有参数的对象。

 * @param {string} params.applicantType - 申请类型（注册，密码重置）。
 * @param {object} params.data - 申请时携带的自定义数据（JSON 对象）。
 * @param {number} params.applicantId - 申请者ID。
 * @param {number} params.issuerId - 发行者ID（响应申请的管理员）。
 * @param {number} params.expiryTime - 验证码的有效期（毫秒）。

 * @return {Promise<string>} - 返回生成的验证码字符串（已存在的或新生成的）。
 */
  async getVerifCode({ applicantType, data, applicantId, issuerId, expiryTime }) {
    const verifCodeRecord = await this.checkValidCode(applicantType, applicantId, issuerId, data);

    if (verifCodeRecord) {
      const encryptedId = this.encryptId(verifCodeRecord.id);
      return verifCodeRecord.token.slice(0, 56) + encryptedId;
    }

    return await this.genVerifCode(applicantType, data, applicantId, issuerId, expiryTime);
  }

  /**
   * 生成验证字符串并生成数据库记录，根据字符串和返回的记录 id，生成最终的 VerifCode
   * @param {string} applicantType - 申请类型（注册，密码重置）
   * @param {object} data - 申请时携带的自定义数据（JSON 对象）
   * @param {number} applicantId - 申请者ID。
   * @param {number} issuerId - 发行者ID（响应申请的管理员）。
   * @param {number} expiryTime - 验证代码的有效期（毫秒）。
   * @param {string} [salt] - 可选参数，如果传入则使用此盐值，否则生成新的盐。
   * @return {number} - 生成的验证字符串在数据表中的ID。
   */
  async genVerifCode(applicantType, data, applicantId, issuerId, expiryTime) {
    console.log('gen start');
    // 生成盐
    const salt = crypto.randomBytes(8).toString('hex');
    // 计算过期时间
    const expiry = Date.now() + expiryTime;
    // 生成 hash 字符串
    const hashStr = this.generateHashStr(applicantType, applicantId, issuerId, expiry, salt);
    // 存储到数据库
    const id = await this.storeVeriCode(applicantType, data, applicantId, issuerId, expiry, salt, hashStr);
    // 加密混淆 ID
    const encryptedId = this.encryptId(id);
    return hashStr.slice(0, 56) + encryptedId;
  }

  /**
 * 根据旧记录生成新的 verifCode。
 * @param {object} record - 数据库中的验证码记录。
 * @param {string} record.applicantType - 申请类型（注册，密码重置）。
 * @param {object} record.data - 申请时携带的自定义数据（JSON 对象）。
 * @param {number} record.applicantId - 申请者ID。
 * @param {number} record.issuerId - 发行者ID（响应申请的管理员）。
 * @param {number} record.expiry - 验证代码的到期时间戳（从数据库记录中获取）。
 * @param {string} record.salt - 生成验证字符串的盐值。
 * @return {string} - 返回重新生成的验证字符串。
 */
  async regenerateVerifCode(record) {
    const { applicantType, applicantId, issuerId, expiry, salt, data } = record;
    console.log(data);

    // 使用旧记录中的数据生成 hash 字符串
    const hashStr = this.generateHashStr(applicantType, applicantId, issuerId, expiry, salt);

    return hashStr.slice(0, 56);
  }

  /**
   * 检查数据库中是否存在未过期的验证码。
   * @param {string} applicantType - 申请类型（注册，密码重置）
   * @param {object} data - 申请时携带的自定义数据（JSON 对象）
   * @param {number} applicantId - 申请者ID。
   * @param {number} issuerId - 发行者ID（响应申请的管理员）
   * @param {number} expiryTime - 验证码的过期时间戳（毫秒）。
   * @return {object|null} - 返回未过期的验证码记录对象，如果不存在则返回 null。
   */
  async checkValidCode(applicantType, applicantId, issuerId, data) {
    // 检查数据库中是否已存在未过期的验证码
    const verifCodeRecord = await this.ctx.model.Common.VerifCode.findOne({
      where: {
        applicantType,
        data,
        applicantId,
        issuerId,
        expiry: {
          // 在这段代码中，expiry 字段的值是一个时间戳，代表验证码的过期时间。
          // 通过查询 expiry 是否大于当前时间戳 Date.now()，就可以判断该验证码是否未过期（未过期的记录）。
          [this.ctx.model.Sequelize.Op.gt]: Date.now(),
        },
      },
    });

    return verifCodeRecord;
  }

  /**
   * 存储验证记录到数据库。
   *
   * @param {string} applicantType - 申请类型（例如：注册、密码重置）。
   * @param {object} data - 申请时携带的自定义数据（JSON 对象）。
   * @param {number} applicantId - 申请者的唯一标识符。
   * @param {number} issuerId - 发行者的唯一标识符（响应申请的管理员）。
   * @param {number} expiry - 验证码的过期时间戳（毫秒）。
   * @param {string} salt - 用于生成验证字符串的盐值。
   * @param {string} token - 生成的验证字符串（尽管不再需要，但保留以便于调试）。
   *
   * @return {number} - 返回生成的验证记录在数据库中的唯一标识符（ID）。
   */
  async storeVeriCode(applicantType, data, applicantId, issuerId, expiry, salt, token) {
    // 存储到数据库
    const verifRecord = await this.ctx.model.Common.VerifCode.create({
      applicantType,
      data,
      applicantId,
      issuerId,
      expiry,
      token, // token 靠实时计算更可靠
      salt,
    });

    return verifRecord.id;
  }

  /**
   * 验证传入的 verifCode。
   * @param {string} verifCode - 需要验证的验证码。
   * @return {Promise<boolean>} - 验证结果，布尔值表示验证码是否有效。
   */
  async checkVerifCode(verifCode) {
  // 截取 verifCode 的后 8 位，并通过 decryptId 解密获取记录 ID
    const encryptedId = verifCode.slice(56, 64);
    const id = this.decryptId(encryptedId);

    // 根据 ID 从数据库中获取相应的记录
    const verifCodeRecord = await this.ctx.model.Common.VerifCode.findByPk(id);

    if (!verifCodeRecord) {
      return false; // 如果没有找到对应的记录，验证失败
    }

    // 使用记录中的信息再次生成验证码
    const regeneratedCodePart = await this.regenerateVerifCode(verifCodeRecord);

    // 对比传入的 verifCode 和 生成的验证码的前 56 位
    const originalCodePart = verifCode.slice(0, 56);
    console.log(originalCodePart);
    console.log(regeneratedCodePart);

    return originalCodePart === regeneratedCodePart;
  }

  /**
 * 生成哈希字符串
 * @param {string} applicantType - 申请类型（注册，密码重置）
 * @param {number} applicantId - 申请者的唯一标识 ID。
 * @param {number} issuerId - 发行者（通常是管理员）的唯一标识 ID。
 * @param {number} expiry - 验证代码的到期时间，作为 Unix 时间戳（以毫秒为单位）。
 * @param {string} salt - 8 位 16 进制字符串作随机盐。
 * @return {string} - 生成的 64 个字符长度的 16 进制哈希验证字符串。
 */
  generateHashStr(applicantType, applicantId, issuerId, expiry, salt) {
    const data = JSON.stringify({ applicantType, applicantId, issuerId, expiry });
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
