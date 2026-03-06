// ============================================
// Scan2Fix - Application Constants
// ============================================

// User roles
const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  USER: 'USER',
};

// Complaint statuses (matches your mobile app exactly)
const COMPLAINT_STATUS = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
};

// Asset types (matches your QR codes & mobile app)
const ASSET_TYPES = {
  AC: 'AC',
  WATER_COOLER: 'WATER_COOLER',
  DESERT_COOLER: 'DESERT_COOLER',
};

// Staff designations
const DESIGNATIONS = {
  JUNIOR: 'JUNIOR',
  SENIOR: 'SENIOR',
};

module.exports = {
  ROLES,
  COMPLAINT_STATUS,
  ASSET_TYPES,
  DESIGNATIONS,
};