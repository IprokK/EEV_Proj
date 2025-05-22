import { __awaiter, __extends, __generator } from "tslib";
import { BaseTransport } from '@amplitude/analytics-core';
var XHRTransport = /** @class */ (function (_super) {
    __extends(XHRTransport, _super);
    function XHRTransport() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            done: 4,
        };
        return _this;
    }
    XHRTransport.prototype.send = function (serverUrl, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        /* istanbul ignore if */
                        if (typeof XMLHttpRequest === 'undefined') {
                            reject(new Error('XHRTransport is not supported.'));
                        }
                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', serverUrl, true);
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState === _this.state.done) {
                                var responseText = xhr.responseText;
                                try {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                    resolve(_this.buildResponse(JSON.parse(responseText)));
                                }
                                catch (_a) {
                                    resolve(_this.buildResponse({ code: xhr.status }));
                                }
                            }
                        };
                        xhr.setRequestHeader('Content-Type', 'application/json');
                        xhr.setRequestHeader('Accept', '*/*');
                        xhr.send(JSON.stringify(payload));
                    })];
            });
        });
    };
    return XHRTransport;
}(BaseTransport));
export { XHRTransport };
//# sourceMappingURL=xhr.js.map