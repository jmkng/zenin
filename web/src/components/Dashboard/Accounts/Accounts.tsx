import { Account, ROOT_ACCOUNT_UI, useAccountContext } from "@/internal/account";
import { formatDate } from "@/internal/layout/graphics";
import { useMonitorContext } from "@/internal/monitor";
import { useMemo, useState } from "react";
import { useDefaultAccountService } from "@/internal/account/service";
import { DataPacket, isErrorPacket } from "@/internal/server";

import TextInput from "@/components/Input/TextInput/TextInput";
import Button from "../../../components/Button/Button";
import VMenuIcon from "../../Icon/VMenuIcon";
import Dialog from "../Dialog/Dialog";
import AccountDialogContent from "./AccountDialogContent";

import "./Accounts.css";

interface Draft {
    id: number,
    username: string | null,
    password: string | null,
    passwordConfirm: string | null,
}

type EditorState = { draft: Draft, original: Draft };

export default function Accounts() {
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const monitor = {
        context: useMonitorContext(),
    }
    const payload = account.context.state.token!.payload;
    const defaults = { id: payload.sub, username: payload.username, password: null, passwordConfirm: null };

    const [editor, setEditor] = useState<EditorState>({ draft: defaults, original: defaults });
    const [isEditing, setIsEditing] = useState<boolean>(payload.root ? false : true);
    const [errors, setErrors] = useState<string[]>([]);

    const hasValidPasswords = useMemo(() =>
        editor.draft.password == editor.draft.passwordConfirm, [editor.draft.password, editor.draft.passwordConfirm]);
    const isDraftChanged: boolean = useMemo(() =>
        editor.draft.username != editor.original.username
        || (editor.draft.password != null && editor.draft.password != ""), [editor.draft.username, editor.original.username, editor.draft.password]);
    const isDraftValid: boolean = useMemo(() => hasValidPasswords, [hasValidPasswords]);

    const canSave: boolean = useMemo(() => isDraftValid && isDraftChanged, [isDraftValid, isDraftChanged])

    const handleManagerEdit = (account: Account) => {
        setIsEditing(true);
        const draft: Draft = { ...defaults, id: account.id, username: account.username };
        setEditor({ draft, original: draft });
    }

    const handleSave = async () => {
        const token = account.context.state.token!.raw;
        const id: number = editor.draft.id;
        const username: string = editor.draft.username!; // Safe after client side validations.
        const password: string | null = editor.draft.password;

        // Request a new token when updating the active account.
        const reissue = id == account.context.state.token!.payload.sub;
        const extract = await account.service.updateAccount(token, id, username, password, reissue);
        if (!extract.ok()) {
            const packet = await extract.json();
            if (isErrorPacket(packet)) setErrors(packet.errors);
            return;
        }
        setErrors([]);
        if (reissue) {
            const packet: DataPacket<string> = await extract.json();
            const token = packet.data;
            account.service.setLSToken(token);
            account.context.dispatch({ type: 'login', token });
        }
        account.context.dispatch({ type: 'update', id, username })
        setEditor(prev => {
            const state = { ...prev.draft, password: defaults.password, passwordConfirm: defaults.passwordConfirm };
            return { ...prev, draft: state, original: state }
        })
    }

    const accountManagerTab = <>
        {account.context.state.accounts.map((n, i) => <div key={i} className="zenin__account">
            <div className="zenin__account_top">
                <div className="zenin__account_top_left">
                    <div className="zenin__account_name">
                        {n.username}
                    </div>
                </div>
                <div className="zenin__account_top_right">
                    {n.root
                        ? <div className="zenin__account_rank">
                            {ROOT_ACCOUNT_UI}
                        </div>
                        : null}

                    <Dialog dialog={{ content: <AccountDialogContent onEdit={() => handleManagerEdit(n)} /> }}>
                        <Button hover={false} icon={<VMenuIcon />}>
                        </Button>
                    </Dialog>
                </div>
            </div>

            <small className="zenin__account_updated_timestamp">
                {formatDate(n.updatedAt)}
            </small>
        </div>)}
    </>

    const accountEditTab = <>
        <h1 className="zenin__h_m-0 zenin__h_mb-c">{editor.original.username}</h1>
        <TextInput
            name={"zenin__account_name"}
            label="Username"
            subtext="The account display name."
            value={editor.draft.username}
            onChange={username => setEditor(prev => ({ ...prev, draft: { ...prev.draft, username } }))}
        />
        <div className="zenin__h_mt-c">
            <TextInput
                type="password"
                name={"zenin__account_name"}
                label="Password"
                value={editor?.draft.password || null}
                onChange={password => setEditor(prev => ({ ...prev, draft: { ...prev.draft, password } }))}
            />
        </div>
        {editor.draft.password != null
            ? <div className="zenin__h_mt-c">
                <TextInput
                    type="password"
                    name={"zenin__account_password_confirm"}
                    label={<span className={hasValidPasswords ? "" : "zenin__h_c-dead-a"}>Confirm Password</span>}
                    value={editor.draft.passwordConfirm}
                    onChange={passwordConfirm =>
                        setEditor(prev => ({ ...prev, draft: { ...prev.draft, passwordConfirm } }))
                    }
                />
                {!hasValidPasswords
                    ? <span className="zenin__detail_validation zenin__h_c-dead-a">Passwords do not match.</span>
                    : null}

                {errors
                    ? <div className="zenin__account_message_container">
                        {errors.map((error, index) => <div key={index} className="zenin__account_message error">{error}</div>)}
                    </div>
                    : null}
            </div>
            : null}
    </>

    return <div className="zenin__accounts">
        <div className="zenin__detail_body">
            {isEditing ? accountEditTab : accountManagerTab}
        </div>

        <div className="zenin__detail_controls">
            {isEditing
                ? <Button kind="primary" border={true} disabled={!canSave} onClick={handleSave}>
                    Save
                </Button>
                : null}

            {payload.root && isEditing
                ? <Button border={true} onClick={() => {
                    setEditor({ draft: defaults, original: defaults })
                    setIsEditing(false)
                }}>
                    Back
                </Button>
                : null}

            <div className="zenin__h_ml-auto">
                <Button border={true} onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'accounts' } })}>
                    Close
                </Button>
            </div>
        </div>
    </div >
}
