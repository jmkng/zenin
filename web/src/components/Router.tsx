import { Route, Routes } from "react-router";

import Dashboard from "./Dashboard/Dashboard";
import Hidden from "./Hidden";
import Login from "./Login/Login";
import NotFound from "./NotFound";
import Notifications from "./Notifications/Notifications";
import Private from "./Private";

import "./Router.css";

const ROOT_PATH = "/";
const LOGIN_PATH = "/login";

export default function Router() {    
    return <div className="router">
        <Routes>
            <Route element={<Hidden redirectPath={ROOT_PATH} />}>
                <Route path="/login" element={<Login />} />
            </Route>
            
            <Route element={<Private redirectPath={LOGIN_PATH} />}>
                <Route path={ROOT_PATH} element={<Dashboard />} />
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>

        <Notifications />
    </div>
}
