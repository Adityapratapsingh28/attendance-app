import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useRouter, useLocalSearchParams } from "expo-router";
import useAuth from "../../hooks/useAuth";

export default function SignUp() {
    const router = useRouter();
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const { sendOtp, error } = useAuth();

    const activeMode = mode || "phone";

    const handleSubmit = async () => {
        // Validate input
        if (activeMode === "email" && !email) {
            Alert.alert("Error", "Please enter your email address");
            return;
        } else if (activeMode === "phone" && !phone) {
            Alert.alert("Error", "Please enter your phone number");
            return;
        }

        if (!name.trim()) {
            Alert.alert("Error", "Please enter your name");
            return;
        }

        setLoading(true);
        
        try {
            const identifier = activeMode === "email" ? email : phone;
            const result = await sendOtp(identifier, activeMode as "email" | "phone");
            
            if (result.ok) {
                // Navigate to OTP verification screen with identifier, mode, and name
                router.push({
                    pathname: "/onboarding/otp-verify",
                    params: { identifier, mode: activeMode, name }
                });
            } else {
                Alert.alert("Error", result.error || "Failed to send OTP. Please try again.");
            }
        } catch (err) {
            Alert.alert("Error", "An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign up</Text>
            
            {/* Mode selector */}
            <View style={styles.modeSelector}>
                <Button 
                    variant={activeMode === "phone" ? "solid" : "ghost"} 
                    title="Phone" 
                    onPress={() => router.setParams({ mode: "phone" })}
                    style={styles.modeButton}
                />
                <Button 
                    variant={activeMode === "email" ? "solid" : "ghost"} 
                    title="Email" 
                    onPress={() => router.setParams({ mode: "email" })}
                    style={styles.modeButton}
                />
            </View>

            {/* Name input */}
            <Input 
                placeholder="Your Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
            />

            {/* Phone input */}
            {activeMode === "phone" && (
                <Input 
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.input}
                />
            )}

            {/* Email input */}
            {activeMode === "email" && (
                <Input 
                    placeholder="Email address"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    autoCapitalize="none"
                />
            )}

            <View style={{ height: 12 }} />
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <Button 
                    title="Create Account" 
                    onPress={handleSubmit} 
                />
            )}
            
            <View style={{ height: 16 }} />
            <Text style={styles.signInText}>Already have an account?</Text>
            <Button 
                variant="ghost" 
                title="Sign In" 
                onPress={() => router.push("signin")}
                style={{ marginTop: 8 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20, 
        justifyContent: "center" 
    },
    title: { 
        fontSize: 20, 
        fontWeight: "600",
        marginBottom: 20,
        textAlign: "center"
    },
    modeSelector: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
        gap: 10
    },
    modeButton: {
        flex: 1,
    },
    input: {
        marginBottom: 16
    },
    signInText: {
        textAlign: "center",
        color: "#666"
    }
});