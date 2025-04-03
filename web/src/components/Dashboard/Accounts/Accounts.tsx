import { useEffect, useMemo, useRef, useState } from "react";

import { useAccount } from "@/hooks/useAccount";
import { useMonitorContext } from "@/hooks/useMonitor";
import { useNotify } from "@/hooks/useNotify";
import { Account, ROOT_ACCOUNT_UI, setLSToken } from "@/internal/account";
import { formatUTCDate } from "@/internal/layout/graphics";
import { CreatedTimestamp, DataPacket, isErrorPacket } from "@/internal/server";

import TextInput from "@/components/Input/TextInput/TextInput";
import Button from "../../../components/Button/Button";
import VMenuIcon from "../../Icon/VMenuIcon";
import Dialog from "../Dialog/Dialog";
import DialogModal from "../Dialog/DialogModal";
import AccountDialogContent from "./AccountDialogContent";

import "./Accounts.css";

interface Draft {
    id: number | null,
    username: string | null,
    password: string | null,
    passwordConfirm: string | null,
}

type EditorState = { draft: Draft, original: Draft };

const defaults: Draft = {
    id: null,
    username: null,
    password: null,
    passwordConfirm: null
};

export default function Accounts() {
    const { service: accountService, context: accountContext } = useAccount();
    const monitorContext = useMonitorContext();
    const notify = useNotify();
    const payload = accountContext.state.token!.payload;
    const errorsContainerRef = useRef<HTMLDivElement>(null);

    const [editor, setEditor] = useState<EditorState>({ draft: defaults, original: defaults });
    const [isEditing, setIsEditing] = useState<boolean>(payload.root ? false : true);
    const [errors, setErrors] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<Account | null>(null);

    useEffect(() => {
        if (errors.length > 0) errorsContainerRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    }, [errors]);

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

    function editAccount(account: Account) {
        setIsEditing(true);
        const draft: Draft = { ...defaults, id: account.id, username: account.username };
        setEditor({ draft, original: draft });
    }

    async function save() {
        // Validations prevent saving before we have good username/password values.
        const username: string = editor.draft.username!;
        const password: string = editor.draft.password!;

        // When id is set we will update that account, otherwise create a new account.
        if (editor.draft.id) updateAccount(editor.draft.id, username, password);
        else createAccount(username, password);
    }

    function reset() {
        setEditor(prev => {
            const state = {
                ...prev.draft,
                password: defaults.password,
                passwordConfirm: defaults.passwordConfirm,
            };
            return { ...prev, draft: state, original: state }
        })
    }

    async function createAccount(username: string, password: string) {
        const token = accountContext.state.token!.raw;

        const extract = await accountService.createAccount(token, username, password);
        if (!extract.ok()) {
            const packet = await extract.json();
            if (isErrorPacket(packet)) setErrors(packet.errors);
            return;
        }
        
        const packet: DataPacket<CreatedTimestamp> = await extract.json();
        accountContext.dispatch({
            type: 'create',
            account: {
                createdAt: packet.data.time,
                updatedAt: packet.data.time,
                id: packet.data.id,
                username,
                root: false
            }
        });
        reset();
        setErrors([]);
        notify("Account created.");
    }

    async function updateAccount(id: number, username: string, password: string) {
        const token = accountContext.state.token!.raw;

        // Request a new token when updating the active account.
        const reissue: boolean = id == accountContext.state.token!.payload.sub;

        const extract = await accountService.updateAccount(token, id, username, password, reissue);
        if (!extract.ok()) {
            const packet = await extract.json();
            if (isErrorPacket(packet)) setErrors(packet.errors);
            return;
        }
        
        const packet: DataPacket<{ time: string, token?: string }> = await extract.json();
        const updatedAt = packet.data.time;
        accountContext.dispatch({ type: 'update', id, username, updatedAt });
        if (reissue) {
            // Token will only be set when a reissue is requested.
            const newToken = packet.data.token!;
            setLSToken(newToken);
            accountContext.dispatch({ type: 'login', token: newToken });
        }
        reset();
        setErrors([]);
        notify("Account updated.");
    }

    async function deleteAccount(id: number) {
        const token = accountContext.state.token!.raw;
        try {
            const extract = await accountService.deleteAccount(token, [id]);
            if (!extract.ok()) {
                const body = await extract.json();
                if (isErrorPacket(body)) setErrors(body.errors);
                return
            };
    
            setIsDeleting(null);
            accountContext.dispatch({ type: "delete", id })
            notify("Account deleted.");
        } catch {
            setIsDeleting(null);
        }
    }

    function draftAccount() {
        setEditor({ draft: defaults, original: defaults });
        setIsEditing(true);
    }

    const accountManagerTab = <>
        <h1 className="h_m-0">Accounts</h1>
        <div className="h_mt-c">
            {accountContext.state.accounts.map((n, i) => <div key={i} className="account">
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
                                onEdit={() => editAccount(n)}
                            />
                        }}>
                            <Button hover={false} icon={<VMenuIcon />}>
                            </Button>
                        </Dialog>
                    </div>
                </div>

                <small className="account_updated_timestamp">
                    {formatUTCDate(n.updatedAt)}
                </small>
            </div>)}
        </div>
    </>

    const accountEditTab = <>
        <h1 className="h_m-0">{editor.original.username}</h1>
        <div className="h_mt-c">
            <TextInput
                name={"account_name"}
                label="Username"
                subtext="The account display name."
                value={editor.draft.username}
                onChange={username => setEditor(prev => ({ ...prev, draft: { ...prev.draft, username } }))}
            />
        </div>
        <div className="h_mt-c">
            <TextInput
                type="password"
                name={"account_password"}
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

   
            </div>
            : null}

            <div className="accounts_message_container">
                {errors.map((n, index) => <div key={index} className="accounts_message error h_mt-c">{n}</div>)}
            </div>
    </>

    return <div className="accounts">
        <div className="detail_body">
            {isEditing ? accountEditTab : accountManagerTab}
        </div>

        <div className="detail_controls">
            {isEditing
                ? <Button kind="primary" border={true} disabled={!canSave} onClick={save}>
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
                ? <Button kind="primary" border={true} onClick={draftAccount}>
                    Create
                </Button>
                : null}
            <div className="h_ml-auto">
                <Button border={true} onClick={() => monitorContext.dispatch({ type: 'pane', pane: { type: 'accounts' } })}>
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
                        <Button onClick={() => deleteAccount(isDeleting.id)} kind="primary">
                            <span>Delete</span>
                        </Button>
                    </div>
                </div>}
            />
            : null}
    </div>
}
