'use strict';
// app/extend/helper.js
const jwt = require('jsonwebtoken');

module.exports = {
  parseInt(string) {
    if (typeof string === 'number') return string;
    if (!string) return string;
    return parseInt(string) || 0;
  },

  verifyToken(token, secret) {
    if (!token) {
      return {
        success: false,
        errorCode: 1001,
        errorMessage: 'Token 未提交',
      };
    }

    const parts = token.split(' ');
    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
      return {
        success: false,
        errorCode: 1002,
        errorMessage: 'Token 格式无效',
      };
    }

    try {
      const decoded = jwt.verify(parts[1], secret);
      return {
        success: true,
        payload: decoded,
      };
    } catch (err) {
      return {
        success: false,
        errorCode: 1003,
        errorMessage: 'Token 无效或过期',
      };
    }
  },
};
