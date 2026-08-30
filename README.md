# AI Notebook Mobile (Android APK)

An interactive, AI-augmented computational notebook app for Android devices. Execute Python & JavaScript code, write Markdown notes, and generate algorithms using AI directly from your phone.

## ✨ Features
- **Local Python & JS Execution**: Runs Python (via Pyodide WASM) and JavaScript directly in your Android environment.
- **AI Assisted Cells**: Prompt the AI to generate code, data visualizations, and algorithms.
- **Mobile Optimized Interface**: Built with touchscreen controls, safe-area headers, and bottom quick-actions.
- **Jupyter (.ipynb) Export**: Export your notebooks to standard Jupyter format at any time.

## 🚀 How to Download the APK
1. Go to the **Actions** tab of this repository on GitHub.
2. Click on the latest workflow run ("Build Android APK").
3. Download the artifact: **`AI-Notebook-Mobile-APK`**.
4. Unzip and install `app-debug.apk` on your Android phone.

## 🛠️ Automated CI/CD Workflow
Every push to the `main` or `master` branch automatically triggers the GitHub Actions workflow in `.github/workflows/build-apk.yml` to compile and publish the latest Android APK artifact.
