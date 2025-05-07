import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Use the same salt rounds as your authService

const passwordToHash = process.argv[2]; // Get password from command line argument

if (!passwordToHash) {
  console.error('Usage: ts-node hash-password.ts <password_to_hash>');
  process.exit(1);
}

const hashPassword = async (password: string): Promise<string> => {
  try {
    console.log(`Hashing password: "${password}"`);
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

hashPassword(passwordToHash)
  .then(hash => {
    console.log('Generated Hash:');
    console.log(hash);
  })
  .catch(() => process.exit(1)); 