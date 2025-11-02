import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface ActionModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ActionModal({ visible, onClose }: ActionModalProps) {
    const router = useRouter();

    const handleRegisterFace = () => {
        onClose();
        router.push('/face-verification/pre');
    };

    const handleStartScanning = () => {
        onClose();
        router.push('/face-verification/post');
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>Choose Action</Text>
                    <Text style={styles.subtitle}>What would you like to do?</Text>

                    <View style={styles.buttonsContainer}>
                        {/* Register New Face Button */}
                        <TouchableOpacity
                            style={[styles.button, styles.registerButton]}
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
                            style={[styles.button, styles.scanButton]}
                            onPress={handleStartScanning}
                        >
                            <Text style={styles.buttonIcon}>📷</Text>
                            <Text style={styles.buttonTitle}>Start Scanning</Text>
                            <Text style={styles.buttonDescription}>
                                Begin face recognition scanning
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 32,
    },
    buttonsContainer: {
        marginBottom: 20,
    },
    button: {
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