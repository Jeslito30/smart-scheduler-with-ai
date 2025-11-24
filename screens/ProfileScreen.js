import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { updateProfilePicture } from '../services/Database';
// Importing Lucide icons for the profile card and dropdown
import { User, Edit, ChevronDown, LogOut } from 'lucide-react-native';

// --- Color Constants ---
const LightColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#1F1F1F',
  textSecondary: '#6B7280',
  accentOrange: '#FF9500',
  progressRed: '#FF4500',  // Used for the Logout button
};

const ProfileScreen = ({ user, onLogout }) => {
    const db = useSQLiteContext();
    // State for the alarm switch
    const [isAlarmEnabled, setIsAlarmEnabled] = useState(true);
    const toggleAlarmSwitch = () => setIsAlarmEnabled(previousState => !previousState);
    const [profilePicture, setProfilePicture] = useState(user?.profile_picture);

    useEffect(() => {
        setProfilePicture(user?.profile_picture);
    }, [user]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setProfilePicture(result.assets[0].uri);
            try {
                await updateProfilePicture(db, user.id, result.assets[0].uri);
            } catch (error) {
                console.error("Failed to update profile picture:", error);
            }
        }
    };

    // Mock data for the dropdown (Time selection)
    const mockAlarmTime = '5 Minutes'; // Example value for the dropdown display

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.titleText}>Profile</Text>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <TouchableOpacity onPress={pickImage}>
                    <View style={styles.avatarContainer}>
                        {profilePicture ? (
                            <Image source={{ uri: profilePicture }} style={styles.avatar} />
                        ) : (
                            <User size={50} color={LightColors.textPrimary} />
                        )}
                    </View>
                </TouchableOpacity>

                <Text style={styles.userNameText}>{user.name}</Text>

                <TouchableOpacity style={styles.editButton}>
                    <Edit size={20} color={LightColors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* --- Alarm Setting Section --- */}
            <View style={styles.settingsSection}>

                {/* Alarm Switch Row */}
                <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Alarm</Text>
                    <Switch
                        trackColor={{ false: LightColors.textSecondary, true: LightColors.accentOrange }}
                        thumbColor={isAlarmEnabled ? LightColors.card : LightColors.textSecondary}
                        ios_backgroundColor={LightColors.textSecondary}
                        onValueChange={toggleAlarmSwitch}
                        value={isAlarmEnabled}
                    />
                </View>

                {/* Alarm Description Input (Placeholder) */}
                <View style={[styles.settingInputContainer, { opacity: isAlarmEnabled ? 1 : 0.5 }]}>
                    <Text style={styles.inputLabel}>Alarm before schedule/task</Text>
                </View>

                {/* Time Setting Input (Placeholder) */}
                <Text style={styles.settingLabel}>Time</Text>
                <TouchableOpacity
                    style={[styles.settingInputContainer, styles.dropdownInput, { opacity: isAlarmEnabled ? 1 : 0.5 }]}
                    disabled={!isAlarmEnabled}
                >
                    <Text style={styles.dropdownText}>{mockAlarmTime}</Text>
                    <ChevronDown size={20} color={LightColors.textPrimary} />
                </TouchableOpacity>
            </View>


            {/* Logout Button */}
            <View style={styles.logoutWrapper}>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={onLogout}
                >
                    {/* LogOut icon is optional, but adds context */}
                    <LogOut size={20} color={LightColors.card} style={{ marginRight: 8 }} />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Note: The bottom navigation bar is typically outside this screen component */}

        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LightColors.background,
        paddingHorizontal: 15,
    },

    // --- Header ---
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 10,
        marginBottom: 20,
    },
    titleText: {
        color: LightColors.textPrimary,
        fontSize: 25,
        fontWeight: 'bold',
    },

    // --- Profile Card ---
    profileCard: {
        backgroundColor: LightColors.card,
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: LightColors.background, // Use background color for avatar circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    userNameText: {
        color: LightColors.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 5,
    },
    userRoleText: {
        color: LightColors.textSecondary,
        fontSize: 14,
        marginBottom: 10,
    },
    editButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        // The edit button in the image is small and subtle
        padding: 5,
    },

    // --- Settings Section ---
    settingsSection: {
        flex: 1, // Allows the settings section to push the logout button to the bottom
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    settingLabel: {
        color: LightColors.textPrimary,
        fontSize: 16,
    },

    // Placeholder Input Styles
    settingInputContainer: {
        backgroundColor: LightColors.card,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB', // A light border for the card
    },
    inputLabel: {
        color: LightColors.textSecondary,
        fontSize: 14,
    },

    // Dropdown Specific Styles
    dropdownInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        color: LightColors.textPrimary,
        fontSize: 16,
    },

    // --- Logout Button ---
    logoutWrapper: {
        // Ensures button stays at the bottom above the nav (if nav is outside SafeAreaView)
        // marginBottom: 20, // Removed to reduce space
    },
    logoutButton: {
        backgroundColor: LightColors.progressRed, // Bright red for a warning/action button
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    logoutButtonText: {
        color: LightColors.card,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ProfileScreen;