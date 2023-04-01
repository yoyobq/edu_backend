'use strict';

module.exports = app => {
  const { router, controller } = app;

  // 测试用 router
  // router.resources('user', '/user', controller.user);
  router.resources('qubankTableInfo', '/qubankTableInfo', controller.qubankTableInfo);
  // router.resources('account', '/account', controller.account);
  // router.resources('chat', '/chat', controller.chat);
  // post 默认访问的是 create，这是自定义的方法
  router.post('/chat', controller.chat.sendQuestionToProxy);
  router.post('/textGen', controller.textGen.sendQuestionToProxy);
};
