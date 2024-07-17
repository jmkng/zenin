import { useState } from "react";

import Button from "../../Button/Button";
import UpDownIcon from "../../Icon/UpDownIcon/UpDownIcon";

import "./Description.css"

interface DescriptionProps {
    description: string | null
}

const MAXCHARS = 238;

export default function DescriptionComponent(props: DescriptionProps) {
    const { description } = props;
    const overflows = description != null && (description.length > MAXCHARS);
    const [truncated, setTruncated] = useState<boolean>(true);

    const handleExpandToggle = () => {
        setTruncated(prev => !prev);
    }

    const element = <div className="zenin__description_component">
        <div className="zenin__info_description">
            <div className="zenin__info_description_text">
                {(overflows && truncated && description) ? truncate(description) : description}
            </div>
            {overflows ?
                <div className="zenin__info_description_controls">
                    <Button onClick={handleExpandToggle}>
                        <UpDownIcon />
                    </Button>
                </div> : null}
        </div>
    </div>

    return description ? element : null
}

const truncate = (value: string) => {
    return value.slice(0, MAXCHARS) + "...";
}
