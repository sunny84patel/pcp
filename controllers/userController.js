import User from '../models/User.js';

// 🔁 Update user (any user can update their own profile)
export const updateUser = async (req, res) => {
  const userId = req.user.userId;
  const updates = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    res.status(200).json({ msg: 'User updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ msg: 'Error updating user', error: err.message });
  }
};

// ❌ Delete user (admin only)
export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) return res.status(404).json({ msg: 'User not found' });

    res.status(200).json({ msg: 'User deleted successfully', deleted });
  } catch (err) {
    res.status(500).json({ msg: 'Error deleting user', error: err.message });
  }
};
// 👁️ Admin: Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v -password');
    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching users', error: err.message });
  }
};
