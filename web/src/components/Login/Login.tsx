import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountContext } from "@/internal/account";
import { useDefaultAccountService } from "@/internal/account/service";
import { useLayoutContext } from "@/internal/layout";
import { DataPacket, isErrorPacket } from "@/internal/server";

import Button from "../Button/Button";
import LogoIcon from "../Icon/LogoIcon";
import TextInput from "../Input/TextInput/TextInput";

import "./Login.css";

export default function Login() {
    const account = {
        service: useDefaultAccountService(),
        context: useAccountContext()
    };
    const layout = useLayoutContext();
    const navigate = useNavigate();

    const [editor, setEditor] = useState<LoginState>(defaults);
    const [errors, setErrors] = useState<string[]>([]);
    const [isClaimed, setIsClaimed] = useState<boolean | null>(null);

    const hasValidPasswords = useMemo(() => isClaimed ? true : editor.password == editor.passwordConfirm, [isClaimed, editor.password, editor.passwordConfirm])
    const canSave: boolean = useMemo(() => hasValidPasswords, [hasValidPasswords])

    useEffect(() => {
        (async () => {
            const extract = await account.service.getClaimed();
            if (!extract.ok()) return;
            const packet: DataPacket<{claimed: boolean}> = await extract.json();
            setIsClaimed(packet.data.claimed);
        })()
    }, [])

    useEffect(() => {
        if (isClaimed === null) return;
        layout.dispatch({ type: 'load', loading: false })
    }, [isClaimed])

    const handleSubmit = async () => {
        if (isClaimed === null || !handleFormValidate()) return;

        const username = editor.username || "";
        const password = editor.password || "";
        layout.dispatch({ type: 'load', loading: true });

        const extract = isClaimed
            ? await account.service.authenticate(username, password)
            : await account.service.setClaimed(username, password)

        const packet: DataPacket<{token: string}> = await extract.json();
        if (!extract.ok()) {
            handleFailure(packet);
            return;
        }

        const token = packet.data.token;
        account.service.setLSToken(token);
        account.context.dispatch({ type: 'login', token });
        setErrors([]);
        navigate("/login");
    }

    const handleFormValidate = () => {
        let result = true;
        if (isClaimed === null) return;
        if (isClaimed === false && (editor.password != editor.passwordConfirm)) {
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
    const warning = <div className="login_message">
        <span>You are logging in to an <a href="#">unclaimed</a> Zenin server. This action will create the first account on the server.</span>
    </div>

    const login = <div className="login">
        <header className="login_header">
        </header>
        <div className="login_logo_container">
            <LogoIcon />
        </div>
        <div className="login_form_container">
            <div className="login_spaced">
                <TextInput
                    name="login_username"
                    label="Username"
                    value={editor.username}
                    onChange={(username: string | null) => setEditor(prev => ({ ...prev, username }))} />
            </div>
            <div className="login_spaced">
                <TextInput
                    name="login_password"
                    label="Password"
                    type="password"
                    value={editor.password}
                    onChange={(password: string | null) => setEditor(prev => ({ ...prev, password }))} />
            </div>
            {isClaimed !== null && isClaimed === false
                ?
                <div className="login_spaced">
                    <TextInput
                        name="login_password_confirm"
                        label="Confirm Password"
                        type="password"
                        value={editor.passwordConfirm}
                        onChange={(confirm: string | null) => setEditor(prev => ({ ...prev, passwordConfirm: confirm }))} />
                </div>
                : null}
            <div className="login_controls">
                <Button
                    kind="primary"
                    onClick={handleSubmit}
                    disabled={!canSave}
                >{isClaimed !== null && isClaimed === true ? "Submit" : "Claim"}
                </Button>
            </div>
        </div>

        <div className="login_message_container">
            {errors.length == 0 && isClaimed !== null && isClaimed === false
                ? warning
                : null}
            {errors
                ? errors.map((error, index) => <div key={index} className="login_message error">{error}</div>)
                : null}
        </div>
    </div>

    return isClaimed !== null ? login : null
}

interface LoginState {
    username: string | null
    password: string | null
    passwordConfirm: string | null
}

const defaults = { username: null, password: null, passwordConfirm: null };
