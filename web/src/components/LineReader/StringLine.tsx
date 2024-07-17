import { Line } from "./Line";

interface StringLineOptions {
    message: string;
    remote?: boolean;
    notify?: boolean;
}
export default class StringLine extends Line {
    #message: string;
    #remote: boolean;

    constructor({ message, remote = false, notify = false }: StringLineOptions) {
        super({ notify });
        this.#message = message;
        this.#remote = remote;
    }

    remote = () => this.#remote

    element = () => <span className="zenin__string_line zenin__line">{this.#message}</span>;
}
