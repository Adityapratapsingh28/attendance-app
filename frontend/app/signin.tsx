

import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import Input from "../components/Input";
import Button from "../components/Button";
import { useRouter } from "expo-router";
import { signInWithEmail } from "../services/authService";

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        // Validate inputs
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
            const result = await signInWithEmail(email, password);
            
            if (result.ok) {
                // Navigation will be handled by AuthContext
                console.log("Sign in successful");
            } else {
                Alert.alert("Error", result.error || "Failed to sign in. Please try again.");
            }
        } catch (err) {
            Alert.alert("Error", "An unexpected error occurred. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* Email input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <Input 
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    autoCapitalize="none"
                />
            </View>

            {/* Password input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <Input 
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity 
                onPress={() => router.push("/onboarding")}
                style={styles.forgotPassword}
            >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
            
            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
                <Button 
                    title="Sign In" 
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
    }
});