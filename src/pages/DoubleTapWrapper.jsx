import React, { useRef } from 'react';
/* */
export default function DoubleTapWrapper({ onDoubleTap, onTap, children, threshold = 300 }) {
    const lastTap = useRef(0);

    const handleClick = () => {
        const now = Date.now();
        if (now - lastTap.current < threshold) {
            onDoubleTap?.();
        } else {
            onTap?.();
        }
        lastTap.current = now;
    };

    return (
        <div onClick={handleClick} style={{ touchAction: 'manipulation' }}>
            {children}
        </div>
    );
}
