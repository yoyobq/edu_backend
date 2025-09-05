'use strict';

module.exports = app => {
  const { STRING, INTEGER, JSON, DATEONLY, ENUM } = app.Sequelize;

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
    gender: {
      type: ENUM('MALE', 'FEMALE', 'SECRET'), // 修正：改为ENUM类型
      allowNull: true,
      defaultValue: 'SECRET',
    },
    birthDate: {
      type: DATEONLY,
      allowNull: true, // 修正：改为允许NULL
      field: 'birth_date',
    },
    avatar: {
      type: STRING(255),
      allowNull: true,
    },
    email: {
      type: STRING(50),
      allowNull: false,
    },
    signature: {
      type: STRING(100),
      allowNull: true,
    },
    accessGroup: {
      type: JSON,
      allowNull: false,
      field: 'access_group',
    },
    address: {
      type: STRING(255),
      allowNull: true,
    },
    phone: {
      type: STRING(20),
      allowNull: true,
    },
    tags: {
      type: JSON,
      allowNull: true,
    },
    geographic: {
      type: JSON,
      allowNull: true,
    },
    metaDigest: { // 新增字段
      type: STRING(255),
      allowNull: true,
      field: 'meta_digest',
    },
    notifyCount: {
      type: INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'notify_count',
    },
    unreadCount: {
      type: INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'unread_count',
    },
    userState: { // 新增字段
      type: ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'),
      allowNull: true,
      defaultValue: 'PENDING',
      field: 'user_state',
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
