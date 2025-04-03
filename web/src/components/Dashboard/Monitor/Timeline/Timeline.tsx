import { Measurement } from "@/internal/measurement";
import { DEAD_API, WARN_API } from "@/internal/server";
import { useEffect, useRef, useState } from "react";

import FailureIcon from "@/components/Icon/FailureIcon";
import WarningIcon from "@/components/Icon/WarningIcon";

import "./Timeline.css";

interface TimelineProps {
    measurements: Measurement[]

    onSlotClick: (measurement: Measurement) => void;
}

const slotWidth = 22.5;
const slotGap = 2;

export default function Timeline(props: TimelineProps) {
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
            const classes = ["measurement_timeline_slot_container", measurement.state].join(" ");
            cache.push(
                <div
                    key={`measurement-${measurement.state}-${index}`}
                    onClick={() => onSlotClick(measurement)}
                    className={classes}
                    style={{ width: slotWidth }}
                >
                    <div className={"measurement_timeline_slot"}></div>
                    <div className={"timeline_visual_aid_container"}>
                        {measurement.state == DEAD_API ? <FailureIcon/> : measurement.state == WARN_API ? <WarningIcon/> : null}
                    </div>
                </div>
            );
        }
        return cache;
    }

    return <div className="measurement_timeline" dir="rtl" style={{ gap: slotGap }} ref={containerRef}>
        {renderSlots()}
    </div>
}
