'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const tbn = 'qubank_table_info';
  const QubankTableInfo = app.model.define('qubank_table_info', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tableName: {
      type: STRING(255),
      allowNull: false,
      field: 'table_name',
    },
    tableInfo: {
      type: STRING(255),
      field: 'table_info',
    },
    testItemStr: {
      type: STRING(255),
      field: 'test_item_str',
    },
    // created_at: {
    //   type: DATE,
    //   defaultValue: NOW, // Date.now()
    // },
    // updated_at: {
    //   type: DATE,
    //   defaultValue: NOW,
    //   onUpdate: NOW,
    // },
    setUserId: {
      type: INTEGER,
      field: 'set_user_id',
    },
    remark: STRING(255),
  }, {
    // freezeTableName: true,
    timestamps: true,
    tableName: tbn,
    // underscored: true,
  });

  // User.prototype.associate = function() {
  //   app.model.User.hasMany(app.model.Post, { as: 'posts' });
  // };
  return QubankTableInfo;
};
