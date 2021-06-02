'use strict';

module.exports = app => {
  const { router, controller } = app;

  // 测试用 router
  router.resources('user', '/user', controller.user);
  router.resources('qubankTableInfo', '/qubankTableInfo', controller.qubankTableInfo);
  router.resources('question', '/question', controller.question);
};
