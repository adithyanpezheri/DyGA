
# Dynamic Image-Based Authentication (DYGA) System

## Overview
The Dynamic Image-Based Authentication (DYGA) System is a secure, user-friendly web application that implements a two-factor authentication mechanism combining traditional username/password login with a personalized image-based sequence. Designed with a modern dark-themed interface, it leverages keyword-driven image grids to enhance security and user engagement. This project is built using vanilla HTML, CSS, and JavaScript, making it lightweight and easy to integrate.

## Features
- **Two-Factor Authentication**:
  - **Primary**: Username and password with SHA-256 hashing.
  - **Secondary**: Selection of a sequence of three images from keyword-based 4x4 grids.
- **Keyword-Based Image Grids**: Users provide a keyword (e.g., "car", "anime", "nature") during registration to generate personalized image sets using Robohash.
- **Secure Storage**: Hashed credentials (username, password, keyword, and image sequence) are stored in browser session storage for the prototype.
- **Professional UI**: Responsive dark theme with hover effects, rounded elements, and clear feedback messages (success/error states).
- **Accessibility**: Keyboard navigation support for image selection.
- **Security Enhancements**:
  - Password, keyword, and sequence data are hashed using the Web Crypto API (SHA-256).
  - Keyword verification ensures grid consistency between registration and login.

## Project Structure
- **`register.html`**: Registration page where users set their username, password, keyword, and image sequence.
- **`login.html`**: Login page for authenticating with credentials and image sequence.

## Prerequisites
- A modern web browser (e.g., Chrome, Firefox, Edge) with JavaScript enabled.
- No external dependencies required; uses vanilla technologies.

## Setup and Installation
1. **Clone or Download**:
   - Clone this repository or download the `register.html` and `login.html` files.
2. **Host Locally**:
   - Use a local server (e.g., `live-server` via npm, Python’s `http.server`, or any static file server) to serve the files. Direct file opening (`file://`) may restrict session storage functionality.
   - Example with Python:
     ```bash
     python -m http.server 8000
     ```
   - Open `http://localhost:8000/register.html` in your browser.
3. **Ensure HTTPS (Optional)**:
   - For production, host on an HTTPS server to leverage secure session storage and Web Crypto API fully.

## Usage
### Registration
1. Open `register.html`.
2. Enter a username, password, and keyword (e.g., "car").
3. Click "Generate Grid" to display a 4x4 grid of keyword-specific images (e.g., `car1.png` to `car16.png`).
4. Select three images in sequence by clicking them (e.g., "1", "5", "10"). The watermark shows the image ID.
5. Click "Register" to save credentials and redirect to the login page.

### Login
1. Open `login.html` (automatically redirected after registration).
2. Enter the same username, password, and keyword used during registration.
3. Click "Login" to verify credentials.
4. Select the same three images in sequence from three consecutive 4x4 grids.
5. Receive "Authentication successful" if all steps match, or "Authentication failed" if incorrect.

## Security Notes
- **Prototype Limitation**: Data is stored in session storage, which is temporary and client-side. For production, use server-side storage with secure database encryption.
- **Keyword**: The keyword enhances personalization but should be treated as a secret in a real system, as it influences grid generation.
- **Hashing**: SHA-256 is used for simplicity; consider salted hashing (e.g., PBKDF2) for production.
## Screenshots

![Screenshot 2025-02-25 101547](https://github.com/user-attachments/assets/c4074f7c-04e1-47be-8e41-c6b3142bb8f6)![Screenshot 2025-02-25 101647](https://github.com/user-attachments/assets/2be5519c-5a63-413e-951a-4d280e80a5e2)

![Screenshot 2025-02-25 101517](https://github.com/user-attachments/assets/1a5fbede-6379-4b6f-8d50-81932bb7aa8a)
![Screenshot 2025-02-25 101502](https://github.com/user-attachments/assets/d1198078-0925-43cd-a28c-46854d208aea)

## Customization
- **Image Source**: Replace Robohash URLs with custom image sets by modifying the `src` attribute in `generateGrid()`.
- **Grid Size**: Adjust `imagePool` and CSS grid properties to change the grid size (e.g., 5x5).
- **Keyword Validation**: Add regex or predefined keyword lists to enforce stronger keywords.

## Future Enhancements
- **Server-Side Integration**: Store credentials in a backend database with secure APIs.
- **Brute-Force Protection**: Add login attempt limits and delays (partially implemented in earlier versions).
- **UI Improvements**: Include progress indicators or tooltips for better user guidance.

## License
This project is open-source and available under the MIT License. Feel free to modify and distribute as needed.

## Contact
For questions or contributions, please reach out via GitHub issues or email.

