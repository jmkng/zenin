export default function PreviousIcon() {
    return <svg
        className="previous_icon icon"
        style={{
            fillRule: "evenodd",
            clipRule: "evenodd",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeMiterlimit: 1.5,
        }}
        viewBox="0 0 24 24"
    >
        <path
            d="m7.5 3 8.5 9-8.5 9"
            style={{
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2,
            }}
            transform="rotate(180 11.875 12)"
        />
    </svg>
}
