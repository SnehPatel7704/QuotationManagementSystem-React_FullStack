const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const validRoles = ['SUPERADMIN', 'ADMIN', 'USER'];
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Admin and Superadmin access
router.use(authenticate, authorize('ADMIN', 'SUPERADMIN'));

// Get all users
router.get('/', async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        enabled: true,
        companyId: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user
router.post('/', async (req, res) => {
  let { username, password, email, role, companyId } = req.body;
  try {
    username = typeof username === 'string' ? username.trim() : '';
    email = typeof email === 'string' ? email.trim() : '';
    role = role || 'USER';
    if (!username || username.length > 50 || !isValidEmail(email) ||
      typeof password !== 'string' || password.length < 8 ||
      !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Provide a valid username, email, role, and password of at least 8 characters.' });
    }

    if (req.user.role === 'ADMIN') {
      if (role === 'SUPERADMIN' || role === 'ADMIN') {
        return res.status(403).json({ message: 'ADMINs can only create USER roles' });
      }
      companyId = req.user.companyId; // Force to their own company
    }

    if (role !== 'SUPERADMIN') {
      companyId = Number(companyId);
      if (!Number.isInteger(companyId) || companyId <= 0) {
        return res.status(400).json({ message: 'A valid company is required for ADMIN and USER accounts.' });
      }
      const company = await prisma.company.findFirst({
        where: { id: companyId, isActive: true },
        select: { id: true },
      });
      if (!company) {
        return res.status(400).json({ message: 'The selected company does not exist or is inactive.' });
      }
    } else {
      companyId = null;
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        role,
        companyId,
        enabled: true,
      },
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      enabled: user.enabled,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user details or role
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { username, password, email, role, enabled, companyId } = req.body;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'User ID must be a positive integer.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    if (existing.id === req.user.id && enabled === false) {
      return res.status(409).json({ message: 'You cannot disable your own account.' });
    }
    
    if (req.user.role === 'ADMIN') {
      if (existing.companyId !== req.user.companyId) {
        return res.status(403).json({ message: 'Cannot edit user outside your company' });
      }
      if (role && (role === 'ADMIN' || role === 'SUPERADMIN')) {
        return res.status(403).json({ message: 'Cannot elevate roles' });
      }
    }

    const updateData = {};
    if (username !== undefined) {
      const normalizedUsername = typeof username === 'string' ? username.trim() : '';
      if (!normalizedUsername || normalizedUsername.length > 50) {
        return res.status(400).json({ message: 'Username must contain between 1 and 50 characters.' });
      }
      updateData.username = normalizedUsername;
    }
    if (email !== undefined) {
      const normalizedEmail = typeof email === 'string' ? email.trim() : '';
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Provide a valid email address.' });
      }
      updateData.email = normalizedEmail;
    }
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'enabled must be a boolean.' });
      }
      updateData.enabled = enabled;
    }
    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid user role.' });
      }
      updateData.role = role;
    }
    if (req.user.role === 'SUPERADMIN' && companyId !== undefined) {
      const targetCompanyId = companyId === null || companyId === '' ? null : Number(companyId);
      if (targetCompanyId !== null) {
        if (!Number.isInteger(targetCompanyId) || targetCompanyId <= 0) {
          return res.status(400).json({ message: 'companyId must be a positive integer.' });
        }
        const company = await prisma.company.findFirst({
          where: { id: targetCompanyId, isActive: true },
          select: { id: true },
        });
        if (!company) {
          return res.status(400).json({ message: 'The selected company does not exist or is inactive.' });
        }
      }
      updateData.companyId = targetCompanyId;
    }
    
    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }
    const resultingRole = updateData.role || existing.role;
    const resultingCompanyId = updateData.companyId !== undefined ? updateData.companyId : existing.companyId;
    if (resultingRole !== 'SUPERADMIN' && !resultingCompanyId) {
      return res.status(400).json({ message: 'ADMIN and USER accounts must be assigned to a company.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      enabled: user.enabled,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'User ID must be a positive integer.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    if (existing.id === req.user.id) {
      return res.status(409).json({ message: 'You cannot delete your own account.' });
    }
    
    if (req.user.role === 'ADMIN') {
      if (existing.companyId !== req.user.companyId) {
        return res.status(403).json({ message: 'Cannot delete user outside your company' });
      }
      if (existing.role === 'ADMIN' || existing.role === 'SUPERADMIN') {
        return res.status(403).json({ message: 'Cannot delete admins' });
      }
    }

    await prisma.user.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'This user is referenced by quotation history and cannot be deleted. Disable the account instead.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
