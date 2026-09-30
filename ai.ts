import type { DialectWord, FolkStory, HeritageEntry } from "@/db/schema";

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && key.trim().length > 10 && !key.includes("your_"));
}

export interface VoiceAnalysisResult {
  originalTranscript: string;
  standardTranslation: string;
  englishTranslation: string;
  marathiTranslation: string;
  kannadaTranslation: string;
  hindiTranslation: string;
  summary: string;
  category: string;
  keywords: string[];
  mode: "groq-live" | "demo-fallback";
}

export interface TranslationResult {
  sourceLanguage: string;
  originalText: string;
  translations: {
    localDialect: string;
    marathi: string;
    kannada: string;
    hindi: string;
    english: string;
  };
  phoneticNotes: string;
  culturalContext: string;
  mode: "groq-live" | "demo-fallback";
}

const SAMPLE_VOICE_PRESETS: Record<string, Omit<VoiceAnalysisResult, "mode">> = {
  konkan_water: {
    originalTranscript:
      "आमच्या गावच्या देवराईत उंबराच्या मुळाशी जो झरा आसा, तो उन्हाळ्यात सुद्धा कधी आटत नाय. जुने जाणते सांगतत की झाडं वाचवली तरच पाणी वाचतला.",
    standardTranslation:
      "आमच्या गावातील देवराईत उंबराच्या झाडाखाली जो पाण्याचा झरा आहे, तो उन्हाळ्यातही कधी आटत नाही. पूर्वज सांगतात की झाडे वाचवली तरच पाणी टिकेल.",
    englishTranslation:
      "The freshwater spring beneath the sacred cluster-fig tree in our village Devrai grove never dries up, even in peak summer. Our elders teach that only by protecting the forest can water endure.",
    marathiTranslation:
      "आमच्या गावातील देवराईत उंबराच्या झाडाखाली असलेला पाण्याचा झरा उन्हाळ्यातही आटत नाही. झाडे जपली तरच पाणी टिकेल असा पूर्वजांचा संदेश आहे.",
    kannadaTranslation:
      "ನಮ್ಮ ಗ್ರಾಮದ ದೇವರ ಕಾಡಿನಲ್ಲಿರುವ ಅತ್ತಿ ಮರದ ಬುಡದ ನೀರಿನ ಬುಗ್ಗೆ ಬೇಸಿಗೆಯಲ್ಲೂ ಬತ್ತುವುದಿಲ್ಲ. ಮರಗಳನ್ನು ಉಳಿಸಿದರೆ ಮಾತ್ರ ನೀರು ಉಳಿಯುತ್ತದೆ ಎಂದು ಹಿರಿಯರು ಹೇಳುತ್ತಾರೆ.",
    hindiTranslation:
      "हमारे गाँव के पवित्र वन (देवराई) में गूलर के पेड़ के नीचे जो जलस्रोत है, वह गर्मियों में भी कभी नहीं सूखता। बुजुर्ग कहते हैं कि पेड़ बचेंगे तभी पानी बचेगा।",
    summary:
      "Oral testimony in Malvani/Konkani dialect documenting indigenous watershed conservation through sacred forest groves (Devrai) and reverence for cluster-fig (Umbar) aquifers.",
    category: "Ecology & Sacred Groves",
    keywords: [
      "देवराई (Devrai)",
      "जलसंधारण (Water Conservation)",
      "उंबर (Cluster Fig)",
      "कोकण (Konkan)",
      "Oral Ecology",
    ],
  },
  dharwad_harvest: {
    originalTranscript:
      "ಸುಗ್ಗಿ ಬಂತು ಅಣ್ಣಾ, ಹೊಲದಾಗ ಜೋಳದ ತೆನೆ ಮುತ್ತಿನಂಗೆ ತೂಗಾಡತೈತಿ. ಎತ್ತುಗಳಿಗೆ ಅರಿಶಿಣ ಕುಂಕುಮ ಹಚ್ಚಿ ಭೂಮಿ ತಾಯಿಗೆ ನಮಸ್ಕಾರ ಮಾಡೋಣ ಬಾ.",
    standardTranslation:
      "सुगीचा सण आला आहे दादा, शेतात ज्वारीची कणसे मोत्यासारखी डोलत आहेत. बैलांना हळद-कुंकू लावून काळ्या आईला वंदन करूया.",
    englishTranslation:
      "The harvest season has arrived, brother; the sorghum ears sway like pearls across the fields. Let us anoint our bullocks with turmeric and vermilion and bow in gratitude to Mother Earth.",
    marathiTranslation:
      "सुगीचे दिवस आले आहेत, शेतात ज्वारीची कणसे मोत्यांसारखी डोलत आहेत. बैलांची पूजा करून धरतीमातेला वंदन करूया.",
    kannadaTranslation:
      "ಸುಗ್ಗಿಯ ಹಬ್ಬ ಬಂದಿದೆ, ಹೊಲದಲ್ಲಿ ಜೋಳದ ತೆನೆಗಳು ಮುತ್ತಿನಂತೆ ತೂಗಾಡುತ್ತಿವೆ. ಎತ್ತುಗಳಿಗೆ ಅರಿಶಿಣ-ಕುಂಕುಮ ಹಚ್ಚಿ ಭೂಮಿತಾಯಿಗೆ ವಂದಿಸೋಣ.",
    hindiTranslation:
      "फसल कटने का उत्सव आ गया है भाई, खेतों में ज्वार की बालियाँ मोतियों की तरह झूम रही हैं। आओ बैलों को हल्दी-कुमकुम लगाकर धरती माता को प्रणाम करें।",
    summary:
      "North Karnataka (Dharwad Janapada) harvest chant celebrating pearl-like sorghum crops, cattle thanksgiving rituals, and reverence for agricultural soil.",
    category: "Farming & Harvest",
    keywords: [
      "ಸುಗ್ಗಿ (Harvest)",
      "ಜೋಳ (Sorghum)",
      "Janapada Kannada",
      "Farming Ritual",
      "Dharwad",
    ],
  },
  ahirani_proverb: {
    originalTranscript:
      "पाणी जिरंल तं शिवार हिरवं राहील, अन वडिलांची बोली टिकली तं गावची ओळख राहील.",
    standardTranslation:
      "पाणी जमिनीत मुरले तरच शेतशिवार हिरवेगार राहील, आणि पूर्वजांची मायबोली टिकली तरच गावाची सांस्कृतिक ओळख जिवंत राहील.",
    englishTranslation:
      "When rainwater percolates into the earth, the fields remain green; when the ancestral dialect endures on the tongue, the soul and identity of the village remain alive.",
    marathiTranslation:
      "पाणी जमिनीत मुरले तर शिवार हिरवे राहील आणि पूर्वजांची बोली टिकली तरच गावाची सांस्कृतिक ओळख राहील.",
    kannadaTranslation:
      "ಮಳೆ ನೀರು ಇಂಗಿದರೆ ಹೊಲ ಹಸಿರಾಗಿರುತ್ತದೆ, ಹಿರಿಯರ ಆಡುಭಾಷೆ ಉಳಿದರೆ ಮಾತ್ರ ಊರಿನ ಗುರುತು ಉಳಿಯುತ್ತದೆ.",
    hindiTranslation:
      "यदि पानी मिट्टी में समाएगा तो खेत हरे-भरे रहेंगे, और यदि पूर्वजों की बोली बचेगी तभी गाँव की पहचान जीवित रहेगी।",
    summary:
      "An Ahirani/Deccan proverb drawing a poetic parallel between groundwater recharge for agricultural survival and native dialect preservation for cultural continuity.",
    category: "Ancestral Wisdom",
    keywords: [
      "अहिराणी (Ahirani)",
      "मायबोली (Dialect)",
      "जलसंधारण (Water Recharge)",
      "म्हण (Proverb)",
      "Khandesh",
    ],
  },
};

export async function callGroqChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (!isGroqConfigured()) return null;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function transcribeAudioWithGroq(
  audioBuffer: Buffer,
  filename: string
): Promise<string | null> {
  if (!isGroqConfigured()) return null;

  try {
    const formData = new FormData();
    const uint8 = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8], { type: "audio/webm" });
    formData.append("file", blob, filename || "recording.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.text || null;
  } catch {
    return null;
  }
}

export async function analyzeVoiceOrText(options: {
  transcript?: string;
  presetKey?: string;
  region?: string;
  dialect?: string;
  audioBuffer?: Buffer;
  filename?: string;
}): Promise<VoiceAnalysisResult> {
  let rawTranscript = options.transcript?.trim() || "";

  if (!rawTranscript && options.audioBuffer && isGroqConfigured()) {
    const whisperText = await transcribeAudioWithGroq(
      options.audioBuffer,
      options.filename || "voice.webm"
    );
    if (whisperText) {
      rawTranscript = whisperText;
    }
  }

  // If Groq is configured and we have a transcript, use Groq LLM for full cultural analysis
  if (isGroqConfigured() && rawTranscript) {
    const systemPrompt = `You are HeritageVoice AI, an expert ethnolinguist and Indian regional dialect archivist specializing in Konkani, Malvani, Marathi, Kannada, Havyaka, Tulu, Ahirani, and Hindi dialects.
Return a strict JSON object with these keys:
- "originalTranscript": string (keep original text intact)
- "standardTranslation": string (Standard Marathi or Kannada translation)
- "englishTranslation": string (accurate scholarly English translation)
- "marathiTranslation": string (Marathi translation in Devanagari script)
- "kannadaTranslation": string (Kannada translation in Kannada script)
- "hindiTranslation": string (Hindi translation in Devanagari script)
- "summary": string (2-sentence cultural & archival summary)
- "category": string (one of: "Ecology & Sacred Groves", "Farming & Harvest", "Maritime Lore", "Ancestral Wisdom", "Seasonal Rituals", "Folk Music & Ballads", "Culinary Heritage")
- "keywords": array of 5 strings`;

    const userPrompt = `Analyze this regional dialect recording from region "${
      options.region || "Konkan & Sahyadri"
    }" (${options.dialect || "Local Dialect"}):\n\n"${rawTranscript}"`;

    const groqJson = await callGroqChat(systemPrompt, userPrompt);
    if (groqJson) {
      try {
        const parsed = JSON.parse(groqJson);
        return {
          originalTranscript: parsed.originalTranscript || rawTranscript,
          standardTranslation:
            parsed.standardTranslation || parsed.marathiTranslation || "",
          englishTranslation: parsed.englishTranslation || "",
          marathiTranslation: parsed.marathiTranslation || "",
          kannadaTranslation: parsed.kannadaTranslation || "",
          hindiTranslation: parsed.hindiTranslation || "",
          summary: parsed.summary || "",
          category: parsed.category || "Ancestral Wisdom",
          keywords: Array.isArray(parsed.keywords)
            ? parsed.keywords
            : ["Dialect", "Oral History"],
          mode: "groq-live",
        };
      } catch {
        // Fallback below
      }
    }
  }

  // Deterministic Demo Fallback Mode
  const preset =
    (options.presetKey && SAMPLE_VOICE_PRESETS[options.presetKey]) || null;

  if (preset && !rawTranscript) {
    return {
      ...preset,
      mode: "demo-fallback",
    };
  }

  if (rawTranscript) {
    // Intelligent fallback analysis of user-supplied transcript
    const lower = rawTranscript.toLowerCase();
    let category = "Ancestral Wisdom";
    const keywords: string[] = [];

    if (
      lower.includes("पाणी") ||
      lower.includes("देवराई") ||
      lower.includes("झाड") ||
      lower.includes("barav") ||
      lower.includes("water") ||
      lower.includes("grove")
    ) {
      category = "Ecology & Sacred Groves";
      keywords.push("देवराई (Sacred Grove)", "जलसंधारण (Water)", "पर्यावरण (Ecology)");
    } else if (
      lower.includes("शेत") ||
      lower.includes("पाऊस") ||
      lower.includes("सुगी") ||
      lower.includes("बैल") ||
      lower.includes("ಬೆಳೆ") ||
      lower.includes("ಸುಗ್ಗಿ") ||
      lower.includes("harvest") ||
      lower.includes("farm")
    ) {
      category = "Farming & Harvest";
      keywords.push("शेती (Agriculture)", "सुगी (Harvest)", "मान्सून (Monsoon)");
    } else if (
      lower.includes("दर्या") ||
      lower.includes("होडी") ||
      lower.includes("मासे") ||
      lower.includes("sea")
    ) {
      category = "Maritime Lore";
      keywords.push("दर्या (Coastal Sea)", "मच्छीमार (Maritime)", "किणारा (Coast)");
    } else {
      keywords.push("लोकसंस्कृती (Folklore)", "मायबोली (Dialect)", "मौखिक परंपरा (Oral Tradition)");
    }

    keywords.push(options.region || "Konkan & Sahyadri", options.dialect || "Regional Dialect");

    return {
      originalTranscript: rawTranscript,
      standardTranslation: `प्रमाण मराठी रूपांतर (${options.region || "स्थानिक विभाग"}): ${rawTranscript}`,
      englishTranslation: `Archival English Translation: "${rawTranscript}" — An oral community expression from ${
        options.region || "Western & Southern India"
      } preserving traditional village knowledge, seasonal customs, and ancestral values.`,
      marathiTranslation: `मराठी भाषांतर: ${rawTranscript} (पारंपरिक लोकपरंपरेतील मौखिक नोंद).`,
      kannadaTranslation: `ಕನ್ನಡ ಅನುವಾದ: ಈ ಸ್ಥಳೀಯ ಜಾನಪದ ನುಡಿಗಟ್ಟು ಗ್ರಾಮೀಣ ಸಂಸ್ಕೃತಿ ಮತ್ತು ಹಿರಿಯರ ಅನುಭವವನ್ನು ವ್ಯಕ್ತಪಡಿಸುತ್ತದೆ (${rawTranscript}).`,
      hindiTranslation: `हिन्दी अनुवाद: "${rawTranscript}" — यह क्षेत्रीय लोक-बोली का कथन ग्रामीण परंपरा और पूर्वजों के अनुभव को दर्शाता है।`,
      summary: `Recorded ${options.dialect || "regional dialect"} oral testimony from ${
        options.region || "Konkan & Sahyadri"
      } categorized under ${category}, documenting grassroots linguistic expressions for community preservation.`,
      category,
      keywords: Array.from(new Set(keywords)).slice(0, 6),
      mode: "demo-fallback",
    };
  }

  return {
    ...SAMPLE_VOICE_PRESETS.konkan_water,
    mode: "demo-fallback",
  };
}

export async function translateCulturalContent(options: {
  text: string;
  sourceLanguage: string;
  region?: string;
}): Promise<TranslationResult> {
  const cleanText = options.text.trim();

  if (isGroqConfigured() && cleanText) {
    const systemPrompt = `You are HeritageVoice AI's multilingual cultural translator for Indian dialects (Malvani, Konkani, Ahirani, Tulu, Havyaka) and standard languages (Marathi, Kannada, Hindi, English).
Never overwrite or alter the original text. Return a strict JSON object with:
- "localDialect": string (expressive rendering in regional Konkani/Malvani/Janapada dialect)
- "marathi": string (natural Marathi translation in Devanagari)
- "kannada": string (natural Kannada translation in Kannada script)
- "hindi": string (natural Hindi translation in Devanagari)
- "english": string (precise cultural English translation)
- "phoneticNotes": string (IPA or pronunciation guide for key terms)
- "culturalContext": string (brief ethnolinguistic note explaining idioms or cultural terms)`;

    const userPrompt = `Source language: ${options.sourceLanguage} (Region: ${
      options.region || "Konkan & Karnataka"
    })\nOriginal Text: "${cleanText}"`;

    const groqJson = await callGroqChat(systemPrompt, userPrompt);
    if (groqJson) {
      try {
        const parsed = JSON.parse(groqJson);
        return {
          sourceLanguage: options.sourceLanguage,
          originalText: cleanText,
          translations: {
            localDialect: parsed.localDialect || cleanText,
            marathi: parsed.marathi || cleanText,
            kannada: parsed.kannada || cleanText,
            hindi: parsed.hindi || cleanText,
            english: parsed.english || cleanText,
          },
          phoneticNotes:
            parsed.phoneticNotes || "/ɡɑːʋ.ɾɑːn/ • Regional prosodic cadence preserved",
          culturalContext:
            parsed.culturalContext ||
            "Original dialect phrasing preserved alongside quad-lingual archival translations.",
          mode: "groq-live",
        };
      } catch {
        // Fallback below
      }
    }
  }

  // Built-in rich translations for known phrases + dynamic fallback for custom text
  const knownTranslations: Record<
    string,
    {
      localDialect: string;
      marathi: string;
      kannada: string;
      hindi: string;
      english: string;
      phoneticNotes: string;
      culturalContext: string;
    }
  > = {
    default_water: {
      localDialect:
        "आमच्या गावच्या देवराईतलं पाणी आणि जुन्या लोकांची बोली कधी आटूक नको.",
      marathi:
        "आमच्या गावातील देवराईचे पाणी आणि पूर्वजांची मायबोली कधीही आटू नये.",
      kannada:
        "ನಮ್ಮ ಊರಿನ ದೇವರ ಕಾಡಿನ ನೀರು ಮತ್ತು ಹಿರಿಯರ ಆಡುಭಾಷೆ ಎಂದಿಗೂ ಬತ್ತದಿರಲಿ.",
      hindi:
        "हमारे गाँव के पवित्र वन (देवराई) का जल और पूर्वजों की मातृबोली कभी न सूखे।",
      english:
        "May the springwaters of our village sacred grove and the spoken dialect of our elders never run dry.",
      phoneticNotes: "/ɑːm.t͡ʃjɑː ɡɑːʋ.t͡ʃjɑː d̪eːʋ.ɾɑːiː.t̪ə.lɑ̃ pɑːɳiː/",
      culturalContext:
        "Links ecological stewardship ('Devrai' / 'Devara Kadu') with linguistic survival across the Sahyadri-Malnad belt.",
    },
  };

  if (cleanText.includes("देवराई") || cleanText.toLowerCase().includes("sacred grove")) {
    return {
      sourceLanguage: options.sourceLanguage,
      originalText: cleanText,
      translations: knownTranslations.default_water,
      phoneticNotes: knownTranslations.default_water.phoneticNotes,
      culturalContext: knownTranslations.default_water.culturalContext,
      mode: "demo-fallback",
    };
  }

  return {
    sourceLanguage: options.sourceLanguage,
    originalText: cleanText,
    translations: {
      localDialect: `कोकणी / मालवणी बोली: "${cleanText}" (गावरान लहेजा आणि मूळ शब्दसंपदा जपलेली नोंद)`,
      marathi: `प्रमाण मराठी भाषांतर: "${cleanText}" — ग्रामीण लोकसंस्कृती आणि पारंपरिक वारसा अधोरेखित करणारे विधान.`,
      kannada: `ಕನ್ನಡ ಅನುವಾದ: "${cleanText}" — ಗ್ರಾಮೀಣ ಪರಂಪರೆ ಮತ್ತು ಜಾನಪದ ಜ್ಞಾನವನ್ನು ಪ್ರತಿಬಿಂಬಿಸುವ ಸ್ಥಳೀಯ ನುಡಿ.`,
      hindi: `हिन्दी अनुवाद: "${cleanText}" — क्षेत्रीय लोक-परंपरा और सांस्कृतिक विरासत को व्यक्त करने वाला कथन।`,
      english: `English Archival Translation: "${cleanText}" — Traditional community expression preserved with original dialectal nuance.`,
    },
    phoneticNotes:
      "Phonetic Register: Indo-Aryan / Dravidian borderland prosody with retroflex liquids [ɭ] and [ɳ].",
    culturalContext:
      "Original dialect text is strictly preserved without modification; translations provide cross-regional accessibility across Maharashtra and Karnataka.",
    mode: "demo-fallback",
  };
}

export interface GroundedSearchResponse {
  query: string;
  answer: string;
  hasMatches: boolean;
  mode: "groq-live" | "demo-fallback";
  matchedWords: DialectWord[];
  matchedStories: FolkStory[];
  matchedHeritage: HeritageEntry[];
}

export async function performGroundedSearch(
  query: string,
  allWords: DialectWord[],
  allStories: FolkStory[],
  allHeritage: HeritageEntry[]
): Promise<GroundedSearchResponse> {
  const cleanQuery = query.trim();
  const qLower = cleanQuery.toLowerCase();

  // Extract meaningful search tokens (ignoring common English stop words)
  const stopWords = new Set([
    "show",
    "me",
    "find",
    "what",
    "does",
    "this",
    "the",
    "from",
    "near",
    "related",
    "to",
    "are",
    "is",
    "in",
    "of",
    "and",
    "or",
    "for",
    "about",
    "tell",
    "all",
    "local",
    "area",
    "region",
    "traditional",
    "mean",
    "meaning",
  ]);

  const rawTokens = qLower
    .replace(/[?.,!"]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  // Synonym expansion for common domain queries
  const expandedTerms = new Set<string>(rawTokens);
  if (qLower.includes("festival") || qLower.includes("सण") || qLower.includes("उत्सव")) {
    expandedTerms.add("festival");
    expandedTerms.add("festivals");
    expandedTerms.add("shimga");
    expandedTerms.add("habba");
    expandedTerms.add("pola");
    expandedTerms.add("bendur");
  }
  if (
    qLower.includes("farm") ||
    qLower.includes("harvest") ||
    qLower.includes("crop") ||
    qLower.includes("agriculture") ||
    qLower.includes("शेती")
  ) {
    expandedTerms.add("farming");
    expandedTerms.add("harvest");
    expandedTerms.add("millstone");
    expandedTerms.add("seed");
    expandedTerms.add("sorghum");
    expandedTerms.add("grain");
    expandedTerms.add("agrarian");
    expandedTerms.add("ओवी");
    expandedTerms.add("पेज");
    expandedTerms.add("गावरान");
  }
  if (
    qLower.includes("historical") ||
    qLower.includes("place") ||
    qLower.includes("temple") ||
    qLower.includes("stepwell") ||
    qLower.includes("monument")
  ) {
    expandedTerms.add("historical places");
    expandedTerms.add("stepwell");
    expandedTerms.add("vihir");
    expandedTerms.add("barav");
    expandedTerms.add("grove");
    expandedTerms.add("wada");
  }
  if (
    qLower.includes("word") ||
    qLower.includes("mean") ||
    qLower.includes("dialect") ||
    qLower.includes("dictionary")
  ) {
    expandedTerms.add("gavran");
    expandedTerms.add("devrai");
    expandedTerms.add("pej");
    expandedTerms.add("maand");
    expandedTerms.add("bayalata");
  }
  if (qLower.includes("food") || qLower.includes("dish") || qLower.includes("cuisine")) {
    expandedTerms.add("food");
    expandedTerms.add("modak");
    expandedTerms.add("solkadhi");
    expandedTerms.add("pej");
    expandedTerms.add("shidori");
  }
  if (qLower.includes("song") || qLower.includes("music") || qLower.includes("dance")) {
    expandedTerms.add("song");
    expandedTerms.add("music");
    expandedTerms.add("dance");
    expandedTerms.add("ovi");
    expandedTerms.add("ektari");
    expandedTerms.add("dashavatar");
    expandedTerms.add("bayalata");
  }

  const terms = Array.from(expandedTerms);

  const scoreText = (haystack: string): number => {
    const hLower = haystack.toLowerCase();
    let score = 0;
    if (hLower.includes(qLower) && qLower.length > 3) score += 10;
    for (const term of terms) {
      if (hLower.includes(term)) {
        score += 3;
      }
    }
    return score;
  };

  const matchedWords = allWords
    .map((w) => ({
      item: w,
      score: scoreText(
        `${w.localWord} ${w.meaning} ${w.standardLanguageMeaning} ${w.englishMeaning} ${w.exampleSentence} ${w.region} ${w.dialectName}`
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  const matchedStories = allStories
    .map((s) => ({
      item: s,
      score: scoreText(
        `${s.title} ${s.storyType} ${s.originalText} ${s.englishTranslation} ${s.aiSummary} ${s.category} ${s.region} ${s.keywords}`
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  const matchedHeritage = allHeritage
    .map((h) => ({
      item: h,
      score: scoreText(
        `${h.name} ${h.category} ${h.description} ${h.historicalInfo} ${h.region}`
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  const totalMatches =
    matchedWords.length + matchedStories.length + matchedHeritage.length;

  // STRICT ANTI-HALLUCINATION GUARD: If nothing in DB matches, explicitly state so!
  if (totalMatches === 0) {
    return {
      query: cleanQuery,
      hasMatches: false,
      mode: isGroqConfigured() ? "groq-live" : "demo-fallback",
      answer:
        "The HeritageVoice AI archive does not currently contain enough verified information or community records matching your query. In accordance with our cultural preservation policy, this system never invents or fabricates cultural, linguistic, or historical facts. You can help expand the archive by contributing verified oral histories, dialect words, or heritage records.",
      matchedWords: [],
      matchedStories: [],
      matchedHeritage: [],
    };
  }

  // Build context strictly from matched records
  const contextSnippet = [
    ...matchedWords
      .slice(0, 4)
      .map(
        (w) =>
          `[Dialect Word] "${w.localWord}" (${w.pronunciation}, Region: ${w.region}): ${w.englishMeaning}. Native meaning: ${w.meaning}`
      ),
    ...matchedStories
      .slice(0, 4)
      .map(
        (s) =>
          `[${s.storyType}] "${s.title}" (Category: ${s.category}, Region: ${s.region}): ${s.aiSummary}`
      ),
    ...matchedHeritage
      .slice(0, 4)
      .map(
        (h) =>
          `[Heritage Archive - ${h.category}] "${h.name}" (Region: ${h.region}): ${h.description}`
      ),
  ].join("\n");

  if (isGroqConfigured()) {
    const systemPrompt = `You are HeritageVoice AI's Archival Search Assistant.
CRITICAL RULE: Answer the user's question ONLY using the provided database records. Do NOT invent cultural facts, dates, or words outside the context. If the context only partially answers the query, summarize what IS in the archive and clearly state what is not covered. Return JSON: { "answer": "your concise, scholarly response citing the exact entry titles/words" }`;

    const userPrompt = `User Question: "${cleanQuery}"\n\nVerified Database Records:\n${contextSnippet}`;
    const groqJson = await callGroqChat(systemPrompt, userPrompt);
    if (groqJson) {
      try {
        const parsed = JSON.parse(groqJson);
        if (parsed.answer) {
          return {
            query: cleanQuery,
            hasMatches: true,
            mode: "groq-live",
            answer: parsed.answer,
            matchedWords: matchedWords.slice(0, 6),
            matchedStories: matchedStories.slice(0, 6),
            matchedHeritage: matchedHeritage.slice(0, 6),
          };
        }
      } catch {
        // Fallback synthesis below
      }
    }
  }

  // Deterministic Grounded Synthesis from matched database records
  const summaryParts: string[] = [];
  summaryParts.push(
    `Based strictly on verified records stored in the HeritageVoice AI database, we found ${totalMatches} matching archival ${
      totalMatches === 1 ? "entry" : "entries"
    }:`
  );

  if (matchedWords.length > 0) {
    const topWords = matchedWords
      .slice(0, 3)
      .map((w) => `"${w.localWord}" (${w.englishMeaning} — ${w.region})`)
      .join("; ");
    summaryParts.push(`• Dialect Dictionary (${matchedWords.length}): ${topWords}.`);
  }

  if (matchedStories.length > 0) {
    const topStories = matchedStories
      .slice(0, 3)
      .map((s) => `"${s.title}" [${s.storyType}, ${s.region}: ${s.aiSummary}]`)
      .join(" ");
    summaryParts.push(`• Oral Literature & Stories (${matchedStories.length}): ${topStories}`);
  }

  if (matchedHeritage.length > 0) {
    const topHeritage = matchedHeritage
      .slice(0, 3)
      .map((h) => `"${h.name}" (${h.category} in ${h.region})`)
      .join("; ");
    summaryParts.push(`• Heritage Archive (${matchedHeritage.length}): ${topHeritage}.`);
  }

  return {
    query: cleanQuery,
    hasMatches: true,
    mode: "demo-fallback",
    answer: summaryParts.join("\n\n"),
    matchedWords: matchedWords.slice(0, 6),
    matchedStories: matchedStories.slice(0, 6),
    matchedHeritage: matchedHeritage.slice(0, 6),
  };
}
