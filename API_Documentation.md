# Realtime Attendance System - API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Base URLs](#base-urls)
3. [Authentication](#authentication)
4. [Face Recognition API](#1-face-recognition-api)
5. [Legacy API](#2-legacy-api)
6. [Timer API](#3-timer-api)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Introduction
This document provides comprehensive documentation for the Realtime Attendance System's APIs. The system consists of three main API services:
- Face Recognition API (FastAPI)
- Legacy API (Flask)
- Timer API (Flask)

## Base URLs
| API Service | Base URL | Description |
|------------|----------|-------------|
| Face Recognition API | `http://localhost:8000` | Main API for face recognition features |
| Legacy API | `http://localhost:5000` | Legacy endpoints for basic operations |
| Timer API | `http://localhost:5000` | Time tracking functionality |

## Authentication
Currently, the APIs implement CORS with the following configurations:
- Face Recognition API: All origins allowed (`*`)
- Legacy API: Only `http://localhost:3000` allowed
- Timer API: All origins allowed

## 1. Face Recognition API

### 1.1 Register Face
**Endpoint:** `POST /api/register-face`

**Description:** Registers a new face in the system.

**Request:**
```http
POST /api/register-face
Content-Type: multipart/form-data

Parameters:
- name: string (required)
- file: image file (required)
```

**Response:**
```json
// Success (200)
{
    "success": true,
    "message": "Face registered successfully for {name}",
    "name": "string"
}

// Error (400/500)
{
    "detail": "Error message"
}
```

### 1.2 Start Scanner
**Endpoint:** `POST /api/start-scanner`

**Description:** Initiates the real-time face recognition scanner.

**Response:**
```json
// Success (200)
{
    "success": true,
    "message": "Scanner started successfully",
    "registered_faces": 123
}

// Error (400/500)
{
    "detail": "Error message"
}
```

### 1.3 Stop Scanner
**Endpoint:** `POST /api/stop-scanner`

**Description:** Stops the real-time face recognition scanner.

**Response:**
```json
{
    "success": true,
    "message": "Scanner stopped successfully"
}
```

### 1.4 Get Scanner Frame
**Endpoint:** `GET /api/scanner-frame`

**Description:** Retrieves the current frame with face detection results.

**Response:**
```json
{
    "frame": "base64_encoded_image",
    "detection": {
        "name": "string",
        "timestamp": 1234567890,
        "status": "marked|already_present|unknown",
        "confidence": 0.95,
        "distance": 0.05
    }
}
```

### 1.5 Get Scanner Status
**Endpoint:** `GET /api/scanner-status`

**Description:** Returns current scanner status.

**Response:**
```json
{
    "active": true,
    "latest_detection": {
        "name": "string",
        "timestamp": 1234567890,
        "status": "string",
        "confidence": 0.95,
        "distance": 0.05
    },
    "registered_faces": 123
}
```

### 1.6 Get Attendance Summary
**Endpoint:** `GET /api/attendance-summary`

**Description:** Retrieves today's attendance summary.

**Response:**
```json
{
    "success": true,
    "summary": {
        "total_present": 123,
        "records": [
            {
                "name": "string",
                "time": "string",
                "camera": "string",
                "confidence": 0.95
            }
        ]
    }
}
```

### 1.7 Get Registered Faces
**Endpoint:** `GET /api/registered-faces`

**Description:** Lists all registered faces.

**Response:**
```json
{
    "success": true,
    "faces": [
        {
            "name": "string",
            "image_url": "string"
        }
    ]
}
```

### 1.8 Health Check
**Endpoint:** `GET /api/health`

**Description:** Checks API server health status.

**Response:**
```json
{
    "status": "healthy",
    "scanner_active": true,
    "timestamp": 1234567890
}
```

## 2. Legacy API

### 2.1 Register User
**Endpoint:** `POST /api/register`

**Description:** Registers a new user with face recognition.

**Request:**
```http
POST /api/register
Content-Type: multipart/form-data

Parameters:
- name: string (required)
- image: image file (required)
```

**Response:**
```json
{
    "success": true,
    "name": "string"
}
```

### 2.2 Scan Face
**Endpoint:** `POST /api/scan`

**Description:** Scans a face image for recognition.

**Request:**
```http
POST /api/scan
Content-Type: multipart/form-data

Parameters:
- image: image file (required)
```

**Response:**
```json
{
    "status": "recognized|no_face|unknown_face",
    "name": "string",
    "confidence": 0.95
}
```

### 2.3 Get Attendance
**Endpoint:** `GET /api/attendance`

**Description:** Retrieves attendance records.

**Response:**
```json
{
    "total_present": 123,
    "records": [
        {
            "name": "string",
            "time": "string",
            "camera": "string"
        }
    ]
}
```

### 2.4 Get Faces
**Endpoint:** `GET /api/faces`

**Description:** Lists all registered faces.

**Response:**
```json
[
    {
        "name": "string",
        "image_url": "string"
    }
]
```

### 2.5 Ping
**Endpoint:** `GET /api/ping`

**Description:** Checks API availability.

**Response:**
```json
{
    "status": "API is running"
}
```

## 3. Timer API

### 3.1 Clock In
**Endpoint:** `POST /clock-in`

**Description:** Starts a new timer session.

**Response:**
```json
// Success (200)
{
    "status": "success",
    "message": "✓ Timer started"
}

// Error (400)
{
    "status": "error",
    "message": "⚠️ Timer already running"
}
```

### 3.2 Clock Out
**Endpoint:** `POST /clock-out`

**Description:** Stops the current timer session.

**Response:**
```json
// Success (200)
{
    "status": "success",
    "message": "✓ Timer stopped",
    "elapsed_time": "HH:MM:SS.ss"
}

// Error (400)
{
    "status": "error",
    "message": "⚠️ No active timer"
}
```

## Error Handling

### HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Successful operation |
| 400 | Bad request (invalid input, missing parameters) |
| 500 | Internal server error |

### Error Response Format
```json
{
    "detail": "Error message description"
}
```
or
```json
{
    "error": "Error message description"
}
```

## Environment Setup

### Supabase Configuration
1. **Create a Supabase Account**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Sign up or log in to your account
   - Create a new project

2. **Get Your API Keys**
   - In your Supabase project dashboard, go to Project Settings
   - Navigate to API section
   - You will find:
     - Project URL (`SUPABASE_URL`)
     - Project API Key (`SUPABASE_KEY`)
     - Anonymous Key (`ANON_KEY`)
     - Service Role Key (`SUPABASE_SERVICE_KEY`)

3. **Set Up Environment Variables**
   - Create a `.env` file in the `backend` directory
   - Add the following variables:
     ```env
     SUPABASE_URL=your_project_url
     SUPABASE_KEY=your_project_api_key
     ANON_KEY=your_anon_key
     SUPABASE_SERVICE_KEY=your_service_role_key
     BUCKET_NAME=faces
     ```
   - Create a `.env` file in the `frontend` directory
   - Add the following variables:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=your_project_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Important Notes**
   - Never commit `.env` files to version control
   - Keep your service role key secure and never expose it in client-side code
   - The `BUCKET_NAME` is set to "faces" by default for storing face images

## Best Practices

### Image Upload Guidelines
1. Supported formats: JPEG, PNG
2. Ensure good image quality for better face detection
3. Face should be clearly visible and well-lit
4. Avoid extreme angles or occlusions

### API Usage Recommendations
1. Use the Face Recognition API (FastAPI) for new implementations
2. Legacy API is maintained for backward compatibility
3. Monitor the health endpoint for system status
4. Handle errors gracefully in client applications
5. Implement appropriate timeouts for long-running operations

### Security Considerations
1. CORS settings should be restricted in production
2. Implement rate limiting for production deployment
3. Add authentication/authorization for secure endpoints
4. Validate all input parameters
5. Sanitize file uploads

### Performance Tips
1. Optimize image size before upload
2. Use appropriate compression for image transfers
3. Implement caching where applicable
4. Monitor server resources during scanner operation
5. Consider implementing batch operations for multiple records