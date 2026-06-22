import dotenv from "dotenv";
dotenv.config();

interface FormattedCountry {
  country: string;
  flag: string;
  language: string;
  nativeLanguage: string;
  code: string;
}

// Target countries with their possible identifiers
const TARGET_COUNTRIES = [
  { name: 'United States', identifiers: ['United States', 'United States of America', 'USA', 'US', 'America'] },
  { name: 'France', identifiers: ['France', 'French Republic', 'FR'] },
  { name: 'Spain', identifiers: ['Spain', 'Kingdom of Spain', 'ES'] },
  { name: 'Brazil', identifiers: ['Brazil', 'Federative Republic of Brazil', 'BR'] },
  { name: 'Germany', identifiers: ['Germany', 'Federal Republic of Germany', 'DE'] },
  { name: 'Italy', identifiers: ['Italy', 'Italian Republic', 'IT'] },
  { name: 'Netherlands', identifiers: ['Netherlands', 'Holland', 'NL'] },
  { name: 'China', identifiers: ['China', "People's Republic of China", 'CN'] },
  { name: 'Taiwan', identifiers: ['Taiwan', 'Republic of China', 'TW'] },
  { name: 'Japan', identifiers: ['Japan', 'JP'] },
  { name: 'South Korea', identifiers: ['South Korea', 'Korea', 'Republic of Korea', 'KR'] },
  { name: 'India', identifiers: ['India', 'Republic of India', 'IN'] },
  { name: 'Kenya', identifiers: ['Kenya', 'Republic of Kenya', 'KE'] },
  { name: 'Nigeria', identifiers: ['Nigeria', 'Federal Republic of Nigeria', 'NG'] },
  { name: 'Ethiopia', identifiers: ['Ethiopia', 'Federal Democratic Republic of Ethiopia', 'ET'] },
  { name: 'Saudi Arabia', identifiers: ['Saudi Arabia', 'Kingdom of Saudi Arabia', 'SA'] },
  { name: 'Russia', identifiers: ['Russia', 'Russian Federation', 'RU'] },
  { name: 'Ukraine', identifiers: ['Ukraine', 'UA'] },
];

// Language codes to language names and native names (from your document)
const LANGUAGE_MAP: Record<string, { name: string; nativeName: string }> = {
  'en': { name: 'English', nativeName: 'English' },
  'fr': { name: 'French', nativeName: 'Français' },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'pt': { name: 'Portuguese', nativeName: 'Português' },
  'de': { name: 'German', nativeName: 'Deutsch' },
  'it': { name: 'Italian', nativeName: 'Italiano' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands' },
  'zh': { name: 'Chinese (Simplified)', nativeName: '简体中文' },
  'ja': { name: 'Japanese', nativeName: '日本語' },
  'ko': { name: 'Korean', nativeName: '한국어' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी' },
  'sw': { name: 'Swahili', nativeName: 'Kiswahili' },
  'yo': { name: 'Yorùbá', nativeName: 'Yorùbá' },
  'ig': { name: 'Igbo', nativeName: 'Asụsụ Igbo' },
  'ha': { name: 'Hausa', nativeName: 'Hausa' },
  'am': { name: 'Amharic', nativeName: 'አማርኛ' },
  'ar': { name: 'Arabic', nativeName: 'العربية' },
  'ru': { name: 'Russian', nativeName: 'Русский' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська' },
};

// Map language codes to country alpha2 codes (from your document)
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  'en': 'US',
  'fr': 'FR',
  'es': 'ES',
  'pt': 'BR',
  'de': 'DE',
  'it': 'IT',
  'nl': 'NL',
  'zh': 'CN',
  'ja': 'JP',
  'ko': 'KR',
  'hi': 'IN',
  'sw': 'KE',
  'yo': 'NG',
  'ig': 'NG',
  'ha': 'NG',
  'am': 'ET',
  'ar': 'SA',
  'ru': 'RU',
  'uk': 'UA',
};

// Nigeria languages
const NIGERIA_LANGUAGES = ['yo', 'ig', 'ha'];

export class WeirdService {
  static async FetchCountries() {
    try {
      // Fetch all countries
      const res = await fetch(
        "https://api.restcountries.com/countries/v5?limit=200",
        {
          headers: {
            Authorization: `Bearer ${process.env.CONTRIES_API}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log(data);
        return null;
      }

      const countries = data?.data?.objects || [];
      
      console.log(`Fetched ${countries.length} countries from API`);

      // Create maps for lookup
      const alpha2Map = new Map();
      const nameMap = new Map();
      
      countries.forEach((country: any) => {
        const alpha2 = country?.codes?.alpha_2 || '';
        const commonName = country?.names?.common || '';
        const officialName = country?.names?.official || '';
        
        // Store by alpha2
        if (alpha2) {
          alpha2Map.set(alpha2, country);
        }
        
        // Store by common name
        if (commonName) {
          nameMap.set(commonName, country);
        }
        
        // Store by official name
        if (officialName) {
          nameMap.set(officialName, country);
        }
        
        // Log some countries to see what's available
        if (['United States', 'Nigeria', 'France', 'Germany', 'China'].includes(commonName)) {
          console.log(`Found: ${commonName} (${alpha2})`);
        }
      });

      const formattedCountries: FormattedCountry[] = [];

      // Process each target country
      for (const target of TARGET_COUNTRIES) {
        let countryData = null;
        let foundIdentifier = '';

        // Try to find by any identifier
        for (const identifier of target.identifiers) {
          // Check if it's an alpha2 code
          if (identifier.length === 2 && alpha2Map.has(identifier)) {
            countryData = alpha2Map.get(identifier);
            foundIdentifier = identifier;
            break;
          }
          // Check if it matches a name
          if (nameMap.has(identifier)) {
            countryData = nameMap.get(identifier);
            foundIdentifier = identifier;
            break;
          }
        }

        if (countryData) {
          const languages = countryData?.languages || [];
          const countryName = countryData?.names?.common || target.name;
          const flagUrl = countryData?.flag?.url_svg || countryData?.flag?.url_png || '';
          const alpha2 = countryData?.codes?.alpha_2 || '';
          
          // Determine which language codes to use for this country
          let langCodes: string[] = [];
          
          // Find the language codes from our mapping
          for (const [langCode, countryCode] of Object.entries(LANGUAGE_TO_COUNTRY)) {
            if (countryCode === alpha2) {
              langCodes.push(langCode);
            }
          }
          
          // Special case for Nigeria - add all three languages
          if (alpha2 === 'NG') {
            langCodes = ['yo', 'ig', 'ha'];
          }
          
          // If no language codes found, try to get from API
          if (langCodes.length === 0) {
            const apiLang = languages[0] || {};
            const langCode = apiLang?.iso639_1 || apiLang?.iso639_3 || '';
            if (langCode) {
              langCodes = [langCode];
            }
          }
          
          // Create entries for each language
          for (const langCode of langCodes) {
            const langInfo = languages.find((l: any) => 
              (l.iso639_1 || l.iso639_3) === langCode
            );
            
            const mappedLang = LANGUAGE_MAP[langCode];
            
            formattedCountries.push({
              country: countryName,
              flag: flagUrl,
              language: mappedLang?.name || langInfo?.name || langCode,
              nativeLanguage: mappedLang?.nativeName || langInfo?.native_name || langCode,
              code: langCode,
            });
          }
          
          console.log(`✅ Found: ${countryName} (${alpha2}) - ${langCodes.join(', ')}`);
        } else {
          console.warn(`⚠️ Country not found: ${target.name}`);
        }
      }

      return {
        message: "Countries fetched successfully",
        data: formattedCountries,
      };
    } catch (error) {
      console.error(error);
      return {
        message: "Error fetching countries",
        data: [],
      };
    }
  }
}