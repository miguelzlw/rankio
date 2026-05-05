// src/components/common/Button.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Botão estilizado com Tailwind.
 * Recebe children, onClick, disabled, type e classes extras.
 */
export default function Button({ children, onClick, disabled = false, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ease-in-out 
        ${disabled ? "bg-gray-500 cursor-not-allowed" : "bg-primary hover:bg-primary/80"} 
        text-text shadow-md ${className}`}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  className: PropTypes.string,
};
