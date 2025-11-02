import { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    SafeAreaView,
    Alert,
    Platform
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { applyLeave } from "../../services/supabase"; // ✅ Changed from applyLeaveWithUser to applyLeave
import { useAuth } from "../../services/AuthContext";

export default function ApplyLeaveScreen() {
    const { user, loading } = useAuth();

    const [leaveType, setLeaveType] = useState("");
    const [teamName, setTeamName] = useState("");
    const [subject, setSubject] = useState("");
    const [fromDate, setFromDate] = useState(new Date());
    const [duration, setDuration] = useState(1);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + duration - 1);

    const handleApplyLeave = async () => {
        // Validate inputs
        if (!leaveType.trim() || !teamName.trim() || !subject.trim() || duration < 1) {
            Alert.alert("Missing Information", "Please fill in all required fields.");
            return;
        }

        if (!user) {
            Alert.alert("Not Logged In", "Please login to apply for leave.");
            return;
        }

        // Additional validation for user ID
        if (!user.id) {
            Alert.alert("Authentication Error", "User ID not found. Please login again.");
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('Submitting leave with data:', {
                leave_type: leaveType,
                start_date: fromDate.toISOString().split("T")[0],
                end_date: toDate.toISOString().split("T")[0],
                reason: subject,
                team_name: teamName,
                user_id: user.id,
                full_name: user.full_name, // ✅ Using user.full_name directly from your AuthContext
                email: user.email
            });

            // ✅ Changed from applyLeaveWithUser to applyLeave
            await applyLeave(user, {
                leave_type: leaveType,
                start_date: fromDate.toISOString().split("T")[0],
                end_date: toDate.toISOString().split("T")[0],
                reason: subject,
                team_name: teamName
            });

            Alert.alert("Success", "Leave application submitted successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (err: any) {
            console.error('Leave application error:', err);
            Alert.alert("Error", err.message || "Failed to submit leave application");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFromDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            setFromDate(selectedDate);
        }
    };

    const handleDurationChange = (text: string) => {
        const value = parseInt(text);
        if (!isNaN(value) && value > 0) {
            setDuration(value);
        } else if (text === '') {
            setDuration(1);
        }
    };

    // Show loading if auth is still loading
    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Apply for Leave</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Leave Type *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                placeholder="e.g., Sick Leave, Casual Leave"
                                value={leaveType}
                                onChangeText={setLeaveType}
                                style={styles.input}
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>From Date *</Text>
                        <TouchableOpacity
                            style={styles.datePickerWrapper}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar" size={18} color="#666" style={styles.dateIcon} />
                            <Text style={styles.dateText}>{fromDate.toDateString()}</Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={fromDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                                onChange={onFromDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Duration (days) *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                placeholder="Enter duration in days"
                                value={duration.toString()}
                                onChangeText={handleDurationChange}
                                keyboardType="numeric"
                                style={styles.input}
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.durationContainer}>
                        <Text style={styles.durationText}>To Date: {toDate.toDateString()}</Text>
                        <Text style={styles.durationText}>Total Duration: {duration} day(s)</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Team Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="people-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                placeholder="Enter your team name"
                                value={teamName}
                                onChangeText={setTeamName}
                                style={styles.input}
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Subject / Description *</Text>
                        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                            <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                placeholder="Provide details about your leave request"
                                value={subject}
                                onChangeText={setSubject}
                                style={[styles.input, styles.textArea]}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                        onPress={handleApplyLeave}
                        activeOpacity={0.8}
                        disabled={isSubmitting}
                    >
                        <Ionicons
                            name={isSubmitting ? "time" : "checkmark-circle"}
                            size={20}
                            color="#fff"
                            style={styles.buttonIcon}
                        />
                        <Text style={styles.submitButtonText}>
                            {isSubmitting ? "Submitting..." : "Submit Leave Request"}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Ionicons name="information-circle" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            Your leave request will be sent to your manager for approval.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ... keep all your existing styles unchanged ...

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f8f9fa" },
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef"
    },
    backButton: { padding: 5 },
    title: { fontSize: 20, fontWeight: "600", color: "#333" },
    placeholder: { width: 34 },
    formContainer: { padding: 20, paddingTop: 25 },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 8 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    textAreaWrapper: { paddingVertical: 15, minHeight: 100, alignItems: "flex-start" },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: "#333" },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    datePickerWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    dateIcon: { marginRight: 10 },
    dateText: { flex: 1, fontSize: 16, color: "#333" },
    durationContainer: {
        backgroundColor: "#e8f5e8",
        borderRadius: 8,
        padding: 12,
        marginBottom: 20
    },
    durationText: { color: "#2d5a2d", fontSize: 14, fontWeight: "500", textAlign: "center" },
    submitButton: {
        backgroundColor: "#28a745",
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        shadowColor: "#28a745",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    submitButtonDisabled: {
        backgroundColor: "#6c757d",
        shadowColor: "#6c757d",
    },
    buttonIcon: { marginRight: 8 },
    submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    infoContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
        marginTop: 20,
        borderLeftWidth: 3,
        borderLeftColor: "#007bff"
    },
    infoText: { color: "#666", fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 }
});