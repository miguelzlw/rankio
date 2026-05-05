// src/components/common/Modal.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Modal genérico com backdrop de vidro (glass) e animação.
 * Recebe `open`, `onClose` e `children`.
 */
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-surface glass p-6 rounded-xl w-full max-w-md mx-4 shadow-xl animate-fade-in">
        {title && <h2 className="text-xl font-semibold mb-4 text-primary">{title}</h2>}
        <div className="mb-4">{children}</div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};
