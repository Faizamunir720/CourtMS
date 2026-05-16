const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, nationalId, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (!['lawyer', 'admin', 'judge', 'citizen', 'clerk'].includes(role)) {
      return res.status(400).json({ error: 'role must be lawyer, admin, judge, citizen, or clerk' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const user = await User.create({ name, email, password, role, phone, nationalId, address });

    createAuditLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'user_register',
      description: `New ${role} registered: ${email}`,
      resourceType: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    createAuditLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'user_login',
      description: `User logged in: ${email}`,
      resourceType: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful',
      token: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ token: signAccessToken(user) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
