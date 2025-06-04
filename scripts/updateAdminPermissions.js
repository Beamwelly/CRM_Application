const { query } = require('../server/db');

async function updateAdminPermissions() {
  try {
    // Get all admin users
    const result = await query('SELECT id, permissions FROM users WHERE role = $1', ['admin']);
    
    for (const user of result.rows) {
      // Parse existing permissions
      const permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions;
      
      // Update viewCustomers permission
      permissions.viewCustomers = 'subordinates';
      
      // Update in database
      await query(
        'UPDATE users SET permissions = $1 WHERE id = $2',
        [JSON.stringify(permissions), user.id]
      );
      
      console.log(`Updated permissions for admin user ${user.id}`);
    }
    
    console.log('Successfully updated all admin permissions');
  } catch (error) {
    console.error('Error updating admin permissions:', error);
  } finally {
    process.exit();
  }
}

updateAdminPermissions(); 