import { useNavigate } from "react-router-dom";
import Button from "./Button/Button";

import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();
    
    return <div className="zenin__404">
        <div className="zenin__404_message">
            Page Not Found
        </div>
        <Button onClick={() => navigate("/")} kind="primary">
            Back
        </Button>
    </div>
}