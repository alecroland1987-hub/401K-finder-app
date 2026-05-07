export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not found' });
  }

  const { prompt } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)?.map(p => p.text)?.join('') || '';

    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
