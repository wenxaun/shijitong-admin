const bcrypt = require('bcryptjs');

// 生成管理员密码hash
const password = process.argv[2] || 'admin123';

console.log('==========================================');
console.log('密码加密工具');
console.log('==========================================');
console.log('');
console.log(`原始密码: ${password}`);

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('加密失败:', err);
    process.exit(1);
  }

  console.log(`加密后的密码: ${hash}`);
  console.log('');
  console.log('使用方法:');
  console.log('1. 复制上面的加密密码');
  console.log('2. 在云开发控制台数据库中创建管理员账户');
  console.log('3. 在 users 集合中添加以下记录:');
  console.log('');
  console.log('{');
  console.log('  "_id": "admin_001",');
  console.log('  "name": "超级管理员",');
  console.log('  "username": "admin",');
  console.log(`  "password": "${hash}",`);
  console.log('  "role": "admin",');
  console.log('  "user_type": "enterprise",');
  console.log('  "created_at": { "$date": "2024-01-01T00:00:00.000Z" }');
  console.log('}');
  console.log('');
  console.log('==========================================');
});
