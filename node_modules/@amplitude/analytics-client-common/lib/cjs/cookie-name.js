Object.defineProperty(exports, "__esModule", { value: true });
exports.getOldCookieName = exports.getCookieName = void 0;
var analytics_core_1 = require("@amplitude/analytics-core");
var getCookieName = function (apiKey, postKey, limit) {
    if (postKey === void 0) { postKey = ''; }
    if (limit === void 0) { limit = 10; }
    return [analytics_core_1.AMPLITUDE_PREFIX, postKey, apiKey.substring(0, limit)].filter(Boolean).join('_');
};
exports.getCookieName = getCookieName;
var getOldCookieName = function (apiKey) {
    return "".concat(analytics_core_1.AMPLITUDE_PREFIX.toLowerCase(), "_").concat(apiKey.substring(0, 6));
};
exports.getOldCookieName = getOldCookieName;
//# sourceMappingURL=cookie-name.js.map