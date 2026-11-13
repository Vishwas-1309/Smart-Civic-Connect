// test-gemini.mjs — Standalone script to test Gemini 2.5 Flash civic classification in VS Code
// Run in VS Code Terminal: node test-gemini.mjs

// Insert your key here or pass as environment variable: set GEMINI_API_KEY=AIza...
const API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const sampleIssue = "There is a dead animal floating in the Central Park pond causing terrible water pollution and odor.";

async function runGeminiClassification(userText) {
  console.log("Analyzing issue with Gemini 2.5 Flash...\n");
  console.log("Input:", userText);
  console.log("-----------------------------------------");

  if (API_KEY === "YOUR_GEMINI_API_KEY") {
    console.log("⚠️ Notice: Please replace YOUR_GEMINI_API_KEY with your actual Google Gemini API key to run a live test.");
    console.log("Simulating expected structured JSON output:\n");
    const simulated = {
      category: "Sanitation",
      subcategory: "Biomedical waste & dead animals",
      severity: "High",
      department: "Sanitation & Solid Waste Management",
      keywords: ["dead animal", "pond", "water pollution"],
      location_clue: "Central Park",
      summary: "High-priority sanitary hazard with water pollution detected in public park pond."
    };
    console.log(JSON.stringify(simulated, null, 2));
    return;
  }

  const systemInstruction = `You are Smart Civic Connect's civic issue classifier. Classify the user's issue into one of: 'public-infra' (Infrastructure), 'street-lighting' (Lighting), 'water-drainage' (Water/Drainage), 'sanitation' (Sanitation), 'traffic-safety' (Traffic), 'accessibility' (Accessibility), 'environmental' (Environmental), 'encroachment' (Encroachment), or 'property-damage' (Property).
Determine subcategory, severity ('Normal', 'High', or 'Urgent'), department, concise title, keywords array, location_clue, and a 1-sentence summary.
Return ONLY a valid JSON object matching:
{"category": string, "subcategory": string, "severity": string, "department": string, "title": string, "summary": string, "keywords": string[], "location_clue": string}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      { parts: [{ text: userText }] }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error(`Gemini API returned HTTP ${response.status}`);
    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const rawJson = data.candidates[0].content.parts[0].text;
      console.log("✅ Live Gemini Response:\n");
      console.log(JSON.stringify(JSON.parse(rawJson), null, 2));
    } else {
      console.log("Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error reaching Gemini API:", error.message);
  }
}

runGeminiClassification(sampleIssue);
