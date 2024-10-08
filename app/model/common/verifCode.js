'use strict';

/**
 * @file verif_code.js
 * @description 定义用于存储和处理验证代码的数据库模型。
 *
 * 主要功能:
 * - 存储申请者ID、发行者ID、创建时间、过期时间、验证字符串和盐值。
 * - 使用 Sequelize 自动管理创建时间字段。
 *
 * 使用场景:
 * - 该模型用于在数据库中保存和查询验证代码记录，支持用户身份验证等功能。
 *
 * 安全性考虑:
 * - 确保验证字符串和盐值的生成和存储安全。
 *
 * @module model/common/verif_code
 */

module.exports = app => {
  const { STRING, INTEGER, ENUM, JSON, BIGINT } = app.Sequelize;

  const tbn = 'common_verif_code';

  const VerifCode = app.model.define(tbn, {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    applicantId: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'applicant_id',
    }, // 申请者ID，默认值为0
    applicantType: {
      type: ENUM('register', 'other'),
      allowNull: false,
      defaultValue: 'other',
      field: 'applicant_type',
    }, // 申请类型，默认是 other
    issuerId: {
      type: INTEGER,
      allowNull: false,
      field: 'issuer_id',
    }, // 发行者ID（响应申请的管理员）
    data: {
      type: JSON,
      allowNull: true,
      field: 'data',
    }, // 附加数据，可以为空
    expiry: {
      type: BIGINT,
      allowNull: false,
    },
    token: {
      type: STRING(64),
      allowNull: false,
    }, // SHA-256生成的哈希值，长度为64
    salt: {
      type: STRING(16),
      allowNull: false,
    }, // 盐的长度为16
  }, {
    timestamps: true,
    createdAt: 'created_at', // 自动管理的创建时间字段
    updatedAt: false, // 禁用自动管理的更新时间字段
    freezeTableName: true,
  });

  return VerifCode;
};
