'use strict';
const Controller = require('egg').Controller;

class ChatController extends Controller {
  async sayhi() {
    this.ctx.body = 'hi';
  }

  async sendQuestionToProxy() {
    const { ctx } = this;
    const reqBody = ctx.request.body;
    // const { API_KEY, question, mode } = reqBody;
    let API_KEY = reqBody.API_KEY;
    const chatValue = reqBody.chatValue;
    // console.log(ctx.query);

    if (chatValue.messages.length > 20) {
      console.log(chatValue.messages.length);
      ctx.body = {
        success: false,
        errorCode: 2001,
        errorMessage: '问答轮次过限，请“清空”对话或“回撤”对话',
        host: ctx.request.header.host,
      };
      return;
    }

    if (!API_KEY) {
      // this.ctx.throw(500, "未设置有效的 API_KEY，若需帮助，请联系管理员。");
      API_KEY = process.env.OPENAI_API_KEY;
    }
    const url = 'http://157.245.34.52:8080';

    // 设置请求参数
    const query = chatValue;
    // 设置发往 proxy 的数据
    const data = {
      API_KEY,
      query,
      mode: 'chat',
    };

    try {
      // console.log(data);
      // 发送 POST 请求
      const response = await ctx.curl(url, {
        // 必须指定 method
        method: 'POST',
        // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
        contentType: 'json',
        data,
        // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
        dataType: 'json',
        // 防止超时
        timeout: 90000,
      });

      // 记录回答文本
      const answer = response.data.choices[0];
      // 显示 token 使用情况
      console.log(response.data.usage);
      // 向前端返回回答文本
      ctx.body = {
        success: true,
        data: {
          message: answer.message,
          usage: response.data.usage,
        },
        host: ctx.request.header.host,
      };
    } catch (error) {
      // console.log(error);
      let errorMessage;
      switch (error.res.statusCode) {
        case -1: errorMessage = '远程第三方服务器无法连接'; break;
        case -2: errorMessage = '远程第三方服务器响应超时'; break;
        case 404: errorMessage = '无效的 url'; break;
        default: errorMessage = error.message ? error.message : '未定义错误，请联系管理员提交 Bug';
      }

      ctx.body = {
        success: false,
        errorCode: error.res.statusCode,
        errorMessage,
        host: ctx.request.header.host,
      };
    }
  }
}

module.exports = ChatController;

// 这是中转服务器无法连接时候的出错信息
// {
//   errno: -111,
//   code: 'ECONNREFUSED',
//   syscall: 'connect',
//   address: '20.243.121.123',
//   port: 8080,
//   name: 'RequestError',
//   data: undefined,
//   path: '/',
//   status: -1,
//   headers: {},
//   res: {
//     status: -1,
//     statusCode: -1,
//     statusMessage: null,
//     headers: {},
//     size: 0,
//     aborted: false,
//     rt: 47,
//     keepAliveSocket: false,
//     data: undefined,
//     requestUrls: [ 'http://20.243.121.123:8080/' ],
//     timing: null,
//     remoteAddress: '',
//     remotePort: '',
//     socketHandledRequests: 1,
//     socketHandledResponses: 0
//   }
// }

// 这是超时出错信息
// {
//   requestId: 1,
//   data: undefined,
//   path: '/',
//   status: -2,
//   headers: {},
//   res: {
//     status: -2,
//     statusCode: -2,
//     statusMessage: null,
//     headers: {},
//     size: 0,
//     aborted: false,
//     rt: 6,
//     keepAliveSocket: false,
//     data: undefined,
//     requestUrls: [ 'http://20.243.121.123:8080/' ],
//     timing: null,
//     remoteAddress: '',
//     remotePort: '',
//     socketHandledRequests: 1,
//     socketHandledResponses: 0
//   }
// }


// 无 API_KEY
// {
//   "error": {
//       "message": "Incorrect API key provided: null. You can find your API key at https://platform.openai.com/account/api-keys.",
//       "type": "invalid_request_error",
//       "param": null,
//       "code": "invalid_api_key"
//   }
// }
