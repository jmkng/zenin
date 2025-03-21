import { useLayoutEffect, useState } from "react";
import { useAccountContext } from "@/internal/account";
import { formatDate } from "@/internal/layout/graphics";
import { Certificate, Measurement } from "@/internal/measurement";
import { useDefaultMeasurementService } from "@/internal/measurement/service";
import { DataPacket } from "@/internal/server";

import ChevronIcon from "../../../Icon/ChevronIcon";

import "./Chain.css";


interface ChainProps {
    measurement: Measurement
}

export default function Chain(props: ChainProps) {
    const account = useAccountContext();
    const measurement = {
        service: useDefaultMeasurementService(),
        data: props.measurement,
    }
    const [state, setState] = useState<ChainState>("WAITING")

    useLayoutEffect(() => {
        setState("WAITING");
    }, [measurement.data])

    const handleExpand = async () => {
        if (state == "PENDING" || isReadyState(state) && state.certificates.length == 0) return;
        if (state == "WAITING") {
            setState("PENDING");
            const token = account.state.token!.raw;
            const certificates = await measurement.service.getCertificate(token, measurement.data.id);
            if (!certificates.ok()) return;
            const packet: DataPacket<{certificates: Certificate[] | null}> = await certificates.json();
            setState({ certificates: packet.data.certificates || [], expanded: true });
            return;
        }
        setState({ ...state, expanded: !state.expanded })
    }

    return <div
        className={
            ["chain_component",
                state == "PENDING" ? "pending" : "",
                isReadyState(state) && state.expanded
                    ? state.certificates.length > 0
                        ? "expanded"
                        : "disabled"
                    : "",
            ].join(" ")}>
        <div className="chain_controls">
            <div
                className="chain_title"
                onClick={handleExpand}
            >
                {isReadyState(state) && state.certificates.length == 0 ? "No Certificates Available" : "Certificates"}
            </div>

            <div
                className={["chain_toggle h_f-row-center"].join(' ')}
                onClick={handleExpand}
            >
                <ChevronIcon />
            </div>
        </div>

        {isReadyState(state) && state.expanded ?
            <div className={"chain_popout"}>
                {state.certificates.map((certificate, index) =>
                    <div className="chain_popout_certificate" key={index}>
                        <div className="chain_popout_not_before chain_popout_row">
                            <span className="chain_popout_label">Not Before</span>
                            <span className="chain_popout_value">{formatDate(certificate.notBefore)}</span>
                        </div>
                        <div className="chain_popout_not_after chain_popout_row">
                            <span className="chain_popout_label">Not After</span>
                            <span className="chain_popout_value">{formatDate(certificate.notAfter)}</span>
                        </div>
                        <div className="chain_popout_public_key_algorithm chain_popout_row">
                            <span className="chain_popout_label">Public Key Algorithm</span>
                            <span className="chain_popout_value">{certificate.publicKeyAlgorithm}</span>
                        </div>
                        <div className="chain_popout_serial_number chain_popout_row">
                            <span className="chain_popout_label">Serial</span>
                            <span className="chain_popout_value">{certificate.serialNumber}</span>
                        </div>
                        <div className="chain_popout_version chain_popout_row">
                            <span className="chain_popout_label">Version</span>
                            <span className="chain_popout_value">{certificate.version}</span>
                        </div>
                        <div className="chain_popout_subject_common_name chain_popout_row">
                            <span className="chain_popout_label">Subject Common Name</span>
                            <span className="chain_popout_value">{certificate.subjectCommonName}</span>
                        </div>
                        <div className="chain_popout_issuer_common_name chain_popout_row">
                            <span className="chain_popout_label">Issuer Common Name</span>
                            <span className="chain_popout_value">{certificate.issuerCommonName}</span>
                        </div>
                    </div>)
                }
            </div>
            : null}
    </div>
}

type ChainState = WaitingState | PendingState | ReadyState;

type PendingState = "PENDING";

type WaitingState = "WAITING";

type ReadyState = { certificates: Certificate[], expanded: boolean };

function isReadyState(state: ChainState): state is ReadyState {
    return typeof state === 'object' && state !== null && 'certificates' in state && 'expanded' in state;
}
