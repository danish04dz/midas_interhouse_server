require('dotenv').config();
const mongoose = require('mongoose');
const Participant = require('./models/Participant');

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Drop the rollNumber index if it exists
    await Participant.collection.dropIndex('rollNumber_1_session_1');
    console.log('Dropped rollNumber_1_session_1 index');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index did not exist, all good.');
    } else {
      console.error(err);
    }
  } finally {
    mongoose.connection.close();
  }
}

dropIndex();
