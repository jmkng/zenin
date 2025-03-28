import { useNavigate } from "react-router-dom";

import Button from "./Button/Button";

import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();

    return <div className="not_found">
        <div className="not_found_text">
            Page Not Found
        </div>
        <Button onClick={() => navigate("/")} kind="primary">
            Back
        </Button>
    </div>
}