// ============================================
// Seed Script — Creates demo data for testing
// ============================================
// Run with: node seed.js
//
// Creates:
//   1 Admin user
//   2 Staff users
//   2 Regular users
//   10 Assets (AC, Water Cooler, Desert Cooler)
//   5 Sample complaints in various statuses
//
// WARNING: This will CLEAR existing data!
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Asset = require('./models/Asset');
const Complaint = require('./models/Complaint');

const seedData = async () => {
  try {
    // Connect
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Ask for confirmation
    console.log('');
    console.log('⚠️  WARNING: This will DELETE all existing data!');
    console.log('   Press Ctrl+C within 3 seconds to cancel...');
    console.log('');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Asset.deleteMany({});
    await Complaint.deleteMany({});
    console.log('   Done.');

    // ════════════════════════════════════════
    // CREATE USERS
    // ════════════════════════════════════════
    console.log('👤 Creating users...');

    const admin = await User.create({
      email: 'admin@scan2fix.com',
      password: 'admin123',
      full_name: 'Admin User',
      phone: '9000000001',
      role: 'ADMIN',
    });
    console.log(`   ✅ Admin: admin@scan2fix.com / admin123`);

    const staff1 = await User.create({
      email: 'rahul@scan2fix.com',
      password: 'staff123',
      full_name: 'Rahul Sharma',
      phone: '9000000002',
      role: 'STAFF',
      designation: 'SENIOR',
      employee_id: 'EMP001',
      is_on_leave: false,
    });
    console.log(`   ✅ Staff: rahul@scan2fix.com / staff123`);

    const staff2 = await User.create({
      email: 'priya@scan2fix.com',
      password: 'staff123',
      full_name: 'Priya Patel',
      phone: '9000000003',
      role: 'STAFF',
      designation: 'JUNIOR',
      employee_id: 'EMP002',
      is_on_leave: false,
    });
    console.log(`   ✅ Staff: priya@scan2fix.com / staff123`);

    const user1 = await User.create({
      email: 'amit@office.com',
      password: 'user123',
      full_name: 'Amit Kumar',
      phone: '9000000004',
      role: 'USER',
    });
    console.log(`   ✅ User: amit@office.com / user123`);

    const user2 = await User.create({
      email: 'neha@office.com',
      password: 'user123',
      full_name: 'Neha Singh',
      phone: '9000000005',
      role: 'USER',
    });
    console.log(`   ✅ User: neha@office.com / user123`);

    // ════════════════════════════════════════
    // CREATE ASSETS
    // ════════════════════════════════════════
    console.log('🏭 Creating assets...');

    const assets = await Asset.insertMany([
      // Air Conditioners
      { asset_id: 'AC-1F-101', type: 'AC', location: '1st Floor, Room 101', brand: 'Voltas', model: '183V ADP' },
      { asset_id: 'AC-1F-102', type: 'AC', location: '1st Floor, Room 102', brand: 'Daikin', model: 'FTL50TV16' },
      { asset_id: 'AC-2F-201', type: 'AC', location: '2nd Floor, Room 201', brand: 'LG', model: 'MS-Q18' },
      { asset_id: 'AC-3F-301', type: 'AC', location: '3rd Floor, Conference Room', brand: 'Blue Star', model: 'IC318' },

      // Water Coolers
      { asset_id: 'WC-1F-001', type: 'WATER_COOLER', location: '1st Floor, Lobby', brand: 'Voltas', model: 'WC-40' },
      { asset_id: 'WC-2F-001', type: 'WATER_COOLER', location: '2nd Floor, Pantry', brand: 'Blue Star', model: 'WC-60' },
      { asset_id: 'WC-3F-001', type: 'WATER_COOLER', location: '3rd Floor, Break Room', brand: 'Voltas', model: 'WC-80' },

      // Desert Coolers
      { asset_id: 'DC-1F-001', type: 'DESERT_COOLER', location: '1st Floor, Open Area', brand: 'Symphony', model: 'Diet 50i' },
      { asset_id: 'DC-2F-001', type: 'DESERT_COOLER', location: '2nd Floor, Work Area', brand: 'Crompton', model: 'Ozone 75' },
      { asset_id: 'DC-GF-001', type: 'DESERT_COOLER', location: 'Ground Floor, Reception', brand: 'Bajaj', model: 'DMH 90' },
    ]);

    console.log(`   ✅ Created ${assets.length} assets`);

    // ════════════════════════════════════════
    // CREATE SAMPLE COMPLAINTS
    // ════════════════════════════════════════
    console.log('📋 Creating sample complaints...');

    // Complaint 1: OPEN (not assigned yet)
    await Complaint.create({
      user_id: user1._id,
      asset: assets[0]._id,
      asset_id: assets[0].asset_id,
      description: 'AC is not cooling properly. Room temperature stays above 30 degrees even after running for 2 hours.',
      status: 'OPEN',
    });
    console.log('   ✅ Complaint 1: OPEN (AC not cooling)');

    // Complaint 2: ASSIGNED (assigned to staff1)
    await Complaint.create({
      user_id: user1._id,
      asset: assets[4]._id,
      asset_id: assets[4].asset_id,
      description: 'Water cooler is making a strange buzzing noise and water is not cold enough.',
      status: 'ASSIGNED',
      assigned_staff_id: staff1._id,
      assigned_by: admin._id,
      assigned_at: new Date(),
    });
    console.log('   ✅ Complaint 2: ASSIGNED (Water cooler noise)');

    // Complaint 3: IN_PROGRESS (staff2 working on it)
    await Complaint.create({
      user_id: user2._id,
      asset: assets[7]._id,
      asset_id: assets[7].asset_id,
      description: 'Desert cooler water pump is not working. No water circulation happening.',
      status: 'IN_PROGRESS',
      assigned_staff_id: staff2._id,
      assigned_by: admin._id,
      assigned_at: new Date(Date.now() - 86400000), // 1 day ago
    });
    console.log('   ✅ Complaint 3: IN_PROGRESS (Desert cooler pump)');

    // Complaint 4: CLOSED (resolved last week)
    const closedDate = new Date(Date.now() - 7 * 86400000); // 7 days ago
    await Complaint.create({
      user_id: user2._id,
      asset: assets[2]._id,
      asset_id: assets[2].asset_id,
      description: 'AC remote not working and unit makes clicking sounds on startup.',
      status: 'CLOSED',
      assigned_staff_id: staff1._id,
      assigned_by: admin._id,
      assigned_at: new Date(Date.now() - 10 * 86400000),
      closed_at: closedDate,
      verified_at: closedDate,
    });
    console.log('   ✅ Complaint 4: CLOSED (AC remote fixed)');

    // Complaint 5: OPEN (another open complaint)
    await Complaint.create({
      user_id: user1._id,
      asset: assets[5]._id,
      asset_id: assets[5].asset_id,
      description: 'Water cooler is leaking from the bottom. Water pooling on the floor near the pantry.',
      status: 'OPEN',
    });
    console.log('   ✅ Complaint 5: OPEN (Water cooler leaking)');

    // ════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SEED DATA CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('📱 LOGIN CREDENTIALS:');
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│  ROLE    │  EMAIL                │ PASSWORD  │');
    console.log('├──────────────────────────────────────────────┤');
    console.log('│  Admin   │  admin@scan2fix.com   │ admin123  │');
    console.log('│  Staff   │  rahul@scan2fix.com   │ staff123  │');
    console.log('│  Staff   │  priya@scan2fix.com   │ staff123  │');
    console.log('│  User    │  amit@office.com      │ user123   │');
    console.log('│  User    │  neha@office.com      │ user123   │');
    console.log('└──────────────────────────────────────────────┘');
    console.log('');
    console.log('🏭 ASSETS (QR Codes to scan):');
    console.log('   AC:             AC-1F-101, AC-1F-102, AC-2F-201, AC-3F-301');
    console.log('   Water Cooler:   WC-1F-001, WC-2F-001, WC-3F-001');
    console.log('   Desert Cooler:  DC-1F-001, DC-2F-001, DC-GF-001');
    console.log('');
    console.log('📋 COMPLAINTS: 2 Open, 1 Assigned, 1 In Progress, 1 Closed');
    console.log('');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedData();