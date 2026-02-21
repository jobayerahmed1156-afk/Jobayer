export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

const BASE_URL = "https://api.alquran.cloud/v1";

export const fetchSurahs = async (): Promise<Surah[]> => {
  const response = await fetch(`${BASE_URL}/surah`);
  const data = await response.json();
  return data.data;
};

export const fetchSurahDetail = async (surahNumber: number): Promise<{ ayahs: Ayah[], name: string, englishName: string }> => {
  const response = await fetch(`${BASE_URL}/surah/${surahNumber}`);
  const data = await response.json();
  return data.data;
};

export const fetchSurahTranslation = async (surahNumber: number, edition: string): Promise<Ayah[]> => {
  const response = await fetch(`${BASE_URL}/surah/${surahNumber}/${edition}`);
  const data = await response.json();
  return data.data.ayahs;
};

export const fetchSurahAudio = async (surahNumber: number, edition: string): Promise<any[]> => {
  const response = await fetch(`${BASE_URL}/surah/${surahNumber}/${edition}`);
  const data = await response.json();
  return data.data.ayahs;
};

export const fetchSurahTransliteration = async (surahNumber: number): Promise<Ayah[]> => {
  // Using a common transliteration edition if available, otherwise fallback
  try {
    const response = await fetch(`${BASE_URL}/surah/${surahNumber}/en.transliteration`);
    const data = await response.json();
    return data.data.ayahs;
  } catch (e) {
    return [];
  }
};

export const fetchJuz = async (juzNumber: number): Promise<{ ayahs: Ayah[], surahs: any }> => {
  const response = await fetch(`${BASE_URL}/juz/${juzNumber}/quran-simple`);
  const data = await response.json();
  return data.data;
};

export const fetchJuzTranslation = async (juzNumber: number, edition: string): Promise<Ayah[]> => {
  const response = await fetch(`${BASE_URL}/juz/${juzNumber}/${edition}`);
  const data = await response.json();
  return data.data.ayahs;
};

export const fetchJuzTransliteration = async (juzNumber: number): Promise<Ayah[]> => {
  try {
    const response = await fetch(`${BASE_URL}/juz/${juzNumber}/en.transliteration`);
    const data = await response.json();
    return data.data.ayahs;
  } catch (e) {
    return [];
  }
};

export const fetchJuzAudio = async (juzNumber: number, edition: string): Promise<any[]> => {
  const response = await fetch(`${BASE_URL}/juz/${juzNumber}/${edition}`);
  const data = await response.json();
  return data.data.ayahs;
};
