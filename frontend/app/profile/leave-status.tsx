import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getUserLeaves } from "../../services/supabase";
import { useAuth } from "../../services/AuthContext"; // Add this import

// Enhanced Leave Card Component
function LeaveRequestCard({ leave }: any) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return '#4CAF50';
            case 'rejected': return '#f44336';
            case 'pending': return '#FF9800';
            default: return '#757575';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'checkmark-circle';
            case 'rejected': return 'close-circle';
            case 'pending': return 'time-outline';
            default: return 'help-circle';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDuration = () => {
        if (leave.start_date === leave.end_date) return "1 day";
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} days`;
    };

    return (
        <View style={styles.leaveCard}>
            {/* Header with Status */}
            <View style={styles.cardHeader}>
                <View style={styles.leaveTypeContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                    <Text style={styles.leaveType}>{leave.leave_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(leave.status)}15` }]}>
                    <Ionicons
                        name={getStatusIcon(leave.status)}
                        size={14}
                        color={getStatusColor(leave.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(leave.status) }]}>
                        {leave.status}
                    </Text>
                </View>
            </View>

            {/* Leave Details */}
            <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                        </Text>
                        <Text style={styles.detailSubValue}>({getDuration()})</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Applied On</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(leave.created_at)}
                        </Text>
                    </View>
                </View>

                {leave.reason && (
                    <View style={styles.reasonContainer}>
                        <Text style={styles.reasonLabel}>Reason</Text>
                        <Text style={styles.reasonText}>{leave.reason}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export default function LeaveStatusScreen() {
    const { user } = useAuth(); // Get user from auth context
    const [refreshing, setRefreshing] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if user is available and has an ID
            if (!user?.id) {
                console.error("User ID not available");
                setError("User not authenticated");
                setLeaveRequests([]);
                return;
            }

            console.log("Fetching leaves for user:", user.id);
            const data = await getUserLeaves(user.id); // Pass user ID
            console.log("Leaves data received:", data);
            setLeaveRequests(data || []);
        } catch (error: any) {
            console.error("Error fetching leaves:", error);
            setError(error.message || "Failed to load leave requests");
            setLeaveRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchLeaves();
        } else {
            setLoading(false);
            setError("User not authenticated");
        }
    }, [user?.id]); // Add dependency on user.id

    const onRefresh = () => {
        if (user?.id) {
            setRefreshing(true);
            fetchLeaves();
        }
    };

    const getStatusCount = (status: string) => {
        return leaveRequests.filter(leave => leave.status?.toLowerCase() === status.toLowerCase()).length;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading your leave requests...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2196F3']}
                        tintColor="#2196F3"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace("/home")}
                    >
                        <Ionicons name="chevron-back" size={24} color="#2196F3" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Leave Status</Text>
                        <Text style={styles.subtitle}>Track your leave requests</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                        <Ionicons name="refresh" size={22} color="#2196F3" />
                    </TouchableOpacity>
                </View>

                {/* Error State */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="warning-outline" size={24} color="#f44336" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchLeaves}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Status Summary Cards - Only show if no error */}
                {!error && (
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryIconContainer}>
                                <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                            </View>
                            <Text style={styles.summaryNumber}>{getStatusCount('Approved')}</Text>
                            <Text style={styles.summaryLabel}>Approved</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryIconContainer}>
                                <Ionicons name="time-outline" size={28} color="#FF9800" />
                            </View>
                            <Text style={styles.summaryNumber}>{getStatusCount('Pending')}</Text>
                            <Text style={styles.summaryLabel}>Pending</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryIconContainer}>
                                <Ionicons name="close-circle" size={28} color="#f44336" />
                            </View>
                            <Text style={styles.summaryNumber}>{getStatusCount('Rejected')}</Text>
                            <Text style={styles.summaryLabel}>Rejected</Text>
                        </View>
                    </View>
                )}

                {/* Leave Requests Section */}
                {!error && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Leave Requests</Text>
                            <Text style={styles.sectionSubtitle}>
                                {leaveRequests.length} total request{leaveRequests.length !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* Leave Request Cards */}
                        {leaveRequests.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="calendar-outline" size={64} color="#E3F2FD" />
                                </View>
                                <Text style={styles.emptyStateTitle}>No Leave Requests Yet</Text>
                                <Text style={styles.emptyStateText}>
                                    Start by applying for your first leave request. It's quick and easy!
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyStateButton}
                                    onPress={() => router.push("/profile/apply-leave")}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color="#2196F3" />
                                    <Text style={styles.emptyStateButtonText}>Apply for Leave</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.leaveCardsContainer}>
                                    {leaveRequests.map((leave) => (
                                        <LeaveRequestCard key={leave.id} leave={leave} />
                                    ))}
                                </View>

                                {/* Action Button */}
                                <View style={styles.actionContainer}>
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={() => router.push("/profile/apply-leave")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="add-circle" size={20} color="#fff" />
                                        <Text style={styles.primaryButtonText}>Apply New Leave</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </>
                )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E3F2FD'
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1976D2'
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center'
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    summaryIconContainer: {
        marginBottom: 12
    },
    summaryNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1976D2',
        marginBottom: 4
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 16
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 4
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666'
    },
    leaveCardsContainer: {
        paddingHorizontal: 20,
        gap: 16
    },
    leaveCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    leaveTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    leaveType: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1976D2',
        marginLeft: 8
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    cardBody: {
        gap: 12
    },
    detailRow: {
        flexDirection: 'row',
        gap: 16
    },
    detailItem: {
        flex: 1
    },
    detailLabel: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    detailValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        marginBottom: 2
    },
    detailSubValue: {
        fontSize: 14,
        color: '#666'
    },
    reasonContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3'
    },
    reasonLabel: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase'
    },
    reasonText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: 12
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24
    },
    emptyStateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8
    },
    emptyStateButtonText: {
        color: '#2196F3',
        fontSize: 16,
        fontWeight: '600'
    },
    actionContainer: {
        paddingHorizontal: 20,
        paddingTop: 30
    },
    primaryButton: {
        backgroundColor: '#2196F3',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    },
});