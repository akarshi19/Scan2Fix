const jwt = require('jsonwebtoken');

// Generate an admin test token
const token = jwt.sign(
  { 
    id: 'test-admin-id',
    role: 'ADMIN',
    email: 'admin@test.com'
  },
  '607d1d80de28bce0384ee9b336370c5f2efa754bb9d892b2c49a82c62f76a88c3a5c07a7e2ea330b0358189e57ed7e658ed08f2257c649895c69f3fe5f675c63',
  { expiresIn: '7d' }
);

console.log('Admin Token:');
console.log(token);
console.log('\nDecoded:');
console.log(jwt.decode(token));
