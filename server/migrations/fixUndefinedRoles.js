const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');

  try {
    // Find all users that have undefined or null roles
    const users = await User.find({ 
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: { $in: [undefined, ""] } }
      ]
    });
    
    console.log(`Found ${users.length} users with undefined roles`);
    
    // Update each user to have the default 'Manager' role
    for (const user of users) {
      user.role = 'Manager'; // Set default role
      await user.save();
      console.log(`Updated user: ${user.name} (${user.username})`);
    }
    
    console.log('All users updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
});