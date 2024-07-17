import { Route, Routes } from "react-router-dom";
import Hidden from "../../components/Hidden/Hidden";
import Guard from "../../components/Guard/Guard";
import LoginView from "../Login/Login";
import Dashboard from "../Dashboard/Dashboard";
import LogView from "../Log/Log";

export default function Router() {
    return (
        <Routes>
            <Route element={<Hidden />}>
                <Route path="/login" element={<LoginView />} />
            </Route>
            <Route element={<Guard />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/log" element={<LogView />} />
            </Route>
        </Routes>
    )
}
