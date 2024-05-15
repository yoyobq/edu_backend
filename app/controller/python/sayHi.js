'use strict';
const Controller = require('egg').Controller;
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

class BasicPythonTemplateController extends Controller {
  async index() {
    const { ctx } = this;

    // 定义要执行的 Python 脚本路径
    const pythonScriptPath = path.resolve(__dirname, '../../service/python/saySth.py');
    // 定义要传递给 Python 脚本的参数
    const word = 'hi';

    // 构造完整的命令字符串
    const command = `python ${pythonScriptPath} -word ${word}`;

    // 请注意此处的异步 await 和在引用申明中改造 exec 为异步函数的方式
    await exec(command)
      .then(({ stdout, stderr }) => {
        // 打印 Python 脚本的输出
        console.log('Python script output:', stdout);
        // 返回执行结果
        this.ctx.body = {
          success: true,
          data: {
            message: stdout, // 使用 Python 脚本的输出作为消息
            stderr,
          },
          host: ctx.request.header.host,
        };
      })
      .catch(err => {
        console.error('Python script execution error:', err);
        // 如果发生错误，返回错误信息
        this.ctx.status = 500; // 设置状态码为 500，表示服务器错误
        this.ctx.body = {
          success: false,
          data: {
            message: 'Internal server error',
            error: err, // 将错误信息返回给客户端
          },
        };
      });


    // this.ctx.body = {
    //   success: true,
    //   data: {
    //     message: '/BasicPythonTemplateController say hi',
    //   },
    //   host: ctx.request.header.host,
    // };
  }
}

module.exports = BasicPythonTemplateController;

