const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Drop collections to reset indexes
    try { 
      await mongoose.connection.collection('userv2').drop(); 
      console.log('🗑️  Dropped userv2'); 
    } catch(e) {
      console.log('   userv2 not found (ok)');
    }
    
    try { 
      await mongoose.connection.collection('complaintv2').drop(); 
      console.log('🗑️  Dropped complaintv2'); 
    } catch(e) {
      console.log('   complaintv2 not found (ok)');
    }
    
    await mongoose.disconnect();
    console.log('✅ Collections reset, ready for reseed');
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
