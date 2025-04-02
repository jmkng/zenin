import { POST_API, Service } from "../server";
import { AuthenticatedRequest, Request } from "../server/request";
import { Settings } from ".";

class SettingsService extends Service {
    constructor() { super(); }

    async getSettings(token: string, themes: boolean) {
        const address = `/settings?themes=${themes}`;
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }
    
    async updateSettings(token: string, settings: Settings) {
        const address = '/settings';
        const body = JSON.stringify(settings);
        const request = new AuthenticatedRequest(token, address).method(POST_API).body(body);
        return await this.extract(request);
    }
    
    async getThemes(token: string) {
        const address = '/settings/themes';
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }

    async getActiveTheme(strict: boolean, json?: boolean) {
        let address = '/settings/themes/active';
        if (!strict) address += "?strict=false";
        const request = new Request(address);
        request.headers({ "Accept": json ? "application/json" : "text/css"});
        return await this.extract(request);
    }
}

export { SettingsService };
