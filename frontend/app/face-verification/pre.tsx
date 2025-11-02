import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import FaceRegistration from "../../components/FaceRegistration";

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

export default function PreVerification() {
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [geoAllowed, setGeoAllowed] = useState(false);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [targetLocation, setTargetLocation] = useState(DEFAULT_LOCATION);

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
                    targetLocation.latitude,
                    targetLocation.longitude
                );

                const allowed = distance <= RADIUS_METERS;
                setGeoAllowed(allowed);
                setIsCheckingLocation(false);

                if (!allowed) {
                    alert(
                        `You are ${Math.round(distance)}m away from the target location. Must be within ${RADIUS_METERS}m.`
                    );
                }
            },
            (error) => {
                alert("Error getting location: " + error.message);
                setIsCheckingLocation(false);
                setGeoAllowed(false);
            },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        verifyGeoFence();
    }, []);

    const handleGoHome = () => {
        router.push("/home");
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                minHeight: "100vh",
                padding: "40px 20px 80px 20px",
                gap: 20,
                textAlign: "center",
                backgroundColor: "#f8fafc",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}
        >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                <h1 style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#1e293b",
                    margin: 0,
                    marginBottom: 8
                }}>
                    Face Registration
                </h1>
                <p style={{
                    fontSize: "1rem",
                    color: "#64748b",
                    margin: 0
                }}>
                    Register a new face for recognition
                </p>
            </div>

            {/* Location Check Section */}
            <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                width: "100%",
                maxWidth: "400px"
            }}>
                <button
                    onClick={verifyGeoFence}
                    disabled={isCheckingLocation}
                    style={{
                        padding: "12px 24px",
                        fontSize: "16px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: isCheckingLocation ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        width: "100%",
                        marginBottom: "15px"
                    }}
                >
                    {isCheckingLocation ? "🔍 Checking Location..." : "📍 Check Location"}
                </button>

                {userLocation && (
                    <p style={{ margin: "10px 0", fontSize: "14px", color: "#475569" }}>
                        📍 Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    </p>
                )}

                {!geoAllowed && userLocation && (
                    <p style={{
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        padding: "10px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        margin: "10px 0"
                    }}>
                        ❌ You must be within {RADIUS_METERS}m of the target location to proceed.
                    </p>
                )}

                {geoAllowed && (
                    <p style={{
                        color: "#059669",
                        backgroundColor: "#f0fdf4",
                        padding: "10px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        margin: "10px 0"
                    }}>
                        ✅ You are within {RADIUS_METERS}m of the target location
                    </p>
                )}
            </div>

            {/* Face Registration Section - Only show when location is allowed */}
            {geoAllowed && (
                <div style={{
                    backgroundColor: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    width: "100%",
                    maxWidth: "500px"
                }}>
                    <h2 style={{
                        fontSize: "1.5rem",
                        fontWeight: "600",
                        color: "#1e293b",
                        margin: "0 0 20px 0",
                        textAlign: "center"
                    }}>
                        Register New Face
                    </h2>

                    {/* FaceRegistration Component */}
                    <FaceRegistration onSuccess={() => router.push("/face-verification/post")} />
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
                display: "flex",
                gap: "15px",
                marginTop: "30px",
                flexWrap: "wrap",
                justifyContent: "center"
            }}>
                <button
                    onClick={() => router.push("/face-verification/post")}
                    style={{
                        padding: "12px 24px",
                        fontSize: "16px",
                        backgroundColor: "#8b5cf6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    ➡️ Go to Scanning
                </button>

                <button
                    onClick={handleGoHome}
                    style={{
                        padding: "12px 24px",
                        fontSize: "16px",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        color: "#1e40af",
                        border: "2px solid rgba(59,130,246,0.3)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    🏠 Go Home
                </button>
            </div>
        </div>
    );
}