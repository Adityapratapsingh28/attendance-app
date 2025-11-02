import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity, Modal } from "react-native";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { signInWithEmail } from "../../services/authService";
import { useAuth } from "../../services/AuthContext";

export default function SignIn() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        if (!password) {
            Alert.alert("Error", "Please enter your password");
            return;
        }

        setLoading(true);

        try {
            console.log("=== SIGNIN DEBUG START ===");
            const result = await signInWithEmail(email, password);
            console.log("Signin API result:", result);

            if (result.ok && result.user) {
                console.log("✅ Auth successful, storing user session...");

                // Store user session
                await signIn(result.user);
                console.log("✅ User session stored");

                // Show action modal instead of navigating directly
                setShowActionModal(true);

                console.log("✅ Action modal shown");
            } else {
                console.log("❌ Signin failed:", result.error);
                Alert.alert("Error", result.error || "Failed to sign in. Please try again.");
            }
        } catch (err) {
            console.error("🚨 Signin catch error:", err);
            Alert.alert("Error", "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
            console.log("=== SIGNIN DEBUG END ===");
        }
    };

    const handleRegisterFace = () => {
        setShowActionModal(false);
        console.log("🔄 Navigating to face registration...");
        router.replace("/face-verification/pre");
    };

    const handleStartScanning = () => {
        setShowActionModal(false);
        console.log("🔄 Navigating to scanning...");
        router.replace("/face-verification/post");
    };

    // Remove debug buttons since we don't need them anymore

    return (
        <>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <Input
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <Input
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    onPress={() => router.push("/onboarding/forgot-password")}
                    style={styles.forgotPassword}
                >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />

                {loading ? (
                    <ActivityIndicator size="large" color="#4F46E5" />
                ) : (
                    <Button
                        title={loading ? "Signing In..." : "Sign In"}
                        onPress={handleSubmit}
                        style={styles.button}
                    />
                )}

                <View style={{ height: 16 }} />

                <Button
                    variant="ghost"
                    title="Don't have an account? Sign Up"
                    onPress={() => router.push("/onboarding/signup")}
                    style={styles.signUpButton}
                />
            </ScrollView>

            {/* Action Selection Modal */}
            <Modal
                visible={showActionModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowActionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Choose Action</Text>
                        <Text style={styles.modalSubtitle}>What would you like to do?</Text>

                        <View style={styles.modalButtonsContainer}>
                            {/* Register New Face Button */}
                            <TouchableOpacity
                                style={[styles.modalButton, styles.registerButton]}
                                onPress={handleRegisterFace}
                            >
                                <Text style={styles.buttonIcon}>👤</Text>
                                <Text style={styles.buttonTitle}>Register New Face</Text>
                                <Text style={styles.buttonDescription}>
                                    Add a new face to the recognition system
                                </Text>
                            </TouchableOpacity>

                            {/* Start Scanning Button */}
                            <TouchableOpacity
                                style={[styles.modalButton, styles.scanButton]}
                                onPress={handleStartScanning}
                            >
                                <Text style={styles.buttonIcon}>📷</Text>
                                <Text style={styles.buttonTitle}>Start Scanning</Text>
                                <Text style={styles.buttonDescription}>
                                    Begin face recognition scanning
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowActionModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: "center",
        backgroundColor: "#F9FAFB"
    },
    header: {
        alignItems: "center",
        marginBottom: 40
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
        color: "#1F2937"
    },
    subtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center"
    },
    inputContainer: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: "#374151"
    },
    input: {
        backgroundColor: "white"
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginTop: -10
    },
    forgotPasswordText: {
        color: "#4F46E5",
        fontSize: 14,
        fontWeight: "500"
    },
    button: {
        borderRadius: 8,
        paddingVertical: 16,
        backgroundColor: "#4F46E5"
    },
    signUpButton: {
        marginTop: 8
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 32,
    },
    modalButtonsContainer: {
        marginBottom: 20,
    },
    modalButton: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    registerButton: {
        backgroundColor: '#F0F9FF',
        borderColor: '#0EA5E9',
    },
    scanButton: {
        backgroundColor: '#F0FDF4',
        borderColor: '#10B981',
    },
    buttonIcon: {
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 8,
    },
    buttonTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 4,
    },
    buttonDescription: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B7280',
    },
    closeButton: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
});