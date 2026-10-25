import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Flow 1 — Auth
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP      from './pages/VerifyOTP';
import ResetPassword  from './pages/ResetPassword';

// Flow 1 — Dashboard
import Dashboard from './pages/Dashboard';

// Flow 2 — Profile
import ProfilePage  from './pages/ProfilePage';
import EditProfile  from './pages/EditProfile';
import UserProfile  from './pages/UserProfile';

// Flow 3 — Follow & Discovery (Replaced with Connections)
import DiscoveryPage from './pages/DiscoveryPage';
import NetworkPage   from './pages/NetworkPage';

// Flow 5 — Communities
import CommunitiesPage from './pages/CommunitiesPage';
import CreateCommunityPage from './pages/CreateCommunityPage';
import CommunityDetailsPage from './pages/CommunityDetailsPage';
import CommunityMembersPage from './pages/CommunityMembersPage';

// Flow 6 — Events
import EventsDashboard from './pages/EventsDashboard';
import CreateEventPage from './pages/CreateEventPage';
import EventDetailsPage from './pages/EventDetailsPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage';
import MyEventsPage from './pages/MyEventsPage';

// Flow 7 — Collaborations
import CollaborationDashboard from './pages/CollaborationDashboard';
import CreateOpportunityPage from './pages/CreateOpportunityPage';
import OpportunityDetailsPage from './pages/OpportunityDetailsPage';
import MyOpportunitiesPage from './pages/MyOpportunitiesPage';
import ApplicationsManagementPage from './pages/ApplicationsManagementPage';
import MyApplicationsPage from './pages/MyApplicationsPage';

// Flow 8 — Notifications
import { NotificationProvider } from './context/NotificationContext';
import { UndoDeleteProvider } from './context/UndoDeleteContext';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';

// Flow 12 — Messaging & Chat
import MessagingDashboard from './pages/MessagingDashboard';


// Flow 9 — Search
import SearchResultsPage from './pages/SearchResultsPage';

// Flow 10 — Admin & Moderation
import AdminDashboard   from './pages/AdminDashboard';
import AdminUsers       from './pages/AdminUsers';
import AdminModeration  from './pages/AdminModeration';
import AdminReports     from './pages/AdminReports';
import AdminLogs        from './pages/AdminLogs';
import AdminAnalytics   from './pages/AdminAnalytics';
import AdminApprovals   from './pages/AdminApprovals';

// Flow 11 — Platform Analytics & Insights
import PlatformAnalytics from './pages/PlatformAnalytics';
import CommunityAnalytics from './pages/CommunityAnalytics';
import EventAnalytics from './pages/EventAnalytics';
import CollaborationAnalytics from './pages/CollaborationAnalytics';

// Flow 13 — Resource Hub & Analytics
import ResourceDashboard from './pages/ResourceDashboard';
import ResourceDetailsPage from './pages/ResourceDetailsPage';

// Flow 14 — Faculty Dashboard, Verification & Official Notices
import FacultyDashboard     from './pages/FacultyDashboard';
import TeacherNoticesPage   from './pages/TeacherNoticesPage';
import TeacherDirectoryPage from './pages/TeacherDirectoryPage';

import './index.css';
import './styles/theme.css';



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <UndoDeleteProvider>
            <Routes>
          {/* Public */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp"      element={<VerifyOTP />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* Protected — Flow 1 */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Protected — Flow 2 */}
          <Route path="/profile"          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/edit"     element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/profile/:userId"  element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

          {/* Protected — Flow 3 & Connections */}
          <Route path="/discover"          element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>} />
          <Route path="/network"           element={<ProtectedRoute><NetworkPage /></ProtectedRoute>} />

          {/* Protected — Flow 5 */}
          <Route path="/communities"          element={<ProtectedRoute><CommunitiesPage /></ProtectedRoute>} />
          <Route path="/communities/create"   element={<ProtectedRoute><CreateCommunityPage /></ProtectedRoute>} />
          <Route path="/communities/:communityId" element={<ProtectedRoute><CommunityDetailsPage /></ProtectedRoute>} />
          <Route path="/communities/:communityId/members" element={<ProtectedRoute><CommunityMembersPage /></ProtectedRoute>} />

          {/* Protected — Flow 6 */}
          <Route path="/events"                  element={<ProtectedRoute><EventsDashboard /></ProtectedRoute>} />
          <Route path="/events/create"           element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="/events/edit/:eventId"    element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="/events/:eventId"          element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
          <Route path="/events/my-registrations" element={<ProtectedRoute><MyRegistrationsPage /></ProtectedRoute>} />
          <Route path="/events/my-events"        element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />

          {/* Protected — Flow 7 */}
          <Route path="/collaborations"                        element={<ProtectedRoute><CollaborationDashboard /></ProtectedRoute>} />
          <Route path="/collaborations/create"                 element={<ProtectedRoute><CreateOpportunityPage /></ProtectedRoute>} />
          <Route path="/collaborations/edit/:collaborationId"  element={<ProtectedRoute><CreateOpportunityPage /></ProtectedRoute>} />
          <Route path="/collaborations/:collaborationId"        element={<ProtectedRoute><OpportunityDetailsPage /></ProtectedRoute>} />
          <Route path="/collaborations/my"                     element={<ProtectedRoute><MyOpportunitiesPage /></ProtectedRoute>} />
          <Route path="/collaborations/:collaborationId/applications" element={<ProtectedRoute><ApplicationsManagementPage /></ProtectedRoute>} />
          <Route path="/collaborations/applications/my"        element={<ProtectedRoute><MyApplicationsPage /></ProtectedRoute>} />

          {/* Protected — Flow 8 */}
          <Route path="/notifications"                         element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/settings/notifications"                element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />

          {/* Protected — Flow 12 (Messaging) */}
          <Route path="/messages"                              element={<ProtectedRoute><MessagingDashboard /></ProtectedRoute>} />

          {/* Protected — Flow 9 */}
          <Route path="/search"                                element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />

          {/* Protected — Flow 10 (Admin Dashboard & Moderation) */}
          <Route path="/admin"                element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"          element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/posts"          element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
          <Route path="/admin/reports"        element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/logs"           element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
          <Route path="/admin/analytics"      element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/approvals"      element={<ProtectedRoute><AdminApprovals /></ProtectedRoute>} />

          {/* Protected — Flow 11 (Platform Analytics & Insights) */}
          <Route path="/analytics"                    element={<ProtectedRoute><PlatformAnalytics /></ProtectedRoute>} />
          <Route path="/analytics/communities"        element={<ProtectedRoute><CommunityAnalytics /></ProtectedRoute>} />
          <Route path="/analytics/events"             element={<ProtectedRoute><EventAnalytics /></ProtectedRoute>} />
          <Route path="/analytics/collaborations"     element={<ProtectedRoute><CollaborationAnalytics /></ProtectedRoute>} />

          {/* Protected — Flow 13 (Resource Hub & File Sharing) */}
          <Route path="/resources"                    element={<ProtectedRoute><ResourceDashboard /></ProtectedRoute>} />
          <Route path="/resources/:resourceId"        element={<ProtectedRoute><ResourceDetailsPage /></ProtectedRoute>} />

          {/* Protected — Flow 14 (Faculty Dashboard & Official Notices) */}
          <Route path="/teacher"                      element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/teacher/notices"              element={<ProtectedRoute><TeacherNoticesPage /></ProtectedRoute>} />
          <Route path="/teacher/directory"            element={<ProtectedRoute><TeacherDirectoryPage /></ProtectedRoute>} />
          <Route path="/teacher/students"             element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>} />

          {/* Defaults */}
          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />

        </Routes>
      </UndoDeleteProvider>
    </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
);
}
