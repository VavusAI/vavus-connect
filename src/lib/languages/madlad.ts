/**
 * Clean MADLAD language registry with canonicalisation helpers.
 * Generated from the original dataset and filtered to remove evaluation/noise rows.
 */
export type Lang = {
    code: string;
    label: string;
    nativeLabel?: string;
};

export const AUTO_CODE = 'auto' as const;

type RawLang = {
    code: string;
    label: string;
    nativeLabel?: string | null;
};

const BANNED_CODE_LIST = [
    'csen',
    'deen',
    'encs',
    'ende',
    'enes',
    'enet',
    'enfr',
    'engu',
    'enhi',
    'enkk',
    'enlt',
    'enlv',
    'enro',
    'enru',
    'entr',
    'enzh',
    'esen',
    'eten',
    'fren',
    'guen',
    'hien',
    'kken',
    'lten',
    'lven',
    'roen',
    'ruen',
    'tren',
    'zhen',
    'zxx-xx-dtynoise',
    'zxx',
    'empy',
    'good',
    'ok'
] as const;

export const BANNED_CODES: ReadonlySet<string> = new Set(
    BANNED_CODE_LIST.map(code => code.toLowerCase())
);

export const LANGUAGE_CODE_ALIASES: Record<string, string> = {
    'auto': 'auto',
    'cmn': 'zh-CN',
    'cmn-hans': 'zh-CN',
    'in': 'id',
    'iw': 'he',
    'ji': 'yi',
    'jw': 'jv',
    'lzh': 'lzh',
    'nb-no': 'nb',
    'no': 'nb',
    'pt-br': 'pt-BR',
    'pt-pt': 'pt',
    'pt_br': 'pt-BR',
    'yue-hant': 'yue',
    'zh': 'zh-CN',
    'zh-classical': 'lzh',
    'zh-cn': 'zh-CN',
    'zh-hans': 'zh-CN',
    'zh-hant': 'zh-TW',
    'zh-hk': 'zh-TW',
    'zh-latn': 'zh-Latn',
    'zh-mo': 'zh-TW',
    'zh-sg': 'zh-CN',
    'zh-tr': 'zh-TW',
    'zh-tw': 'zh-TW'
};



const LABEL_OVERRIDES: Record<string, string> = {
    'zh-cn': 'Chinese (Simplified)',
    'zh-tw': 'Chinese (Traditional)'
};

const BCP47_REGEX = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;


export function canonicalizeBcp47(code: string): string {
    if (!code) return '';
    const trimmed = code.trim();
    if (!trimmed) return '';
    if (trimmed === AUTO_CODE) return AUTO_CODE;
    const squashed = trimmed
        .replace(/_/g, '-')
        .replace(/\s+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (!squashed) return '';
    const parts = squashed.split('-').filter(Boolean);
    if (!parts.length) return '';
    const [language, ...rest] = parts;
    const canonicalParts = [language.toLowerCase()];
    for (const part of rest) {
        if (/^[a-zA-Z]{4}$/.test(part)) {
            canonicalParts.push(part[0].toUpperCase() + part.slice(1).toLowerCase());
        } else if (/^(?:[a-zA-Z]{2}|[0-9]{3})$/.test(part)) {
            canonicalParts.push(part.toUpperCase());
        } else {
            canonicalParts.push(part.toLowerCase());
        }
    }
    return canonicalParts.join('-');
}

function resolveAlias(code: string, aliases: Record<string, string>): string {
    let current = code;
    const seen = new Set<string>();
    while (true) {
        const key = current.toLowerCase();
        if (seen.has(key)) return current;
        seen.add(key);
        const next = aliases[key];
        if (!next) return current;
        const canonicalNext = canonicalizeBcp47(next);
        if (!canonicalNext) return current;
        current = canonicalNext;
    }
}

function isNormalizedValid(code: string): boolean {
    if (!code) return false;
    if (code === AUTO_CODE) return true;
    if (BANNED_CODES.has(code.toLowerCase())) return false;
    return BCP47_REGEX.test(code);
}

export function isLikelyValidCode(code: string): boolean {
    if (!code) return false;
    const canonical = canonicalizeBcp47(code);
    if (!canonical) return false;
    const resolved = resolveAlias(canonical, LANGUAGE_CODE_ALIASES);
    return isNormalizedValid(resolved);
}
export class LanguageCodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LanguageCodeError';
    }
}

type MutableLang = {
    code: string;
    label: string;
    nativeLabel?: string;
};

const RAW_LANGUAGE_ROWS: RawLang[] = [
    { code: 'auto', label: 'Auto-detect' },
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
    { code: 'fr', label: 'French', nativeLabel: 'Français' },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
    { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
    { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
    { code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
    { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
    { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
    { code: 'zh-TW', label: 'Chinese (Traditional)', nativeLabel: '繁體中文' },
    { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
    { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
    { code: 'aa', label: 'Afar' },
    { code: 'abs', label: 'Ambonese Malay' },
    { code: 'abt', label: 'Ambulas' },
    { code: 'ace', label: 'Achinese' },
    { code: 'acf', label: 'St Lucian Creole French' },
    { code: 'ach', label: 'Acoli' },
    { code: 'ada', label: 'Adangme' },
    { code: 'adh', label: 'Adhola' },
    { code: 'ady', label: 'Adyghe' },
    { code: 'af', label: 'Afrikaans' },
    { code: 'agr', label: 'Aguaruna' },
    { code: 'ahk', label: 'Akha' },
    { code: 'ak', label: 'Twi' },
    { code: 'akb', label: 'Batak Angkola' },
    { code: 'alt', label: 'S. Altai' },
    { code: 'alz', label: 'Alur' },
    { code: 'am', label: 'Amharic' },
    { code: 'amu', label: 'Guerrero Amuzgo' },
    { code: 'ang', label: 'Old English' },
    { code: 'ann', label: 'Obolo' },
    { code: 'apd-SD', label: 'Sudanese Arabic' },
    { code: 'ape', label: 'Bukiyip' },
    { code: 'ar-Latn', label: 'Arabic (Latn)' },
    { code: 'arn', label: 'Mapudungun' },
    { code: 'as', label: 'Assamese' },
    { code: 'av', label: 'Avar' },
    { code: 'awa', label: 'Awadhi' },
    { code: 'ay', label: 'Aymara' },
    { code: 'ayl', label: 'Libyan Arabic' },
    { code: 'az', label: 'Azerbaijani' },
    { code: 'az-RU', label: 'Azerbaijani (Russia)' },
    { code: 'azg', label: 'San Pedro Amuzgos Amuzgo' },
    { code: 'ba', label: 'Bashkir' },
    { code: 'ban', label: 'Balinese' },
    { code: 'bas', label: 'Basa (Cameroon)' },
    { code: 'bbc', label: 'Batak Toba' },
    { code: 'bci', label: 'Baoulé' },
    { code: 'be', label: 'Belarusian' },
    { code: 'ber', label: 'Tamazight (Tfng)' },
    { code: 'ber-Latn', label: 'Tamazight (Latn)' },
    { code: 'bew', label: 'Betawi' },
    { code: 'bfy', label: 'Bagheli' },
    { code: 'bg', label: 'Bulgarian' },
    { code: 'bg-Latn', label: 'Bulgarian (Latn)' },
    { code: 'bgc', label: 'Haryanvi' },
    { code: 'bgp', label: 'E. Baluchi' },
    { code: 'bgz', label: 'Banggai' },
    { code: 'bhb-Gujr', label: 'Bhili' },
    { code: 'bho', label: 'Bhojpuri' },
    { code: 'bi', label: 'Bislama' },
    { code: 'bik', label: 'Central Bikol' },
    { code: 'bim', label: 'Bimoba' },
    { code: 'bjj', label: 'Kanauji' },
    { code: 'bm', label: 'Bambara' },
    { code: 'bmm', label: 'N. Betsimisaraka Malagasy' },
    { code: 'bn', label: 'Bengali' },
    { code: 'bn-Latn', label: 'Bengali (Latn)' },
    { code: 'bo', label: 'Tibetan' },
    { code: 'bqc', label: 'Boko (Benin)' },
    { code: 'br', label: 'Breton' },
    { code: 'bru', label: 'E. Bru' },
    { code: 'brx', label: 'Bodo (India)' },
    { code: 'bs', label: 'Bosnian' },
    { code: 'bto', label: 'Rinconada Bikol' },
    { code: 'bts', label: 'Batak Simalungun' },
    { code: 'btx', label: 'Batak Karo' },
    { code: 'bua', label: 'Buryat' },
    { code: 'bum', label: 'Bulu' },
    { code: 'bus', label: 'Bokobaru' },
    { code: 'bzc', label: 'S. Betsimisaraka Malagasy' },
    { code: 'bzj', label: 'Belize Kriol English' },
    { code: 'ca', label: 'Catalan' },
    { code: 'cab', label: 'Garifuna' },
    { code: 'cac', label: 'Chuj' },
    { code: 'cak', label: 'Kaqchikel' },
    { code: 'cbk', label: 'Chavacano' },
    { code: 'cce', label: 'Chopi' },
    { code: 'ce', label: 'Chechen' },
    { code: 'ceb', label: 'Cebuano' },
    { code: 'cfm', label: 'Falam Chin' },
    { code: 'cgg', label: 'Chiga' },
    { code: 'ch', label: 'Chamorro' },
    { code: 'chk', label: 'Chuukese' },
    { code: 'chm', label: 'Meadow Mari' },
    { code: 'chr', label: 'Cherokee' },
    { code: 'cjk', label: 'Chokwe' },
    { code: 'ckb', label: 'Kurdish (Sorani)' },
    { code: 'clu', label: 'Caluyanun' },
    { code: 'cnh', label: 'Hakha Chin' },
    { code: 'cni', label: 'Asháninka' },
    { code: 'co', label: 'Corsican' },
    { code: 'cr-Latn', label: 'Cree (Latn)' },
    { code: 'crh', label: 'Crimean Tatar' },
    { code: 'crs', label: 'Seselwa Creole French' },
    { code: 'cs', label: 'Czech' },
    { code: 'ctd-Latn', label: 'Tedim Chin (Latn)' },
    { code: 'ctg', label: 'Chittagonian' },
    { code: 'ctu', label: 'Chol' },
    { code: 'cuk', label: 'San Blas Kuna' },
    { code: 'cv', label: 'Chuvash' },
    { code: 'cy', label: 'Welsh' },
    { code: 'cyo', label: 'Cuyonon' },
    { code: 'da', label: 'Danish' },
    { code: 'dcc', label: 'Deccan' },
    { code: 'din', label: 'Dinka' },
    { code: 'dje', label: 'Zarma' },
    { code: 'djk', label: 'E. Maroon Creole' },
    { code: 'dln', label: 'Darlong' },
    { code: 'doi', label: 'Dogri' },
    { code: 'dov', label: 'Dombe' },
    { code: 'dtp', label: 'Kadazan Dusun' },
    { code: 'dv', label: 'Dhivehi' },
    { code: 'dwr', label: 'Dawro' },
    { code: 'dyu', label: 'Dyula' },
    { code: 'dz', label: 'Dzongkha' },
    { code: 'ee', label: 'Ewe' },
    { code: 'el-CY', label: 'Greek (Cypress)' },
    { code: 'el-Latn', label: 'Greek (Latn)' },
    { code: 'emp', label: 'N. Emberá' },
    { code: 'en-Arab', label: 'English (Arab)' },
    { code: 'en-Cyrl', label: 'English (Cyrl)' },
    { code: 'enq', label: 'Enga' },
    { code: 'eo', label: 'Esperanto' },
    { code: 'et', label: 'Estonian' },
    { code: 'eu', label: 'Basque' },
    { code: 'fa', label: 'Persian' },
    { code: 'ff', label: 'Fulfulde' },
    { code: 'ff-Adlm', label: 'Fulah' },
    { code: 'ffm', label: 'Maasina Fulfulde' },
    { code: 'fj', label: 'Fijian' },
    { code: 'fo', label: 'Faroese' },
    { code: 'fon', label: 'Fon' },
    { code: 'frp', label: 'Arpitan' },
    { code: 'fy', label: 'W. Frisian' },
    { code: 'ga', label: 'Irish' },
    { code: 'gag', label: 'Gagauz' },
    { code: 'gbm', label: 'Garhwali' },
    { code: 'gd', label: 'Scottish Gaelic' },
    { code: 'gil', label: 'Gilbertese' },
    { code: 'gjk', label: 'Kachi Koli' },
    { code: 'gju', label: 'Gujari' },
    { code: 'gl', label: 'Galician' },
    { code: 'gn', label: 'Guarani' },
    { code: 'gof', label: 'Gofa' },
    { code: 'gom', label: 'Goan Konkani' },
    { code: 'gom-Latn', label: 'Goan Konkani (Latn)' },
    { code: 'gor', label: 'Gorontalo' },
    { code: 'grc', label: 'Ancient Greek' },
    { code: 'gsw', label: 'Swiss German' },
    { code: 'gu', label: 'Gujarati' },
    { code: 'gu-Latn', label: 'Gujarati (Latn)' },
    { code: 'gub', label: 'Guajajára' },
    { code: 'guc', label: 'Wayuu' },
    { code: 'guh', label: 'Guahibo' },
    { code: 'gui', label: 'E. Bolivian Guaraní' },
    { code: 'gv', label: 'Manx' },
    { code: 'gvl', label: 'Gulay' },
    { code: 'gym', label: 'Ngäbere' },
    { code: 'gyn', label: 'Guyanese Creole English' },
    { code: 'ha', label: 'Hausa' },
    { code: 'haw', label: 'Hawaiian' },
    { code: 'he', label: 'Hebrew' },
    { code: 'hi', label: 'Hindi' },
    { code: 'hi-Latn', label: 'Hindi (Latn)' },
    { code: 'hif', label: 'Fiji Hindi' },
    { code: 'hil', label: 'Hiligaynon' },
    { code: 'hmn', label: 'Hmong' },
    { code: 'hne', label: 'Chhattisgarhi' },
    { code: 'ho', label: 'Hiri Motu' },
    { code: 'hr', label: 'Croatian' },
    { code: 'ht', label: 'Haitian Creole' },
    { code: 'hu', label: 'Hungarian' },
    { code: 'hui', label: 'Huli' },
    { code: 'hus', label: 'Huastec' },
    { code: 'hvn', label: 'Sabu' },
    { code: 'hy', label: 'Armenian' },
    { code: 'iba', label: 'Iban' },
    { code: 'ibb', label: 'Ibibio' },
    { code: 'id', label: 'Indonesian' },
    { code: 'ify', label: 'Keley-I Kallahan' },
    { code: 'ig', label: 'Igbo' },
    { code: 'ilo', label: 'Ilocano' },
    { code: 'inb', label: 'Inga' },
    { code: 'is', label: 'Icelandic' },
    { code: 'iso', label: 'Isoko' },
    { code: 'iu', label: 'Inuktitut' },
    { code: 'ium', label: 'Iu Mien' },
    { code: 'iw', label: 'ok (r1: ok has some codemixing because of boilerplate)' },
    { code: 'izz', label: 'Izii' },
    { code: 'ja-Latn', label: 'Japanese (Latn)' },
    { code: 'jac', label: 'Popti’' },
    { code: 'jam', label: 'Jamaican Creole English' },
    { code: 'jax', label: 'Jambi Malay' },
    { code: 'jiv', label: 'Shuar' },
    { code: 'jv', label: 'Javanese' },
    { code: 'jvn', label: 'Caribbean Javanese' },
    { code: 'ka', label: 'Georgian' },
    { code: 'kaa', label: 'Kara-Kalpak' },
    { code: 'kaa-Latn', label: 'Kara-Kalpak (Latn)' },
    { code: 'kac', label: 'Kachin' },
    { code: 'kbd', label: 'Kabardian' },
    { code: 'kbp', label: 'Kabiyè' },
    { code: 'kek', label: 'Kekchí' },
    { code: 'kfy', label: 'Kumaoni' },
    { code: 'kg', label: 'Kongo' },
    { code: 'kha', label: 'Khasi' },
    { code: 'kj', label: 'Kuanyama' },
    { code: 'kjb', label: 'Q’anjob’al' },
    { code: 'kjg', label: 'Khmu' },
    { code: 'kjh', label: 'Khakas' },
    { code: 'kk', label: 'Kazakh' },
    { code: 'kl', label: 'Kalaallisut' },
    { code: 'km', label: 'Khmer' },
    { code: 'kmb', label: 'Kimbundu' },
    { code: 'kmz-Latn', label: 'Khorasani Turkish (Latn)' },
    { code: 'kn', label: 'Kannada' },
    { code: 'kn-Latn', label: 'Kannada (Latn)' },
    { code: 'knj', label: 'W. Kanjobal' },
    { code: 'koi', label: 'Komi-Permyak' },
    { code: 'kos', label: 'Kosraean' },
    { code: 'krc', label: 'Karachay-Balkar' },
    { code: 'kri', label: 'Krio' },
    { code: 'krj', label: 'Kinaray-A' },
    { code: 'ks', label: 'Kashmiri' },
    { code: 'ksd', label: 'Kuanua' },
    { code: 'ksw', label: 'S’gaw Karen' },
    { code: 'ktu', label: 'Kituba (DRC)' },
    { code: 'ku', label: 'Kurdish (Kurmanji)' },
    { code: 'kum', label: 'Kumyk' },
    { code: 'kv', label: 'Komi' },
    { code: 'kw', label: 'Cornish' },
    { code: 'kwi', label: 'Awa-Cuaiquer' },
    { code: 'ky', label: 'Kyrghyz' },
    { code: 'la', label: 'Latin' },
    { code: 'laj', label: 'Lango (Uganda)' },
    { code: 'lb', label: 'Luxembourgish' },
    { code: 'lg', label: 'Luganda' },
    { code: 'lhu', label: 'Lahu' },
    { code: 'ln', label: 'Lingala' },
    { code: 'lo', label: 'Lao' },
    { code: 'lrc', label: 'N. Luri' },
    { code: 'lt', label: 'Lithuanian' },
    { code: 'ltg', label: 'Latgalian' },
    { code: 'lu', label: 'Luba-Katanga' },
    { code: 'lus', label: 'Mizo' },
    { code: 'luz', label: 'S. Luri' },
    { code: 'lv', label: 'Latvian' },
    { code: 'mad', label: 'Madurese' },
    { code: 'mag', label: 'Magahi' },
    { code: 'mai', label: 'Maithili' },
    { code: 'mak', label: 'Makasar' },
    { code: 'mam', label: 'Mam' },
    { code: 'mas', label: 'Masai' },
    { code: 'max', label: 'North Moluccan Malay' },
    { code: 'maz', label: 'Central Mazahua' },
    { code: 'mbt', label: 'Matigsalug Manobo' },
    { code: 'mdf', label: 'Moksha' },
    { code: 'mdh', label: 'Maguindanaon' },
    { code: 'mdy', label: 'Male (Ethiopia)' },
    { code: 'mel', label: 'Central Melanau' },
    { code: 'meo', label: 'Kedah Malay' },
    { code: 'meu', label: 'Motu' },
    { code: 'mey', label: 'Hassaniyya' },
    { code: 'mfb', label: 'Bangka' },
    { code: 'mfe', label: 'Morisien' },
    { code: 'mg', label: 'Malagasy' },
    { code: 'mgh', label: 'Makhuwa-Meetto' },
    { code: 'mh', label: 'Marshallese' },
    { code: 'mi', label: 'Maori' },
    { code: 'min', label: 'Minangkabau' },
    { code: 'miq', label: 'Mískito' },
    { code: 'mk', label: 'Macedonian' },
    { code: 'mkn', label: 'Kupang Malay' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'ml-Latn', label: 'Malayalam (Latn)' },
    { code: 'mn', label: 'Mongolian' },
    { code: 'mni', label: 'Meiteilon (Manipuri)' },
    { code: 'mnw', label: 'Mon' },
    { code: 'mps', label: 'Dadibi' },
    { code: 'mqy', label: 'Manggarai' },
    { code: 'mr', label: 'Marathi' },
    { code: 'mr-Latn', label: 'Marathi (Latn)' },
    { code: 'mrj', label: 'Hill Mari' },
    { code: 'mrw', label: 'Maranao' },
    { code: 'ms', label: 'Malay' },
    { code: 'ms-Arab', label: 'Malay (Jawi)' },
    { code: 'ms-Arab-BN', label: 'Malay (Jawi, Brunei)' },
    { code: 'msb', label: 'Masbatenyo' },
    { code: 'msi', label: 'Sabah Malay' },
    { code: 'msm', label: 'Agusan Manobo' },
    { code: 'mt', label: 'Maltese' },
    { code: 'mtq', label: 'Muong' },
    { code: 'mtr', label: 'Mewari' },
    { code: 'mui', label: 'Musi' },
    { code: 'mwr', label: 'Marwari' },
    { code: 'my', label: 'Myanmar (Burmese)' },
    { code: 'myv', label: 'Erzya' },
    { code: 'nan-Latn-TW', label: 'Min Nan Chinese (Latn)' },
    { code: 'nd', label: 'North Ndebele' },
    { code: 'ndc-ZW', label: 'Ndau' },
    { code: 'ne', label: 'Nepali' },
    { code: 'new', label: 'Newari' },
    { code: 'ng', label: 'Ndonga' },
    { code: 'ngu', label: 'Guerrero Nahuatl' },
    { code: 'nhe', label: 'E. Huasteca Nahuatl' },
    { code: 'nia', label: 'Nias' },
    { code: 'nij', label: 'Ngaju' },
    { code: 'niq', label: 'Nandi' },
    { code: 'nl', label: 'Dutch' },
    { code: 'nnb', label: 'Nande' },
    { code: 'no', label: 'Norwegian' },
    { code: 'noa', label: 'Woun Meu' },
    { code: 'noe', label: 'Nimadi' },
    { code: 'nog', label: 'Nogai' },
    { code: 'nr', label: 'South Ndebele' },
    { code: 'nso', label: 'Sepedi' },
    { code: 'nut', label: 'Nung (Viet Nam)' },
    { code: 'nv', label: 'Navajo' },
    { code: 'ny', label: 'Chichewa' },
    { code: 'nyn', label: 'Nyankole' },
    { code: 'nyo', label: 'Nyoro' },
    { code: 'nyu', label: 'Nyungwe' },
    { code: 'nzi', label: 'Nzima' },
    { code: 'oc', label: 'Occitan' },
    { code: 'oj', label: 'Ojibwa' },
    { code: 'om', label: 'Oromo' },
    { code: 'or', label: 'Odia (Oriya)' },
    { code: 'os', label: 'Ossetian' },
    { code: 'otq', label: 'Querétaro Otomi' },
    { code: 'pa', label: 'Punjabi' },
    { code: 'pa-Arab', label: 'Lahnda Punjabi (PK)' },
    { code: 'pag', label: 'Pangasinan' },
    { code: 'pam', label: 'Pampanga' },
    { code: 'pap', label: 'Papiamento' },
    { code: 'pau', label: 'Palauan' },
    { code: 'pck', label: 'Paite Chin' },
    { code: 'pcm', label: 'Nigerian Pidgin' },
    { code: 'pis', label: 'Pijin' },
    { code: 'pl', label: 'Polish' },
    { code: 'pmy', label: 'Papuan Malay' },
    { code: 'pon', label: 'Pohnpeian' },
    { code: 'ppk', label: 'Uma' },
    { code: 'prk', label: 'Parauk' },
    { code: 'ps', label: 'Pashto' },
    { code: 'qu', label: 'Quechua' },
    { code: 'qub', label: 'Huallaga Huánuco Quechua' },
    { code: 'quc', label: 'K’iche’' },
    { code: 'quf', label: 'Lambayeque Quechua' },
    { code: 'quh', label: 'S. Bolivian Quechua' },
    { code: 'qup', label: 'S. Pastaza Quechua' },
    { code: 'quy', label: 'Ayacucho Quechua' },
    { code: 'qvc', label: 'Cajamarca Quechua' },
    { code: 'qvi', label: 'Imbabura H. Quichua' },
    { code: 'qvz', label: 'N. Pastaza Quichua' },
    { code: 'qxr', label: 'Cañar H. Quichua' },
    { code: 'raj', label: 'Rajasthani' },
    { code: 'rcf', label: 'Réunion Creole French' },
    { code: 'rhg-Latn', label: 'Rohingya (Latn)' },
    { code: 'rki', label: 'Rakhine' },
    { code: 'rkt', label: 'Rangpuri' },
    { code: 'rm', label: 'Romansh' },
    { code: 'rmc', label: 'Carpathian Romani' },
    { code: 'rn', label: 'Rundi' },
    { code: 'rom', label: 'Romani' },
    { code: 'ru-Latn', label: 'Russian (Latn)' },
    { code: 'rw', label: 'Kinyarwanda' },
    { code: 'rwo', label: 'Rawa' },
    { code: 'rwr', label: 'Marwari (India)' },
    { code: 'sa', label: 'Sanskrit' },
    { code: 'sah', label: 'Yakut' },
    { code: 'sat-Latn', label: 'Santali (Latn)' },
    { code: 'sd', label: 'Sindhi' },
    { code: 'sda', label: 'Toraja-Sa’dan' },
    { code: 'se', label: 'N. Sami' },
    { code: 'seh', label: 'Sena' },
    { code: 'sg', label: 'Sango' },
    { code: 'sgj', label: 'Surgujia' },
    { code: 'shn', label: 'Shan' },
    { code: 'shp', label: 'Shipibo-Conibo' },
    { code: 'shu', label: 'Chadian Arabic' },
    { code: 'si', label: 'Sinhala' },
    { code: 'sja', label: 'Epena' },
    { code: 'sjp', label: 'Surjapuri' },
    { code: 'sk', label: 'Slovak' },
    { code: 'skg', label: 'Sakalava Malagasy' },
    { code: 'skr', label: 'Saraiki' },
    { code: 'sl', label: 'Slovenian' },
    { code: 'sm', label: 'Samoan' },
    { code: 'smt', label: 'Simte' },
    { code: 'sn', label: 'Shona' },
    { code: 'so', label: 'Somali' },
    { code: 'spp', label: 'Supyire Senoufo' },
    { code: 'sq', label: 'Albanian' },
    { code: 'sr', label: 'Serbian' },
    { code: 'srm', label: 'Saramaccan' },
    { code: 'srn', label: 'Sranan Tongo' },
    { code: 'srr', label: 'Serer' },
    { code: 'ss', label: 'Swati' },
    { code: 'st', label: 'Sesotho' },
    { code: 'stq', label: 'Saterfriesisch' },
    { code: 'su', label: 'Sundanese' },
    { code: 'sus', label: 'Susu' },
    { code: 'suz', label: 'Sunwar' },
    { code: 'sv', label: 'Swedish' },
    { code: 'sw', label: 'Swahili' },
    { code: 'sxn', label: 'Sangir' },
    { code: 'sxu', label: 'Upper Saxon' },
    { code: 'syl', label: 'Sylheti' },
    { code: 'syl-Latn', label: 'Sylheti (Latn)' },
    { code: 'syr', label: 'Syriac' },
    { code: 'ta', label: 'Tamil' },
    { code: 'ta-Latn', label: 'Tamil (Latn)' },
    { code: 'tab', label: 'Tabassaran' },
    { code: 'taj', label: 'E. Tamang' },
    { code: 'tbz', label: 'Ditammari' },
    { code: 'tca', label: 'Ticuna' },
    { code: 'tcy', label: 'Tulu' },
    { code: 'tdx', label: 'Tandroy-Mahafaly Malagasy' },
    { code: 'te', label: 'Telugu' },
    { code: 'te-Latn', label: 'Telugu (Latn)' },
    { code: 'teo', label: 'Teso' },
    { code: 'tet', label: 'Tetum' },
    { code: 'tg', label: 'Tajik' },
    { code: 'th', label: 'Thai' },
    { code: 'ti', label: 'Tigrinya' },
    { code: 'tiv', label: 'Tiv' },
    { code: 'tk', label: 'Turkmen' },
    { code: 'tks', label: 'Takestani' },
    { code: 'tlh', label: 'Klingon' },
    { code: 'tll', label: 'Tetela' },
    { code: 'tly-IR', label: 'Talysh (Iran)' },
    { code: 'tn', label: 'Tswana' },
    { code: 'to', label: 'Tonga (Tonga Islands)' },
    { code: 'toj', label: 'Tojolabal' },
    { code: 'tpi', label: 'Tok Pisin' },
    { code: 'tr', label: 'Turkish' },
    { code: 'trp', label: 'Kok Borok' },
    { code: 'trw', label: 'Torwali' },
    { code: 'ts', label: 'Tsonga' },
    { code: 'tsc', label: 'Tswa' },
    { code: 'tsg', label: 'Tausug' },
    { code: 'tt', label: 'Tatar' },
    { code: 'tuc', label: 'Mutu' },
    { code: 'tuf', label: 'Central Tunebo' },
    { code: 'tvl', label: 'Tuvalu' },
    { code: 'twu', label: 'Termanu' },
    { code: 'tyv', label: 'Tuvinian' },
    { code: 'tyz', label: 'Tày' },
    { code: 'tzh', label: 'Tzeltal' },
    { code: 'tzj', label: 'Tz’utujil' },
    { code: 'tzo', label: 'Tzotzil' },
    { code: 'ubu', label: 'Umbu-Ungu' },
    { code: 'udm', label: 'Udmurt' },
    { code: 'ug', label: 'Uyghur' },
    { code: 'uk', label: 'Ukrainian' },
    { code: 'ur', label: 'Urdu' },
    { code: 'uz', label: 'Uzbek' },
    { code: 've', label: 'Venda' },
    { code: 'vec', label: 'Venetian' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'vkt', label: 'Tenggarong Kutai Malay' },
    { code: 'wa', label: 'Walloon' },
    { code: 'wal', label: 'Wolaytta' },
    { code: 'war', label: 'Waray (Philippines)' },
    { code: 'wo', label: 'Wolof' },
    { code: 'xal', label: 'Kalmyk' },
    { code: 'xh', label: 'Xhosa' },
    { code: 'xmm', label: 'Manado Malay' },
    { code: 'xnr', label: 'Kangri' },
    { code: 'xog', label: 'Soga' },
    { code: 'yap', label: 'Yapese' },
    { code: 'yaq', label: 'Yaqui' },
    { code: 'yi', label: 'Yiddish' },
    { code: 'ymm', label: 'Maay' },
    { code: 'yo', label: 'Yoruba' },
    { code: 'yua', label: 'Yucateco' },
    { code: 'yue', label: 'Cantonese' },
    { code: 'za', label: 'Zhuang' },
    { code: 'zap', label: 'Zapotec' },
    { code: 'zh', label: 'Mandarin Chinese' },
    { code: 'zh-Latn', label: 'Chinese (Latn)' },
    { code: 'zne', label: 'Zande' },
    { code: 'zu', label: 'Zulu' },
    { code: 'zyj', label: 'Youjiang Zhuang' },
    { code: 'zza', label: 'Zaza' },
] as const;


const languageMap = new Map<string, MutableLang>();
for (const raw of RAW_LANGUAGE_ROWS) {
    const canonical = canonicalizeBcp47(raw.code);
    if (!canonical) continue;
    const resolved = resolveAlias(canonical, LANGUAGE_CODE_ALIASES);
    if (!isNormalizedValid(resolved)) continue;
    const key = resolved.toLowerCase();
    if (BANNED_CODES.has(key)) continue;
    const labelOverride = LABEL_OVERRIDES[key];
    const label = labelOverride ?? raw.label;
    const nativeLabel = raw.nativeLabel?.trim() ? raw.nativeLabel : undefined;
    const existing = languageMap.get(key);
    if (!existing) {
        languageMap.set(key, { code: resolved, label, ...(nativeLabel ? { nativeLabel } : {}) });
    } else {
        if (labelOverride) existing.label = label;
        if (!existing.nativeLabel && nativeLabel) existing.nativeLabel = nativeLabel;
    }
}

const ordered = Array.from(languageMap.values());
ordered.sort((a, b) => a.label.localeCompare(b.label, 'en'));
const autoIndex = ordered.findIndex(item => item.code === AUTO_CODE);
if (autoIndex > 0) {
    const [auto] = ordered.splice(autoIndex, 1);
    ordered.unshift(auto);
}

export const LANGUAGES: Lang[] = ordered.map(lang => ({ ...lang }));

const LANGUAGE_LOOKUP = new Map<string, Lang>();
for (const lang of LANGUAGES) {
    LANGUAGE_LOOKUP.set(lang.code.toLowerCase(), lang);
}

export function getLanguageOptions(options?: { includeAuto?: boolean }): Lang[] {
    const { includeAuto = true } = options ?? {};
    const list = includeAuto ? LANGUAGES : LANGUAGES.filter(lang => lang.code !== AUTO_CODE);
    return list.map(lang => ({ ...lang }));
}
let fullLanguageCache: Lang[] | null = null;

export async function loadFullMadladLanguages(): Promise<Lang[]> {
    if (!fullLanguageCache) {
        fullLanguageCache = getLanguageOptions();
    }
    return fullLanguageCache.map(lang => ({ ...lang }));
}

export function labelFor(code: string): string {
    if (!code) return '';
    const canonical = canonicalizeBcp47(code);
    if (!canonical) return code;
    const resolved = resolveAlias(canonical, LANGUAGE_CODE_ALIASES);
    const entry = LANGUAGE_LOOKUP.get(resolved.toLowerCase());
    if (!entry) return resolved;
    return entry.nativeLabel ? `${entry.label} • ${entry.nativeLabel}` : entry.label;
}

export function codeForApi(code: string): string {
    const rawInput = code?.trim();
    if (!rawInput) {
        throw new LanguageCodeError('Language code is required');
    }

    const canonical = canonicalizeBcp47(rawInput);
    if (!canonical) {
        throw new LanguageCodeError(`Invalid language code: ${rawInput}`);
    }

    const resolved = resolveAlias(canonical, LANGUAGE_CODE_ALIASES);
    if (!isNormalizedValid(resolved)) {
        throw new LanguageCodeError(`Unsupported language code: ${rawInput}`);
    }
    if (resolved === AUTO_CODE) return AUTO_CODE;

    const canonicalResolved = canonicalizeBcp47(resolved);
    if (!canonicalResolved) {
        throw new LanguageCodeError(`Invalid language code: ${resolved}`);
    }

    const lower = canonicalResolved.toLowerCase();
    if (lower === 'zh-cn') return 'zh';
    if (lower === 'zh-tw' || lower === 'zh-hant') return 'zh_Hant';

    return canonicalResolved;
}