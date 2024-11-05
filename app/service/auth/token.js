'use strict';

const Service = require('egg').Service;
const jwt = require('jsonwebtoken'); // 引入 jsonwebtoken

/**
 *  用于完成前后端的鉴权
 *  规划中应该有以下三种形式
 *  1. 基于 JWT 的简单鉴权（student，guest）
 *  2. 基于 前后端 token 比对的增强鉴权（teacher，admin）
 *  3. 基于 websocket 的心跳包 （考试或其他需要服务器发送指令的模式）
 *
 *  目前，23-4-8 开始完善的是 1 JWT 的简单鉴权（暂时用于所有用户）
 */


class Token extends Service {
  async create(account) {
    // console.log(account);
    // console.log(this.app.config.jwt.secret);
    // 根据 account 生成 token
    // base_user_accounts {
    //   dataValues: { id: 2, status: 1 },
    //   _previousDataValues: { id: 2, status: 1 },
    //   uniqno: 1,
    //   _changed: Set(0) {},
    //   _options: {
    //     isNewRecord: false,
    //     _schema: null,
    //     _schemaDelimiter: '',
    //     raw: true,
    //     attributes: [ 'id', 'status' ]
    //   },
    //   isNewRecord: false
    // }

    const userIp = this.ctx.headers['x-forwarded-for'] || this.ctx.headers['x-real-ip'] || this.ctx.ip;
    console.log('remoteddr:', userIp);
    const remoteAddr = this.ctx.headers['x-real-ip'] || '192.168.72.256';

    // 利用 jswebtoken 生成 token
    const token = jwt.sign({
      // 载荷信息
      // {
      //   id: 2,
      //   status: 'ACTIVE',
      //   createdAt: '2023-03-15T01:06:50.000Z',
      //   loginPassword: '2823b13ece6ad1b6dd897a37bfa092b3e7379ef350e54f8bd8c12171e21c35fb5ea0d371812a0281a9d1106a871aa3f5249479e16d2eca3edda1af0a515774f5',
      //   loginAddr: '192.168.72.256',
      //   iat: 1730824871,
      //   exp: 1730857271
      // }
      ...account.dataValues,
      loginAddr: remoteAddr,
    }, this.app.config.jwt.jwtSecret, { expiresIn: this.app.config.jwt.expiresIn });

    // console.log(jwt.decode(token));
    return token;
  }
}

module.exports = Token;
