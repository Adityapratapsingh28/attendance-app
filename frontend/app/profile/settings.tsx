import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../services/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const { user, signOut, role } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    // Simple settings state
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);
                            // Navigate immediately for better UX
                            setTimeout(() => {
                                router.replace('/onboarding/signin');
                            }, 100);
                            
                            // Then attempt signout
                            await signOut();
                        } catch (error) {
                            console.error('Sign out error:', error);
                            // Force navigation even if there's an error
                            router.replace('/onboarding/signin');
                        } finally {
                            setLoggingOut(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEditProfile = () => {
        router.push('/profile/edit');
    };

    const handleLeaveStatus = () => {
        router.push('/profile/leave-status');
    };

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        showChevron = true,
        danger = false,
        disabled = false
    }: {
        icon: any;
        title: string;
        subtitle?: string;
        onPress: () => void;
        showChevron?: boolean;
        danger?: boolean;
        disabled?: boolean;
    }) => (
        <TouchableOpacity
            style={[
                styles.settingItem,
                danger && styles.dangerItem,
                disabled && styles.disabledItem
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <View style={styles.settingLeft}>
                <View style={[
                    styles.iconContainer,
                    danger ? styles.dangerIconContainer : styles.normalIconContainer
                ]}>
                    <Ionicons
                        name={icon}
                        size={20}
                        color={danger ? '#dc3545' : '#2196F3'}
                    />
                </View>
                <View style={styles.settingText}>
                    <Text style={[
                        styles.settingTitle,
                        danger && styles.dangerText,
                        disabled && styles.disabledText
                    ]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {showChevron && (
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={danger ? '#dc3545' : '#ccc'}
                />
            )}
        </TouchableOpacity>
    );

    const SettingSwitch = ({
        icon,
        title,
        subtitle,
        value,
        onValueChange
    }: {
        icon: any;
        title: string;
        subtitle?: string;
        value: boolean;
        onValueChange: (value: boolean) => void;
    }) => (
        <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
                <View style={styles.normalIconContainer}>
                    <Ionicons name={icon} size={20} color="#2196F3" />
                </View>
                <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.settingSubtitle}>{subtitle}</Text>
                    )}
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
                thumbColor={value ? '#ffffff' : '#ffffff'}
                ios_backgroundColor="#e0e0e0"
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    disabled={loggingOut}
                >
                    <Ionicons name="chevron-back" size={24} color="#2196F3" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userInitial}>
                            {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                                user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {user?.user_metadata?.full_name || 'User'}
                        </Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        {role === 'admin' && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>Admin</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="person-outline"
                            title="Edit Profile"
                            subtitle="Update your personal information"
                            onPress={handleEditProfile}
                            disabled={loggingOut}
                        />
                        <SettingItem
                            icon="calendar-outline"
                            title="Leave Status"
                            subtitle="View your leave requests"
                            onPress={handleLeaveStatus}
                            disabled={loggingOut}
                        />
                    </View>
                </View>

                {/* App Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.sectionContent}>
                        <SettingSwitch
                            icon="notifications-outline"
                            title="Push Notifications"
                            subtitle="Receive app notifications"
                            value={notifications}
                            onValueChange={setNotifications}
                        />
                        <SettingSwitch
                            icon="moon-outline"
                            title="Dark Mode"
                            subtitle="Coming soon"
                            value={darkMode}
                            onValueChange={setDarkMode}
                        />
                    </View>
                </View>

                {/* Account Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <View style={styles.sectionContent}>
                        <TouchableOpacity
                            style={[styles.settingItem, styles.dangerItem]}
                            onPress={handleSignOut}
                            disabled={loggingOut}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingLeft}>
                                <View style={styles.dangerIconContainer}>
                                    {loggingOut ? (
                                        <ActivityIndicator size="small" color="#dc3545" />
                                    ) : (
                                        <Ionicons name="log-out-outline" size={20} color="#dc3545" />
                                    )}
                                </View>
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingTitle, styles.dangerText]}>
                                        {loggingOut ? 'Signing out...' : 'Sign Out'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.2.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#E3F2FD',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1976D2',
    },
    headerRight: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 20,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 16,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    userAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    userInitial: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    adminBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    adminBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1976D2',
    },
    section: {
        marginTop: 24,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 12,
    },
    sectionContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    dangerItem: {
        backgroundColor: '#fff5f5',
        borderBottomWidth: 0,
    },
    disabledItem: {
        opacity: 0.6,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    normalIconContainer: {
        backgroundColor: '#E3F2FD',
    },
    dangerIconContainer: {
        backgroundColor: '#ffebee',
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    dangerText: {
        color: '#dc3545',
    },
    disabledText: {
        color: '#999',
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 16,
    },
    versionText: {
        fontSize: 14,
        color: '#999',
    },
});