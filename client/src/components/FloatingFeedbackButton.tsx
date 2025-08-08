import React from 'react';
import { MessageSquare } from 'lucide-react';

interface FloatingFeedbackButtonProps {
  onClick: () => void;
}

const FloatingFeedbackButton: React.FC<FloatingFeedbackButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 group animate-float hover-glow"
      title="Send Feedback"
    >
      <div className="flex items-center justify-center relative">
        <MessageSquare className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
        
        {/* Notification dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
      </div>
      
      {/* Enhanced pulse animations */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-ping opacity-20"></div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse opacity-30"></div>
    </button>
  );
};

export default FloatingFeedbackButton;
