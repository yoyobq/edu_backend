/**
 * @file verifCode.js
 * @description 该服务负责生成和处理验证代码。
 * 采用异或（XOR）混淆来隐藏ID，并使用十六进制编码进一步模糊数据。
 * 这种方法确保生成的验证字符串安全且难以逆向工程。
 *
 * 主要功能:
 * - 通过异或混淆ID并进行十六进制编码来生成验证代码。
 * - 解码和去混淆验证代码以进行验证。
 *
 * 使用场景:
 * - 该服务可用于生成安全的验证链接，用于邮件确认、密码重置和其他用户身份验证任务。
 *
 * 安全性考虑:
 * - 异或混淆结合十六进制编码通过使得难以从验证代码推断出原始ID来增强安全性。
 * - 确保用于异或操作的密钥安全存储，不要在源代码中硬编码。
 *
 * 示例:
 * const encryptedId = encryptId('12345', 'your_secret_key');
 * console.log('加密后的ID:', encryptedId);
 *
 * const decryptedId = decryptId(encryptedId, 'your_secret_key');
 * console.log('解密后的ID:', decryptedId);
 *
 * @module service/common/verifCode
 */

// const crypto = require('crypto');

/**
 * 异或混淆函数，用于使用提供的密钥加密/解密输入。
 * @param {string} input - 要混淆的输入字符串。
 * @param {string} key - 用于异或操作的密钥。
 * @return {string} - 混淆后的字符串。
 */
function xorEncryptDecrypt(input, key) {
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
function toHex(str) {
  return Buffer.from(str, 'utf8').toString('hex');
}

/**
 * 将十六进制编码转换为字符串。
 * @param {string} hex - 要解码的十六进制字符串。
 * @return {string} - 解码后的字符串。
 */
function fromHex(hex) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

/**
 * 加密ID。
 * @param {string} id - 要加密的ID。
 * @param {string} key - 用于异或操作的密钥。
 * @return {string} - 加密后的ID。
 */
function encryptId(id, key) {
  const xorResult = xorEncryptDecrypt(id, key);
  return toHex(xorResult);
}

/**
 * 解密ID。
 * @param {string} encodedId - 要解密的ID。
 * @param {string} key - 用于异或操作的密钥。
 * @return {string} - 解密后的ID。
 */
function decryptId(encodedId, key) {
  const hexDecoded = fromHex(encodedId);
  return xorEncryptDecrypt(hexDecoded, key);
}

// 示例用法
const secretKey = 'your_secret_key';
const id = '12345';

// 加密ID
const encryptedId = encryptId(id, secretKey);
console.log('加密后的ID:', encryptedId);

// 解密ID
const decryptedId = decryptId(encryptedId, secretKey);
console.log('解密后的ID:', decryptedId);
