import { useEffect, useState } from "react"
import { formatDate } from "../../../internal/layout/graphics";
import { Certificate, Measurement } from "../../../internal/measurement";
import { useAccountContext } from "../../../internal/account";
import { useDefaultMeasurementService } from "../../../internal/measurement/service";
import { DataPacket } from "../../../server";

import ChevronIcon from "../../Icon/ChevronIcon/ChevronIcon";

import "./Chain.css"

interface ChainProps {
    measurement: Measurement
}

export default function ChainComponent(props: ChainProps) {
    const account = useAccountContext();
    const measurement = {
        service: useDefaultMeasurementService(),
        data: props.measurement,
    }
    const [expanded, setExpanded] = useState<boolean>(false);

    const [pending, setPending] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[] | null>(null);

    useEffect(() => {
        setPending(false);
        setCertificates(null);
        setExpanded(false);
    }, [measurement.data])

    const handleLoad = async () => {
        const token = account.state.authenticated!.token.raw;
        const certificates = await measurement.service.getCertificates(token, measurement.data.id);
        if (!certificates.ok()) return;
        const packet: DataPacket<Certificate[]> = await certificates.json();
        setCertificates(packet.data);
        setPending(false);
    }

    const handleExpand = () => {
        if (expanded) {
            setExpanded(false);
        } else {
            setExpanded(true);
            if (certificates == null) {
                setPending(true);
                handleLoad();
            }
        }
    }

    return <div
        className={
            [
                "zenin__chain_component",
                pending ? "pending" : "",
                expanded && certificates != null ? "expanded" : "",
            ].join(" ")}>
        <div className="zenin__chain_controls">
            <div
                className="zenin__chain_title"
                onClick={handleExpand}
            >
                Certificates
            </div>

            <div
                className={["zenin__chain_toggle zenin__h_center"].join(' ')}
                onClick={handleExpand}
            >
                <ChevronIcon />
            </div>
        </div>

        {expanded && certificates != null ?
            <div className="zenin__chain_popout">
                {certificates.map((certificate, index) =>
                    <div className="zenin__chain_popout_certificate" key={index}>
                        <div className="zenin__chain_popout_not_before zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Not Before</span>
                            <span className="zenin__chain_popout_value">{formatDate(certificate.notBefore)}</span>
                        </div>
                        <div className="zenin__chain_popout_not_after zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Not After</span>
                            <span className="zenin__chain_popout_value">{formatDate(certificate.notAfter)}</span>
                        </div>
                        <div className="zenin__chain_popout_public_key_algorithm zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Public Key Algorithm</span>
                            <span className="zenin__chain_popout_value">{certificate.publicKeyAlgorithm}</span>
                        </div>
                        <div className="zenin__chain_popout_serial_number zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Serial</span>
                            <span className="zenin__chain_popout_value">{certificate.serialNumber}</span>
                        </div>
                        <div className="zenin__chain_popout_version zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Version</span>
                            <span className="zenin__chain_popout_value">{certificate.version}</span>
                        </div>
                        <div className="zenin__chain_popout_subject_common_name zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Subject Common Name</span>
                            <span className="zenin__chain_popout_value">{certificate.subjectCommonName}</span>
                        </div>
                        <div className="zenin__chain_popout_issuer_common_name zenin__chain_popout_row">
                            <span className="zenin__chain_popout_label">Issuer Common Name</span>
                            <span className="zenin__chain_popout_value">{certificate.issuerCommonName}</span>
                        </div>
                    </div>)
                }
            </div>
            : null}
    </div>
}