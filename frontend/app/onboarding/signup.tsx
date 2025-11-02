import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { signUpWithEmail } from "../../services/authService";

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string) => {
        // Basic phone validation - adjust as needed
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phone === '' || phoneRegex.test(phone.replace(/\s/g, ''));
    };

    const handleSubmit = async () => {
        console.log("=== SIGNUP DEBUG START ===");
        console.log("Form data:", {
            name,
            email,
            phone,
            employeeId,
            passwordLength: password.length
        });

        // Validate inputs
        if (!name.trim()) {
            Alert.alert("Error", "Please enter your name");
            return;
        }

        if (name.trim().length < 2) {
            Alert.alert("Error", "Please enter a valid name");
            return;
        }

        if (!email.trim()) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        if (phone && !validatePhone(phone)) {
            Alert.alert("Error", "Please enter a valid phone number");
            return;
        }

        if (!password) {
            Alert.alert("Error", "Please enter a password");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        console.log("All validation passed, proceeding with signup...");
        setLoading(true);

        try {
            console.log("Calling signUpWithEmail...");
            const result = await signUpWithEmail(email, password, name, phone, employeeId);
            console.log("Signup API result:", JSON.stringify(result, null, 2));

            if (result.ok) {
                console.log("✅ Signup successful!");
                Alert.alert(
                    "Success",
                    "Account created successfully! You can now sign in.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                console.log("Navigating to signin page");
                                router.replace("/onboarding/signin");
                            }
                        }
                    ]
                );
            } else {
                console.log("❌ Signup failed:", result.error);
                Alert.alert("Error", result.error || "Failed to create account. Please try again.");
            }
        } catch (err: any) {
            console.error("🚨 Signup catch error:", err);
            Alert.alert("Error", err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
            console.log("=== SIGNUP DEBUG END ===");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Enter your details to create an account</Text>
            </View>

            {/* Name input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <Input
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    autoCapitalize="words"
                    editable={!loading}
                />
            </View>

            {/* Email input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
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

            {/* Phone input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <Input
                    placeholder="Enter your phone number (optional)"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.input}
                    editable={!loading}
                />
            </View>

            {/* Employee ID input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Employee ID</Text>
                <Input
                    placeholder="Enter your employee ID (optional)"
                    value={employeeId}
                    onChangeText={setEmployeeId}
                    style={styles.input}
                    autoCapitalize="none"
                    editable={!loading}
                />
            </View>

            {/* Password input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <Input
                    placeholder="Enter your password (min. 6 characters)"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                    editable={!loading}
                />
                <Text style={styles.passwordHint}>
                    {password.length > 0 ? `${password.length} characters` : ''}
                </Text>
            </View>

            <Text style={styles.requiredHint}>* Required fields</Text>

            <View style={{ height: 20 }} />

            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
                <Button
                    title={loading ? "Creating Account..." : "Create Account"}
                    onPress={handleSubmit}
                    style={styles.button}
                />
            )}

            <View style={{ height: 16 }} />

            <Button
                variant="ghost"
                title="Already have an account? Sign In"
                onPress={() => router.push("/onboarding/signin")}
                style={styles.signInButton}
            />
        </ScrollView>
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
    passwordHint: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
        marginLeft: 4
    },
    requiredHint: {
        fontSize: 12,
        color: "#6B7280",
        fontStyle: "italic",
        marginTop: -10,
        marginBottom: 10
    },
    button: {
        borderRadius: 8,
        paddingVertical: 16,
        backgroundColor: "#4F46E5"
    },
    signInButton: {
        marginTop: 8
    }
});