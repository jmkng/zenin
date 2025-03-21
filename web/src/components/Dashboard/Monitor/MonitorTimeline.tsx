import { useEffect, useRef, useState } from 'react';
import { Measurement } from '@/internal/measurement';

import './MonitorTimeline.css';

interface MonitorTimelineProps {
    measurements: Measurement[]

    onSlotClick: (measurement: Measurement) => void;
}

const slotWidth = 22.5;
const slotGap = 2;

export default function MonitorTimeline(props: MonitorTimelineProps) {
    const { measurements, onSlotClick } = props;
    const [slots, setSlots] = useState<number>(0);
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            const size = entries[0].target.getBoundingClientRect();
            const width = size.width;
            const slots = Math.floor(width / (slotWidth + slotGap));
            setSlots(slots);
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            observer.disconnect();
        };
    }, []);

    function renderSlots() {
        const cache = [];
        for (const [index, measurement] of measurements.entries()) {
            if (cache.length == slots) break;
            cache.push(
                <div
                    key={index}
                    onClick={() => onSlotClick(measurement)}
                    className="measurement_timeline_slot_container"
                    style={{ width: slotWidth }}
                >
                    <div className={["measurement_timeline_slot", measurement.state].join(' ')}></div>
                </div>
            );
        }
        return cache;
    }


    return <div className="measurement_timeline" dir='rtl' style={{ gap: slotGap }} ref={containerRef}>
        {renderSlots()}
    </div>
}
