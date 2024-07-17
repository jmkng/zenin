export abstract class Line {
    #notify: boolean;

    constructor({ notify = false }: LineOptions) {
        this.#notify = notify;
    }

    notify = () => {
        const value = this.#notify;
        this.#notify = false;
        return value;
    }

    abstract remote(): boolean;

    abstract element(): JSX.Element;
}

interface LineOptions {
    notify?: boolean;
}
