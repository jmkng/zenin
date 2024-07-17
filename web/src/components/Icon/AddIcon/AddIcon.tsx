import { CSSProperties } from "react";

interface AddIconProps {
    style?: CSSProperties
}

export default function AddIcon(props: AddIconProps) {
    const { style } = props;
    return (
        <svg className="zenin__icon zenin__add_icon" width="100%" height="100%" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" style={{ fillRule: "evenodd", clipRule: "evenodd", strokeLinecap: "round", strokeLinejoin: "round", strokeMiterlimit: 1.5, ...style }}>
            <g transform="matrix(1,0,0,0.909091,0,1.09091)">
                <path d="M12,1L12,23" style={{ fill: "none", stroke: "currentcolor", strokeWidth: "2" }} />
            </g>
            <g transform="matrix(0.909091,0,0,1,1.09091,0)">
                <path d="M1,12L23,12" style={{ fill: "none", stroke: "currentcolor", strokeWidth: "2" }} />
            </g>
        </svg>

    );
}
