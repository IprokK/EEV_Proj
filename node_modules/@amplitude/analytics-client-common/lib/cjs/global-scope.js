/* eslint-disable no-restricted-globals */
/* Only file allowed to access to globalThis, window, self */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalScope = void 0;
var getGlobalScope = function () {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    return undefined;
};
exports.getGlobalScope = getGlobalScope;
//# sourceMappingURL=global-scope.js.map