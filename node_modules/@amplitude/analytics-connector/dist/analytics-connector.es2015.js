class ApplicationContextProviderImpl {
    getApplicationContext() {
        return {
            versionName: this.versionName,
            language: getLanguage(),
            platform: 'Web',
            os: undefined,
            deviceModel: undefined,
        };
    }
}
const getLanguage = () => {
    return ((typeof navigator !== 'undefined' &&
        ((navigator.languages && navigator.languages[0]) ||
            navigator.language)) ||
        '');
};

class EventBridgeImpl {
    constructor() {
        this.queue = [];
    }
    logEvent(event) {
        if (!this.receiver) {
            if (this.queue.length < 512) {
                this.queue.push(event);
            }
        }
        else {
            this.receiver(event);
        }
    }
    setEventReceiver(receiver) {
        this.receiver = receiver;
        if (this.queue.length > 0) {
            this.queue.forEach((event) => {
                receiver(event);
            });
            this.queue = [];
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isEqual = (obj1, obj2) => {
    const primitive = ['string', 'number', 'boolean', 'undefined'];
    const typeA = typeof obj1;
    const typeB = typeof obj2;
    if (typeA !== typeB) {
        return false;
    }
    for (const p of primitive) {
        if (p === typeA) {
            return obj1 === obj2;
        }
    }
    // check null
    if (obj1 == null && obj2 == null) {
        return true;
    }
    else if (obj1 == null || obj2 == null) {
        return false;
    }
    // if got here - objects
    if (obj1.length !== obj2.length) {
        return false;
    }
    //check if arrays
    const isArrayA = Array.isArray(obj1);
    const isArrayB = Array.isArray(obj2);
    if (isArrayA !== isArrayB) {
        return false;
    }
    if (isArrayA && isArrayB) {
        //arrays
        for (let i = 0; i < obj1.length; i++) {
            if (!isEqual(obj1[i], obj2[i])) {
                return false;
            }
        }
    }
    else {
        //objects
        const sorted1 = Object.keys(obj1).sort();
        const sorted2 = Object.keys(obj2).sort();
        if (!isEqual(sorted1, sorted2)) {
            return false;
        }
        //compare object values
        let result = true;
        Object.keys(obj1).forEach((key) => {
            if (!isEqual(obj1[key], obj2[key])) {
                result = false;
            }
        });
        return result;
    }
    return true;
};

const ID_OP_SET = '$set';
const ID_OP_UNSET = '$unset';
const ID_OP_CLEAR_ALL = '$clearAll';
// Polyfill for Object.entries
if (!Object.entries) {
    Object.entries = function (obj) {
        const ownProps = Object.keys(obj);
        let i = ownProps.length;
        const resArray = new Array(i);
        while (i--) {
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
        }
        return resArray;
    };
}
class IdentityStoreImpl {
    constructor() {
        this.identity = { userProperties: {} };
        this.listeners = new Set();
    }
    editIdentity() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const actingUserProperties = Object.assign({}, this.identity.userProperties);
        const actingIdentity = Object.assign(Object.assign({}, this.identity), { userProperties: actingUserProperties });
        return {
            setUserId: function (userId) {
                actingIdentity.userId = userId;
                return this;
            },
            setDeviceId: function (deviceId) {
                actingIdentity.deviceId = deviceId;
                return this;
            },
            setUserProperties: function (userProperties) {
                actingIdentity.userProperties = userProperties;
                return this;
            },
            setOptOut(optOut) {
                actingIdentity.optOut = optOut;
                return this;
            },
            updateUserProperties: function (actions) {
                let actingProperties = actingIdentity.userProperties || {};
                for (const [action, properties] of Object.entries(actions)) {
                    switch (action) {
                        case ID_OP_SET:
                            for (const [key, value] of Object.entries(properties)) {
                                actingProperties[key] = value;
                            }
                            break;
                        case ID_OP_UNSET:
                            for (const key of Object.keys(properties)) {
                                delete actingProperties[key];
                            }
                            break;
                        case ID_OP_CLEAR_ALL:
                            actingProperties = {};
                            break;
                    }
                }
                actingIdentity.userProperties = actingProperties;
                return this;
            },
            commit: function () {
                self.setIdentity(actingIdentity);
                return this;
            },
        };
    }
    getIdentity() {
        return Object.assign({}, this.identity);
    }
    setIdentity(identity) {
        const originalIdentity = Object.assign({}, this.identity);
        this.identity = Object.assign({}, identity);
        if (!isEqual(originalIdentity, this.identity)) {
            this.listeners.forEach((listener) => {
                listener(identity);
            });
        }
    }
    addIdentityListener(listener) {
        this.listeners.add(listener);
    }
    removeIdentityListener(listener) {
        this.listeners.delete(listener);
    }
}

const safeGlobal = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
        ? global
        : self;

class AnalyticsConnector {
    constructor() {
        this.identityStore = new IdentityStoreImpl();
        this.eventBridge = new EventBridgeImpl();
        this.applicationContextProvider = new ApplicationContextProviderImpl();
    }
    static getInstance(instanceName) {
        if (!safeGlobal['analyticsConnectorInstances']) {
            safeGlobal['analyticsConnectorInstances'] = {};
        }
        if (!safeGlobal['analyticsConnectorInstances'][instanceName]) {
            safeGlobal['analyticsConnectorInstances'][instanceName] =
                new AnalyticsConnector();
        }
        return safeGlobal['analyticsConnectorInstances'][instanceName];
    }
}

export { AnalyticsConnector };
