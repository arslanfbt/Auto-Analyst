"use client"

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Auto-Analyst. All rights reserved.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Analytics Dashboard v1.0</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 