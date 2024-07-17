import { Measurement } from '../../internal/monitor';
import { useEffect, useRef, useState } from 'react';

import './Series.css';

interface SeriesProps {
    measurements: Measurement[]
}

const slotWidth = 20;
const slotGap = 2;

export default function SeriesComponent(props: SeriesProps) {
    const { measurements } = props;

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
        for (const [i, m] of measurements.entries()) {
            if (cache.length == slots) break;
            cache.push(
                <div className="zenin__series_slot_container" style={{ width: slotWidth }} key={i}>
                    <div className={["zenin__series_slot", m.state].join(' ')}></div>
                </div>
            );
        }
        return cache;
    }


    return (
        <div className="zenin__series" dir='rtl' style={{ gap: slotGap }} ref={containerRef}>
            {renderSlots()}
        </div>
    )
}
