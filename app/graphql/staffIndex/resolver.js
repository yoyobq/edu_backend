'use strict';

module.exports = {
  Query: {
    async getNameByJobId(_, { jobId }, { connector }) {
      const result = await connector.staffIndex.getByJobId(jobId);
      return result ? result.name : null;
    },
    async getJobIdByName(_, { name }, { connector }) {
      const result = await connector.staffIndex.getByName(name);
      return result ? result.job_Id : null;
    },
    async existsStaffIndex(_, { jobId, name }, { connector }) {
      const exists = await connector.staffIndex.exists({ jobId, name });
      return exists;
    },
  },
  Mutation: {
    async createStaffIndex(_, { jobId, name }, { connector }) {
      const result = await connector.staffIndex.create({ jobId, name });
      return result;
    },
    async updateStaffIndex(_, { jobId, name }, { connector }) {
      const result = await connector.staffIndex.update({ jobId, name });
      return result;
    },
    async deleteStaffIndex(_, { jobId }, { connector }) {
      const result = await connector.staffIndex.delete(jobId);
      return !!result;
    },
  },
};
