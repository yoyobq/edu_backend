'use strict';

module.exports = app => {
  const { router, controller } = app;

  // 测试用 router
  // router.resources('user', '/user', controller.deprecated.account);
  router.get('chat', '/chat', controller.ai.chat.sayhi);
  router.get('getSession', '/getSession', controller.mySSTS.getSession.index);
  // router.resources('qubankTableInfo', '/qubankTableInfo', controller.qubankTableInfo);
  // router.resources('account', '/account', controller.account);
  // router.resources('chat', '/chat', controller.chat);
  // post 默认访问的是 create，这是自定义的方法
  router.post('chat', '/chat', controller.ai.chat.sendQuestionToProxy);
  router.post('textGen', '/textGen', controller.ai.textGen.sendQuestionToProxy);
  // router.post('chat', '/chat', controller.ai.chat.sendQuestionToProxy);
  // router.post('textGen', '/textGen', controller.ai.textGen.sendQuestionToProxy);

  // // 加载 Controller 目录下的所有控制器文件，并绑定到对应的路由上。
  // // 请注意这段代码放在文件的最后，以确保先加载已经定义好的路由。
  // app.loader.loadController({
  //   // 设置 Controller 文件所在目录的绝对路径
  //   directory: app.config.baseDir + '/app/controller',
  //   // 匹配 Controller 文件的文件名模式
  //   match: '**/*.js',
  //   // 忽略某个目录下的 Controller 文件，这里忽略 admin 目录下的 Controller 文件
  //   ignore: 'admin/**/*.js',
  //   // 是否调用 Controller 时自动将其挂载到 app.controller 属性上
  //   call: true,
  //   // 指定命名方式，这里设置为大写命名方式（即驼峰命名）
  //   caseStyle: 'upper',
  //   // 是否覆盖已存在的同名方法
  //   override: true,
  // });
};
