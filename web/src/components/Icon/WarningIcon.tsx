export default function WarningIcon() {
    return <svg
        className="warning_icon icon"
        style={{
            fillRule: "evenodd",
            clipRule: "evenodd",
            strokeLinejoin: "round",
            strokeMiterlimit: 2,
        }}
        viewBox="0 0 24 24"
    >
        <path
            d="M92.27 45.582 54.418 7.73a6.249 6.249 0 0 0-8.832 0L7.731 45.582A6.196 6.196 0 0 0 5.899 50c0 1.668.645 3.231 1.832 4.418l37.855 37.855a6.253 6.253 0 0 0 4.418 1.832 6.176 6.176 0 0 0 4.418-1.832l37.855-37.855A6.194 6.194 0 0 0 94.109 50c0-1.668-.645-3.23-1.832-4.418h-.007Zm-2.937 5.898L51.478 89.335c-.813.813-2.145.813-2.938 0L10.669 51.48a2.066 2.066 0 0 1-.605-1.48c0-.563.207-1.082.605-1.481l37.852-37.852a2.075 2.075 0 0 1 2.937 0l37.855 37.855c.395.395.606.918.606 1.481 0 .562-.207 1.082-.606 1.48l.02-.003Z"
            style={{
                fillRule: "nonzero",
                stroke: "currentColor",
                strokeWidth: "2px",
            }}
            transform="matrix(.25179 0 0 .25179 -.59 -.59)"
        />
        <path
            d="m12 15 4.292-6.009"
            style={{
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.28px",
                strokeLinecap: "round",
                strokeMiterlimit: 1.5,
            }}
            transform="matrix(.6946 -.29033 .49614 .6351 -3.777 6.02)"
        />
        <circle
            cx={12.392}
            cy={6.892}
            r={0.892}
            transform="translate(-1.89 8.275) scale(1.12085)"
        />
    </svg>
}
