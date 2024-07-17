import { Line } from './Line';

import './ObjectLine.css';

interface ObjectLineOptions {
    object: object;
    message?: string;
    notify?: boolean;
    remote?: boolean;
}

export default class ObjectLine extends Line {
    #object: object
    #message: string
    #remote: boolean

    constructor({ object, message = "", notify = false, remote = false }: ObjectLineOptions) {
        super({ notify })
        this.#object = object;
        this.#message = message;
        this.#remote = remote;
    }

    remote = () => this.#remote

    element = () => {
        const entries = Object.entries(this.#object);
        const pairs = entries.map(([key, value], index) => (
            <span className="zenin__line_pair" key={index}>
                <span className="zenin__line_key">{key}</span>
                =
                <span className={["zenin__line_value", key === "state" ? `${value}` : ''].join(' ')}>{value}</span>
                {index < entries.length - 1 && ', '}
            </span>
        ));
        return <span className="zenin__object_line zenin__line">{this.#message} {pairs}</span>;
    }
}
