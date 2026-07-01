# Run and deploy

eas build --platform android --profile preview
eas env:create --name GEMINI_API_KEY --value {KEY} --environment preview --environment production
eas build --platform android --profile preview --local

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npx expo start`
