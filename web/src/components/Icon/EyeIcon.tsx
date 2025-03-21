interface EyeIconProps {
    hide: boolean;
}

export default function EyeIcon(props: EyeIconProps) {
    const { hide } = props;

    return <svg className="icon eye_icon" width="100%" height="100%" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" style={{ fillRule: "evenodd", clipRule: "evenodd", strokeLinejoin: "round", strokeMiterlimit: 2, fill: "currentcolor" }}>
        <g transform="matrix(0.216005,0,0,0.21442,1.19975,1.27902)">
            <path d="M95.64,39.55C89.36,29.32 75.07,12.16 50,12.16C24.93,12.16 10.64,29.32 4.36,39.55C0.4,45.96 0.4,54.05 4.36,60.45C10.64,70.68 24.93,87.84 50,87.84C75.07,87.84 89.36,70.68 95.64,60.45C99.6,54.05 99.6,45.95 95.64,39.55ZM88.74,56.21C83.34,64.98 71.13,79.74 50,79.74C28.87,79.74 16.66,64.98 11.26,56.21C8.91,52.4 8.91,47.59 11.26,43.79C16.65,35.02 28.86,20.26 50,20.26C71.14,20.26 83.34,35 88.74,43.79C91.09,47.6 91.09,52.4 88.74,56.21ZM50,29.75C38.82,29.75 29.75,38.82 29.75,50C29.75,61.18 38.82,70.25 50,70.25C61.18,70.25 70.25,61.18 70.25,50C70.23,38.82 61.18,29.77 50,29.75ZM50,62.15C43.29,62.15 37.85,56.71 37.85,50C37.85,43.29 43.29,37.85 50,37.85C56.71,37.85 62.15,43.29 62.15,50C62.15,56.71 56.71,62.15 50,62.15Z" style={{ fillRule: "nonzero", stroke: "currentcolor", strokeWidth: 2 }} />
        </g>
        <g transform="matrix(1.2,0,0,1.125,-1.8,-1.5)">
            {!hide ?
                <path d="M19,4L4,20" style={{ stroke: "currentcolor", strokeWidth: 2, strokeLinecap: "round", strokeMiterlimit: 1.5 }} />
                : null
            }
        </g>
    </svg>
}
