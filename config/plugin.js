'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  graphql: {
    enable: true,
    package: 'egg-graphql',
  },

  cors: {
    enable: true,
    package: 'egg-cors',
  },
};
