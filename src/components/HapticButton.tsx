'use client';

import { haptic } from '@/lib/haptics';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface HapticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';
}

/**
 * Button component with built-in haptic feedback
 */
const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'medium', onClick, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      haptic[hapticType]();
      onClick?.(e);
    };

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);

HapticButton.displayName = 'HapticButton';

export default HapticButton;
