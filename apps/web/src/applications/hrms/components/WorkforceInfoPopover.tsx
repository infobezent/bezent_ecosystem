import React, { useState } from 'react';

export interface WorkforceInfoPopoverProps {
  label: string;
  tooltip: string;
  className?: string;
}

export const WorkforceInfoPopover: React.FC<WorkforceInfoPopoverProps> = ({
  label,
  tooltip,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bezent-wf-help-trigger ${className}`}>
      <button
        type="button"
        className="bezent-wf-help-btn"
        aria-label={`${label} Information`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onBlur={() => setIsOpen(false)}
      >
        ?
      </button>
      <div
        className={`bezent-wf-help-popover ${isOpen ? 'bezent-wf-help-popover--visible' : ''}`}
        role="tooltip"
      >
        {tooltip}
      </div>
    </div>
  );
};

export default WorkforceInfoPopover;
