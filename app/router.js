'use strict';

module.exports = app => {
  const { router, controller } = app;
  router.resources('user', '/user', controller.user);
  router.resources('qubankTableInfo', '/qubankTableInfo', controller.qubankTableInfo);
};
