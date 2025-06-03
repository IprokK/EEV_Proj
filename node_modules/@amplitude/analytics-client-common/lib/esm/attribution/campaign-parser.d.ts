import { Campaign, CampaignParser as ICampaignParser, ClickIdParameters, ReferrerParameters, UTMParameters } from '@amplitude/analytics-types';
export declare class CampaignParser implements ICampaignParser {
    parse(): Promise<Campaign>;
    getUtmParam(): UTMParameters;
    getReferrer(): ReferrerParameters;
    getClickIds(): ClickIdParameters;
}
//# sourceMappingURL=campaign-parser.d.ts.map