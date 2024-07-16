'use strict';

const Service = require('egg').Service;

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

    // console.log(account.dataValues);

    const remoteAddr = this.ctx.headers['x-real-ip'] || '192.168.72.256';

    // 利用 egg-jwt 生成 token
    const token = this.app.jwt.sign({
      // 载荷信息
      // {
      //   id: 2,
      //   status: 1,
      //   loginAddr: '192.168.72.256', // dev 下给的错误 IP，方便识别
      //   iat: 1681094553,
      //   exp: 1681180953
      // }
      ...account.dataValues,
      loginAddr: remoteAddr,
    }, this.app.config.jwt.secret, { expiresIn: this.app.config.jwt.expiresIn });

    // console.log(this.app.jwt.decode(token));
    return token;
  }
}

module.exports = Token;
