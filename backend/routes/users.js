const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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
    if (req.user.role === 'ADMIN') {
      if (role === 'SUPERADMIN' || role === 'ADMIN') {
        return res.status(403).json({ message: 'ADMINs can only create USER roles' });
      }
      companyId = req.user.companyId; // Force to their own company
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user details or role
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { username, password, email, role, enabled, companyId } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    
    if (req.user.role === 'ADMIN') {
      if (existing.companyId !== req.user.companyId) {
        return res.status(403).json({ message: 'Cannot edit user outside your company' });
      }
      if (role && (role === 'ADMIN' || role === 'SUPERADMIN')) {
        return res.status(403).json({ message: 'Cannot elevate roles' });
      }
    }

    const updateData = { username, email, enabled };
    if (role) updateData.role = role;
    if (req.user.role === 'SUPERADMIN' && companyId !== undefined) {
      updateData.companyId = companyId;
    }
    
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found' });
    
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
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
