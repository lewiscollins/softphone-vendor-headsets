import PlantronicsService from '../../../../src/services/vendor-implementations/plantronics/plantronics';
import DeviceInfo from '../../../../src/types/device-info';
import { mockLogger } from '../../test-utils';
// import fetchMock from 'jest-fetch-mock';
import nock = require('nock');
import {
  createNock,
  mockRegister,
} from '../../../mock-apis';
// import fetchJsonp from 'fetch-jsonp';

const testDevice: DeviceInfo = {
  ProductName: 'testDevice1',
};

function resetService(plantronicsService: PlantronicsService) {
  plantronicsService.vendorName = 'Plantronics';
  plantronicsService.pluginName = 'genesys-cloud-headset-library';
  plantronicsService._deviceInfo = null;
  plantronicsService.activePollingInterval = 2000;
  plantronicsService.connectedDeviceInterval = 6000;
  plantronicsService.disconnectedDeviceInterval = 2000;
  plantronicsService.deviceIdRetryInterval = 2000;
  plantronicsService.isActive = false;
  plantronicsService.disableEventPolling = false;
  plantronicsService.deviceStatusTimer = null;
}

describe('PlantronicsService', () => {
  let plantronicsService: PlantronicsService;

  beforeEach(() => {
    plantronicsService = PlantronicsService.getInstance({ logger: console });
    resetService(plantronicsService);
  });

  describe('instantiation', () => {
    afterEach(() => {
      plantronicsService = null;
    });

    it('should be a singleton', () => {
      const plantronicsService2 = PlantronicsService.getInstance({ logger: console });

      expect(plantronicsService).not.toBeFalsy();
      expect(plantronicsService2).not.toBeFalsy();
      expect(plantronicsService).toBe(plantronicsService2);
    });
  });

  describe('deviceName', () => {
    it('should return the value of deviceInfo.ProductName', () => {
      plantronicsService._deviceInfo = testDevice;
      const result = plantronicsService.deviceName;
      expect(result).toEqual(testDevice.ProductName);
    });
  });

  describe('apiHost', () => {
    it('should return the expected value', () => {
      const expected = 'https://127.0.0.1:32018/Spokes';
      expect(plantronicsService.apiHost).toEqual(expected);
    });
  });

  describe('vendorName', () => {
    it('should return the expected name', () => {
      const expected = 'Plantronics';
      expect(plantronicsService.vendorName).toEqual(expected);
    });
  });

  describe('deviceLabelMatchesVendor', () => {
    beforeEach(() => {
      plantronicsService = PlantronicsService.getInstance({ logger: console });
      plantronicsService.logger = mockLogger;
    });
    it('should return true when the device label contains the string "plantronics"', () => {
      let testLabel = 'plantronics headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset PlanTroniCs made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of Plantronics';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "plantronics"', () => {
      let testLabel = 'standard headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
    it('should return true when the device label contains the string "(047f:"', () => {
      let testLabel = '(047f: headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset (047f: made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);

      testLabel = 'A headset of (047f:';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(true);
    });
    it('should return false when the device label does not contain the string "(047f:"', () => {
      let testLabel = 'standard headset';
      let result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset sennheiser made';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);

      testLabel = 'A headset of awesome';
      result = plantronicsService.deviceLabelMatchesVendor(testLabel);
      expect(result).toBe(false);
    });
  });

  describe('pollForCallEvents', () => {
    afterEach(() => {
      jest.useRealTimers();
    })
    it('will not call getCallEventsSpy if proper flags are not met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const pollForCallEventsSpy = jest.spyOn(plantronicsService, 'pollForCallEvents');
      jest.useFakeTimers();
      plantronicsService.pollForCallEvents();
      expect(getCallEventsSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
      expect(pollForCallEventsSpy).toHaveBeenCalled();
    })
    it('will call getCallEventsSpy if proper flags are met', () => {
      const getCallEventsSpy = jest.spyOn(plantronicsService, 'getCallEvents');
      const pollForCallEventsSpy = jest.spyOn(plantronicsService, 'pollForCallEvents');
      plantronicsService.isConnected = true;
      plantronicsService.isActive = true;
      plantronicsService.disableEventPolling = false;

      jest.useFakeTimers();
      plantronicsService.pollForCallEvents();

      expect(getCallEventsSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.activePollingInterval);
      expect(pollForCallEventsSpy).toHaveBeenCalled();
    });
  });

  describe('pollForDeviceStatus', () => {
    afterEach(() => {
      jest.useRealTimers();
    })
    it('will not call getDeviceStatusSpy if proper flags are not met', () => {
      plantronicsService.isConnecting = true;
      const getDeviceStatusSpy = jest.spyOn(plantronicsService, 'getDeviceStatus');
      const pollForDeviceStatusSpy = jest.spyOn(plantronicsService, 'pollForDeviceStatus');
      jest.useFakeTimers();
      plantronicsService.pollForDeviceStatus();
      expect(getDeviceStatusSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.disconnectedDeviceInterval);
      expect(pollForDeviceStatusSpy).toHaveBeenCalled();
    });
    it('will call getDeviceStatusSpy if proper flags are met', () => {
      plantronicsService.isConnecting = false;
      const getDeviceStatusSpy = jest.spyOn(plantronicsService, 'getDeviceStatus');
      const pollForDeviceStatusSpy = jest.spyOn(plantronicsService, 'pollForDeviceStatus');
      jest.useFakeTimers();
      plantronicsService.pollForDeviceStatus();
      expect(getDeviceStatusSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(plantronicsService.disconnectedDeviceInterval);
      expect(pollForDeviceStatusSpy).toHaveBeenCalled();
    })
  });

  describe('callCorrespondingFunction', () => {
    it('will call deviceAnsweredCall', () => {
      const deviceAnsweredCallSpy = jest.spyOn(plantronicsService, 'deviceAnsweredCall');
      plantronicsService.callCorrespondingFunction({
        name: 'AcceptCall',
        code: '1',
        event: {}
      });
      expect(deviceAnsweredCallSpy).toHaveBeenCalled();
    });
    it('will call deviceEndedCall', () => {
      const deviceEndedCallSpy = jest.spyOn(plantronicsService, 'deviceEndedCall');
      plantronicsService.callCorrespondingFunction({
        name: 'TerminateCall'
      });
      expect(deviceEndedCallSpy).toHaveBeenCalled();
    });
    it('will call _checkIsActiveTask', () => {
      const _checkIsActiveTaskSpy = jest.spyOn(plantronicsService, '_checkIsActiveTask');
      plantronicsService.callCorrespondingFunction({
        name: 'CallEnded'
      });
      expect(_checkIsActiveTaskSpy).toHaveBeenCalled();
    })
    it('will call deviceMuteChanged with the proper flag', () => {
      const deviceMuteChangedSpy = jest.spyOn(plantronicsService, 'deviceMuteChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'Mute'
      });
      expect(deviceMuteChangedSpy).toHaveBeenCalledWith(true, {name: 'Mute'});

      plantronicsService.callCorrespondingFunction({
        name: 'Unmute'
      });
      expect(deviceMuteChangedSpy).toHaveBeenLastCalledWith(false, {name: 'Unmute'});
    });
    it('will call deviceHoldStatusChanged with the proper flag', () => {
      const deviceHoldStatusChangedSpy = jest.spyOn(plantronicsService, 'deviceHoldStatusChanged');
      plantronicsService.callCorrespondingFunction({
        name: 'HoldCall'
      });
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(true, {name: 'HoldCall'});

      plantronicsService.callCorrespondingFunction({
        name: 'ResumeCall'
      });
      expect(deviceHoldStatusChangedSpy).toHaveBeenCalledWith(false, {name: 'ResumeCall'});
    });

    it('calls deviceEventLogs when no valid event was passed in', () => {
      const deviceEventLogsSpy = jest.spyOn(plantronicsService, 'deviceEventLogs');
      plantronicsService.callCorrespondingFunction({
        name: 'Test'
      });
      expect(deviceEventLogsSpy).toHaveBeenCalled();
    })
  });

  describe('_checkIsActiveTask', () => {
    it('should set isActive according to the length of calls', () => {
      const _getActiveCallsSpy = jest.spyOn(plantronicsService, '_getActiveCalls');

      plantronicsService._checkIsActiveTask();
      expect(_getActiveCallsSpy).toHaveBeenCalled();
      expect(plantronicsService.isActive).toBeFalsy();

      plantronicsService._checkIsActiveTask();
      expect(_getActiveCallsSpy).toHaveBeenCalled();
      expect(plantronicsService.isActive).toBeTruthy();
    });
  })
});
