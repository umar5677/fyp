// fyp/food-app/hooks/useCalorieBLE.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; 
import { api } from '../utils/api';

// IMPORTANT: These UUIDs must match the ones in your Python script
const CALORIE_SERVICE_UUID = "8b88e82e-cd3b-4844-864e-2bf45e3a7588";
const CALORIE_CHARACTERISTIC_UUID = "31f8b1b6-2ea6-4bc1-99db-ff07f79cc1da";
const DEVICE_NAME = "GlucoBites Calorie Tracker";

function useCalorieBLE() {
    const bleManager = useMemo(() => new BleManager(), []);
    const [device, setDevice] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Disconnected");

    // Use a ref to hold the last received value to avoid re-running effects unnecessarily
    const lastValueRef = useRef(null);

    // This effect runs only when a new, different value is received
    useEffect(() => {
        if (lastValueRef.current === null) return;
        
        const sendDataToServer = async () => {
            try {
                // Call the API function to send the data to your server
                await api.addExerciseLog({ caloriesBurnt: lastValueRef.current });
                console.log(`[BLE] Successfully sent ${lastValueRef.current} calories to backend.`);
            } catch (error) {
                console.error("[BLE] Failed to send exercise log to backend:", error);
            }
        };

        sendDataToServer();
    }, [lastValueRef.current]);

    const requestAndroidPermissions = async () => {
        if (Platform.OS !== 'android') return true;

        const apiLevel = Platform.Version;

        if (apiLevel < 31) {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                { title: "Location Permission", message: "Bluetooth requires location permission.", buttonPositive: "OK" }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else { // Android 12 and above
            const result = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return (
                result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
                result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
                result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
            );
        }
    };

    const startScan = async () => {
        const isPermissionsGranted = await requestAndroidPermissions();
        if (!isPermissionsGranted) {
            setConnectionStatus("Permissions not granted");
            return;
        }

        console.log("[BLE] Starting device scan...");
        setConnectionStatus("Scanning...");

        bleManager.startDeviceScan([CALORIE_SERVICE_UUID], null, (error, foundDevice) => {
            if (error) {
                console.error("[BLE] Scan error:", error);
                setConnectionStatus("Error Scanning");
                bleManager.stopDeviceScan();
                return;
            }

            if (foundDevice && foundDevice.name === DEVICE_NAME) {
                console.log(`[BLE] Found device: ${foundDevice.name}`);
                bleManager.stopDeviceScan();
                setConnectionStatus("Found Device");
                connectToDevice(foundDevice);
            }
        });
    };

    const connectToDevice = async (foundDevice) => {
        try {
            setConnectionStatus("Connecting...");
            const connectedDevice = await bleManager.connectToDevice(foundDevice.id);
            setDevice(connectedDevice);

            setConnectionStatus("Discovering Services...");
            await connectedDevice.discoverAllServicesAndCharacteristics();
            console.log("[BLE] Services discovered.");

            // Create a listener for when the device disconnects
            connectedDevice.onDisconnected((error, disconnectedDevice) => {
                console.log("[BLE] Device disconnected. Attempting to rescan...");
                setDevice(null);
                setConnectionStatus("Disconnected");
                startScan(); // Automatically restart the scan
            });

            // Set up notifications from the characteristic
            connectedDevice.monitorCharacteristicForService(
                CALORIE_SERVICE_UUID,
                CALORIE_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                    if (error) {
                        console.error("[BLE] Characteristic monitor error:", error);
                        return;
                    }

                    const rawData = Buffer.from(characteristic.value, 'base64');
                    const stringData = rawData.toString('utf-8');
                    const numericValue = parseFloat(stringData);
                    
                    if (!isNaN(numericValue) && lastValueRef.current !== numericValue) {
                         console.log(`[BLE] Received new value: ${numericValue}`);
                         lastValueRef.current = numericValue; 
                    }
                }
            );
            
            setConnectionStatus("Connected");
            console.log("[BLE] Connection successful and monitoring started.");

        } catch (error) {
            console.error("[BLE] Connection error:", error);
            setConnectionStatus("Error Connecting");
        }
    };
    
    // Effect to start the process when the hook is used
    useEffect(() => {
        const subscription = bleManager.onStateChange((state) => {
            if (state === 'PoweredOn') {
                startScan();
            } else {
                console.log(`[BLE] State is not 'PoweredOn': ${state}`);
            }
        }, true);

        return () => {
            subscription.remove();
            bleManager.destroy(); 
        };
    }, [bleManager]);


    return { connectionStatus };
}

export default useCalorieBLE;