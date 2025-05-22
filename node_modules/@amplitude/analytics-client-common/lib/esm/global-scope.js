/* eslint-disable no-restricted-globals */
/* Only file allowed to access to globalThis, window, self */
export var getGlobalScope = function () {
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
//# sourceMappingURL=global-scope.js.map