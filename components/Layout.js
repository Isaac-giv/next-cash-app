// components/Layout.js
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-white to-blue-500 bg-fixed">
      <div className="max-w-2xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
}