// fyp/food-app/hooks/useCalorieBLE.js (FINAL Version)
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; 
import { api } from '../utils/api';

const CALORIE_SERVICE_UUID = "8b88e82e-cd3b-4844-864e-2bf45e3a7588";
const CALORIE_CHARACTERISTIC_UUID = "31f8b1b6-2ea6-4bc1-99db-ff07f79cc1da";
const DEVICE_NAME = "GlucoBites Calorie Tracker";
const UPLOAD_INTERVAL_MS = 10000;

const bleManager = new BleManager();

function useCalorieBLE() {
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
    
    const accumulatedCaloriesRef = useRef(0);
    const intervalIdRef = useRef(null);
    const deviceRef = useRef(null);
    const isConnectingRef = useRef(false);

    const disconnectDevice = useCallback(() => {
        bleManager.stopDeviceScan();
        if (deviceRef.current) {
            deviceRef.current.cancelConnection()
                .catch(err => console.log("Minor error on cancelConnection:", err));
            deviceRef.current = null;
        }
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }
        setConnectionStatus("Disconnected");
    }, []);

    const connectToDevice = useCallback(async (foundDevice) => {
        if (isConnectingRef.current || deviceRef.current) return;
        isConnectingRef.current = true;

        try {
            setConnectionStatus("Connecting...");
            const device = await foundDevice.connect();
            deviceRef.current = device;
            
            // --- CRITICAL STABILITY FIX ---
            device.onDisconnected(async (error) => {
                isConnectingRef.current = false;
                
                setTimeout(async () => {
                    try {
                        if (deviceRef.current) {
                            const isStillConnected = await deviceRef.current.isConnected();
                            if (!isStillConnected) {
                                console.log("[BLE] Connection confirmed as lost. Disconnecting cleanly.");
                                disconnectDevice();
                            } else {
                                console.log("[BLE] Received a transient disconnect signal but the device is still connected. Ignoring.");
                            }
                        }
                    } catch (e) {
                        console.error("[BLE] Error in disconnect handler. Forcing disconnect.", e);
                        disconnectDevice();
                    }
                }, 500); // 0.5-second delay is plenty
            });
            
            setConnectionStatus("Discovering...");
            await device.discoverAllServicesAndCharacteristics();
            setConnectionStatus("Connected");
            
            device.monitorCharacteristicForService(CALORIE_SERVICE_UUID, CALORIE_CHARACTERISTIC_UUID, (error, char) => {
                if (error) { 
                    console.error("[BLE] Notification Error:", JSON.stringify(error, null, 2));
                    // The onDisconnected handler will catch the resulting disconnect
                    return; 
                }
                const numVal = parseFloat(Buffer.from(char.value, 'base64').toString('utf-8'));
                if (!isNaN(numVal)) accumulatedCaloriesRef.current += numVal;
            });
            
            intervalIdRef.current = setInterval(() => {
                if (accumulatedCaloriesRef.current > 0) {
                    const batch = accumulatedCaloriesRef.current;
                    accumulatedCaloriesRef.current = 0;
                    api.addExerciseLog({ caloriesBurnt: batch }).catch(() => accumulatedCaloriesRef.current += batch);
                }
            }, UPLOAD_INTERVAL_MS);

        } catch (error) {
            console.error("[BLE] Connection error:", error);
            setConnectionStatus("Disconnected"); // Go to a clean state on failure
        } finally {
            isConnectingRef.current = false;
        }
    }, [disconnectDevice]);

    const startScan = useCallback(async () => {
        bleManager.stopDeviceScan();
        // Permission logic...
        
        setConnectionStatus("Scanning...");
        bleManager.startDeviceScan(null, null, (error, foundDevice) => {
            if (error) { 
                setConnectionStatus("Scan Error");
                return; 
            }
            if (foundDevice && foundDevice.name === DEVICE_NAME) {
                bleManager.stopDeviceScan();
                connectToDevice(foundDevice);
            }
        });
        
        // Timeout logic for the scan
    }, [connectToDevice]);
    
    // The rest of the hook (useEffect and return statement) remains the same
    useEffect(() => {
        const stateSubscription = bleManager.onStateChange((state) => {
            if (state === State.PoweredOn) {
                setConnectionStatus("Disconnected");
            } else {
                disconnectDevice();
                setConnectionStatus("Bluetooth Off");
            }
        }, true);
        
        return () => {
            stateSubscription.remove();
            disconnectDevice();
        };
    }, [disconnectDevice]);

    return { connectionStatus, startScan, disconnectDevice };
}

export default useCalorieBLE;