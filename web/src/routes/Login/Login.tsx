import { useEffect, useState } from "react";
import { useAccountContext } from "../../internal/account";
import { useDefaultAccountService } from "../../internal/account/service";
import { useNavigate } from "react-router-dom";
import { DataPacket, Packet, isErrorPacket } from "../../server";
import { useLayoutContext } from "../../internal/layout";
import { useDefaultMetaService } from "../../internal/meta/service";
import { Meta } from "../../internal/meta";

import TextInput from "../../components/Input/TextInput/TextInput";
import Button from "../../components/Button/Button";
import LogoIcon from "../../components/Icon/LogoIcon/LogoIcon";

import "./Login.css"

export default function LoginView() {
    const [form, setForm] = useState<LoginState>(defaultState);
    const [errors, setErrors] = useState<string[]>([]);
    const [summary, setSummary] = useState<Meta | null>(null);
    const meta = useDefaultMetaService();
    const account = {
        service: useDefaultAccountService(),
        context: useAccountContext()
    }
    const layout = useLayoutContext();
    const navigate = useNavigate();

    useEffect(() => {
        handleInitialize();
    }, [])

    useEffect(() => {
        if (!summary) return;
        layout.dispatch({ type: 'load', loading: false })
    }, [summary])


    const handleInitialize = async () => {
        const extract = await meta.summary();
        if (!extract.ok()) return;
        const packet: DataPacket<Meta> = await extract.json();
        setSummary(packet.data);
    }

    const handleSubmit = async () => {
        if (!summary || !handleFormValidate()) return;
        let extract;
        const username = form.username || "";
        const password = form.password || "";
        layout.dispatch({ type: 'load', loading: true });
        if (summary.isClaimed) extract = await account.service.login(username, password);
        else extract = await account.service.claim(username, password);
        const packet: Packet<string> = await extract.json();
        if (!extract.ok()) return handleFailure(packet);
        const token = (packet as DataPacket<string>).data;
        account.service.set(token);
        account.context.dispatch({ type: 'login', token });
        setErrors([]);
        navigate("/login");
    }

    const handleFormValidate = () => {
        let result = true;
        if (!summary) return;
        if (!summary.isClaimed && (form.password != form.confirm)) {
            setErrors(["Passwords do not match."]);
            result = false;
        }
        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFailure = (packet: any) => {
        if (isErrorPacket(packet)) setErrors(packet.errors);
        else setErrors(["An internal server error has occurred. Try again."]);
        layout.dispatch({ type: 'load', loading: false });
    }

    // TODO: Documentation
    const warning = <div className="zenin__login_message">
        <span>You are logging in to an <a href="#">unclaimed</a> Zenin server. This action will create the first account on the server.</span>
    </div>

    const login = <div className="zenin__login">
        <header className="zenin__login_header">
        </header>
        <div className="zenin__login_logo_container">
            <LogoIcon />
        </div>
        <div className="zenin__login_form_container">
            <div className="zenin__login_spaced">
                <TextInput
                    name="zenin__login_username"
                    label="Username"
                    value={form.username}
                    onChange={(username: string | null) => setForm(prev => ({ ...prev, username }))} />
            </div>
            <div className="zenin__login_spaced">
                <TextInput
                    name="zenin__login_password"
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={(password: string | null) => setForm(prev => ({ ...prev, password }))} />
            </div>
            {!summary?.isClaimed
                ?
                <div className="zenin__login_spaced">
                    <TextInput
                        name="zenin__login_password_confirm"
                        label="Confirm Password"
                        type="password"
                        value={form.confirm}
                        onChange={(confirm: string | null) => setForm(prev => ({ ...prev, confirm }))} />
                </div>
                : null}
            <div className="zenin__login_controls">
                <Button kind="primary" onClick={handleSubmit}>{summary?.isClaimed ? "Submit" : "Claim"}</Button>
            </div>
        </div>

        <div className="zenin__login_message_container">
            {errors.length == 0 && !summary?.isClaimed
                ? warning
                : null}
            {errors
                ? errors.map((error, index) => <div key={index} className="zenin__login_message error">{error}</div>)
                : null}
        </div>
    </div >

    return summary ? login : null
}

interface LoginState {
    username: string | null
    password: string | null
    confirm: string | null
}

const defaultState = { username: null, password: null, confirm: null };
