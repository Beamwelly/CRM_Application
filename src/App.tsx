import { Routes, Route, Navigate } from 'react-router-dom';
import { CRMProvider } from './context/CRMContext';
import { Toaster } from './components/ui/toaster';
import { SidebarProvider } from './hooks/use-mobile';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import FollowUps from './pages/FollowUps';
import Renewals from './pages/Renewals';
// import Team from './pages/Team'; // Keep import commented/removed
import NotFound from './pages/NotFound';
import { UserManagementPage } from './pages/UserManagementPage'; // Import UserManagementPage
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AddAdminPage } from './pages/AddAdminPage'; // Import AddAdminPage
import { AddEmployeePage } from './pages/AddEmployeePage'; // Import AddEmployeePage
import EmailHistoryPage from './pages/EmailHistoryPage'; // Import the new page

function App() {
  return (
    <CRMProvider>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/leads" element={
            <ProtectedRoute>
              <Leads />
            </ProtectedRoute>
          } />
          
          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />
          
          <Route path="/email" element={
            <ProtectedRoute>
              <EmailHistoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/follow-ups" element={
            <ProtectedRoute>
              <FollowUps />
            </ProtectedRoute>
          } />
          
          <Route path="/renewals" element={
            <ProtectedRoute>
              <Renewals />
            </ProtectedRoute>
          } />

          {/* Add User Management Route */}
          <Route path="/users" element={
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          } />
          
          {/* Add Routes for Creating Users */}
          <Route 
            path="/users/add-admin" 
            element={
              <ProtectedRoute allowedRoles={['developer']}>
                <AddAdminPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/users/add-employee" 
            element={
              <ProtectedRoute allowedRoles={['developer', 'admin']}>
                <AddEmployeePage />
              </ProtectedRoute>
            }
          />
          
          {/* Remove Team Route (Commented out) */}
          {/* 
          <Route path="/team" element={
            <ProtectedRoute>
              <Team />
            </ProtectedRoute>
          } /> 
          */}
          
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
        <Toaster />
      </SidebarProvider>
    </CRMProvider>
  );
}

export default App;
