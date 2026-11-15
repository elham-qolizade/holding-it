'use client';

import React, { useState } from 'react';

interface RetroWindowProps {
  title: string;
  className?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  id?: string;
}

export const RetroWindow: React.FC<RetroWindowProps> = ({
  title,
  className = '',
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  id,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen(prev => !prev);
    }
  };

  return (
    <section id={id} className={`win ${isOpen ? '' : 'shut'} ${className}`}>
      <h2>
        <button
          type="button"
          className="box"
          onClick={handleToggle}
          aria-label={isOpen ? 'Collapse window' : 'Expand window'}
        />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
};
