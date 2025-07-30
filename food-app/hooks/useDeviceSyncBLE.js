// fyp/food-app/hooks/useDeviceSyncBLE.js
import { useCallback } from 'react';
import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const SYNC_SERVICE_UUID = "925e08ef-4d2e-4064-bf05-1a6fd6b74919";
const SYNC_CHARACTERISTIC_UUID = "3e04fb0e-bdf0-45f6-9a8e-d42f14446af3";
const DEVICE_NAME = "GlucoBites Glucose Tracker";

const bleManager = new BleManager();

// Custom hook for a one-time, structured data sync from a device
function useDeviceSyncBLE() {

    const getDeviceSyncData = useCallback(() => {
        return new Promise(async (resolve, reject) => {
            let scanTimeout, connectTimeout;

            const cleanup = (device) => {
                clearTimeout(scanTimeout);
                clearTimeout(connectTimeout);
                bleManager.stopDeviceScan();
                if (device) {
                    device.cancelConnection().catch(() => {});
                }
            };

            const bleState = await bleManager.state();
            if (bleState !== State.PoweredOn) {
                return reject(new Error('Bluetooth is not enabled.'));
            }

            console.log('[DeviceSync] Starting scan...');

            scanTimeout = setTimeout(() => {
                cleanup(null);
                reject(new Error('Device not found. Ensure it is nearby and turned on.'));
            }, 10000);

            bleManager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    cleanup(device);
                    return reject(new Error(`Scan Error: ${error.message}`));
                }

                if (device && device.name === DEVICE_NAME) {
                    bleManager.stopDeviceScan();
                    clearTimeout(scanTimeout);
                    console.log(`[DeviceSync] Found device: ${device.name}`);
                    
                    connectTimeout = setTimeout(() => {
                         cleanup(device);
                         reject(new Error('Connection timed out.'));
                    }, 8000);

                    device.connect()
                        .then(d => { clearTimeout(connectTimeout); return d.discoverAllServicesAndCharacteristics(); })
                        .then(d => d.readCharacteristicForService(SYNC_SERVICE_UUID, SYNC_CHARACTERISTIC_UUID))
                        .then(char => {
                            const rawValue = Buffer.from(char.value, 'base64').toString('utf-8');
                            const parts = rawValue.split(',');
                            
                            if (parts.length < 4) {
                                return reject(new Error('Received incomplete data from device.'));
                            }

                            const syncData = {
                                glucose: parseFloat(parts[0]),
                                calories: parseFloat(parts[1]),
                                tag: parts[2],
                                date: new Date(parts[3]),
                            };

                            if (!isNaN(syncData.glucose) && !isNaN(syncData.calories) && syncData.tag) {
                                console.log('[DeviceSync] Success! Parsed data:', syncData);
                                resolve(syncData);
                            } else {
                                reject(new Error('Received invalid data format from device.'));
                            }
                        })
                        .catch(err => reject(new Error(`An error occurred: ${err.message}`)))
                        .finally(() => cleanup(device));
                }
            });
        });
    }, []);

    return { getDeviceSyncData };
}

export default useDeviceSyncBLE;