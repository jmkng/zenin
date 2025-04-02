import { useAccount } from "@/hooks/useAccount";
import { useLayoutContext } from "@/hooks/useLayout";
import { setLSToken } from "@/internal/account";
import { DataPacket, isErrorPacket } from "@/internal/server";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../Button/Button";
import LogoIcon from "../Icon/LogoIcon";
import TextInput from "../Input/TextInput/TextInput";

import "./Login.css";

export default function Login() {
    const { service: accountService, context: accountContext } = useAccount();
    const layoutContext = useLayoutContext();
    const navigate = useNavigate();

    const [editor, setEditor] = useState<LoginState>(defaults);
    const [errors, setErrors] = useState<string[]>([]);
    const [isClaimed, setIsClaimed] = useState<boolean | null>(null);

    const hasValidPasswords = useMemo(() => isClaimed ? true : editor.password == editor.passwordConfirm, [isClaimed, editor.password, editor.passwordConfirm])
    const hasValidPasswordConfirm = useMemo(() => editor.password == editor.passwordConfirm, [editor.password, editor.passwordConfirm])
    const canSave: boolean = useMemo(() => hasValidPasswords, [hasValidPasswords])

    useEffect(() => {
        (async () => {
            const extract = await accountService.getClaimed();
            if (!extract.ok()) return;
            const packet: DataPacket<{claimed: boolean}> = await extract.json();
            setIsClaimed(packet.data.claimed);
        })()
    }, [])

    useEffect(() => {
        if (isClaimed === null) return;
        layoutContext.dispatch({ type: 'load', loading: false })
    }, [isClaimed])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
            }
        };
    
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleSubmit]);

    async function handleSubmit() {
        if (isClaimed === null || !handleFormValidate()) return;

        const username = editor.username || "";
        const password = editor.password || "";
        layoutContext.dispatch({ type: 'load', loading: true });

        const extract = isClaimed
            ? await accountService.authenticate(username, password)
            : await accountService.setClaimed(username, password)

        const packet: DataPacket<{token: string}> = await extract.json();
        if (!extract.ok()) {
            if (isErrorPacket(packet)) setErrors(packet.errors);
            layoutContext.dispatch({ type: 'load', loading: false });
            return;
        }

        const token = packet.data.token;
        setLSToken(token);
        accountContext.dispatch({ type: 'login', token });
        setErrors([]);
        navigate("/");
    }

    function handleFormValidate() {
        let result = true;
        if (isClaimed === null) return;
        if (isClaimed === false && (editor.password != editor.passwordConfirm)) {
            setErrors(["Passwords do not match."]);
            result = false;
        }
        return result;
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
                        label={<span className={hasValidPasswords ? "" : "h_c-dead-a"}>Confirm Password</span>}
                        type="password"
                        value={editor.passwordConfirm}
                        onChange={(confirm: string | null) => setEditor(prev => ({ ...prev, passwordConfirm: confirm }))} 
                    />
                    {!hasValidPasswordConfirm
                    ? <span className="detail_validation h_c-dead-a">Passwords do not match.</span>
                    : null}
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