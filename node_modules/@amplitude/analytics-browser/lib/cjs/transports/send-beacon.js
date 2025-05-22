Object.defineProperty(exports, "__esModule", { value: true });
exports.SendBeaconTransport = void 0;
var tslib_1 = require("tslib");
var analytics_client_common_1 = require("@amplitude/analytics-client-common");
var analytics_core_1 = require("@amplitude/analytics-core");
var SendBeaconTransport = /** @class */ (function (_super) {
    tslib_1.__extends(SendBeaconTransport, _super);
    function SendBeaconTransport() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SendBeaconTransport.prototype.send = function (serverUrl, payload) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var globalScope = (0, analytics_client_common_1.getGlobalScope)();
                        /* istanbul ignore if */
                        if (!(globalScope === null || globalScope === void 0 ? void 0 : globalScope.navigator.sendBeacon)) {
                            throw new Error('SendBeaconTransport is not supported');
                        }
                        try {
                            var data = JSON.stringify(payload);
                            var success = globalScope.navigator.sendBeacon(serverUrl, JSON.stringify(payload));
                            if (success) {
                                return resolve(_this.buildResponse({
                                    code: 200,
                                    events_ingested: payload.events.length,
                                    payload_size_bytes: data.length,
                                    server_upload_time: Date.now(),
                                }));
                            }
                            return resolve(_this.buildResponse({ code: 500 }));
                        }
                        catch (e) {
                            reject(e);
                        }
                    })];
            });
        });
    };
    return SendBeaconTransport;
}(analytics_core_1.BaseTransport));
exports.SendBeaconTransport = SendBeaconTransport;
//# sourceMappingURL=send-beacon.js.map