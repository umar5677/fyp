# Food App

A mobile application for food ordering, built with **React Native (Expo)** for the frontend and **Node.js** for the backend.

## 📦 Installation

### 1. Install Node Modules

Run the following commands in **both** the `food-app` and `server` directories:

```bash
cd food-app
npm install

cd ../server
npm install
```

---

## ⚙️ Configuration

### 2. Update API Base URL

In `food-app/utils/api.js` (line 4), change the `BASE_URL` to your local IP:

```javascript
const BASE_URL = 'http://your_local_ip:3000/api';
```

💡 You can find your local IP using:

* **Windows**: `ipconfig`
* **Mac/Linux**: `ifconfig`

---

## 🚀 Running the App

### 3. Start Development App (Expo)

```bash
cd food-app
npx expo run:android
```

### 4. Start Server

```bash
cd server
npm start
```

---

## 📱 App Permissions

Make sure to grant the following permission in your device settings:

* **Nearby Devices**

---

## 🛠 Tech Stack

* **Frontend**: React Native (Expo)
* **Backend**: Node.js + Express
* **Database**: MySQL

---
