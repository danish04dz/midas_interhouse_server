const User = require('../models/User');
const { sendEventManagerWelcomeEmail } = require('../utils/emailService');

// @desc Get all users (event_managers) — Admin
// @route GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// @desc Create event_manager account — Admin
// @route POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });

    const userRole = role || 'event_manager';

    const user = await User.create({
      name, email, password,
      role: userRole,
      department,
      createdBy: req.user._id,
    });

    // Send email to event_manager
    if (userRole === 'event_manager' || userRole === 'admin') {
      await sendEventManagerWelcomeEmail(email, name, password);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update user — Admin
// @route PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, password, department, isActive, role } = req.body;
    user.name = name || user.name;
    user.email = email || user.email;
    user.department = department || user.department;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // will be hashed by pre-save hook

    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

// @desc Delete user — Admin
// @route DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
