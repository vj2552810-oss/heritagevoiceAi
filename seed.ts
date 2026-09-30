import { db } from "@/db";
import { users, dialectWords, folkStories, heritageArchive } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { count, eq } from "drizzle-orm";

let seededPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seededPromise) return seededPromise;
  seededPromise = runSeed().catch((err) => {
    console.error("Seed error:", err);
    seededPromise = null;
  });
  return seededPromise;
}

export async function ensureDemoAccountsValid(): Promise<void> {
  await ensureSeeded();

  const demoSpecs = [
    {
      name: "Dr. Vasudha Kulkarni",
      email: "admin@heritagevoice.ai",
      region: "Konkan & Sahyadri",
      preferredLanguage: "Marathi",
      role: "admin",
      bio: "Chief Ethnolinguist & Digital Heritage Curator. Overseeing dialect lexicons and oral history verification across Western and Southern India.",
    },
    {
      name: "Arjun Sawant",
      email: "arjun@heritagevoice.ai",
      region: "Sindhudurg (Konkan)",
      preferredLanguage: "Marathi",
      role: "user",
      bio: "Field folklorist recording Malvani, Konkani, and Sahyadri agrarian songs and village proverbs.",
    },
    {
      name: "Kaveri Hegde",
      email: "kaveri@heritagevoice.ai",
      region: "Dharwad & Uttara Kannada",
      preferredLanguage: "Kannada",
      role: "user",
      bio: "Oral historian documenting North Karnataka Janapada songs, Havyaka expressions, and temple architecture.",
    },
  ];

  for (const spec of demoSpecs) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, spec.email))
      .limit(1);

    if (!existing) {
      await db.insert(users).values({
        ...spec,
        passwordHash: hashPassword("password123"),
      });
    } else if (
      spec.email === "admin@heritagevoice.ai" &&
      existing.role !== "admin"
    ) {
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, existing.id));
    }
  }
}

export async function verifyOrRepairDemoPassword(
  email: string,
  password: string,
  storedHash: string,
  userId: number
): Promise<boolean> {
  if (verifyPassword(password, storedHash)) {
    return true;
  }
  const isDemoEmail =
    email === "admin@heritagevoice.ai" ||
    email === "arjun@heritagevoice.ai" ||
    email === "kaveri@heritagevoice.ai";
  if (isDemoEmail && password === "password123") {
    const repairedHash = hashPassword("password123");
    await db
      .update(users)
      .set({ passwordHash: repairedHash })
      .where(eq(users.id, userId));
    return true;
  }
  return false;
}

async function runSeed() {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount > 0) return;

  const adminPassword = hashPassword("password123");
  const userPassword = hashPassword("password123");

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        name: "Dr. Vasudha Kulkarni",
        email: "admin@heritagevoice.ai",
        passwordHash: adminPassword,
        region: "Konkan & Sahyadri",
        preferredLanguage: "Marathi",
        role: "admin",
        bio: "Chief Ethnolinguist & Digital Heritage Curator. Overseeing dialect lexicons and oral history verification across Western and Southern India.",
      },
      {
        name: "Arjun Sawant",
        email: "arjun@heritagevoice.ai",
        passwordHash: userPassword,
        region: "Sindhudurg (Konkan)",
        preferredLanguage: "Marathi",
        role: "user",
        bio: "Field folklorist recording Malvani, Konkani, and Sahyadri agrarian songs and village proverbs.",
      },
      {
        name: "Kaveri Hegde",
        email: "kaveri@heritagevoice.ai",
        passwordHash: userPassword,
        region: "Dharwad & Uttara Kannada",
        preferredLanguage: "Kannada",
        role: "user",
        bio: "Oral historian documenting North Karnataka Janapada songs, Havyaka expressions, and temple architecture.",
      },
    ])
    .returning();

  const adminUser = insertedUsers[0];
  const arjunUser = insertedUsers[1];
  const kaveriUser = insertedUsers[2];

  // Seed Dialect Dictionary Words
  await db.insert(dialectWords).values([
    {
      localWord: "गावरान (Gavrān)",
      pronunciation: "/ɡɑːʋ.ɾɑːn/",
      meaning: "मूळ गावची, नैसर्गिक आणि पारंपरिक पद्धतीने टिकवलेली गोष्ट किंवा वाण.",
      standardLanguageMeaning: "मराठी: देशी, अस्सल ग्रामीण, नैसर्गिक वाण (हिंदी: देसी / मूल)",
      englishMeaning: "Indigenous, heirloom, or authentically native to the local village soil and tradition.",
      exampleSentence: "आजीने यंदाच्या पावसाळ्यात गावरान भाताचं बियाणं जपून ठेवलंय.",
      audioUrl: "",
      region: "Konkan & Sahyadri",
      dialectName: "Malvani / Deccan Marathi",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "गजाआड (Gajā'āḍ)",
      pronunciation: "/ɡəd͡ʒɑː.ɑːɖ/",
      meaning: "गावाच्या वेशीबाहेर किंवा डोंगराच्या कुशीत दडलेला जुना ऐतिहासिक ठेवा.",
      standardLanguageMeaning: "मराठी: दुर्लक्षित किंवा आडवळणावर असलेला प्रदेश",
      englishMeaning: "Tucked away beyond the main village trail; secluded ancestral hamlet in the hills.",
      exampleSentence: "गजाआडच्या वाडीत अजूनही जुनी पाण्याची बारव जिवंत आहे.",
      audioUrl: "",
      region: "Konkan & Sahyadri",
      dialectName: "Malvani",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "ಮಳೆಗಾಲದ ಹಬ್ಬ (Maḷegālada Habba / बेळसु)",
      pronunciation: "/beɭə.su/",
      meaning: "शेतात नवे पीक आल्यावर गावदेवतेला अर्पण करायचा पहिला नैवेद्य आणि उत्सव.",
      standardLanguageMeaning: "कन्नड: ಬೆಳೆ ಹಬ್ಬ / मराठी: नवान्न पौर्णिमा (हिंदी: नवान्न उत्सव)",
      englishMeaning: "First-harvest thanksgiving offering made to the guardian deity of the agricultural fields.",
      exampleSentence: "ಹೊಸ ಭತ್ತ ಬಂದ ಮೇಲೆ ಇಡೀ ಊರು ಸೇರಿ ಬೆಳಸು ಹಬ್ಬ ಮಾಡಿದರು.",
      audioUrl: "",
      region: "Dharwad & Uttara Kannada",
      dialectName: "Dharwad / Havyaka Kannada",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "देवराई (Devrāī)",
      pronunciation: "/d̪eːʋ.ɾɑːiː/",
      meaning: "देवाच्या नावाने राखून ठेवलेले अबाधित प्राचीन जंगल जिथे कुऱ्हाड चालवण्यास बंदी असते.",
      standardLanguageMeaning: "मराठी: पवित्र वन / अभयारण्य (कन्नड: ದೇವರ ಕಾಡು / हिंदी: पवित्र उपवन)",
      englishMeaning: "Sacred community-protected forest grove dedicated to a local deity where felling trees is taboo.",
      exampleSentence: "आमच्या गावच्या देवराईत शंभर वर्षांपूर्वीचे उंबराचे आणि नागाचं बन आहे.",
      audioUrl: "",
      region: "Western Ghats (Sahyadri)",
      dialectName: "Konkani / Marathi",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "पेज (Pej / Ganji)",
      pronunciation: "/peːd͡ʒ/",
      meaning: "लाल तांदूळ शिजवून केलेली पौष्टिक पेज, जी सकाळी शेतावर जाण्यापूर्वी मातीच्या मडक्यातून दिली जाते.",
      standardLanguageMeaning: "मराठी: तांदळाची निवळी / पेज (कन्नड: ಗಂಜಿ / हिंदी: मांड या दलिया)",
      englishMeaning: "Warm, nourishing red-rice gruel served in earthen pots before morning agricultural work.",
      exampleSentence: "सकाळची गरम तांदळाची पेज आणि आंब्याचं लोणचं खाल्ल्याशिवाय नांगरणीला जोर येत नाही.",
      audioUrl: "",
      region: "Sindhudurg (Konkan)",
      dialectName: "Malvani / Konkani",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "ಬಯಲಾಟ (Bayalāṭa)",
      pronunciation: "/bəjə.lɑːʈə/",
      meaning: "कापणीनंतर रात्री उघड्या मैदानात दिवटीच्या प्रकाशात चालणारा पौराणिक लोकनाट्य आणि नृत्य प्रकार.",
      standardLanguageMeaning: "कन्नड: ಬಯಲಾಟ ಜಾನಪದ ನಾಟಕ (मराठी: दशावतार / लळित लोकनाट्य)",
      englishMeaning: "Open-air night-long folk theatre combining percussion, classical dialogue, and ritual dance.",
      exampleSentence: "ಸುಗ್ಗಿಯ ರಾತ್ರಿ ಊರಿನ ಕಟ್ಟೆಯ ಮುಂದೆ ಬಯಲಾಟ ನೋಡಲು ಜನ ಸೇರಿದ್ದರು.",
      audioUrl: "",
      region: "Dharwad & Uttara Kannada",
      dialectName: "Janapada Kannada",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "मांड (Māṇḍ)",
      pronunciation: "/mɑːɳɖ/",
      meaning: "गावातील सण, जत्रा आणि पंचायतीसाठी ग्रामस्थांनी एकत्र येण्याची पवित्र जागा.",
      standardLanguageMeaning: "मराठी: गावचा पार किंवा मुख्य चौक (कन्नड: ಊರ ಕಟ್ಟೆ)",
      englishMeaning: "Sacred village commons or central stone platform where elders convene for festivals and oral folklore.",
      exampleSentence: "शिमग्याचा ढोल मांडावर वाजला की सगळी वाडी गोळा होते.",
      audioUrl: "",
      region: "Goa & South Konkan",
      dialectName: "Konkani / Malvani",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "अहिरणी शिदोरी (Ahiraṇī Śidorī)",
      pronunciation: "/ʃi.d̪oː.ɾiː/",
      meaning: "प्रवासात किंवा शेतावर नेण्यासाठी कापडी फडक्यात बांधलेली भाकरी, ठेचा आणि कांद्याची पारंपरिक जेवणाची गाठोडी.",
      standardLanguageMeaning: "मराठी: प्रवासातील भोजन / शिदोरी (हिंदी: सफर का कलेवा)",
      englishMeaning: "Traditional cloth-wrapped meal bundle of pearl-millet flatbread and spiced green chili chutney carried by farmers.",
      exampleSentence: "वडाच्या सावलीला बसून शेतकऱ्यांनी आपली शिदोरी सोडली.",
      audioUrl: "",
      region: "Khandesh & Deccan",
      dialectName: "Ahirani",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      localWord: "कौलाचे घर (Kaulāce Ghar)",
      pronunciation: "/kəu.lɑː.t͡ʃe ɡʱəɾ/",
      meaning: "हाताने थापलेल्या मातीच्या नळीच्या कौलांनी शाकारलेले पारंपरिक उतरत्या छपराचे कोकणी घर.",
      standardLanguageMeaning: "मराठी: कौलारू घर (कन्नड: ಹೆಂಚಿನ ಮನೆ)",
      englishMeaning: "Traditional sloped-roof homestead covered with hand-molded terracotta clay tiles designed for heavy monsoons.",
      exampleSentence: "पावसाची पहिली सर कौलाच्या घरावर पडताच मातीचा सुगंध दरवळला.",
      audioUrl: "",
      region: "Konkan & Sahyadri",
      dialectName: "Malvani",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "pending",
      isSample: true,
    },
    {
      localWord: "ಹಲಗೆ ವಾದ್ಯ (Halage Vādya)",
      pronunciation: "/hələ.ɡe ʋɑːd̪jə/",
      meaning: "ग्रामीण उत्सवात आणि मिरवणुकीत वाजवले जाणारे गोलाकार चामड्याचे पारंपरिक तालवाद्य.",
      standardLanguageMeaning: "कन्नड: ಹಲಗೆ ತಮಟೆ (मराठी: हलगी वाद्य)",
      englishMeaning: "Circular frame drum played with vibrant rhythmic cadences during regional folk processions.",
      exampleSentence: "ಜಾತ್ರೆಯಲ್ಲಿ ಹಲಗೆ ವಾದ್ಯದ ನಾದಕ್ಕೆ ಯುವಕರು ಹೆಜ್ಜೆ ಹಾಕಿದರು.",
      audioUrl: "",
      region: "Dharwad & Uttara Kannada",
      dialectName: "North Karnataka Kannada",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "pending",
      isSample: true,
    },
  ]);

  // Seed Folk Stories, Proverbs, Songs, Legends, Oral Histories
  await db.insert(folkStories).values([
    {
      title: "सात पायऱ्यांची बारव आणि वसुंधरेचा आशीर्वाद (The Legend of the Seven-Step Stone Well)",
      storyType: "Village Legend",
      originalText:
        "कोकणातल्या जुन्या गावात सात पायऱ्यांची काळ्या पाषाणाची बारव आसा. जुने लोक सांगतत की जेव्हा तीन वर्ष दुष्काळ पडलो, तेव्हा गावच्या लोकांनी देवराईतलं एकही झाड तोडलं नाय. उलट उंबराच्या मुळाशी पाणी घातलं आणि गावदेवीची करुणा भाकली. चौथ्या दिवशी बारवेच्या तळातून गोड पाण्याचा झरा फुटलो तो आजतागायत कधी आटलो नाय.",
      standardTranslation:
        "कोकणातील जुन्या गावात सात पायऱ्यांची काळ्या दगडाची विहीर (बारव) आहे. पूर्वज सांगतात की जेव्हा तीन वर्षे दुष्काळ पडला, तेव्हा गावकऱ्यांनी देवराईतील एकही झाड तोडले नाही. चौथ्या दिवशी विहिरीच्या तळातून गोड पाण्याचा झरा फुटला जो आजपर्यंत कधीही आटला नाही.",
      englishTranslation:
        "In an ancient Konkan village stands a black-basalt stepwell of seven tiers. Elders recount that during a three-year drought, villagers refused to fell a single tree in the sacred grove (Devrai), instead watering the roots of the ancient fig tree. On the fourth dawn, a sweet freshwater spring burst through the stone floor and has never run dry since.",
      marathiTranslation:
        "कोकणातील जुन्या गावात सात पायऱ्यांची काळ्या पाषाणाची बारव आहे. दुष्काळातही गावकऱ्यांनी देवराईतील झाडे जपली आणि चौथ्या दिवशी बारवेत अखंड गोड पाण्याचा झरा फुटला.",
      kannadaTranslation:
        "ಕೊಂಕಣದ ಹಳೆಯ ಗ್ರಾಮದಲ್ಲಿ ಏಳು ಮೆಟ್ಟಿಲುಗಳ ಕಲ್ಲಿನ ಬಾವಿಯಿದೆ. ಬರಗாலದಲ್ಲೂ ಗ್ರಾಮಸ್ಥರು ದೇವರ ಕಾಡಿನ ಮರಗಳನ್ನು ರಕ್ಷಿಸಿದರು, ಮತ್ತು ನಾಲ್ಕನೇ ದಿನ ಬಾವಿಯಲ್ಲಿ ಸಿಹಿ ನೀರಿನ ಬುಗ್ಗೆ ಚಿಮ್ಮಿತು.",
      hindiTranslation:
        "कोंकण के एक पुराने गाँव में काले पत्थर की सात सीढ़ियों वाली बावड़ी है। तीन साल के सूखे में भी ग्रामीणों ने पवित्र वन (देवराई) का एक भी पेड़ नहीं काटा, जिसके फलस्वरूप बावड़ी से मीठे पानी का अटूट स्रोत फूट पड़ा।",
      aiSummary:
        "An ecological village legend from the Konkan coast illustrating how ancestral communities linked groundwater survival directly to the strict preservation of sacred forest groves (Devrai).",
      category: "Ecology & Sacred Groves",
      region: "Konkan & Sahyadri",
      keywords: "बारव, देवराई, दुष्काळ, जलसंधारण, Konkan, Stepwell, Sacred Grove",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "सुगीच्या जात्यावरची ओवी (Dawn Millstone Harvest Song of the Sahyadri)",
      storyType: "Traditional Song",
      originalText:
        "पहिली माझी ओवी ग, गावच्या काळ्या आईला | पाऊस पडू दे सोन्याचा, कणीस भरू दे मोत्यानं || दुसरी माझी ओवी ग, बैलजोडीच्या शिंगाला | नांगर चालतो वळीत, धनी गातोया अभंगाला ||",
      standardTranslation:
        "माझी पहिली ओवी गावच्या काळ्या मातीला (धरतीला) अर्पण आहे; सोन्यासारखा पाऊस पडू दे आणि मोत्यासारख्या दाण्यांनी कणीस भरू दे. माझी दुसरी ओवी कष्ट करणाऱ्या बैलजोडीला आहे, ज्यांच्या पावलावर शेतकरी अभंग गात नांगरणी करतो.",
      englishTranslation:
        "My first verse at the stone hand-mill is offered to the dark mother earth of our village; may golden rains fall and fill every ear of grain with pearls. My second verse honors the yoked bullocks whose steady stride guides the plow while the farmer sings devotional verses.",
      marathiTranslation:
        "जात्यावर दळण दळताना गायली जाणारी ही पारंपरिक ओवी काळ्या मातीविषयी आणि बैलांच्या कष्टाविषयी कृतज्ञता व्यक्त करते.",
      kannadaTranslation:
        "ಬೀಸುವ ಕಲ್ಲಿನ ಮುಂದೆ ಹಾಡುವ ಈ ಜನಪದ ಗೀತೆಯು ಕಪ್ಪು ಭೂಮಿ ತಾಯಿಗೆ ಮತ್ತು ಉಳುಮೆ ಮಾಡುವ ಎತ್ತುಗಳಿಗೆ ಕೃತಜ್ಞತೆಯನ್ನು ಸಲ್ಲಿಸುತ್ತದೆ.",
      hindiTranslation:
        "चक्की पीसते समय गाया जाने वाला यह पारंपरिक लोकगीत काली धरती माता, सुनहरी वर्षा और हल चलाने वाले बैलों के प्रति कृतज्ञता प्रकट करता है।",
      aiSummary:
        "A traditional women's dawn millstone song (Jatyavarchi Ovi) celebrating agricultural gratitude, monsoon fertility, and the sacred bond between farming families, soil, and cattle.",
      category: "Farming & Harvest",
      region: "Western Ghats (Sahyadri)",
      keywords: "ओवी, जाते, शेती, सुगी, पाऊस, Harvest Song, Farming, Millstone",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "ಬೆಳೆ ಬಂದಾಗ ನೆಲ ಮರೆಯಬೇಡ — धारवाडची कृषी म्हण (Agrarian Proverb of North Karnataka)",
      storyType: "Proverb",
      originalText:
        "ಮಳೆ ಬಂದಾಗ ಕೆರೆ ತುಂಬುವುದು, ಬೆಳೆ ಬಂದಾಗ ಮನೆ ತುಂಬುವುದು; ಆದರೆ ಹಿರಿಯರ ಮಾತು ಮರೆತರೆ ಊರೇ ಬರಡಾಗುವುದು.",
      standardTranslation:
        "पाऊस आल्यावर तलाव भरतो आणि पीक आल्यावर घर धान्याने भरते; पण पूर्वजांचे शहाणपण आणि संस्कार विसरले तर अख्खे गाव ओसाड पडते.",
      englishTranslation:
        "When the monsoon arrives, the village tank brims; when the harvest ripens, the granary fills; yet if a community forgets the counsel of its elders, the entire village turns barren.",
      marathiTranslation:
        "पाऊस पडल्यावर तळे भरते, पीक आल्यावर घर भरते; परंतु वडिलधाऱ्यांचे बोल विसरल्यास गाव भकास होते.",
      kannadaTranslation:
        "ಮಳೆ ಬಂದಾಗ ಕೆರೆ ತುಂಬುತ್ತದೆ, ಫಸಲು ಬಂದಾಗ ಮನೆ ತುಂಬುತ್ತದೆ; ಆದರೆ ಹಿರಿಯರ ಅನುಭವದ ಮಾತು ಮರೆತರೆ ಊರು ಬರಡಾಗುತ್ತದೆ.",
      hindiTranslation:
        "वर्षा आने पर तालाब भरता है और फसल पकने पर घर भरता है; किंतु यदि बुजुर्गों की सीख भुला दी जाए तो पूरा गाँव सूना हो जाता है।",
      aiSummary:
        "A classic Janapada Kannada proverb linking material agricultural prosperity with the preservation of intergenerational oral wisdom and community ethics.",
      category: "Ancestral Wisdom",
      region: "Dharwad & Uttara Kannada",
      keywords: "Janapada, Proverb, Farming, Elders, Monsoon, धारवाड, म्हण",
      audioUrl: "",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "दर्यावरची तारू आणि दीपस्तंभाची कथा (The Fisherman's Lamp of Vengurla Coast)",
      storyType: "Folk Story",
      originalText:
        "वादळी रात्री जेव्हा मच्छीमारांची होडी दर्यात हरवायची, तेव्हा किनाऱ्यावरच्या मंदिराच्या दीपमाळेवर गावातल्या बाया तिळाच्या तेलाचे दिवे लावून बसत. त्या दिव्यांची ज्योत वाऱ्याने विझू नये म्हणून संपूर्ण गाव रात्रभर भजन म्हणत पहारा देत असे.",
      standardTranslation:
        "वादळी रात्री जेव्हा मच्छीमारांची नौका समुद्रात दिशा चुकते, तेव्हा किनाऱ्यावरील मंदिराच्या दीपमाळेवर गावातील स्त्रिया तिळाच्या तेलाचे दिवे प्रज्वलित करत आणि संपूर्ण गाव रात्रभर भजन गात पहारा देत असे.",
      englishTranslation:
        "On tempestuous monsoon nights when fishing outriggers lost their bearings at sea, village women lit sesame-oil lamps atop the coastal temple pillar (Deepmal), while the entire settlement kept vigil singing devotional refrains until every boat returned safely to shore.",
      marathiTranslation:
        "समुद्रात गेलेल्या मच्छीमारांच्या रक्षणासाठी किनाऱ्यावरील दीपमाळेवर तिळाचे दिवे लावून संपूर्ण गाव जागून पहारा देत असे.",
      kannadaTranslation:
        "ಚಂಡಮಾರುತದ ರಾತ್ರಿಯಲ್ಲಿ ಮೀನುಗಾರರ ದೋಣಿಗಳಿಗೆ ದಾರಿ ತೋರಿಸಲು ಕರಾವಳಿಯ ದೇವಾಲಯದ ದೀಪಸ್ತಂಭದಲ್ಲಿ ಎಳ್ಳೆಣ್ಣೆ ದೀಪಗಳನ್ನು ಹಚ್ಚಿ ಇಡೀ ಗ್ರಾಮ ಜಾಗರಣೆ ಮಾಡುತ್ತಿತ್ತು.",
      hindiTranslation:
        "तूफानी रातों में जब मछुआरों की नाव समुद्र में भटक जाती थी, तब तट के मंदिर के दीपस्तंभ पर तिल के तेल के दीये जलाकर पूरा गाँव रात भर भजन गाते हुए पहरा देता था।",
      aiSummary:
        "A coastal maritime folk story from Sindhudurg documenting communal solidarity and the traditional use of temple stone lamp-pillars (Deepmal) as community lighthouses.",
      category: "Maritime Lore",
      region: "Sindhudurg (Konkan)",
      keywords: "दर्या, मच्छीमार, दीपमाळ, वेंगुर्ला, Maritime, Konkan Coast, Folk Story",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "तांब्रपत्रावरचा आठशे वर्षांपूर्वीचा बाजार-नियम (Oral History of the Copper-Plate Market Charter)",
      storyType: "Oral History",
      originalText:
        "आमच्या आजोबांनी सांगितलेली आठवण: जुन्या काळी आठवडी बाजारात धान्याचं माप करताना पहिलं पसाभर धान्य गावच्या अनाथ आणि पांथस्थांसाठी बाजूला काढून ठेवायचा नियम तांब्याच्या पत्रावर कोरलेला होता. त्याला 'धर्माचा पसा' म्हणत.",
      standardTranslation:
        "पूर्वजांची मौखिक आठवण: प्राचीन काळी आठवडी बाजारात धान्याचे मापन करताना पहिले पसाभर धान्य गावातील गरजू आणि प्रवाशांसाठी बाजूला ठेवण्याचा नियम ताम्रपटावर कोरलेला होता, ज्याला 'धर्माचा पसा' म्हणत.",
      englishTranslation:
        "Recorded oral memory from village elders: In centuries past, a copper-plate charter at the weekly market mandated that the very first handful of grain measured from every sack—called 'Dharmacha Pasa'—be set aside in a stone vessel to feed travelers and the destitute.",
      marathiTranslation:
        "आठवडी बाजारात प्रत्येक पोत्यातून पहिला पसाभर धान्य गरजूंसाठी आणि वाटसरूंसाठी काढून ठेवण्याच्या परंपरेचा मौखिक इतिहास.",
      kannadaTranslation:
        "ವಾರದ ಸಂತೆಯಲ್ಲಿ ಪ್ರತಿ ಚೀಲದಿಂದ ಮೊದಲ ಬೊಗಸೆ ಧಾನ್ಯವನ್ನು ಪ್ರವಾಸಿಗರು ಮತ್ತು ಬಡವರಿಗಾಗಿ ಮೀಸಲಿಡುವ ತಾಮ್ರಪತ್ರದ ಸಂಪ್ರದಾಯದ ಮೌಖಿಕ ಇತಿಹಾಸ.",
      hindiTranslation:
        "साप्ताहिक हाट में अनाज तौलते समय पहली अंजलि अनाज राहगीरों और जरूरतमंदों के लिए अलग रखने की ताम्रपत्र परंपरा का मौखिक इतिहास।",
      aiSummary:
        "An oral history recounting customary market welfare systems ('Dharmacha Pasa') where communal grain reserves were collected voluntarily during weekly rural markets.",
      category: "Ancestral Wisdom",
      region: "Khandesh & Deccan",
      keywords: "ताम्रपट, आठवडी बाजार, धर्माचा पसा, Oral History, Market Custom, Grain",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "काजव्यांच्या रात्रीची वारली निसर्गकथा (Traditional Story of the Firefly Monsoon Herald)",
      storyType: "Traditional Story",
      originalText:
        "जेव्हा सादडाच्या आणि बाभळीच्या झाडांवर लाखो काजवे एकाच वेळी लखलखू लागतात, तेव्हा जंगलातले लोक समजतात की आता बियाणं पेरण्याची वेळ झाली. काजवे म्हणजे आभाळातल्या चांदण्याच जमिनीवर उतरून शेतकऱ्याला पेरणीचा सांगावा देतात.",
      standardTranslation:
        "जेव्हा झाडांवर लाखो काजवे एकाच वेळी चमकू लागतात, तेव्हा आदिवासी आणि शेतकरी बांधव समजतात की मान्सून जवळ आला असून पेरणीची वेळ झाली आहे. काजवे म्हणजे शेतकऱ्याला पेरणीचा संदेश देणाऱ्या चांदण्या मानल्या जातात.",
      englishTranslation:
        "When hundreds of thousands of fireflies synchronize their glow across the forest canopy in late May, indigenous cultivators recognize nature's calendar signaling seed-sowing time—believing the stars themselves descend to whisper the arrival of the southwest monsoon.",
      marathiTranslation:
        "काजव्यांच्या लखलखाटावरून पावसाळ्याची आणि पेरणीची अचूक वेळ ओळखण्याची सह्याद्रीतील पारंपरिक निसर्गकथा.",
      kannadaTranslation:
        "ಮರಗಳ ಮೇಲೆ ಮಿಂಚುಹುಳುಗಳ ಬೆಳಕಿನಿಂದ ಮುಂಗಾರು ಮಳೆ ಮತ್ತು ಬಿತ್ತನೆಯ ಸಮಯವನ್ನು ಗುರುತಿಸುವ ಸಹ್ಯಾದ್ರಿಯ ಸಾಂಪ್ರದಾಯಿಕ ಕಥೆ.",
      hindiTranslation:
        "वृक्षों पर जुगनुओं की चमक से मानसून के आगमन और बुवाई के सटीक समय को पहचानने की सह्याद्रि की पारंपरिक लोककथा।",
      aiSummary:
        "A traditional phenological story from the Sahyadri ranges describing how rural communities read firefly bioluminescence as an ecological indicator for pre-monsoon sowing.",
      category: "Farming & Harvest",
      region: "Western Ghats (Sahyadri)",
      keywords: "काजवे, पेरणी, पाऊस, सह्याद्री, Fireflies, Monsoon, Farming, Traditional Story",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      title: "सुगीचा ढोल आणि नंदीबैलाचे गाणे (Pending Harvest Drum Song)",
      storyType: "Traditional Song",
      originalText:
        "गुबुगुबु वाजे सुगीचा डमरू, अंगणात आला नंदीबैल गाऊ | धनीच्या घराला सोन्याची कळा, पाऊसकाळ चांगला होऊ दे भोळा ||",
      standardTranslation:
        "सुगीच्या दिवसांत अंगणात नंदीबैल घेऊन येणाऱ्या लोककलाकाराचे हे पारंपरिक आशीर्वाद गीत आहे.",
      englishTranslation:
        "A harvest-season ceremonial song sung by wandering Nandi-bull folk bards blessing village courtyards with abundant rain and prosperity.",
      marathiTranslation:
        "सुगीच्या दिवसांत अंगणात येणाऱ्या नंदीबैलाचे पारंपरिक लोकगीत.",
      kannadaTranslation:
        "ಸುಗ್ಗಿಯ ಕಾಲದಲ್ಲಿ ಮನೆ ಮುಂದೆ ಬರುವ ನಂದಿಕೋಲು ಜಾನಪದ ಕಲಾವಿದರ ಆಶೀರ್ವಾದ ಗೀತೆ.",
      hindiTranslation:
        "फसल के मौसम में आँगन में आने वाले नंदीबैल लोक कलाकारों का पारंपरिक आशीर्वाद गीत।",
      aiSummary:
        "A ceremonial folk song performed during post-harvest rounds by traditional Nandi-bull minstrels across rural Maharashtra and Karnataka.",
      category: "Seasonal Rituals",
      region: "Khandesh & Deccan",
      keywords: "नंदीबैल, सुगी, लोकगीत, Harvest, Folk Song",
      audioUrl: "",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "pending",
      isSample: true,
    },
  ]);

  // Seed Heritage Archive across ALL 11 required categories with map coordinates
  await db.insert(heritageArchive).values([
    {
      name: "Bara-Motichi Vihir & Sahyadri Basalt Stepwell",
      category: "Historical Places",
      description:
        "An octagonal 17th-century black-basalt subterranean stepwell featuring twelve water-drawing moat channels, carved stone arcades, and cool vaulted chambers that served both royal caravans and agrarian estates.",
      historicalInfo:
        "Constructed between 1641 and 1646 CE using interlocking dressed Deccan trap basalt stone Blocks bound with lime-jaggery-bael mortar. The stepwell integrates hydrological recharge shafts with shaded resting pavilions.",
      region: "Satara & Sahyadri Escarpment",
      latitude: 17.6805,
      longitude: 74.0183,
      imageUrl: "/images/heritage-stepwell.jpg",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Konkan Shimga & Palkhi Harvest Procession",
      category: "Festivals",
      description:
        "A vibrant spring community festival where wooden palanquins (Palkhi) of village guardian deities visit every courtyard amidst dhol-tasha rhythms, sacred fire offerings, and traditional folk theatre.",
      historicalInfo:
        "Celebrated annually around the Phalguna full moon across Ratnagiri and Sindhudurg. The festival reinforces social harmony as estranged families reunite at the village Maand to carry the ornamented palanquin.",
      region: "Sindhudurg & Ratnagiri (Konkan)",
      latitude: 16.0046,
      longitude: 73.6836,
      imageUrl: "/images/heritage-festival.jpg",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Ukadiche Modak, Solkadhi & Red-Rice Bhakri Thali",
      category: "Traditional Food",
      description:
        "Steamed rice-flour dumplings filled with fresh coconut and palm jaggery infused with nutmeg, paired with cooling kokum-coconut Solkadhi served in clay bowls.",
      historicalInfo:
        "Rooted in the coastal agro-ecology of the Western Ghats where heirloom red rice, kokum (Garcinia indica), and coconut groves form a sustainable culinary triad documented in medieval culinary compendiums.",
      region: "Konkan Coast",
      latitude: 16.9902,
      longitude: 73.312,
      imageUrl: "/images/heritage-food.jpg",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Ilkal & Nauvari Handloom Pit-Loom Weaves",
      category: "Clothing",
      description:
        "Handwoven nine-yard cotton-silk saris featuring the distinctive Tope Teni border joinery and Kasuti geometric embroidery depicting templegopurams, palanquins, and lotus motifs.",
      historicalInfo:
        "Woven on traditional throw-shuttle pit looms across North Karnataka and southern Maharashtra since the 8th century CE, utilizing natural madder-root terracotta and indigo dyes.",
      region: "Dharwad & Bagalkot (North Karnataka)",
      latitude: 15.964,
      longitude: 76.1185,
      imageUrl: "/images/heritage-weaving.jpg",
      audioUrl: "",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Ektari, Tuntune & Dholki Balladry (Povada & Bhajan)",
      category: "Folk Music",
      description:
        "Acoustic folk ensembles centered around the single-stringed Ektari drone, rhythmic Dholki drum, and brass Manjira cymbals used to narrate heroic ballads and philosophical Abhangs.",
      historicalInfo:
        "Oral bards (Shahir and Varkari singers) preserved centuries of regional history and devotional poetry through call-and-response musical cadences performed under village banyan trees.",
      region: "Western Ghats & Deccan",
      latitude: 18.5204,
      longitude: 73.8567,
      imageUrl: "/images/heritage-folk-music.jpg",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Dashavatar & Yakshagana Night-Long Ritual Dance Drama",
      category: "Folk Dance",
      description:
        "Elaborately costumed ritual dance-drama featuring hand-painted wooden headgear, vigorous footwork, and improvised philosophical dialogues accompanied by Maddale and Chande percussion.",
      historicalInfo:
        "Performed from dusk till dawn in temple courtyards after the winter harvest, blending classical Natyashastra mudras with vibrant local dialect storytelling.",
      region: "Sindhudurg & Uttara Kannada",
      latitude: 14.8006,
      longitude: 74.129,
      imageUrl: "/images/heritage-festival.jpg",
      audioUrl: "",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Traditional Terracotta Pottery & Pit-Loom Artisanship",
      category: "Traditional Occupations",
      description:
        "Hereditary village craft guilds specializing in wheel-thrown black and red earthenware water vessels (Matka, Ranjan) and hand-warped cotton textile weaving.",
      historicalInfo:
        "Historically organized under the Barabalutedar and Aya community exchange system, where potters, weavers, and blacksmiths supplied essential agrarian tools in exchange for a share of the village harvest.",
      region: "Khandesh & Deccan Plateau",
      latitude: 19.8762,
      longitude: 75.3433,
      imageUrl: "/images/heritage-weaving.jpg",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Pahili Peraṇī (Sacred Seed-Consecration Custom)",
      category: "Customs",
      description:
        "Before the first monsoon furrow is plowed, families gather to anoint heirloom seeds with turmeric, vermilion, and neem leaves while offering coconut to the field boundary stone.",
      historicalInfo:
        "This custom also includes exchanging five varieties of heirloom seeds among neighboring households so no family faces crop failure alone during unpredictable rains.",
      region: "Konkan & Sahyadri",
      latitude: 16.705,
      longitude: 74.2433,
      imageUrl: "/images/heritage-food.jpg",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Devrai Sacred Grove Guardianship & Deepmal Lighting",
      category: "Religious/Cultural Traditions",
      description:
        "Community-enforced ecological sanctuary traditions where ancient patches of primary monsoon forest are revered as the living abode of the village deity.",
      historicalInfo:
        "Botanical surveys across the Western Ghats have identified rare medicinal lianas and endemic tree species surviving exclusively inside Devrai sacred groves due to centuries-old cultural taboos against cutting wood.",
      region: "Western Ghats (Sahyadri)",
      latitude: 17.9217,
      longitude: 73.6557,
      imageUrl: "/images/heritage-stepwell.jpg",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "1924 Archival Glass-Plate Print of Wada Panchayat",
      category: "Old Photographs",
      description:
        "Rare silver-gelatin sepia print showing village elders, folk musicians, and weavers assembled in front of a carved teakwood Wada courtyard house during the 1924 harvest assembly.",
      historicalInfo:
        "Digitized from a family glass-plate negative collection in Sawantwadi; documents traditional turbans (Pheta), brass water vessels, and pre-independence timber architecture.",
      region: "Sawantwadi (South Konkan)",
      latitude: 15.9056,
      longitude: 73.8213,
      imageUrl: "/images/heritage-old-photo.jpg",
      audioUrl: "",
      contributorId: adminUser.id,
      contributorName: adminUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Modi & Old Kannada Script Palm-Leaf Land & Water Foliations",
      category: "Historical Documents",
      description:
        "Bundled Borassus palm-leaf manuscripts (Tadpatra) and handmade paper scrolls inscribed in cursive Modi and Halegannada scripts detailing village water-sharing schedules and herbal pharmacopoeia.",
      historicalInfo:
        "Preserved in cedarwood chests dusted with sweet-flag (Vekhand) root powder to repel insects; dates to the late 18th century.",
      region: "Pune & Dharwad Archives",
      latitude: 15.4589,
      longitude: 75.0078,
      imageUrl: "/images/heritage-manuscript.jpg",
      audioUrl: "",
      contributorId: kaveriUser.id,
      contributorName: kaveriUser.name,
      status: "approved",
      isSample: true,
    },
    {
      name: "Bendur / Pola Bull-Honoring Agrarian Festival",
      category: "Festivals",
      description:
        "Mid-monsoon thanksgiving festival celebrating draught cattle with turmeric-oil massages, painted horns, embroidered झूल (jhool) shawls, and sweet puran-poli offerings.",
      historicalInfo:
        "Observed across Maharashtra and North Karnataka (as Kara Hunime) to give farm bullocks complete rest after the intensive monsoon plowing season.",
      region: "Kolhapur & Belagavi Borderland",
      latitude: 16.386,
      longitude: 74.38,
      imageUrl: "/images/heritage-festival.jpg",
      audioUrl: "",
      contributorId: arjunUser.id,
      contributorName: arjunUser.name,
      status: "pending",
      isSample: true,
    },
  ]);
}
