import 'dotenv/config';

export default {
  expo: {
    name: "Scan2Fix",
    slug: "scan2fix",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/splash-icon.png",
    scheme: "scan2fix",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.scan2fix.app",
    },

    android: {
      package: "com.scan2fix.app",
      versionCode: 4,
      adaptiveIcon: {
        backgroundColor: "#000000",
        foregroundImage: "./assets/images/splash-icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      enableProguardInReleaseBuilds: true,

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
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow Scan2Fix to access your camera to scan QR codes"
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow Scan2Fix to save QR codes to your gallery",
          savePhotosPermission: "Allow Scan2Fix to save QR codes to your gallery",
          isAccessMediaLocationEnabled: true
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "The app needs access to your photos to upload profile pictures.",
          cameraPermission: "The app needs access to your camera to take profile pictures."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/splash-icon.png",
          color: "#ffffff",
          sounds: [],
          androidMode: "default",
          androidCollapsedTitle: "Scan2Fix"
        }
      ],
    ],

    extra: {
      apiUrl: process.env.API_URL,
      eas: {
        projectId: "1c62fd97-803b-4a76-a8b6-9dd36862e989",
      },
    },
  },
};