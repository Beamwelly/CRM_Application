import { pool } from '../db';
import fs from 'fs/promises';
import path from 'path';

async function createRemarksTable() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/create_remarks_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);
    console.log('Remarks table created successfully');
  } catch (error) {
    console.error('Error creating remarks table:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
createRemarksTable().catch(console.error); 