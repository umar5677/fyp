// fyp/food-app/hooks/useCalorieBLE.js (v7 - Final State Machine Implementation)
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; 
import { api } from '../utils/api';

const CALORIE_SERVICE_UUID = "8b88e82e-cd3b-4844-864e-2bf45e3a7588";
const CALORIE_CHARACTERISTIC_UUID = "31f8b1b6-2ea6-4bc1-99db-ff07f79cc1da";
const DEVICE_NAME = "GlucoBites Calorie Tracker";
const UPLOAD_INTERVAL_MS = 10000;

// SINGLETON INSTANCE: Ensures only one BleManager is ever created.
const bleManager = new BleManager();

function useCalorieBLE() {
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
    
    // Refs for state that shouldn't cause re-renders
    const accumulatedCaloriesRef = useRef(0);
    const intervalIdRef = useRef(null);
    const deviceRef = useRef(null);
    const isConnectingRef = useRef(false); // State machine flag

    const disconnectDevice = useCallback(() => {
        if (deviceRef.current) {
            deviceRef.current.cancelConnection();
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
            
            device.onDisconnected(() => {
                isConnectingRef.current = false;
                disconnectDevice();
            });
            
            setConnectionStatus("Discovering...");
            await device.discoverAllServicesAndCharacteristics();
            setConnectionStatus("Connected");
            
            device.monitorCharacteristicForService(CALORIE_SERVICE_UUID, CALORIE_CHARACTERISTIC_UUID, (error, char) => {
                if (error) { return; }
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
            if (error.reason !== 'Operation was cancelled') {
                console.error("[BLE] Connection error:", error);
            }
        } finally {
            isConnectingRef.current = false;
        }
    }, [disconnectDevice]);

    const startScan = useCallback(async () => {
        bleManager.stopDeviceScan(); // Always stop previous scan
        const permissionsGranted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ]).then(res => Object.values(res).every(p => p === PermissionsAndroid.RESULTS.GRANTED));

        if (!permissionsGranted) {
            setConnectionStatus("Permissions Disabled");
            return;
        }
        
        setConnectionStatus("Scanning...");
        bleManager.startDeviceScan(null, null, (error, foundDevice) => {
            if (error) { return; }
            if (foundDevice && foundDevice.name === DEVICE_NAME) {
                bleManager.stopDeviceScan();
                connectToDevice(foundDevice);
            }
        });
    }, [connectToDevice]);
    
    useEffect(() => {
        const stateSubscription = bleManager.onStateChange((state) => {
            if (state === State.PoweredOn) startScan();
            else {
                disconnectDevice();
                setConnectionStatus("Bluetooth Off");
            }
        }, true);
        
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState !== 'active' && deviceRef.current) {
                disconnectDevice();
            } else if (nextAppState === 'active' && !deviceRef.current) {
                bleManager.state().then(state => {
                    if (state === State.PoweredOn) startScan();
                });
            }
        });
        
        return () => {
            stateSubscription.remove();
            appStateSubscription.remove();
            if (deviceRef.current) deviceRef.current.cancelConnection();
            bleManager.stopDeviceScan();
        };
    }, [startScan, disconnectDevice]); // Dependencies are now stable functions

    return { connectionStatus };
}

export default useCalorieBLE;