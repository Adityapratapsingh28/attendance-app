import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import { useAuth } from "../../services/AuthContext"; // Import useAuth hook
import { supabase } from "../../services/supabase";

export default function ProfileScreen() {
    const { user, signOut, loading: authLoading } = useAuth(); // Use auth context
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    // Fetch authenticated user info
    const fetchUserData = async () => {
        if (user) {
            setUserData({
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || "User Name",
                role: user.user_metadata?.role || "Employee",
                department: user.user_metadata?.department || "General",
                email: user.email || "email@example.com",
                phone: user.user_metadata?.phone || "+1 (000) 000-0000",
                location: user.user_metadata?.location || "Not specified",
                employee_id: user.user_metadata?.employee_id || "EMP000",
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUserData();
    }, [user]);

    const handleLogout = async () => {
        Alert.alert(
            "Confirm Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Starting logout process...");
                            setLoggingOut(true);
                            
                            // Clear local state first for immediate UI feedback
                            setUserData(null);
                            
                            // Force hard navigation to signin page
                            setTimeout(() => {
                                router.replace("/onboarding/signin");
                            }, 100);
                            
                            // Use the signOut method from AuthContext
                            await signOut();
                            console.log("SignOut completed successfully");

                        } catch (error: any) {
                            console.error("Detailed logout error:", error);
                            // Force navigation even if there's an error
                            router.replace("/onboarding/signin");
                        } finally {
                            setLoggingOut(false);
                            console.log("Logout process completed");
                        }
                    }
                }
            ]
        );
    };

    const handleEditProfile = () => {
        router.push("/profile/edit");
    };

    // Show loading while auth is initializing or user data is loading
    if (authLoading || loading || !userData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditProfile}
                        disabled={loggingOut}
                    >
                        <Ionicons name="create-outline" size={22} color="#2196F3" />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {userData.full_name
                                        ? userData.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                                        : "U"}
                                </Text>
                            </View>
                            <View style={styles.statusIndicator} />
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{userData.full_name}</Text>
                            <Text style={styles.profileRole}>{userData.role}</Text>
                            <Text style={styles.profileDepartment}>{userData.department}</Text>
                        </View>
                    </View>

                    <View style={styles.profileDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>{userData.email}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>{userData.phone}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>{userData.location}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Ionicons name="briefcase-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>Employee ID: {userData.employee_id}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.editProfileButton}
                        activeOpacity={0.8}
                        onPress={handleEditProfile}
                        disabled={loggingOut}
                    >
                        <Ionicons name="create-outline" size={18} color="#2196F3" />
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push("/profile/leave-status")}
                        disabled={loggingOut}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: "#2196F315" }]}>
                            <Ionicons name="calendar-outline" size={22} color="#2196F3" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Leave Status</Text>
                            <Text style={styles.menuSubtitle}>View your leave requests</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push("/profile/settings")}
                        disabled={loggingOut}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: "#6c757d15" }]}>
                            <Ionicons name="settings-outline" size={22} color="#6c757d" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Settings</Text>
                            <Text style={styles.menuSubtitle}>App preferences and configuration</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>
                </View>

                {/* Logout Section */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity
                        style={[
                            styles.logoutButton,
                            loggingOut && styles.logoutButtonDisabled
                        ]}
                        onPress={() => {
                            setLoggingOut(true);
                            // Force navigation first
                            router.replace("/onboarding/signin");
                            // Then attempt signout in background
                            signOut().catch(err => console.error("Signout error:", err));
                        }}
                        activeOpacity={0.8}
                        disabled={loggingOut}
                    >
                        {loggingOut ? (
                            <>
                                <ActivityIndicator size="small" color="#dc3545" />
                                <Text style={styles.logoutText}>Logging out...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="log-out-outline" size={20} color="#dc3545" />
                                <Text style={styles.logoutText}>Logout</Text>
                            </>
                        )}
                    </TouchableOpacity>
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
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    container: {
        flex: 1
    },
    contentContainer: {
        paddingBottom: 30
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E3F2FD'
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1976D2'
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#E3F2FD'
    },
    profileCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700'
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff'
    },
    profileInfo: {
        flex: 1
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 4
    },
    profileRole: {
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600',
        marginBottom: 2
    },
    profileDepartment: {
        fontSize: 14,
        color: '#666'
    },
    profileDetails: {
        marginBottom: 20
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 8
    },
    detailText: {
        marginLeft: 12,
        fontSize: 15,
        color: '#333',
        fontWeight: '500'
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#2196F3',
        borderRadius: 8,
        backgroundColor: '#E3F2FD'
    },
    editProfileText: {
        marginLeft: 6,
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600'
    },
    menuSection: {
        paddingHorizontal: 20,
        marginTop: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 15
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    menuContent: {
        flex: 1
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
        marginBottom: 2
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#666'
    },
    logoutSection: {
        paddingHorizontal: 20,
        marginTop: 20
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dc3545',
        shadowColor: '#dc3545',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    logoutButtonDisabled: {
        opacity: 0.6
    },
    logoutText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#dc3545',
        fontWeight: '600'
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 20
    },
    versionText: {
        fontSize: 12,
        color: '#999'
    },
});