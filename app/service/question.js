/*
 * 2021-06-02
 * 这里是因为 sequezlize 并不支持动态表名，所以搞的一个临时的解决方案，
 * 所谓动态表名：一张很大的表，为了性能着想，分成很多张字段名和数据结构都一样的小表，叫水平分割，是数据库优化的一种常见办法。
 * 由于对 sequezlize 的理解还不够，所以用这种方法尝试解决上述问题，今后如有需要，会尝试改进。
 *
 * TODO: 改进思路，做一张和当前数据表数据结构一致的 base model, 每次读取此 model 的时候都同时导入真正想引用的目标数据。
 *
 */

'use strict';

const Service = require('egg').Service;
const { QueryTypes } = require('sequelize');

class Questions extends Service {
  async list({ offset = 0, limit = 10, tableName }) {
    // const tableName = 'qubank_wlgjg_2104';

    // 这么写是为了方便看引用字段，也防止有人篡改 tableName 造成数据泄露
    const sqlStr = `
      SELECT
        \`id\`,
        \`custom_id\`,
        \`topic\`,
        \`a\`,
        \`b\`,
        \`c\`,
        \`d\`,
        \`e\`,
        \`f\`,
        \`g\`,
        \`answer\`,
        \`type\`,
        \`chapter\`,
        \`pic_path\`
      FROM
        \`${tableName}\`
      ORDER BY
        \`custom_id\` ASC
      LIMIT
        ${offset}, ${limit}
    `;

    const questions = await this.app.model.query(sqlStr, { type: QueryTypes.SELECT });
    return questions;
  }

  async find(id, tableName) {
    // const tableName = 'qubank_wlgjg_2104';
    const sqlStr = `
    SELECT
      \`id\`,
      \`custom_id\`,
      \`topic\`,
      \`a\`,
      \`b\`,
      \`c\`,
      \`d\`,
      \`e\`,
      \`f\`,
      \`g\`,
      \`answer\`,
      \`type\`,
      \`chapter\`,
      \`pic_path\`
    FROM
      \`${tableName}\`
    WHERE
      \`id\` = ${id}
  `;

    const question = await this.ctx.model.query(sqlStr, { type: QueryTypes.SELECT });

    // 注意: 返回的数据集是个"数组", 由于是根据主键，只要正确读取数据，只可能是一条，所以question[0]
    if (!question[0]) {
      this.ctx.throw(404, 'question not found');
    }
    return question[0];
  }
}

module.exports = Questions;
