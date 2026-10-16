export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="bg-white rounded-2xl p-8 border border-brand-100 text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-xl font-semibold text-brand-800 mb-2">Access Denied</h1>
        <p className="text-sm text-brand-500 mb-6">
          You do not have permission to access this page. Please contact your admin.
        </p>
        <a href="/dashboard" className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}