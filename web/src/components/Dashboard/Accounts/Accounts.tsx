import { Account, ROOT_ACCOUNT_UI, useAccountContext } from "@/internal/account";
import { formatDate } from "@/internal/layout/graphics";
import { useMonitorContext } from "@/internal/monitor";
import { useMemo, useState } from "react";
import { useDefaultAccountService } from "@/internal/account/service";
import { CreatedTimestamp, DataPacket, isErrorPacket } from "@/internal/server";

import TextInput from "@/components/Input/TextInput/TextInput";
import Button from "../../../components/Button/Button";
import VMenuIcon from "../../Icon/VMenuIcon";
import Dialog from "../Dialog/Dialog";
import AccountDialogContent from "./AccountDialogContent";
import DialogModal from "../Dialog/DialogModal";

import "./Accounts.css";

interface Draft {
    id: number | null,
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
    const defaults: Draft = {
        id: null,
        username: null,
        password: null,
        passwordConfirm: null
    };

    const [editor, setEditor] = useState<EditorState>({ draft: defaults, original: defaults });
    const [isEditing, setIsEditing] = useState<boolean>(payload.root ? false : true);
    const [errors, setErrors] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<Account | null>(null);

    const hasValidPasswords = useMemo(() =>
        editor.draft.id
            ? editor.draft.password == editor.draft.passwordConfirm
            : editor.draft.password != null && editor.draft.passwordConfirm != null && editor.draft.password == editor.draft.passwordConfirm,
        [editor.draft.password, editor.draft.passwordConfirm, editor.draft.id]);
    const hasValidUsername = useMemo(() => editor.draft.username != null, [editor.draft.username])
    const isDraftChanged: boolean = useMemo(() =>
        editor.draft.username != editor.original.username
        || (editor.draft.password != null && editor.draft.password != ""), [editor.draft.username, editor.original.username, editor.draft.password]);
    const isDraftValid: boolean = useMemo(() => hasValidUsername && hasValidPasswords, [hasValidUsername, hasValidPasswords]);

    const canSave: boolean = useMemo(() => isDraftValid && isDraftChanged, [isDraftValid, isDraftChanged])

    const handleManagerEdit = (account: Account) => {
        setIsEditing(true);
        const draft: Draft = { ...defaults, id: account.id, username: account.username };
        setEditor({ draft, original: draft });
    }

    const handleSave = async () => {
        // Validations prevent saving before we have good username/password values.
        const username: string = editor.draft.username!;
        const password: string = editor.draft.password!;

        // When id is set we will update that account, otherwise create a new account.
        if (editor.draft.id)
            handleUpdate(editor.draft.id, username, password);
        else handleCreate(username, password);
    }

    const handleReset = () => {
        setEditor(prev => {
            const state = {
                ...prev.draft,
                password: defaults.password,
                passwordConfirm: defaults.passwordConfirm,
            };
            return { ...prev, draft: state, original: state }
        })
    }

    const handleCreate = async (username: string, password: string) => {
        const token = account.context.state.token!.raw;

        const extract = await account.service.createAccount(token, username, password);
        if (extract.ok()) {
            const packet: DataPacket<CreatedTimestamp> = await extract.json();
            account.context.dispatch({
                type: 'create',
                account: {
                    createdAt: packet.data.time,
                    updatedAt: packet.data.time,
                    id: packet.data.id,
                    username,
                    root: false
                }
            });
            handleReset();
            setErrors([]);
        } else {
            const packet = await extract.json();
            if (isErrorPacket(packet)) setErrors(packet.errors);
        }
    }

    const handleUpdate = async (id: number, username: string, password: string) => {
        const token = account.context.state.token!.raw;

        // Request a new token when updating the active account.
        const reissue: boolean = id == account.context.state.token!.payload.sub;

        const extract = await account.service.updateAccount(token, id, username, password, reissue);
        if (extract.ok()) {
            const packet: DataPacket<{ time: string, token?: string }> = await extract.json();
            const updatedAt = packet.data.time;
            account.context.dispatch({ type: 'update', id, username, updatedAt });
            if (reissue) {
                // Token will only be set when a reissue is requested.
                const token = packet.data.token!;
                account.service.setLSToken(token);
                account.context.dispatch({ type: 'login', token });
            }
            handleReset();
            setErrors([]);
        } else {
            const packet = await extract.json();
            if (isErrorPacket(packet)) setErrors(packet.errors);
        }
    }

    async function handleDelete(id: number) {
        const token = account.context.state.token!.raw;
        const extract = await account.service.deleteAccount(token, [id]);
        if (!extract.ok) return;

        setIsDeleting(null);
        account.context.dispatch({ type: 'remove', id })
    }

    function handleEdit() {
        setEditor({ draft: defaults, original: defaults });
        setIsEditing(true);
    }

    const accountManagerTab = <>
        {account.context.state.accounts.map((n, i) => <div key={i} className="account">
            <div className="account_top">
                <div className="account_top_left">
                    <div className="account_name">
                        {n.username}
                    </div>
                </div>
                <div className="account_top_right">
                    {n.root
                        ? <div className="account_rank">
                            {ROOT_ACCOUNT_UI}
                        </div>
                        : null}

                    <Dialog dialog={{
                        content: <AccountDialogContent
                            allowDelete={!n.root}
                            onDelete={() => setIsDeleting(n)}
                            onEdit={() => handleManagerEdit(n)}
                        />
                    }}>
                        <Button hover={false} icon={<VMenuIcon />}>
                        </Button>
                    </Dialog>
                </div>
            </div>

            <small className="account_updated_timestamp">
                {formatDate(n.updatedAt)}
            </small>
        </div>)}
    </>

    const accountEditTab = <>
        <h1 className="h_m-0 h_mb-c">{editor.original.username}</h1>
        <TextInput
            name={"account_name"}
            label="Username"
            subtext="The account display name."
            value={editor.draft.username}
            onChange={username => setEditor(prev => ({ ...prev, draft: { ...prev.draft, username } }))}
        />
        <div className="h_mt-c">
            <TextInput
                type="password"
                name={"account_name"}
                label="Password"
                value={editor?.draft.password || null}
                onChange={password => setEditor(prev => ({ ...prev, draft: { ...prev.draft, password } }))}
            />
        </div>
        {editor.draft.password != null
            ? <div className="h_mt-c">
                <TextInput
                    type="password"
                    name={"account_password_confirm"}
                    label={<span className={hasValidPasswords ? "" : "h_c-dead-a"}>Confirm Password</span>}
                    value={editor.draft.passwordConfirm}
                    onChange={passwordConfirm =>
                        setEditor(prev => ({ ...prev, draft: { ...prev.draft, passwordConfirm } }))
                    }
                />
                {!hasValidPasswords
                    ? <span className="detail_validation h_c-dead-a">Passwords do not match.</span>
                    : null}

                {errors
                    ? <div className="account_message_container">
                        {errors.map((error, index) => <div key={index} className="account_message error">{error}</div>)}
                    </div>
                    : null}
            </div>
            : null}
    </>

    return <div className="accounts">
        <div className="detail_body">
            {isEditing ? accountEditTab : accountManagerTab}
        </div>

        <div className="detail_controls">
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

            {payload.root && !isEditing
                ? <Button kind="primary" border={true} onClick={handleEdit}>
                    Create
                </Button>
                : null}
            <div className="h_ml-auto">
                <Button border={true} onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'accounts' } })}>
                    Close
                </Button>
            </div>
        </div>

        {isDeleting
            ? <DialogModal
                title="Confirm"
                visible={isDeleting != null}
                onCancel={() => setIsDeleting(null)}
                content={<div className="dialog_delete_account_content">
                    <div className="dialog_confirm_content_top">
                        <div>Are you sure you want to delete {isDeleting.username}?</div>
                        <div>This action cannot be undone.</div>
                    </div>
                    <div className="dialog_confirm_content_bottom">
                        <Button onClick={() => handleDelete(isDeleting.id)} kind="primary">
                            <span>Delete</span>
                        </Button>
                    </div>
                </div>}
            />
            : null}
    </div>
}
