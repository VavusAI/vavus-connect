// /src/lib/languages/madlad.ts
// MADLAD language registry (seed list + open tag support)
// Sources for coverage: NeurIPS/ArXiv paper + HF model card. See docs links below.

export type Lang = {
    code: string;      // BCP-47 (prefer ISO 639-1; fall back to 639-3 or subtags when needed)
    name: string;      // English label
    native?: string;   // Optional native label
};

export const AUTO_CODE = "auto";

// --- Seed list ---
// NOTE: This is a curated starter set for UX. The API layer below ALSO accepts any BCP-47 tag.
// You can keep expanding this list or load the full set via the loader at the bottom.
export const MADLAD_LANGUAGES: Lang[] = [
    { code: AUTO_CODE, name: "Auto-detect" },

    // Europe (core)
    { code: "en", name: "English" },
    { code: "ro", name: "Romanian", native: "Română" },
    { code: "es", name: "Spanish", native: "Español" },
    { code: "fr", name: "French", native: "Français" },
    { code: "de", name: "German", native: "Deutsch" },
    { code: "it", name: "Italian", native: "Italiano" },
    { code: "pt", name: "Portuguese", native: "Português" },
    { code: "nl", name: "Dutch", native: "Nederlands" },
    { code: "pl", name: "Polish", native: "Polski" },
    { code: "uk", name: "Ukrainian", native: "Українська" },
    { code: "ru", name: "Russian", native: "Русский" },
    { code: "tr", name: "Turkish", native: "Türkçe" },
    { code: "el", name: "Greek", native: "Ελληνικά" },
    { code: "sv", name: "Swedish", native: "Svenska" },
    { code: "no", name: "Norwegian", native: "Norsk" },
    { code: "da", name: "Danish", native: "Dansk" },
    { code: "fi", name: "Finnish", native: "Suomi" },
    { code: "cs", name: "Czech", native: "Čeština" },
    { code: "sk", name: "Slovak", native: "Slovenčina" },
    { code: "hu", name: "Hungarian", native: "Magyar" },
    { code: "bg", name: "Bulgarian", native: "Български" },
    { code: "sr", name: "Serbian", native: "Српски" },
    { code: "hr", name: "Croatian", native: "Hrvatski" },
    { code: "sl", name: "Slovenian", native: "Slovenščina" },
    { code: "lt", name: "Lithuanian", native: "Lietuvių" },
    { code: "lv", name: "Latvian", native: "Latviešu" },
    { code: "et", name: "Estonian", native: "Eesti" },

    // Middle East / North Africa
    { code: "ar", name: "Arabic", native: "العربية" },
    { code: "fa", name: "Persian (Farsi)", native: "فارسی" },
    { code: "he", name: "Hebrew", native: "עברית" },
    { code: "ku", name: "Kurdish (Kurmanji/Sorani)" },

    // Africa (selection)
    { code: "sw", name: "Swahili", native: "Kiswahili" },
    { code: "am", name: "Amharic", native: "አማርኛ" },
    { code: "ha", name: "Hausa" },
    { code: "ig", name: "Igbo" },
    { code: "yo", name: "Yoruba" },
    { code: "zu", name: "Zulu", native: "isiZulu" },
    { code: "xh", name: "Xhosa", native: "isiXhosa" },
    { code: "st", name: "Sesotho" },
    { code: "tn", name: "Tswana" },
    { code: "rw", name: "Kinyarwanda" },
    { code: "sn", name: "Shona" },
    { code: "so", name: "Somali", native: "Soomaali" },
    { code: "ts", name: "Tsonga" },

    // South & Southeast Asia
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "bn", name: "Bengali", native: "বাংলা" },
    { code: "ur", name: "Urdu", native: "اردو" },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "mr", name: "Marathi", native: "मराठी" },
    { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "ml", name: "Malayalam", native: "മലയാളം" },
    { code: "si", name: "Sinhala", native: "සිංහල" },
    { code: "ne", name: "Nepali", native: "नेपाली" },
    { code: "km", name: "Khmer", native: "ភាសាខ្មែរ" },
    { code: "lo", name: "Lao", native: "ລາວ" },
    { code: "my", name: "Burmese", native: "မြန်မာ" },
    { code: "th", name: "Thai", native: "ไทย" },
    { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
    { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
    { code: "ms", name: "Malay", native: "Bahasa Melayu" },
    { code: "fil", name: "Filipino", native: "Filipino" },
    { code: "sd", name: "Sindhi", native: "سنڌي" },
    { code: "ps", name: "Pashto", native: "پښتو" },

    // East Asia
    { code: "zh", name: "Chinese (generic)", native: "中文" },
    { code: "zh-Hans", name: "Chinese (Simplified)", native: "简体中文" },
    { code: "zh-Hant", name: "Chinese (Traditional)", native: "繁體中文" },
    { code: "yue", name: "Cantonese", native: "粵語" },
    { code: "ja", name: "Japanese", native: "日本語" },
    { code: "ko", name: "Korean", native: "한국어" },

    // Americas
    { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)" },
    { code: "es-419", name: "Spanish (Latin America)", native: "Español (LatAm)" },
    { code: "qu", name: "Quechua" },
    { code: "gn", name: "Guarani" },
    { code: "ay", name: "Aymara" },

    // Extras often encountered in MADLAD
    { code: "az", name: "Azerbaijani", native: "Azərbaycanca" },
    { code: "kk", name: "Kazakh", native: "Қазақ" },
    { code: "uz", name: "Uzbek", native: "Oʻzbek" },
    { code: "mn", name: "Mongolian", native: "Монгол" },
    { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
    { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
    { code: "ka", name: "Georgian", native: "ქართული" },
    { code: "hy", name: "Armenian", native: "Հայերեն" },
    { code: "sq", name: "Albanian", native: "Shqip" },
    { code: "bs", name: "Bosnian", native: "Bosanski" },
    { code: "mk", name: "Macedonian", native: "Македонски" },
    { code: "is", name: "Icelandic", native: "Íslenska" },
    { code: "ga", name: "Irish", native: "Gaeilge" },
    { code: "cy", name: "Welsh", native: "Cymraeg" },
    { code: "mt", name: "Maltese", native: "Malti" },
];

// Helper lookups
export function isSupported(code: string) {
    if (code === AUTO_CODE) return true;
    // accept any BCP-47 tag; you may still want to validate shape later
    return /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code);
}

export function labelFor(code: string) {
    const found = MADLAD_LANGUAGES.find(l => l.code === code);
    return found ? `${found.name}${found.native ? ` — ${found.native}` : ""}` : code;
}

// Optional: lazy-load the FULL set from a JSON you’ll add later (Table 8 → JSON).
// Example file path: /public/data/madlad_languages.json (array of {code,name,native?})
let _fullCache: Lang[] | null = null;
export async function loadFullMadladLanguages(): Promise<Lang[]> {
    if (_fullCache) return _fullCache;
    try {
        const res = await fetch("/data/madlad_languages.json", { cache: "force-cache" });
        if (res.ok) {
            const arr = (await res.json()) as Lang[];
            // ensure auto is present and at top:
            const dedup = [ { code: AUTO_CODE, name: "Auto-detect" }, ...arr.filter(x => x.code !== AUTO_CODE) ];
            _fullCache = dedup;
            return dedup;
        }
    } catch {}
    return MADLAD_LANGUAGES; // fallback
}

/**
 * Docs:
 * - Dataset/model coverage (419+ langs): paper + appendix (Table 8).
 * - Model card (400+/450+): Hugging Face.
 * Paper: NeurIPS/ArXiv/OpenReview.
 */
