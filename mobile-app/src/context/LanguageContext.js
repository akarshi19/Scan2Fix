import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const LanguageContext = createContext({});

const TRANSLATIONS = {
  en: {
    // Common
    welcome: 'Welcome',
    logout: 'Logout',
    save: 'Save Changes',
    cancel: 'Cancel',
    error: 'Error',
    success: 'Success',
    loading: 'Loading...',
    search: 'Search',
    noData: 'No data found',
    back: 'Back',

    // Auth
    login: 'LOG IN',
    signup: 'SIGN UP',
    email: 'Email address',
    password: 'Password',
    fullName: 'Full Name',
    forgotPassword: 'Forgot Password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    welcomeBack: 'Welcome back!',
    loginSubtitle: 'Log in to your Scan2Fix account',
    createAccount: 'Create Account',
    signupSubtitle: 'Join Scan2Fix to report issues',
    orSignInUsing: 'Or sign in using',
    orSignUpUsing: 'Or sign up using',

    // Dashboard
    trackManage: 'Track and manage your complaints and staff',
    totalComplaints: 'Total Complaints',
    openComplaints: 'Open Complaints',
    assignedComplaints: 'Assigned Complaints',
    inProgressComplaints: 'In Progress Complaints',
    closedComplaints: 'Closed Complaints',
    staffOnDuty: 'Staff on Duty',
    staffUnavailable: 'Staff Unavailable',
    totalEquipments: 'Total Equipments',
    quickActions: 'Quick Actions',
    viewAllComplaints: 'View All Complaints',
    needAssignment: 'Need Assignment',
    recentComplaints: 'Recent Complaints',
    noComplaints: 'No complaints yet',

    // User
    scanQR: 'Scan QR Code',
    reportIssue: 'Report an issue of the Equipment',
    howItWorks: 'How it works:',
    step1: 'Scan QR code on the machine',
    step2: 'Describe the problem',
    step3: 'Take a photo (optional)',
    step4: 'Submit and track status',
    myComplaints: 'My Complaints',

    // Staff
    myJobs: 'My Jobs',
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    completed: 'Completed',
    startWorking: 'Start Working',
    generateOTP: 'Generate OTP to Complete',
    available: 'Available',
    onLeave: 'On Leave',

    // Assets
    equipment: 'Equipment',
    addEquipment: 'Add Equipment',
    assetId: 'Asset ID',
    location: 'Location',
    brand: 'Brand',
    model: 'Model',
    printQR: 'Print QR',
    share: 'Share',
    assetidalert: 'Asset ID is required',
    locationalert: 'Location is required',
    createalert: 'Asset Created!  ',
    hasbeenadded: 'has been added',
    viewAsset: 'View Asset',
    failedcreate: 'Failed to create asset',
    equipmentType: 'Equipment Type',
    airConditioner: 'Air Conditioner',
    waterCooler: 'Water Cooler', 
    desertCooler: 'Desert Cooler',


    // Users
    manageUsers: 'Manage Users',
    addUser: 'Add New User',
    markAvailable: 'Mark Available',
    markOnLeave: 'Mark On Leave',

    // Profile
    profileInfo: 'Profile Information',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    updatePassword: 'Update Password',
    theme: 'Theme',
    language: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',

    // Settings
    settings: 'Settings',
    selectLanguage: 'Select Language',
    selectTheme: 'Select Theme',

        // Complaint Detail
    complaintDetails: 'Complaint Details',
    reportedBy: 'Reported By',
    resolvedBy: 'Resolved By',
    complaintResolved: 'Complaint Resolved',
    assignStaff: 'Assign Staff',
    reassignStaff: 'Reassign Staff',
    selectStaffMember: 'Select Staff Member',
    staffOnLeaveWarning: 'Assigned staff is on leave. Consider reassigning.',
    assigning: 'Assigning…',
    
    // All Complaints
    complaintsList: 'Complaints',
    staffLeave: 'Staff Leave',
    all: 'All',
    open: 'Open',
    assigned: 'Assigned',
    closed: 'Closed',
    totalComplaintsCount: 'Total complaints',
    noComplaintsFound: 'No complaints found',
    notAssignedYet: 'Not assigned yet',
    tapToView: 'Tap to view',
    assignedTo: 'Assigned To',
    
    // Manage Users
    markOnLeave: 'Mark On Leave',
    markAvailable: 'Mark Available',
    confirm: 'Confirm',
    usersCount: 'users',
    noUsersFound: 'No users found',
    
    // Add User
    selectRole: 'Select Role',
    basicInfo: 'Basic Information',
    staffDetails: 'Staff Details',
    employeeId: 'Employee ID',
    designation: 'Designation',
    creating: 'Creating...',
    createStaff: 'Create Staff Member',
    createAdmin: 'Create Admin',
    createUser: 'Create User',
    
    // Assets
    active: 'Active',
    inactive: 'Inactive',
    equipmentDetails: 'Equipment Details',
    qrCode: 'QR Code',
    scanToReport: 'Scan this QR code with Scan2Fix app to report issues',
    
    // User Detail
    userDetails: 'User Details',
    staffActions: 'Staff Actions',
    notProvided: 'Not provided',
    notSet: 'Not set',
    joined: 'Joined',
    saving: 'Saving…',
    updating: 'Updating…',
    
    // Profile
    phone: 'Phone',
    role: 'Role',
    
  },
  hi: {
    // Common
    welcome: 'स्वागत है',
    logout: 'लॉग आउट',
    save: 'बदलाव सहेजें',
    cancel: 'रद्द करें',
    error: 'त्रुटि',
    success: 'सफल',
    loading: 'लोड हो रहा है...',
    search: 'खोजें',
    noData: 'कोई डेटा नहीं मिला',
    back: 'वापस',

    // Auth
    login: 'लॉग इन',
    signup: 'साइन अप',
    email: 'ईमेल पता',
    password: 'पासवर्ड',
    fullName: 'पूरा नाम',
    forgotPassword: 'पासवर्ड भूल गए?',
    dontHaveAccount: 'खाता नहीं है?',
    alreadyHaveAccount: 'पहले से खाता है?',
    welcomeBack: 'वापसी पर स्वागत है!',
    loginSubtitle: 'अपने Scan2Fix खाते में लॉग इन करें',
    createAccount: 'खाता बनाएं',
    signupSubtitle: 'समस्याओं की रिपोर्ट करने के लिए जुड़ें',
    orSignInUsing: 'या इससे लॉग इन करें',
    orSignUpUsing: 'या इससे साइन अप करें',

    // Dashboard
    trackManage: 'अपनी शिकायतों और कर्मचारियों का प्रबंधन करें',
    totalComplaints: 'कुल शिकायतें',
    openComplaints: 'खुली शिकायतें',
    assignedComplaints: 'सौंपी गई शिकायतें',
    inProgressComplaints: 'प्रगति में शिकायतें',
    closedComplaints: 'बंद शिकायतें',
    staffOnDuty: 'ड्यूटी पर कर्मचारी',
    staffUnavailable: 'अनुपलब्ध कर्मचारी',
    totalEquipments: 'कुल उपकरण',
    quickActions: 'त्वरित कार्य',
    viewAllComplaints: 'सभी शिकायतें देखें',
    needAssignment: 'सौंपना बाकी',
    recentComplaints: 'हाल की शिकायतें',
    noComplaints: 'अभी तक कोई शिकायत नहीं',

    // User
    scanQR: 'QR कोड स्कैन करें',
    reportIssue: 'उपकरण की समस्या रिपोर्ट करें',
    howItWorks: 'यह कैसे काम करता है:',
    step1: 'मशीन पर QR कोड स्कैन करें',
    step2: 'समस्या का वर्णन करें',
    step3: 'फोटो लें (वैकल्पिक)',
    step4: 'सबमिट करें और स्थिति ट्रैक करें',
    myComplaints: 'मेरी शिकायतें',

    // Staff
    myJobs: 'मेरे कार्य',
    notStarted: 'शुरू नहीं हुआ',
    inProgress: 'प्रगति में',
    completed: 'पूर्ण',
    startWorking: 'काम शुरू करें',
    generateOTP: 'पूर्णता के लिए OTP बनाएं',
    available: 'उपलब्ध',
    onLeave: 'छुट्टी पर',

    // Assets
    equipment: 'उपकरण',
    addEquipment: 'उपकरण जोड़ें',
    assetId: 'उपकरण ID',
    location: 'स्थान',
    brand: 'ब्रांड',
    model: 'मॉडल',
    printQR: 'QR प्रिंट करें',
    share: 'शेयर करें',
    assetidalert: 'उपकरण ID आवश्यक है।',
    locationalert: 'स्थान आवश्यक है।',
    createalert: 'उपकरण बनाई गई!  ',
    hasbeenadded: 'जोड़ दिया गया है|',
    viewAsset: 'उपकरण देखें',
    failedcreate: 'उपकरण बनाने में विफल रहा',
    equipmentType: 'उपकरण का प्रकार',
    airConditioner: 'एयर कंडीशनर',
    wateCooler: 'पानी का कूलर', 
    desertCooler: 'डेजर्ट कूलर',
    // Users
    manageUsers: 'उपयोगकर्ता प्रबंधन',
    addUser: 'नया उपयोगकर्ता जोड़ें',
    markAvailable: 'उपलब्ध करें',
    markOnLeave: 'छुट्टी पर करें',

    // Profile
    profileInfo: 'प्रोफ़ाइल जानकारी',
    changePassword: 'पासवर्ड बदलें',
    currentPassword: 'वर्तमान पासवर्ड',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    updatePassword: 'पासवर्ड अपडेट करें',
    theme: 'थीम',
    language: 'भाषा',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',

    // Settings
    settings: 'सेटिंग्स',
    selectLanguage: 'भाषा चुनें',
    selectTheme: 'थीम चुनें',
        // Complaint Detail
    complaintDetails: 'शिकायत विवरण',
    reportedBy: 'रिपोर्ट करने वाला',
    resolvedBy: 'समाधान करने वाला',
    complaintResolved: 'शिकायत हल हो गई',
    assignStaff: 'कर्मचारी सौंपें',
    reassignStaff: 'पुनः सौंपें',
    selectStaffMember: 'कर्मचारी चुनें',
    staffOnLeaveWarning: 'सौंपा गया कर्मचारी छुट्टी पर है। पुनः सौंपने पर विचार करें।',
    assigning: 'सौंपा जा रहा है…',
    
    // All Complaints
    complaintsList: 'शिकायतें',
    staffLeave: 'छुट्टी पर',
    all: 'सभी',
    open: 'खुली',
    assigned: 'सौंपी गई',
    closed: 'बंद',
    totalComplaintsCount: 'कुल शिकायतें',
    noComplaintsFound: 'कोई शिकायत नहीं मिली',
    notAssignedYet: 'अभी तक सौंपी नहीं गई',
    tapToView: 'देखने के लिए टैप करें',
    assignedTo: 'सौंपा गया',
    
    // Manage Users
    markOnLeave: 'छुट्टी पर करें',
    markAvailable: 'उपलब्ध करें',
    confirm: 'पुष्टि करें',
    usersCount: 'उपयोगकर्ता',
    noUsersFound: 'कोई उपयोगकर्ता नहीं मिला',
    
    // Add User
    selectRole: 'भूमिका चुनें',
    basicInfo: 'बुनियादी जानकारी',
    staffDetails: 'कर्मचारी विवरण',
    employeeId: 'कर्मचारी ID',
    designation: 'पदनाम',
    creating: 'बनाया जा रहा है...',
    createStaff: 'कर्मचारी बनाएं',
    createAdmin: 'एडमिन बनाएं',
    createUser: 'उपयोगकर्ता बनाएं',
    
    // Assets
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',
    equipmentDetails: 'उपकरण विवरण',
    qrCode: 'QR कोड',
    scanToReport: 'समस्या रिपोर्ट करने के लिए Scan2Fix ऐप से इस QR कोड को स्कैन करें',
    
    // User Detail
    userDetails: 'उपयोगकर्ता विवरण',
    staffActions: 'कर्मचारी कार्य',
    notProvided: 'प्रदान नहीं किया गया',
    notSet: 'सेट नहीं है',
    joined: 'शामिल हुए',
    saving: 'सहेजा जा रहा है…',
    updating: 'अपडेट हो रहा है…',
    
    // Profile
    phone: 'फ़ोन',
    role: 'भूमिका',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await SecureStore.getItemAsync('appLanguage');
      if (saved) {
        setLanguageState(saved);
      } else {
        setIsFirstLaunch(true);
      }
    } catch (e) {}
    setLoaded(true);
  };

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    setIsFirstLaunch(false);
    await SecureStore.setItemAsync('appLanguage', lang);
  };

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isFirstLaunch, loaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);