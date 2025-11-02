import { useEffect } from "react";
import { useAuth } from "../services/AuthContext";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../services/supabase";

export default function Index() {
    const { role, loading, user } = useAuth();

    useEffect(() => {
        const handleNavigation = async () => {
            if (!loading) {
                try {
                    // Double check the session status
                    const { data: { session } } = await supabase.auth.getSession();

                    if (!session) {
                        console.log("No active session, redirecting to signin");
                        await router.replace("/onboarding/signin");
                        return;
                    }

                    if (role === "admin") {
                        console.log("Redirecting admin to admin dashboard");
                        await router.replace("/admin");
                    } else if (role === "user") {
                        const firstLogin = user?.user_metadata?.first_login;
                        console.log("User navigation - firstLogin:", firstLogin);
                        if (firstLogin) {
                            await router.replace("/face-verification/pre");
                        } else {
                            await router.replace("/face-verification/post");
                        }
                    } else {
                        console.log("No role detected, redirecting to signin");
                        await router.replace("/onboarding/signin");
                    }
                } catch (error) {
                    console.error("Navigation error:", error);
                    // Fallback to signin page on error
                    await router.replace("/onboarding/signin");
                }
            }
        };

        handleNavigation();
    }, [role, loading, user]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return null;
}
