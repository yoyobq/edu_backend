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

  sequelize: {
    enable: true,
    package: 'egg-sequelize',
  },

  passport: {
    enable: true,
    package: 'egg-passport',
  },

  passportLocal: {
    enable: true,
    package: 'egg-passport-local',
  },

  jwt: {
    enable: true,
    package: 'egg-jwt',
  },
};
