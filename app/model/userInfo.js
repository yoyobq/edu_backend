'use strict';

module.exports = app => {
  const { STRING, INTEGER, JSON } = app.Sequelize;

  const tbn = 'base_user_info';
  const UserInfo = app.model.define(tbn, {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accountId: {
      type: INTEGER,
      allowNull: false,
      field: 'account_id',
    },
    nickname: {
      type: STRING(50),
      allowNull: false,
    },
    avatar: {
      type: STRING(255),
    },
    email: {
      type: STRING(50),
      allowNull: false,
    },
    signature: {
      type: STRING(100),
    },
    accessGroup: {
      type: JSON,
      allowNull: false,
      field: 'access_group',
    },
    address: {
      type: STRING(255),
    },
    phone: {
      type: STRING(20),
    },
    // Sequ 不直接支持枚举类型，这是替代方案
    gender: {
      type: STRING(10),
    },
    tags: {
      type: JSON,
    },
    geographic: {
      type: JSON,
    },
    notifyCount: {
      type: INTEGER,
    },
    unreadCount: {
      type: INTEGER,
    },
  }, {
    freezeTableName: true,
    timestamps: true,
  });

  return UserInfo;
};


// mutation {
//   insertUserInfo(params: {
//     accountId: 15,  # 替换为真实的 accountId
//     name: "John Doe",
//     avatar: "http://example.com/avatar.jpg",
//     email: "john.doe@example.com",
//     signature: "Hello, world!",
//     accessGroup: ["guest"],  # 强制设置为 guest 权限
//     address: "123 Main St",
//     phone: "123-456-7890",
//     tags: ["tag1", "tag2"],
//     geographic: {
//       lat: 123.456,
//       long: -78.90
//     },
//     gender: MALE
//   }) {
//     id
//     accountId
//     name
//     avatar
//     email
//     signature
//     accessGroup
//     address
//     phone
//     tags
//     geographic
//     gender
//     createdAt
//     updatedAt
//   }
// }
