# Weather Minimal

## Overview

Weather Minimal is a React Native application built with Expo that provides location-based weather forecasting. The application utilizes the Open-Meteo API for real-time weather and air quality data, featuring a minimalist user interface with support for localization, unit toggling, and offline caching.

## Features

* **Real-Time Weather Data:** Displays current temperature, perceived temperature, and general weather conditions.
* **Environmental Indicators:** Tracks sunrise, sunset, UV index, and European Air Quality Index (AQI).
* **5-Day Forecast:** Provides daily minimum/maximum temperatures and precipitation probability.
* **Theming:** Native support for Light and Dark modes.
* **Localization:** Built-in English and Portuguese language support.
* **Unit Preferences:** Toggle between Metric and Imperial measurement systems.
* **Offline Persistence:** Caches previous weather data using `AsyncStorage` for immediate display on subsequent loads.

## Technologies

* **Framework:** React Native / Expo
* **Location Services:** `expo-location`
* **Typography:** `expo-font` (Pretendard)
* **Icons:** `@expo/vector-icons` (Feather)
* **Storage:** `@react-native-async-storage/async-storage`
* **APIs:** Open-Meteo Forecast API, Open-Meteo Air Quality API

## Prerequisites

Ensure the following dependencies are installed on your system:
* Node.js (LTS recommended)
* Expo CLI
* iOS Simulator or Android Emulator (or a physical device with Expo Go)

## Installation

1. Initialize a new Expo project or clone your repository:
```bash
npx create-expo-app weather-minimal
cd weather-minimal
```

2. Install the required dependencies:
```bash
npx expo install expo-location expo-font @expo/vector-icons @react-native-async-storage/async-storage
```

3. Replace the contents of `App.js` with the provided application code.

## Usage

Start the development server:
```bash
npx expo start
```

Press `a` to open in the Android emulator, `i` for the iOS simulator, or scan the QR code with the Expo Go app on a physical device.

## Permissions

The application requires location permissions to function correctly. Upon initialization, the app will prompt the user for foreground location access (`Location.requestForegroundPermissionsAsync()`). If denied, an error state will be rendered.

## API Configuration

The application uses public, open-source APIs that do not require authentication keys.
* **Weather API:** `https://api.open-meteo.com/v1/forecast`
* **Air Quality API:** `https://air-quality-api.open-meteo.com/v1/air-quality`