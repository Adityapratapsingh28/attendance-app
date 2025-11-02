import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
    Image,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ApiService from '../services/apiService';

interface Detection {
    name: string | null;
    timestamp: number | null;
    status: 'waiting' | 'marked' | 'already_present' | 'unknown';
    confidence?: number;
    distance?: number;
}

interface AttendanceRecord {
    name: string;
    time: string;
    camera: string;
    confidence?: number;
}

interface AttendanceScannerProps {
    onBack?: () => void;
}

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ onBack }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentFrame, setCurrentFrame] = useState<string | null>(null);
    const [latestDetection, setLatestDetection] = useState<Detection>({
        name: null,
        timestamp: null,
        status: 'waiting',
    });
    const [attendanceSummary, setAttendanceSummary] = useState<{
        total_present: number;
        records: AttendanceRecord[];
    }>({
        total_present: 0,
        records: []
    });
    const [registeredFacesCount, setRegisteredFacesCount] = useState(0);

    // Polling interval for frames
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const summaryIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Start scanner
    const startScanner = async () => {
        setLoading(true);
        try {
            const result = await ApiService.startScanner();

            if (result.success) {
                setIsScanning(true);
                setRegisteredFacesCount(result.registered_faces || 0);
                startFramePolling();
                Alert.alert('Success', result.message);
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error: any) {
            console.error('Error starting scanner:', error);
            Alert.alert('Error', error.message || 'Failed to start scanner');
        } finally {
            setLoading(false);
        }
    };

    // Stop scanner
    const stopScanner = async () => {
        setLoading(true);
        try {
            const result = await ApiService.stopScanner();

            if (result.success) {
                setIsScanning(false);
                stopFramePolling();
                setCurrentFrame(null);
                setLatestDetection({
                    name: null,
                    timestamp: null,
                    status: 'waiting',
                });
                Alert.alert('Success', result.message);
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error: any) {
            console.error('Error stopping scanner:', error);
            Alert.alert('Error', error.message || 'Failed to stop scanner');
        } finally {
            setLoading(false);
        }
    };

    // Start polling for frames
    const startFramePolling = () => {
        frameIntervalRef.current = setInterval(async () => {
            try {
                const frameData = await ApiService.getScannerFrame();
                if (frameData && frameData.frame) {
                    setCurrentFrame(frameData.frame);
                }
                if (frameData && frameData.detection) {
                    setLatestDetection(frameData.detection);
                }
            } catch (error) {
                console.error('Error getting frame:', error);
                // Continue polling despite errors
            }
        }, 1000); // Poll every 1 second
    };

    // Stop polling for frames
    const stopFramePolling = () => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
    };

    // Load attendance summary
    const loadAttendanceSummary = useCallback(async () => {
        try {
            const result = await ApiService.getAttendanceSummary();
            if (result.success) {
                // Safe data handling with fallbacks
                setAttendanceSummary({
                    total_present: result.summary?.total_present || 0,
                    records: result.summary?.attendanceList || result.summary?.records || []
                });
            }
        } catch (error) {
            console.error('Error loading attendance summary:', error);
            // Set default empty state on error
            setAttendanceSummary({
                total_present: 0,
                records: []
            });
        }
    }, []);

    // Check scanner status on mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await ApiService.getScannerStatus();
                setIsScanning(status?.active || false);
                setLatestDetection(status?.latest_detection || {
                    name: null,
                    timestamp: null,
                    status: 'waiting'
                });
                setRegisteredFacesCount(status?.registered_faces || 0);

                if (status?.active) {
                    startFramePolling();
                }
            } catch (error) {
                console.error('Error checking scanner status:', error);
            }
        };

        checkStatus();
        loadAttendanceSummary();

        // Cleanup on unmount
        return () => {
            stopFramePolling();
            if (summaryIntervalRef.current) {
                clearInterval(summaryIntervalRef.current);
            }
        };
    }, [loadAttendanceSummary]);

    // Refresh attendance summary periodically
    useEffect(() => {
        summaryIntervalRef.current = setInterval(loadAttendanceSummary, 5000);

        return () => {
            if (summaryIntervalRef.current) {
                clearInterval(summaryIntervalRef.current);
            }
        };
    }, [loadAttendanceSummary]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'marked':
                return '#4CAF50';
            case 'already_present':
                return '#FF9800';
            case 'unknown':
                return '#f44336';
            default:
                return '#999';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'marked':
                return 'Attendance Marked ✅';
            case 'already_present':
                return 'Already Present 🟡';
            case 'unknown':
                return 'Unknown Face ❌';
            default:
                return 'Waiting for face...';
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>Attendance Scanner</Text>
            </View>

            {/* Scanner Controls */}
            <View style={styles.controlsContainer}>
                <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: isScanning ? '#4CAF50' : '#999' }]} />
                    <Text style={styles.statusText}>
                        Scanner: {isScanning ? 'Active' : 'Stopped'}
                    </Text>
                    <Text style={styles.facesCount}>
                        Registered Faces: {registeredFacesCount}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        isScanning ? styles.stopButton : styles.startButton,
                        loading && styles.buttonDisabled
                    ]}
                    onPress={isScanning ? stopScanner : startScanner}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialIcons
                                name={isScanning ? "stop" : "play-arrow"}
                                size={24}
                                color="#fff"
                            />
                            <Text style={styles.controlButtonText}>
                                {isScanning ? 'Stop Scanner' : 'Start Scanner'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Live Feed */}
            {isScanning && (
                <View style={styles.feedContainer}>
                    <Text style={styles.sectionTitle}>Live Feed</Text>

                    {currentFrame ? (
                        <Image
                            source={{ uri: `data:image/jpeg;base64,${currentFrame}` }}
                            style={styles.feedImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.feedPlaceholder}>
                            <ActivityIndicator size="large" color="#2196F3" />
                            <Text style={styles.placeholderText}>Loading camera feed...</Text>
                        </View>
                    )}

                    {/* Detection Status */}
                    <View style={styles.detectionContainer}>
                        <View style={[
                            styles.detectionCard,
                            { borderLeftColor: getStatusColor(latestDetection.status) }
                        ]}>
                            <Text style={styles.detectionTitle}>Latest Detection</Text>
                            <Text style={styles.detectionStatus}>
                                {getStatusText(latestDetection.status)}
                            </Text>
                            {latestDetection.name && latestDetection.name !== 'Unknown' && (
                                <Text style={styles.detectionName}>
                                    👤 {latestDetection.name}
                                </Text>
                            )}
                            {latestDetection.confidence && (
                                <Text style={styles.detectionConfidence}>
                                    Confidence: {(latestDetection.confidence * 100).toFixed(1)}%
                                </Text>
                            )}
                            {latestDetection.timestamp && (
                                <Text style={styles.detectionTime}>
                                    {new Date(latestDetection.timestamp * 1000).toLocaleTimeString()}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Attendance Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.sectionTitle}>Today's Attendance</Text>
                    <TouchableOpacity onPress={loadAttendanceSummary} style={styles.refreshButton}>
                        <MaterialIcons name="refresh" size={20} color="#2196F3" />
                    </TouchableOpacity>
                </View>

                {attendanceSummary ? (
                    <>
                        <View style={styles.summaryStats}>
                            <Text style={styles.totalPresent}>
                                Total Present: {attendanceSummary.total_present || 0}
                            </Text>
                        </View>

                        {/* ✅ FIXED: Safe array length check */}
                        {(attendanceSummary?.records?.length ?? 0) > 0 ? (
                            <View style={styles.recordsList}>
                                {/* ✅ FIXED: Safe array mapping */}
                                {(attendanceSummary.records || []).map((record, index) => (
                                    <View key={index} style={styles.recordItem}>
                                        <View style={styles.recordInfo}>
                                            <Text style={styles.recordName}>👤 {record.name || 'Unknown'}</Text>
                                            <Text style={styles.recordTime}>🕐 {record.time || 'Unknown time'}</Text>
                                            {record.confidence && (
                                                <Text style={styles.recordConfidence}>
                                                    📊 {(record.confidence * 100).toFixed(1)}%
                                                </Text>
                                            )}
                                        </View>
                                        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noRecords}>
                                <MaterialIcons name="info" size={48} color="#ccc" />
                                <Text style={styles.noRecordsText}>No attendance records for today</Text>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#2196F3" />
                        <Text style={styles.loadingText}>Loading attendance data...</Text>
                    </View>
                )}
            </View>

            {/* Instructions */}
            {!isScanning && (
                <View style={styles.instructionsContainer}>
                    <MaterialIcons name="info" size={24} color="#2196F3" />
                    <Text style={styles.instructionsTitle}>How to use:</Text>
                    <Text style={styles.instructionsText}>
                        1. Make sure you have registered faces in the system{'\n'}
                        2. Click "Start Scanner" to begin face recognition{'\n'}
                        3. Position faces in front of the camera{'\n'}
                        4. Attendance will be marked automatically when faces are recognized
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    controlsContainer: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 20,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusContainer: {
        marginBottom: 20,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    facesCount: {
        fontSize: 14,
        color: '#666',
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 8,
    },
    startButton: {
        backgroundColor: '#4CAF50',
    },
    stopButton: {
        backgroundColor: '#f44336',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    controlButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    feedContainer: {
        backgroundColor: '#fff',
        margin: 15,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        margin: 20,
        marginBottom: 15,
    },
    feedImage: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
    },
    feedPlaceholder: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    placeholderText: {
        marginTop: 10,
        color: '#666',
    },
    detectionContainer: {
        padding: 20,
    },
    detectionCard: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    detectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },
    detectionStatus: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    detectionName: {
        fontSize: 16,
        color: '#2196F3',
        marginBottom: 3,
    },
    detectionConfidence: {
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
    },
    detectionTime: {
        fontSize: 12,
        color: '#999',
    },
    summaryContainer: {
        backgroundColor: '#fff',
        margin: 15,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    refreshButton: {
        padding: 8,
    },
    summaryStats: {
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    totalPresent: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    recordsList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    recordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    recordInfo: {
        flex: 1,
    },
    recordName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    recordTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    recordConfidence: {
        fontSize: 12,
        color: '#999',
    },
    noRecords: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noRecordsText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
    },
    instructionsContainer: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 20,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2196F3',
        marginTop: 10,
        marginBottom: 10,
    },
    instructionsText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});

export default AttendanceScanner;