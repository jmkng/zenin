import { useLayoutEffect, useRef, useState } from "react"
import ChevronIcon from "../../Icon/ChevronIcon/ChevronIcon";

import "./Expand.css"
import Button from "../../Button/Button";
import CopyIcon from "../../Icon/CopyIcon/CopyIcon";
import LastIcon from "../../Icon/LastIcon/LastIcon";
import FirstIcon from "../../Icon/FirstIcon/FirstIcon";

interface ExpandProps {
    title: string,
    text: string
}

export default function ExpandComponent(props: ExpandProps) {
    const { title, text } = props;
    const [expanded, setExpanded] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [isScrolledTop, setIsScrolledTop] = useState<boolean>(true);
    const [isScrolledBottom, setIsScrolledBottom] = useState<boolean>(false);
    const popoutRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const popoutElement = popoutRef.current;
        if (popoutElement) {
            popoutElement.addEventListener('scroll', handleScrollEvent);
            handleScrollEvent();
            return () => {
                popoutElement.removeEventListener('scroll', handleScrollEvent);
            };
        }
    }, [expanded]);

    const handleExpand = () => {
        setExpanded(prev => !prev)
    }

    const handleScroll = (bottom: boolean) => {
        if (popoutRef.current) {
            popoutRef.current.scrollTo({
                top: bottom ? popoutRef.current.scrollHeight : 0,
                behavior: 'smooth'
            });
        }
    };

    const handleScrollEvent = () => {
        if (popoutRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = popoutRef.current;
            setIsScrolledTop(scrollTop === 0);
            setIsScrolledBottom(scrollTop + clientHeight >= scrollHeight);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 1000)
        } catch (err) {
            console.error(`failed to copy text to clipboard: ${err}`);
        }
    };

    return <div className={["zenin__expand_component", expanded ? "expanded" : ""].join(" ")}>
        <div className="zenin__expand_controls">
            <div
                className="zenin__expand_title"
                onClick={handleExpand}
            >
                {title}
            </div>
            <div className="zenin__expand_text">{text}</div>
            <div
                className="zenin__expand_toggle zenin__h_center"
                onClick={handleExpand}
            >
                <ChevronIcon />
            </div>
        </div>

        {expanded ?
            <>
                <div className="zenin__expand_popout_controls">
                    <div className="zenin__expand_popout_controls_left">
                        <Button
                            disabled={isScrolledTop}
                            icon={<span style={{ transform: "rotate(90deg)" }}><FirstIcon /></span>}
                            border={true}
                            onClick={() => handleScroll(false)}
                        >
                            Top
                        </Button>
                        <Button
                            disabled={isScrolledBottom}
                            icon={<span style={{ transform: "rotate(90deg)" }}><LastIcon /></span>}
                            border={true}
                            onClick={() => handleScroll(true)}
                        >
                            Bottom
                        </Button>
                    </div>
                    <div className="zenin__expand_popout_controls_right">
                        <Button
                            icon={<CopyIcon />}
                            disabled={copied}
                            border={true}
                            onClick={handleCopy}
                        >
                            Copy
                        </Button>
                    </div>
                </div>
                <div className="zenin__expand_popout" ref={popoutRef}>
                    <span>{text}</span>
                </div>
            </>
            : null}
    </div>
}