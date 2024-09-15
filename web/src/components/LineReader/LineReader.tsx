import { useEffect, useRef, useState } from "react";
import { isScrolledToBottom } from "../../internal/layout/graphics";
import { Line } from "./Line";

import ChevronIcon from "../Icon/ChevronIcon";

import "./LineReader.css";

interface LineReaderProps {
    lines: Line[]
    urgent: Line[];
}

export default function LineReader(props: LineReaderProps) {
    const { lines, urgent } = props;

    const [isSticky, setIsSticky] = useState<boolean>(true);
    const readerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const toSticky = () => {
            const current = readerRef.current;
            if (!current) return;
            current.scrollTop = current.scrollHeight;
        }
        if (isSticky) toSticky();
    }, [isSticky, lines])

    useEffect(() => {
        const current = readerRef.current;
        if (!current) return;
        const handleScroll = () => {
            setIsSticky(isScrolledToBottom(current))
        };
        current.addEventListener('scroll', handleScroll);
        return () => {
            current.removeEventListener('scroll', handleScroll);
        };
    }, [])

    return (
        <div className="zenin__line_reader zenin__h_monospace" ref={readerRef}>
            <div className="zenin__line_reader_list">
                {lines.map((line, index) => (
                    <span
                        key={index}
                        className={["zenin__line_reader_row", urgent.some(n => n === line) ? 'urgent' : ''].join(' ')}
                    >
                        <span className={["zenin__line_reader_row_gutter zenin__h_center", !line.remote() ? 'local' : ''].join(' ')}>
                            <ChevronIcon />
                        </span>
                        <span className="zenin__line_reader_row_element">{line.element()}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
