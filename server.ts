import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. AI Pandal Assistant & Route Planner endpoint
app.post('/api/ai/pandal-assistant', async (req, res) => {
  const fallbackReplies: Record<string, string> = {
    bn: "নমস্কার! আমি শারদ মিত্র, আপনার ত্রিপুরা দুর্গাপূজার এআই পরিক্রমা সহায়ক। আজ পশ্চিম ত্রিপুরায় ভারত রত্ন সংঘ ও শান্তিপাড়া ক্লাবের চোখ ধাঁধানো থিম এবং উদয়পুর টাউন ক্লাবের টেরাকোটা স্থাপত্য অবশ্যই দর্শনীয়! মেলারমাঠ ও ঊষা বাজারে রয়েছে সুস্বাদু খাবার স্টল।",
    kok: "Khulumkha! Ang Sharod Mitra, nini Tripura Durga Puja ni AI guide. Bharat Ratna Sangha, Udaipur Town Club tei Netaji Play Forum pandal rwk! Kaham chakhum tei restaurant no explore khlaidi.",
    hi: "नमस्ते! मैं 'शारद मित्र' हूँ, आपका त्रिपुरा दुर्गा पूजा एआई गाइड। अगरतला के भारत रत्न संघ, शांतिपारा क्लब और उदयपुर टाउन क्लब के भव्य पंडाल अवश्य देखें! निकटतम प्रसिद्ध भोजन व मिठाइयों की जानकारी के लिए कार्ड पर टैप करें।",
    en: "Greetings! I am Sharod Mitra, your Tripura Durga Puja AI Guide. Top recommended spots today: Bharat Ratna Sangha (Usha Bazar) for mega architecture, Udaipur Town Club for terracotta heritage, and Netaji Play Forum for tribal bamboo art! Enjoy authentic street food nearby."
  };

  try {
    const { prompt, lang = 'bn', currentPandal } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      return res.json({ reply: fallbackReplies[lang] || fallbackReplies.bn });
    }

    const languagePrompt = lang === 'kok' 
      ? 'Kokborok language (use clear latin or bengali script as understood in Tripura)' 
      : lang === 'hi' 
      ? 'Hindi' 
      : lang === 'en' 
      ? 'English' 
      : 'Bengali';

    const systemInstruction = `You are "শারদ মিত্র" (Sharod Mitra / Durga AI), an elite cultural guide, pandal hopper assistant, and culinary advisor for Tripura Durga Puja 2026.
You provide helpful, concise advice (under 130 words) on:
- Best pandals to visit in Agartala, Udaipur, Dharmanagar, and Khowai
- Live crowd mitigation and best timing (early evening vs late night)
- Famous local restaurants & street food (e.g. Shankar Hotel, Kurry Club, Abhishek Sweets, Udaipur Matabari Peda)
- Cultural context: Tripura royal Manikya legacy, tribal bamboo-cane art, and Kumartuli idols.
Current pandal context if any: ${currentPandal || 'Tripura General'}.
Language to reply in: ${languagePrompt}.
Be courteous, culturally authentic, and enthusiastic!`;

    const callPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI response timed out')), 4500)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);
    res.json({ reply: response.text || fallbackReplies[lang] || fallbackReplies.bn });
  } catch (err: any) {
    console.error("Gemini API notice:", err?.message || err);
    const lang = req.body?.lang || 'bn';
    res.json({ 
      reply: fallbackReplies[lang] || fallbackReplies.bn
    });
  }
});

// 2. Sponsor inquiry & advertising lead capture endpoint
app.post('/api/sponsor-inquiry', (req, res) => {
  const { name, phone, brandName, budget, message } = req.body;
  console.log("New sponsor inquiry received:", { name, phone, brandName, budget, message });
  res.json({ 
    success: true, 
    message: 'ধন্যবাদ! ত্রিপুরা শারদোৎসব স্পনসরশিপ টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।' 
  });
});

// 3. Live website footfalls counter
let totalFootfalls = 84920;
app.get('/api/footfalls', (_req, res) => {
  totalFootfalls += Math.floor(Math.random() * 3) + 1;
  res.json({ footfalls: totalFootfalls });
});

// 4. In-memory community reviews & ratings store
const pandalReviews: Record<string, Array<{ id: string; author: string; rating: number; comment: string; date: string }>> = {
  'bharat-ratna': [
    { id: '1', author: 'Debabrata Debbarma', rating: 5, comment: 'মায়াপুরের বৈদিক মন্দিরের রেপ্লিকা অপূর্ব! চন্দননগরের লাইটিং মন ছুঁয়ে গেছে।', date: 'মহা সপ্তমী' },
    { id: '2', author: 'Anamika Roy', rating: 5, comment: 'বিশাল ভিড় ছিল কিন্তু শৃঙ্খলা প্রশংসনীয়। ১৮ ফুটের মৃন্ময়ী প্রতিমা অনবদ্য!', date: 'মহা অষ্টমী' }
  ],
  'udaipur-town-club': [
    { id: '3', author: 'Shibaji Saha', rating: 5, comment: 'বিষ্ণুপুরের টেরাকোটা মন্দির নিখুঁতভাবে ফুটিয়ে তোলা হয়েছে। মাতাবাড়ির পেঁড়া প্রসাদ দারুণ!', date: 'মহা ষষ্ঠী' }
  ],
  'shanti-para-club': [
    { id: '4', author: 'Pritam Das', rating: 5, comment: 'শীশ মহলের কাঁচের কাজ ও ঝাড়বাতি রাজকীয়! রাতে লাইট শো দেখার মতো।', date: 'মহা সপ্তমী' }
  ]
};

app.get('/api/reviews/:pandalId', (req, res) => {
  const { pandalId } = req.params;
  res.json({ reviews: pandalReviews[pandalId] || [] });
});

app.post('/api/reviews', (req, res) => {
  const { pandalId, author, rating, comment } = req.body;
  if (!pandalId || !author || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!pandalReviews[pandalId]) {
    pandalReviews[pandalId] = [];
  }

  const newReview = {
    id: Date.now().toString(),
    author: author.trim(),
    rating: Number(rating) || 5,
    comment: comment.trim(),
    date: 'আজ (Just now)'
  };

  pandalReviews[pandalId].unshift(newReview);
  res.json({ success: true, review: newReview });
});

// 5. Active scrollable sponsor ads endpoint
const sponsorAds = [
  {
    id: 'ad1',
    brand: 'Prantika Hyundai Agartala',
    tag: 'অটোমোবাইল পার্টনার',
    headline: 'শারদীয় অফারে নতুন গাড়িতে ₹৫০,০০০ পর্যন্ত সাশ্রয়!',
    cta: 'টেস্ট ড্রাইভ বুক করুন',
    link: 'tel:03812341234',
    bgGradient: 'from-blue-900 to-indigo-900'
  },
  {
    id: 'ad2',
    brand: 'Tripura Gramin Bank',
    tag: 'ব্যাংকিং পার্টনার',
    headline: 'উৎসব মৌসুমে বিশেষ হোম লোন ও গোল্ড লোনে ০% প্রসেসিং ফি।',
    cta: 'বিস্তারিত জানুন',
    link: 'https://wa.me/919436124510',
    bgGradient: 'from-amber-900 to-red-950'
  },
  {
    id: 'ad3',
    brand: 'AarviSphere Media Studio',
    tag: 'ভিডিও ও ফটোগ্রাফি',
    headline: 'আপনার ক্লাবের প্যান্ডেলের 4K সিনেমাটিক ড্রোন কভারেজ বুক করুন।',
    cta: 'YouTube দেখুন',
    link: 'https://www.youtube.com/@aarvisphere',
    bgGradient: 'from-red-950 to-festive-deepCrimson'
  },
  {
    id: 'ad4',
    brand: 'Matabari Sweets & Peda Udaipur',
    tag: 'খাবার পার্টনার',
    headline: 'উদয়পুরের বিখ্যাত খাঁটি গাওয়া ঘিয়ে তৈরি পেঁড়া হোম ডেলিভারি।',
    cta: 'অর্ডার করুন',
    link: 'https://m.rapido.bike',
    bgGradient: 'from-orange-950 to-amber-900'
  }
];

app.get('/api/ads', (_req, res) => {
  res.json({ ads: sponsorAds });
});

// 6. Real-time background crowd status store & update endpoint
const crowdOverrides: Record<string, { crowdStatus: string; crowdLevel: string; lastUpdated: string }> = {};

app.get('/api/crowd-status', (_req, res) => {
  res.json({ overrides: crowdOverrides });
});

app.post('/api/crowd-status', (req, res) => {
  const { pandalId, crowdStatus, crowdLevel } = req.body;
  if (!pandalId || !crowdStatus || !crowdLevel) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  crowdOverrides[pandalId] = {
    crowdStatus,
    crowdLevel,
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };
  res.json({ success: true, updated: crowdOverrides[pandalId] });
});

// 7. Community Photo Contest endpoint
interface PhotoEntry {
  id: number;
  title: string;
  pandal: string;
  author: string;
  image: string;
  votes: number;
}

const photoEntries: PhotoEntry[] = [
  { id: 1, title: 'Mayapur Planetarium Dome', pandal: 'Bharat Ratna Sangha', author: 'Debabrata D.', image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80', votes: 154 },
  { id: 2, title: 'Golden Terracotta Idol', pandal: 'Udaipur Town Club', author: 'Priya Saha', image: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=600&q=80', votes: 142 },
  { id: 3, title: 'Sheesh Mahal Mirror Magic', pandal: 'Shanti Para Pragati Sangha', author: 'Anirban R.', image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80', votes: 110 }
];

app.get('/api/photos', (_req, res) => {
  res.json({ photos: photoEntries });
});

app.post('/api/photos', (req, res) => {
  const { title, pandal, author, image } = req.body;
  if (!title || !pandal || !image) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const newEntry: PhotoEntry = {
    id: Date.now(),
    title,
    pandal,
    author: author || 'Devotee',
    image,
    votes: 1
  };
  photoEntries.unshift(newEntry);
  res.json({ success: true, entry: newEntry });
});

app.post('/api/photos/vote', (req, res) => {
  const { id } = req.body;
  const target = photoEntries.find(p => p.id === Number(id));
  if (target) {
    target.votes += 1;
    return res.json({ success: true, votes: target.votes });
  }
  res.status(404).json({ error: 'Photo not found' });
});


async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const distExists = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || (distExists && process.env.NODE_ENV !== 'development');

  if (isProduction) {
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Development] Initializing Vite middleware mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
