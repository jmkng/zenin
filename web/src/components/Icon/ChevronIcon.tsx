export default function ChevronIcon() {
    return <svg 
        className="chevron_icon icon" 
        width="100%" 
        height="100%" 
        viewBox="0 0 24 24" 
        style={{ 
            fillRule: "evenodd", 
            clipRule: "evenodd", 
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            strokeMiterlimit: 1.5 
        }}
    >
        <path 
            d="M7.5,3L16,12L7.5,21" 
            style={{ 
                fill: "none", 
                stroke: "currentcolor", 
                strokeWidth: 2 
            }} 
            transform="translate(0.25,0)"
        />
    </svg>
}
