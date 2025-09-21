import http from 'http';
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const PROJECT = '756307450344';
const LOCATION = 'us-central1';
const DEFAULT_MODEL = 'projects/756307450344/locations/us-central1/endpoints/1417678407017168896';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

function json(res: http.ServerResponse, status: number, body: any) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

async function handleGenerate(prompt: string, model?: string, location?: string) {
  const mdl = model || DEFAULT_MODEL;
  const loc = location || LOCATION;
  const token = await auth.getAccessToken();

  const body = {
    contents: [
      { role: 'user', parts: [ { text: prompt || '' } ] }
    ],
    generationConfig: { temperature: 1, topP: 0.95, maxOutputTokens: 65535 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' }
    ]
  };

  // First try Vertex AI (aiplatform)
  const urlA = `https://${loc}-aiplatform.googleapis.com/v1/${mdl}:generateContent`;
  let resp = await fetch(urlA, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROJECT,
    },
    body: JSON.stringify(body)
  });

  // If that fails (e.g., API not enabled for this path), try firebasevertexai endpoint
  if (!resp.ok) {
    const urlB = `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT}/models/${encodeURIComponent(mdl)}:generateContent`;
    resp = await fetch(urlB, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-goog-user-project': PROJECT,
      },
      body: JSON.stringify(body)
    });
  }

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Vertex returned ${resp.status}: ${errTxt}`);
  }

  const data = await resp.json().catch(() => ({}));
  // Try to extract text from typical generative response shapes
  let text = '';
  try {
    text = (data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join(' ')) || '';
  } catch {}
  try {
    if (!text && typeof data?.response?.text === 'function') {
      text = await data.response.text();
    }
  } catch {}
  return { text, raw: data };
}

const server = http.createServer(async (req, res) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    if (req.url === '/api/generate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          const { prompt, model, location } = jsonBody || {};
          const result = await handleGenerate(String(prompt || ''), model, location);
          return json(res, 200, { text: result.text });
        } catch (e: any) {
          console.error('Server /api/generate error:', e);
          return json(res, 500, { error: e?.message || 'Server error' });
        }
      });
      return;
    }

    if (req.url === '/healthz') {
      return json(res, 200, { ok: true });
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (e: any) {
    console.error('Server error:', e);
    return json(res, 500, { error: e?.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
