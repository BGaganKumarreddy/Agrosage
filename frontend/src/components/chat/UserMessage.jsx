import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserMessage = ({ message }) => {
  const { user } = useAuth();
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex items-start justify-end gap-2.5 w-full select-text">
      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-[#303030] border border-[#414141] text-[#ECECEC] px-4 py-2.5 shadow-sm space-y-1">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-[#414141] text-[#ECECEC] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
        {initial}
      </div>
    </div>
  );
};
