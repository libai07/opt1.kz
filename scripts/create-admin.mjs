import crypto from 'node:crypto';

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}

const ITERATIONS = 100_000;
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const pwdHash = `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
const id = 'admin-' + crypto.randomUUID().slice(0, 8);

console.log('SQL to run in D1:');
console.log(`INSERT INTO admins (id, email, pwd_hash, role) VALUES ('${id}', '${email}', '${pwdHash}', 'owner');`);
