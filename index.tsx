import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { app } from './services/firebaseService';
import { setFirebaseVertexModel } from './services/geminiService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize Vertex AI model with your endpoint at startup, then mount the app
(async () => {
  try {
    const env = (import.meta as any)?.env || {};
    const modelEndpoint = env.VITE_VERTEX_MODEL_ENDPOINT || "projects/756307450344/locations/us-central1/endpoints/1417678407017168896";
    await setFirebaseVertexModel(app, {
      location: 'us-central1',
      modelEndpoint,
      generationConfig: { temperature: 1, topP: 0.95, maxOutputTokens: 65535 },
      // safetySettings omitted here; geminiService will supply defaults via its own dynamic import
    });
  } catch (e) {
    // If dynamic import fails in the browser, the chat will fall back to a mock response.
    console.warn('Vertex model initialization failed. The app will use mock AI until configured.', e);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();

