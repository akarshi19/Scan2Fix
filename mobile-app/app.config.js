import 'dotenv/config';

export default {
  expo: {
    name: "Scan2Fix",
    slug: "scan2fix",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "scan2fix",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.scan2fix.app",
    },

    android: {
      package: "com.scan2fix.app",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Scan2Fix to access your camera to scan QR codes"
        }
      ],
       "expo-secure-store",
      [
        "expo-media-library",
        {
          "photosPermission": "Allow Scan2Fix to save QR codes to your gallery",
          "savePhotosPermission": "Allow Scan2Fix to save QR codes to your gallery",
          "isAccessMediaLocationEnabled": true
        }
      ],
      ["expo-barcode-scanner",
        {
          newArchEnabled: false,
        }
      ],
      "expo-secure-store",
      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      apiUrl: process.env.API_URL,
      eas: {
        projectId: "1c62fd97-803b-4a76-a8b6-9dd36862e989",
      },
    },
  },
};