import React, { useState, useEffect, useRef } from 'react';
import './SlotMachine.css';

const SlotMachine = ({ options = [], onSpinEnd, spinning }) => {
    const [rotation, setRotation] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const reelRef = useRef(null);

    // Constants for 3D ring
    const ITEM_HEIGHT = 60; // Must match CSS
    const RADIUS = 200; // Distance from center
    // angle per item depends on how many we fake-render. 
    // For a reel feel, we render the list multiple times or map angle to index.

    // Simplified 3D approach:
    // We have a "ring" that rotates.
    // We populate the ring with `options`.
    // If options are few, we repeat them to fill the circle.

    const REPEAT = Math.ceil(12 / Math.max(1, options.length)) + 1;
    const itemsToRender = Array(REPEAT).fill(options).flat();
    const SLOTS_COUNT = itemsToRender.length;
    const ANGLE_STEP = 360 / SLOTS_COUNT;

    useEffect(() => {
        if (spinning) {
            // Spin indefinitely or for a set duration? 
            // User control says "spinning" passed in. 
            // We will rotate fast.
            const interval = setInterval(() => {
                setRotation(r => r - 10); // Rotate 'down'
            }, 16);
            return () => clearInterval(interval);
        } else {
            // Snap to nearest item when spinning stops
            const snapAngle = Math.round(rotation / ANGLE_STEP) * ANGLE_STEP;
            setRotation(snapAngle);
        }
    }, [spinning]);

    // Use a declarative animation approach for smoother control?
    // CSS Animation is better for the "Spin" state.



    return (
        <div className="slot-machine-container">
            <div className="slot-window">
                <div className={`slot-ring ${spinning ? 'spinning' : ''}`} ref={reelRef}
                    style={{
                        '--item-count': SLOTS_COUNT,
                        '--radius': `${RADIUS}px`,
                        '--winning-index': selectedIndex,
                        transform: `rotateX(${rotation}deg)`
                    }}>
                    {itemsToRender.map((item, i) => (
                        <div
                            key={i}
                            className="slot-item"
                            style={{
                                transform: `rotateX(${i * ANGLE_STEP}deg) translateZ(${RADIUS}px)`
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>
            <div className="slot-overlay"></div>
        </div>
    );
};

export default SlotMachine;
