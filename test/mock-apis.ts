import WebSocket from 'ws';
import nock from 'nock';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

declare var global: {
    window: any,
    document: any,
    crypto: any
} & NodeJS.Global;

interface MockApiReturns {
    getActiveCalls: nock.Scope;
    getCallEvents: nock.Scope;
    getDeviceStatus: nock.Scope;
    connect: nock.Scope;
    disconnect: nock.Scope;
    incomingCall: nock.Scope;
    outgoingCall: nock.Scope;
    answerCall: nock.Scope;
    endCall: nock.Scope;
    setMute: nock.Scope;
    setHold: nock.Scope;
}

interface MockApiOptions {
    nockScope: nock.Scope;
    pluginName?: string,
    response?: any,
    shouldFail?: Boolean
    conversationId?: string;
    contactName?: string;
}

interface MockMakeRequestResponse<Type> {
    Description: string;
    Result: Type;
    Type: number;
    Type_Name: string;
    isError: boolean
}

interface MockActiveDeviceInfo extends MockMakeRequestResponse<MockDeviceInfo> {
    Result: MockDeviceInfo;
}

interface MockCallEvents extends MockMakeRequestResponse<MockEventsArray[] | string>{
    Result: MockEventsArray[] | string;
}

interface MockToggle extends MockMakeRequestResponse<boolean> {
    Result: boolean;
}

interface MockEventsArray {
    Action: number;
    CallId: MockCall;
    CallSource: string;
    DeviceEvent: number;
    DialedKey: number;
}

interface MockCall {
    ConferenceId: number;
    Id: number;
    InConference: boolean;
}

interface MockDeviceInfo {
    BaseFirmwareVersion: string;
    BaseSerialNumber: string;
    BluetoothFirmwareVersion: string;
    DevicePath: string;
    HeadsetSerialNumber: string;
    InternalName: string;
    IsAttached: boolean;
    ManufacturerName: string;
    ProductId: number;
    ProductName: string;
    RemoteFirmwareVersion: string;
    SerialNumber: string;
    USBVersionNumber: string;
    Uid: string;
    VendorId: number;
}

interface MockApiOptions {}

Object.defineProperty(global, 'crypto', {
    value: {
        getRandomValues: function (rawBytes: Uint8Array) {
            const buffer = crypto.randomBytes(rawBytes.length);
            for (let i = 0; i < rawBytes.length; i++) {
                rawBytes[i] = buffer[i];
            }
        }
    }
});

// let wss: WebSocket.Server;
let ws: WebSocket;

let MOCK_TOGGLE_RESPONSE = {
    Description: '',
    Result: true,
    Type: 2,
    Type_Name: "Bool",
    isError: false
}

const MOCK_MUTE_CALL_EVENTS_RESPONSE = {
    Description: 'CallEvents',
    Result: [
        {
            Action: 11,
            CallId: {
                ConferenceId: 0,
                Id: 0,
                InConference: false
            },
            CallSource: 'genesys-cloud-headset-library',
            DeviceEvent: 4,
            DialedKey: 0
        },
        {
            Action: 11,
            CallId: {
                ConferenceId: 0,
                Id: 0,
                InConference: false
            },
            CallSource: 'genesys-cloud-headset-library',
            DeviceEvent: 4,
            DialedKey: 0
        }
    ],
    Type: 10,
    Type_Name: 'CallStateArray',
    isError: false
};

const MOCK_EMPTY_CALL_EVENTS = {
    Description: 'CallEvents',
    Result: '',
    Type: 10,
    Type_Name: 'CallStateArray',
    isError: false
};

const MOCK_DEVICE_INFO = {
    Description: "Active Device Info",
    Result: {
        BaseFirmwareVersion: "219",
        BaseSerialNumber: "94a6f16facca49c1a9bdf52f0f984e8b",
        BluetoothFirmwareVersion: "0",
        DevicePath: "\\\\?\\hid#vid_047f&pid_c053&mi_03&col04#7&1fcc273b&0&0003#{4d1e55b2-f16f-11cf-88cb-001111000030}",
        HeadsetSerialNumber: "",
        InternalName: "Blackwire 5220 stereo",
        IsAttached: true,
        ManufacturerName: "Plantronics",
        ProductId: 49235,
        ProductName: "Plantronics Blackwire 5220 Series",
        RemoteFirmwareVersion: "0",
        SerialNumber: "94A6F16FACCA49C1A9BDF52F0F984E8B",
        USBVersionNumber: "219",
        Uid: "6edc0d33b3cb2e3890feb0c7c087438b",
        VendorId: 1151
    },
    Type: 4,
    Type_Name: "DeviceInfo",
    isError: false
}

function getMockIncomingCall (): MockToggle {
    MOCK_TOGGLE_RESPONSE.Description = 'Incoming Call';
    return JSON.parse(JSON.stringify(MOCK_TOGGLE_RESPONSE));
}

function getMockIsActive (): MockToggle {
    MOCK_TOGGLE_RESPONSE.Description = 'Is Active';
    return JSON.parse(JSON.stringify(MOCK_TOGGLE_RESPONSE));
}

export function createNock (hostUri?: string): nock.Scope {
    return nock(hostUri || 'https://api.mypurecloud.com');
}

export function mockRegister (params: MockApiOptions): nock.Scope {
    const intercept = params.nockScope.get(`/SessionManager/Register?name=${params.pluginName}`);
    if(params.shouldFail) {
        return intercept.reply(500, params.response);
    }

    // return intercept.reply(200, params.response || getMockRegister());
    return intercept.reply(200, params.response);
}

export function mockIncomingCall (params: MockApiOptions): nock.Scope {
    let endpoint = `?name=${params.pluginName}&tones=Unknown&route=ToHeadset`;
    if (params.conversationId) {
        const halfEncodedCallIdString = `"Id":"${params.conversationId}"`;
        endpoint += `&callID={${encodeURI(halfEncodedCallIdString)}}`;
    }

    if (params.contactName) {
        const halfEncodedCallIdString = `"Name":"${params.contactName}"`;
        endpoint += `&contact={${encodeURI(halfEncodedCallIdString)}}`;
    }
    const intercept = params.nockScope.get(`/CallServices/IncomingCall${endpoint}`);

    if (params.shouldFail) {
        return intercept.reply(500, params.response);
    }
    MOCK_TOGGLE_RESPONSE.Description = 'Incoming Call';
    return intercept.reply(200, params.response || MOCK_TOGGLE_RESPONSE);
}

export function mockIsActive (params: MockApiOptions): nock.Scope {
    const intercept = params.nockScope.get(`SessionManager/IsActive?name=${params.pluginName}&active=true`)
    if(params.shouldFail) {
        return intercept.reply(500, params.response);
    }

    return intercept.reply(200, params.response || getMockIsActive());
}

export function mockSetDefaultSoftPhone (params: MockApiOptions): nock.Scope {
    const intercept = params.nockScope.get(`/UserPreference/SetDefaultSoftPhone?name=${params.pluginName}`);

    if (params.shouldFail) {
        return intercept.reply(500, params.response)
    }

    return intercept.reply(200)
}

export function mockUnregister (params: MockApiOptions): nock.Scope {
    const intercept = params.nockScope.get(`/SessionManager/UnRegister?name=${params.pluginName}`);

    if (params.shouldFail) {
        return intercept.reply(500, params.response);
    }

    return intercept.reply(200)
}

// export function mockAnswerCall (params: MockApiOptions): nock.Scope {
//     const intercept = params.nockScope.get('')
// }