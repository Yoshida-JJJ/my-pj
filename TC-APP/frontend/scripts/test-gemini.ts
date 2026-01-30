import { config } from 'dotenv';
import path from 'path';

// Load env from frontend/.env.local (assuming that's where keys are)
// We need to resolve the path relative to where we run the script
// If running from root, path is frontend/.env.local
config({ path: path.resolve(process.cwd(), 'frontend/.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY is missing from process.env');
    process.exit(1);
}

console.log('🔑 API Key found:', apiKey.slice(0, 5) + '...');

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error('❌ API Error:', data.error);
            return;
        }

        if (data.models) {
            console.log('✅ Available Models:');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.models.forEach((m: any) => {
                // Filter for likely candidates
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log('⚠️ No models returned.', data);
        }

    } catch (e) {
        console.error('❌ Network/Fetch Error:', e);
    }
}

listModels();
