const fs = require('fs');
const path = require('path');

console.log('=== Absolute Cinema Template Setup Helper ===');
console.log('');

// Check current working directory
console.log(`Current working directory: ${process.cwd()}`);
console.log('')

// Check possible locations where the template should be placed
const possibleLocations = [
  path.join(process.cwd(), 'public', 'images'),
  path.join(process.cwd(), 'backend', 'public', 'images'),
];

console.log('Checking for public/images directories...');
possibleLocations.forEach((dir, index) => {
  console.log(`${index + 1}. ${dir}`);
  if (fs.existsSync(dir)) {
    console.log('   ✅ EXISTS - You can place the template here');
    const files = fs.readdirSync(dir);
    if (files.length > 0) {
      console.log('   Files already in this directory:', files.join(', '));
    }
  } else {
    console.log('   ❌ DOES NOT EXIST');
    // Try to create it
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log('   ✅ CREATED - You can now place the template here');
    } catch (err) {
      console.log('   ❌ CANNOT CREATE:', err.message);
    }
  }
  console.log('');
});

console.log('=== Instructions ===');
console.log('1. Save your absolute cinema template image as one of these names:');
console.log('   - absolute-cinema-template.png');
console.log('   - absolute-cinema-template.jpg');
console.log('   - absolute-cinema-template.jpeg');
console.log('');
console.log('2. Place it in one of the existing directories shown above');
console.log('');
console.log('3. The server will automatically find and use it'); 