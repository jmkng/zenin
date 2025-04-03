export default function PauseIcon() {
    return <svg
        className="pause_icon icon"
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        style={{
            fillRule: "evenodd",
            clipRule: "evenodd",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeMiterlimit: 1.5,
        }}
    >
        <g transform="matrix(1,0,0,1.05263,10,-1.15789)">
            <path d="M7,3L7,22" style={{ fill: "none", stroke: "currentColor", strokeWidth: 2 }} />
        </g>
        <g transform="matrix(1,0,0,1.05263,0,-1.15789)">
            <path d="M7,3L7,22" style={{ fill: "none", stroke: "currentColor", strokeWidth: 2 }} />
        </g>
    </svg>
}
