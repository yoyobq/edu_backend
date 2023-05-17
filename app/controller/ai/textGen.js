'use strict';
const Controller = require('egg').Controller;

class TextGenController extends Controller {
  async sendQuestionToProxy() {
    const { ctx } = this;
    const reqBody = ctx.request.body;
    // const { API_KEY, question, mode } = reqBody;
    let API_KEY = reqBody.API_KEY;
    const question = reqBody.inputValue;
    const mode = reqBody.mode;
    // console.log(ctx.request.body);
    // console.log(ctx.query);

    if (!API_KEY) {
      // this.ctx.throw(500, "未设置有效的 API_KEY，若需帮助，请联系管理员。");
      API_KEY = process.env.OPENAI_API_KEY;
    }

    if (question.trim().length === 0) {
      this.ctx.throw(400, '问题为空');
    }

    // if (!configuration.apiKey) {
    //   this.ctx.throw(500, "未设置有效的 API_KEY，若需帮助，请联系管理员。");
    // }

    // curl -X POST -H "Content-Type: application/json" -d '{"question":"40岁人生的意义是什么？"}' http://20.243.121.123:8080/
    const url = 'http://157.245.34.52:8080';

    // 设置请求参数
    const query = {
      // gpt-3.5-turbo
      model: 'text-davinci-003',
      // 输入给 GPT 模型的文本信息，用于启发模型生成相关的文本
      prompt: question,
      // 用于控制 GPT 模型生成文本的多样性，取值范围为 0-1，数值越大则生成的文本越多样化，数值越小则生成的文本越保守。
      temperature: 0.6,
      // 使用 tokens 上限
      max_tokens: 1024,
      n: 1,
    };

    // 设置发往 proxy 的数据
    const data = {
      API_KEY,
      query,
      mode,
    };

    try {
      console.log(data);
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
        timeout: 60000,
      });
      // 记录回答文本
      const answer = response.data.choices[0].text;
      // 显示 token 使用情况
      console.log(response.data.usage);
      // 向前端返回回答文本
      ctx.body = answer;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = TextGenController;

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

//  gpt-3.5 接口分析
// question = {
//   model: "gpt-3.5-turbo",
//   messages: [
//     // {"role": "system", "content": "You are a helpful assistant."},
//     {"role": "user", "content": "Who won the world series in 2020?"},
//     // {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
//     // {"role": "user", "content": "Where was it played?"}
//   ],
//   // temperature: 1, // 默认 1，范围0-2 越高答题思路越宽
//   // top_p: 1, // 默认1，范围 0-2，不要和 temperature 一起修改
//   // n: 1, // number | optional | 1 | 最多返回几份答案
//   // stream: boolean | optional | false | 像官网一样流式传输结果
//   // stop: string or array | optional | null | 终止流式传输的字符
//   max_tokens: 512, // int | optional | infinite | 最高 2048，太低没用 | 每次最多使用多少 token
//   // presence_penalty: number | optional | 0 | -2 to 2 | 正值允许创新，负值防止跑题
//   // frequency_penalty: number | optional | 0 | -2 to 2 | 正值防止逐字重复同一行
//   // logit_bias: map | optional | null 没看懂
//   // user: string | optional 用户标识符
// }
