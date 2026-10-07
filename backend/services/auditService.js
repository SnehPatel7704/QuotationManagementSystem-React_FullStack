const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const logAudit = async (quotationId, userId, action, oldStatus, newStatus, notes = null) => {
  try {
    await prisma.quotationAuditLog.create({
      data: {
        quotationId,
        userId,
        action,
        oldStatus,
        newStatus,
        notes,
      },
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

module.exports = {
  logAudit,
};
