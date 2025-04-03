import { useLayoutContext } from "@/hooks/useLayout";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Button from "./Button/Button";

import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();
    const layoutContext = useLayoutContext();

    useEffect(() => {
        layoutContext.dispatch({ type: "load", loading: false });
    }, []);

    function back() {
        layoutContext.dispatch({ type: "load", loading: true });
        navigate("/");
    }

    return <div className="not_found">
        <div className="not_found_text">
            Page Not Found
        </div>
        <Button onClick={back} kind="primary">
            Back
        </Button>
    </div>
}
