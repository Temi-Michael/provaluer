import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onCancel : undefined}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-[15px] text-gray2 leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-[14px] font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px] ${
                isDanger 
                  ? "bg-red text-white hover:bg-red/90" 
                  : "bg-blue text-white hover:bg-blue/90"
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
