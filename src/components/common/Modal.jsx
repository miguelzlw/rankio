// src/components/common/Modal.jsx
import React from "react";

/**
 * Modal genérico com backdrop de vidro (glass) e animação.
 * Recebe `open`, `onClose` e `children`.
 */
export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-surface glass p-6 rounded-xl w-full max-w-md mx-4 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-semibold mb-4 text-primary">{title}</h2>}
        <div className="mb-4">{children}</div>
        <div className="flex justify-end space-x-2 mt-6">
          {footer ? (
            footer
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white transition"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
