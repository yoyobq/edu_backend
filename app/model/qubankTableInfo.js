'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, NOW } = app.Sequelize;

  const tbn = 'qubank_table_info';
  const QubankTableInfo = app.model.define('qubank_table_info', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    table_name: {
      type: STRING(255),
      allowNull: false,
    },
    table_info: STRING(255),
    test_item_str: STRING(50),
    created_at: {
      type: DATE,
      defaultValue: NOW, // Date.now()
    },
    updated_at: {
      type: DATE,
      defaultValue: NOW,
      onUpdate: NOW,
    },
    set_user_id: INTEGER,
    remark: STRING(255),
  }, {
    // freezeTableName: true,
    timestamps: true,
    tableName: tbn,
  });

  // User.prototype.associate = function() {
  //   app.model.User.hasMany(app.model.Post, { as: 'posts' });
  // };

  return QubankTableInfo;
};
