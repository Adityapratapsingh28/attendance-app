import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    BackHandler,
    StatusBar,
    SafeAreaView,
    TouchableOpacity,
    Text,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AttendanceScanner from '../../components/AttendanceScanner';
import ApiService from '../../services/apiService';

const DEFAULT_LOCATION = { latitude: 12.81696, longitude: 80.039546 };
const RADIUS_METERS = 450;

const getDistanceFromLatLonInMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) => {
    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function PostScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [serverConnected, setServerConnected] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [geoAllowed, setGeoAllowed] = useState(false);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);

    // Check server and location on mount
    useEffect(() => {
        checkServerConnection();
        verifyGeoFence();
    }, []);

    // Android back button
    useEffect(() => {
        const backAction = () => {
            Alert.alert("Exit Scanner", "Are you sure you want to go back?", [
                { text: "Cancel", style: "cancel" },
                { text: "YES", onPress: () => router.back(), style: "destructive" }
            ]);
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, []);

    const verifyGeoFence = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setIsCheckingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const current = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                setUserLocation(current);

                const distance = getDistanceFromLatLonInMeters(
                    current.latitude,
                    current.longitude,
                    DEFAULT_LOCATION.latitude,
                    DEFAULT_LOCATION.longitude
                );

                const allowed = distance <= RADIUS_METERS;
                setGeoAllowed(allowed);
                setIsCheckingLocation(false);

                if (!allowed) {
                    Alert.alert(
                        "Location Restricted",
                        `You are ${Math.round(distance)}m away from the target location. Must be within ${RADIUS_METERS}m to scan attendance.`
                    );
                }
            },
            (error) => {
                Alert.alert("Location Error", "Error getting location: " + error.message);
                setIsCheckingLocation(false);
                setGeoAllowed(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const checkServerConnection = async () => {
        try {
            await ApiService.healthCheck();
            setServerConnected(true);
        } catch (error) {
            console.error('Server connection failed:', error);
            setServerConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        Alert.alert("Exit Scanner", "Stop scanning and go back?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, Go Back",
                onPress: async () => {
                    try {
                        await ApiService.stopScanner();
                    } catch (error) {
                        console.log('Scanner stop error (ignored):', error.message);
                    }
                    router.back();
                },
                style: "destructive"
            }
        ]);
    };

    const CustomButton = ({ title, onPress, variant = 'primary', style = {} }) => (
        <TouchableOpacity
            style={[
                styles.button,
                variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[
                styles.buttonText,
                variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
                <View style={styles.gradientBackground}>
                    <View style={styles.loadingContainer}>
                        <View style={styles.loadingCard}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text style={styles.loadingText}>Connecting to Server...</Text>
                        </View>
                        <CustomButton
                            title="Go Home"
                            onPress={() => router.push('/home')}
                            variant="secondary"
                            style={styles.homeButton}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (!serverConnected) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
                <View style={styles.gradientBackground}>
                    <View style={styles.errorContainer}>
                        <View style={styles.errorCard}>
                            <Text style={styles.errorTitle}>Connection Failed</Text>
                            <CustomButton title="Retry" onPress={checkServerConnection} style={styles.retryButton} />
                        </View>
                        <CustomButton
                            title="Go Home"
                            onPress={() => router.push('/home')}
                            variant="secondary"
                            style={styles.homeButton}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
            <View style={styles.gradientBackground}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Attendance Scanner</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Location Status */}
                <View style={styles.locationContainer}>
                    <View style={styles.locationHeader}>
                        <Text style={styles.locationTitle}>📍 Location Status</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={verifyGeoFence}
                            disabled={isCheckingLocation}
                        >
                            <Text style={styles.refreshButtonText}>
                                {isCheckingLocation ? "🔄" : "🔄"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {userLocation && (
                        <Text style={styles.locationText}>
                            Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                        </Text>
                    )}

                    {!geoAllowed && userLocation && (
                        <View style={styles.locationError}>
                            <Text style={styles.locationErrorText}>
                                ❌ You must be within {RADIUS_METERS}m of the target location to scan attendance.
                            </Text>
                        </View>
                    )}

                    {geoAllowed && (
                        <View style={styles.locationSuccess}>
                            <Text style={styles.locationSuccessText}>
                                ✅ You are within {RADIUS_METERS}m - Scanning enabled
                            </Text>
                        </View>
                    )}
                </View>

                {/* Scanner - Only show when location is allowed */}
                {geoAllowed ? (
                    <View style={styles.scannerContainer}>
                        <View style={styles.scannerWrapper}>
                            <AttendanceScanner
                                onBack={handleBack}
                                onError={(error) => {
                                    Alert.alert('Scanner Error', error.message);
                                }}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.scannerDisabled}>
                        <Text style={styles.scannerDisabledText}>
                            Scanner disabled - Location requirement not met
                        </Text>
                        <CustomButton
                            title="Check Location Again"
                            onPress={verifyGeoFence}
                            style={styles.retryLocationButton}
                        />
                    </View>
                )}

                {/* Actions */}
                <View style={styles.bottomContainer}>
                    <CustomButton
                        title="🏠 Go Home"
                        onPress={() => router.push('/home')}
                        variant="secondary"
                        style={styles.homeButtonBottom}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e3a8a' },
    gradientBackground: { flex: 1, backgroundColor: '#1e40af' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    backButtonText: {
        fontSize: 20,
        color: '#93c5fd',
        fontWeight: 'bold'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff'
    },
    placeholder: {
        width: 40
    },
    locationContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: 20,
        marginBottom: 10,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    refreshButton: {
        padding: 8,
    },
    refreshButtonText: {
        fontSize: 16,
        color: '#93c5fd',
    },
    locationText: {
        fontSize: 12,
        color: '#cbd5e1',
        marginBottom: 8,
    },
    locationError: {
        backgroundColor: 'rgba(220, 38, 38, 0.2)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.3)',
    },
    locationErrorText: {
        fontSize: 12,
        color: '#fecaca',
        textAlign: 'center',
    },
    locationSuccess: {
        backgroundColor: 'rgba(5, 150, 105, 0.2)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(5, 150, 105, 0.3)',
    },
    locationSuccessText: {
        fontSize: 12,
        color: '#a7f3d0',
        textAlign: 'center',
    },
    scannerContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 10,
    },
    scannerWrapper: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    scannerDisabled: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scannerDisabledText: {
        fontSize: 16,
        color: '#cbd5e1',
        textAlign: 'center',
        marginBottom: 20,
    },
    bottomContainer: {
        padding: 20
    },
    button: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    primaryButton: {
        backgroundColor: '#3b82f6'
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 2,
        borderColor: 'rgba(59,130,246,0.3)'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600'
    },
    primaryButtonText: {
        color: '#fff'
    },
    secondaryButtonText: {
        color: '#1e40af'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    errorCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center'
    },
    errorTitle: {
        fontSize: 20,
        color: '#dc2626',
        fontWeight: '700'
    },
    retryButton: {
        marginTop: 10
    },
    retryLocationButton: {
        marginTop: 10,
        width: '80%',
    },
    homeButton: {
        marginTop: 20
    },
    homeButtonBottom: {
        width: '100%'
    }
});