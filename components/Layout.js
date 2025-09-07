// components/Layout.js - Layout wrapper with authentication header
import AuthHeader from './AuthHeader';
import SiteFooter from './SiteFooter';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AuthHeader />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
