'use strict';

module.exports = app => {
  const { router, controller } = app;
  router.resources('users', '/users', controller.users);
};
