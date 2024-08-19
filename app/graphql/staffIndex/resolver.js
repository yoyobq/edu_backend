'use strict';

module.exports = {
  Query: {
    async getNameByJobId(_, { jobId }, { connector }) {
      const result = await connector.memberStaff.getByJobId(jobId);
      return result ? result.name : null;
    },
    async getJobIdByName(_, { name }, { connector }) {
      const result = await connector.memberStaff.getByName(name);
      return result ? result.job_Id : null;
    },
    async existsMemberStaff(_, { jobId, name }, { connector }) {
      const exists = await connector.memberStaff.exists({ jobId, name });
      return exists;
    },
  },
  Mutation: {
    async createMemberStaff(_, { jobId, name }, { connector }) {
      const result = await connector.memberStaff.create({ jobId, name });
      return result;
    },
    async updateMemberStaff(_, { jobId, name }, { connector }) {
      const result = await connector.memberStaff.update({ jobId, name });
      return result;
    },
    async deleteMemberStaff(_, { jobId }, { connector }) {
      const result = await connector.memberStaff.delete(jobId);
      return !!result;
    },
  },
};
