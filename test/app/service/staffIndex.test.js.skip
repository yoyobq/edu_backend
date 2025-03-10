'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('service/user/staffIndex.js', () => {

  let ctx;
  before(async () => {
    ctx = app.mockContext();
  });

  describe('create()', () => {
    it('应该成功创建一个新的员工', async () => {
      const newStaff = { jobId: 5, name: 'npmTestMemberCreate' };
      const result = await ctx.service.user.staffIndex.create(newStaff);
      assert(result);
      assert(result.jobId === newStaff.jobId);
      assert(result.name === newStaff.name);

      // 清理测试数据
      await ctx.model.StaffIndex.destroy({ where: { jobId: newStaff.jobId } });
    });
  });

  describe('findByJobId()', () => {
    it('应该根据 jobId 查询到员工信息', async () => {
      const jobId = 1;
      const mockStaff = { jobId, name: 'npmTestMemberFindByJobId' };

      // 在数据库中创建一个模拟员工数据
      await ctx.model.StaffIndex.create(mockStaff);

      const result = await ctx.service.user.staffIndex.findByJobId(jobId);
      assert(result);
      assert(result.name === mockStaff.name);

      // 清理测试数据
      await ctx.model.StaffIndex.destroy({ where: { jobId } });
    });

    it('应该在 jobId 不存在时抛出 404 错误', async () => {
      try {
        await ctx.service.user.staffIndex.findByJobId(99999);
        assert.fail('应该抛出 404 错误');
      } catch (err) {
        assert(err.status === 404);
      }
    });
  });

  describe('findByName()', () => {
    it('应该根据姓名查询到员工信息', async () => {
      const name = 'npmTestMemberFindByJobName';
      const mockStaff = { jobId: 2, name };

      // 在数据库中创建一个模拟员工数据
      await ctx.model.StaffIndex.create(mockStaff);

      const result = await ctx.service.user.staffIndex.findByName(name);
      assert(result);
      assert(result.jobId === mockStaff.jobId);

      // 清理测试数据
      await ctx.model.StaffIndex.destroy({ where: { jobId: mockStaff.jobId } });
    });

    it('应该在姓名不存在时抛出 404 错误', async () => {
      try {
        await ctx.service.user.staffIndex.findByName('Nonexistent Name');
        assert.fail('应该抛出 404 错误');
      } catch (err) {
        assert(err.status === 404);
      }
    });
  });

  describe('exists()', () => {
    it('应该返回 true 如果存在指定 jobId 和 name 的员工', async () => {
      const mockStaff = { jobId: 3, name: 'npmTestExists' };

      // 在数据库中创建一个模拟员工数据
      await ctx.model.StaffIndex.create(mockStaff);

      const exists = await ctx.service.user.staffIndex.exists(mockStaff.jobId, mockStaff.name);
      assert(exists === true);

      // 清理测试数据
      await ctx.model.StaffIndex.destroy({ where: { jobId: mockStaff.jobId } });
    });

    it('应该返回 false 如果不存在指定 jobId 和 name 的员工', async () => {
      const exists = await ctx.service.user.staffIndex.exists(4, 'NonExistent Name');
      assert(exists === false);
    });
  });


  describe('update()', () => {
    it('应该成功更新一个已存在的员工', async () => {
      const jobId = 6;
      const newName = 'npmTestUpdateNew';

      // 在数据库中创建一个模拟员工数据
      await ctx.model.StaffIndex.create({ jobId, name: 'npmTestUpdateOld' });

      const result = await ctx.service.user.staffIndex.update({ jobId, name: newName });
      assert(result);
      assert(result.name === newName);

      // 清理测试数据
      await ctx.model.StaffIndex.destroy({ where: { jobId } });
    });

    it('应该在更新不存在的员工时抛出 404 错误', async () => {
      try {
        await ctx.service.user.staffIndex.update({ jobId: 9999, name: 'Does Not Exist' });
        assert.fail('应该抛出 404 错误');
      } catch (err) {
        assert(err.status === 404);
      }
    });
  });

  describe('delete()', () => {
    it('应该成功删除一个已存在的员工', async () => {
      const jobId = 7;

      // 在数据库中创建一个模拟员工数据
      await ctx.model.StaffIndex.create({ jobId, name: 'npmTestDelete' });

      const result = await ctx.service.user.staffIndex.delete(jobId);
      assert(result === true);

      try {
        await ctx.service.user.staffIndex.findByJobId(jobId);
        assert.fail('应该抛出 404 错误');
      } catch (err) {
        assert(err.status === 404);
      }
    });

    it('应该在删除不存在的员工时抛出 404 错误', async () => {
      try {
        await ctx.service.user.staffIndex.delete(9999);
        assert.fail('应该抛出 404 错误');
      } catch (err) {
        assert(err.status === 404);
      }
    });
  });

});
