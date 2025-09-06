// components/Layout.js - Layout wrapper with authentication header
import AuthHeader from './AuthHeader';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}