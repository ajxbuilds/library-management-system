import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { UndoFloatingButton } from './components/UndoFloatingButton';
import { BookDetailModal } from './components/BookDetailModal';

// Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { LibrarianDashboard } from './pages/LibrarianDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { CatalogPage } from './pages/CatalogPage';
import { CirculationPage } from './pages/CirculationPage';
import { FinesPage } from './pages/FinesPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SearchLabPage } from './pages/SearchLabPage';
import { SortingLabPage } from './pages/SortingLabPage';
import { GraphLabPage } from './pages/GraphLabPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogPage } from './pages/AuditLogPage';

const MainLayout: React.FC = () => {
  const { user, isAdmin, isLibrarian } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('admin-dash');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');

  // Render current active page
  const renderActivePage = () => {
    switch (currentTab) {
      case 'admin-dash':
        return <AdminDashboard onNavigate={setCurrentTab} onSelectBook={setSelectedBookId} />;
      case 'librarian-dash':
        return <LibrarianDashboard onNavigate={setCurrentTab} onSelectBook={setSelectedBookId} />;
      case 'student-dash':
        return <StudentDashboard onNavigate={setCurrentTab} onSelectBook={setSelectedBookId} />;
      case 'catalog':
        return (
          <CatalogPage 
            onSelectBook={setSelectedBookId} 
            initialSearchQuery={catalogSearchQuery}
            onClearSearch={() => setCatalogSearchQuery('')}
          />
        );
      case 'circulation':
        return <CirculationPage onSelectBook={setSelectedBookId} />;
      case 'fines':
        return <FinesPage />;
      case 'recommendations':
        return <RecommendationsPage onSelectBook={setSelectedBookId} />;
      case 'search-lab':
        return <SearchLabPage />;
      case 'sorting-lab':
        return <SortingLabPage />;
      case 'graph-lab':
        return <GraphLabPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'audit-logs':
        return <AuditLogPage />;
      default:
        return (
          <CatalogPage 
            onSelectBook={setSelectedBookId} 
            initialSearchQuery={catalogSearchQuery}
            onClearSearch={() => setCatalogSearchQuery('')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-300">
      {/* Top Navbar */}
      <Navbar
        onSelectBook={(bookId) => setSelectedBookId(bookId)}
        onSearchSubmit={(query) => {
          setCatalogSearchQuery(query);
          setCurrentTab('catalog');
        }}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Modals & Floating Overlays */}
      <NotificationDrawer />
      
      <BookDetailModal
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
        onSuccessAction={() => window.dispatchEvent(new CustomEvent('loan-updated'))}
      />

      <UndoFloatingButton />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainLayout />
      </NotificationProvider>
    </AuthProvider>
  );
}
