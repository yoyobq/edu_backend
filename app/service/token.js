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
  async create() {
    console.log('here');
    console.log(this.app.config.jwt.secret);
    // console.log(process.env.OPENAI_API_KEY);
    return;
  }
}

module.exports = Token;
