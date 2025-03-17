import { FC, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { LogOut, Settings, User, BarChart2 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsOpen: () => void;
  onAccountOpen: () => void;
  isAdmin: boolean;
}

const UserProfilePopup: FC<UserProfilePopupProps> = ({ isOpen, onClose, onSettingsOpen, onAccountOpen, isAdmin }) => {
  const { data: session } = useSession();
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    if (isAdmin) {
      // Clear admin status
      localStorage.removeItem('isAdmin');
      // Redirect to home page
      window.location.href = '/';
    } else {
      // Sign out from next-auth (Google)
      await signOut({ callbackUrl: '/' });
    }
    onClose();
  };

  const handleAnalyticsDashboard = () => {
    router.push('/analytics/dashboard');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      ref={popupRef}
      className="absolute top-10 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[9999]"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* User info */}
      {session?.user ? (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="User avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-gray-500 font-semibold text-lg">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                </div>
              )}
              {isAdmin && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#FF7F7F] rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {session.user.name && (
                <p className="text-sm font-medium text-gray-800 truncate">
                  {session.user.name}
                </p>
              )}
              <p className="text-xs text-gray-500 truncate">
                {session.user.email || 'User'}
              </p>
            </div>
          </div>
        </div>
      ) : isAdmin ? (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF7F7F]/10 flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-[#FF7F7F]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Administrator</p>
              <p className="text-xs text-gray-500">Admin Mode</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="p-2">
        {isAdmin && (
          <button
            onClick={handleAnalyticsDashboard}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <BarChart2 className="h-4 w-4 text-gray-500" />
            <span>Analytics Dashboard</span>
          </button>
        )}
        
        <button
          onClick={onAccountOpen}
          className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <User className="h-4 w-4 text-gray-500" />
          <span>My Account</span>
        </button>
        
        <button
          onClick={onSettingsOpen}
          className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4 text-gray-500" />
          <span>Settings</span>
        </button>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span>Sign out</span>
        </button>
      </div>
    </motion.div>
  );
};

export default UserProfilePopup; 