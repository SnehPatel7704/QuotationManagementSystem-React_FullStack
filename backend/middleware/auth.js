const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate JWT tokens
 * Extracts user info from token and attaches to req.user
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        companyId: true,
        enabled: true,
        company: {
          select: { isActive: true },
        },
      },
    });

    if (!user || !user.enabled) {
      return res.status(401).json({ message: 'Account is unavailable' });
    }
    if (user.role !== 'SUPERADMIN' && (!user.companyId || !user.company?.isActive)) {
      return res.status(403).json({ message: 'The user account is not assigned to an active company.' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return next(error);
  }
}

/**
 * Middleware factory to authorize specific roles
 * Usage: authorize('SUPERADMIN', 'ADMIN')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Remove ROLE_ prefix if present (Spring Security compatibility)
    const userRole = req.user.role.replace('ROLE_', '');

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden - insufficient permissions' });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
