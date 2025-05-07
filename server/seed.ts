import bcrypt from 'bcrypt';
import { query } from './db'; // Import the query function from db.ts
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

const SALT_ROUNDS = 10;

// Define Demo Users (without hardcoded IDs)
const demoUsersData = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'manager',
    serviceAccess: ['training', 'wealth']
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'executive',
    serviceAccess: ['training', 'wealth']
  },
  {
    name: 'Mike Jones',
    email: 'mike@example.com',
    password: 'password123',
    role: 'executive',
    serviceAccess: ['training']
  },
  {
    name: 'Sarah Lee',
    email: 'sarah@example.com',
    password: 'password123',
    role: 'executive',
    serviceAccess: ['wealth']
  },
];

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Clear existing users and access first
    console.log('Clearing existing user data...');
    await query('DELETE FROM user_service_access');
    await query('DELETE FROM users');
    console.log('Existing user data cleared.');

    for (const userData of demoUsersData) {
      // Generate a new UUID for the user
      const userId = uuidv4();
      console.log(`Generated ID ${userId} for ${userData.email}`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      console.log(`Hashing password for ${userData.email}...`);

      // Insert into users table with generated UUID
      await query(
        'INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [userId, userData.name, userData.email, userData.role, hashedPassword]
      );
      console.log(`Inserted user: ${userData.email}`);

      // Insert into user_service_access table
      for (const serviceType of userData.serviceAccess) {
        await query(
          'INSERT INTO user_service_access (user_id, service_type) VALUES ($1, $2)',
          [userId, serviceType]
        );
        console.log(`  - Granted access to ${serviceType} for ${userData.email}`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1); // Exit with error code
  } finally {
    // Pool closure is handled automatically when script ends
  }
}

// Run the seeding function
seedDatabase(); 