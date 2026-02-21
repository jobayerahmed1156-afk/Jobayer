import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, BookOpen, Play, Pause, Volume2, LayoutList, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchSurahs, fetchSurahDetail, fetchSurahTranslation, fetchSurahAudio, fetchSurahTransliteration, fetchJuz, fetchJuzTranslation, fetchJuzTransliteration, fetchJuzAudio, Surah, Ayah } from './services/quranApi';
import { analyzeRecitation } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const EDITIONS = [
  { id: 'bn.bengali', name: 'বাংলা', font: 'font-bengali' },
  { id: 'en.sahih', name: 'English', font: 'font-sans' },
  { id: 'ur.jalandhry', name: 'اردو', font: 'font-quran' },
  { id: 'hi.farooq', name: 'हिन्दी', font: 'font-sans' },
];

const QARIS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.abdulsamad', name: 'AbdulBaset AbdulSamad' },
  { id: 'ar.abdurrahmaansudais', name: 'Abdurrahmaan As-Sudais' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly' },
];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [browseMode, setBrowseMode] = useState<'surah' | 'juz'>('surah');
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [translations, setTranslations] = useState<Ayah[]>([]);
  const [transliterations, setTransliterations] = useState<Ayah[]>([]);
  const [ayahAudios, setAyahAudios] = useState<any[]>([]);
  const [selectedEdition, setSelectedEdition] = useState(EDITIONS[0]);
  const [selectedQari, setSelectedQari] = useState(QARIS[0]);
  const [viewMode, setViewMode] = useState<'list' | 'mushaf'>('list');
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isQariPlaying, setIsQariPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const qariAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleQariPlayback = (e: React.MouseEvent, audioUrl: string) => {
    e.stopPropagation();
    if (!qariAudioRef.current) return;

    if (isQariPlaying && qariAudioRef.current.src === audioUrl) {
      qariAudioRef.current.pause();
      setIsQariPlaying(false);
    } else {
      qariAudioRef.current.src = audioUrl;
      qariAudioRef.current.play();
      setIsQariPlaying(true);
    }
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const data = await fetchSurahs();
        setSurahs(data);
      } catch (error) {
        console.error("Failed to load surahs", error);
      } finally {
        setLoading(false);
      }
    };
    loadSurahs();
  }, []);

  const handleSurahSelect = async (surah: Surah) => {
    setLoading(true);
    setSelectedSurah(surah);
    setSelectedJuz(null);
    try {
      const [detail, trans, audios, translit] = await Promise.all([
        fetchSurahDetail(surah.number),
        fetchSurahTranslation(surah.number, selectedEdition.id),
        fetchSurahAudio(surah.number, selectedQari.id),
        fetchSurahTransliteration(surah.number)
      ]);
      setAyahs(detail.ayahs);
      setTranslations(trans);
      setAyahAudios(audios);
      setTransliterations(translit);
      setCurrentAyahIndex(0);
      setAnalysisResult(null);
    } catch (error) {
      console.error("Failed to load surah details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJuzSelect = async (juzNumber: number) => {
    setLoading(true);
    setSelectedJuz(juzNumber);
    setSelectedSurah(null);
    try {
      const [detail, trans, audios, translit] = await Promise.all([
        fetchJuz(juzNumber),
        fetchJuzTranslation(juzNumber, selectedEdition.id),
        fetchJuzAudio(juzNumber, selectedQari.id),
        fetchJuzTransliteration(juzNumber)
      ]);
      setAyahs(detail.ayahs);
      setTranslations(trans);
      setAyahAudios(audios);
      setTransliterations(translit);
      setCurrentAyahIndex(0);
      setAnalysisResult(null);
    } catch (error) {
      console.error("Failed to load juz details", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSurah || selectedJuz) {
      const updateData = async () => {
        try {
          if (selectedSurah) {
            const [trans, audios, translit] = await Promise.all([
              fetchSurahTranslation(selectedSurah.number, selectedEdition.id),
              fetchSurahAudio(selectedSurah.number, selectedQari.id),
              fetchSurahTransliteration(selectedSurah.number)
            ]);
            setTranslations(trans);
            setAyahAudios(audios);
            setTransliterations(translit);
          } else if (selectedJuz) {
            const [trans, audios, translit] = await Promise.all([
              fetchJuzTranslation(selectedJuz, selectedEdition.id),
              fetchJuzAudio(selectedJuz, selectedQari.id),
              fetchJuzTransliteration(selectedJuz)
            ]);
            setTranslations(trans);
            setAyahAudios(audios);
            setTransliterations(translit);
          }
        } catch (error) {
          console.error("Failed to update data", error);
        }
      };
      updateData();
    }
  }, [selectedEdition, selectedQari, selectedSurah, selectedJuz]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await handleAnalysis(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAnalysisResult(null);
      setRecordedAudioUrl(null);
    } catch (error) {
      console.error("Error accessing microphone", error);
      alert("Microphone access is required for recitation analysis.");
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !recordedAudioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAnalysis = async (audioBase64: string) => {
    setIsAnalyzing(true);
    try {
      const currentAyah = ayahs[currentAyahIndex];
      const result = await analyzeRecitation(audioBase64, currentAyah.text);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysisResult({
        feedback: "দুঃখিত, বিশ্লেষণ করা সম্ভব হয়নি। আবার চেষ্টা করুন।",
        score: 0,
        isCorrect: false
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextAyah = () => {
    if (currentAyahIndex < ayahs.length - 1) {
      setCurrentAyahIndex(prev => prev + 1);
      setAnalysisResult(null);
    }
  };

  const prevAyah = () => {
    if (currentAyahIndex > 0) {
      setCurrentAyahIndex(prev => prev - 1);
      setAnalysisResult(null);
    }
  };

  if (loading && !selectedSurah) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-quran-paper">
        <Loader2 className="w-12 h-12 animate-spin text-quran-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-quran-paper text-quran-ink selection:bg-quran-gold/20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-quran-paper/80 backdrop-blur-md border-b border-quran-gold/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-quran-gold rounded-full flex items-center justify-center text-white shadow-lg shadow-quran-gold/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Tarteel AI Clone</h1>
        </div>
        <div className="flex items-center gap-4">
          {(selectedSurah || selectedJuz) && (
            <div className="flex items-center gap-2">
              <select 
                value={selectedQari.id}
                onChange={(e) => {
                  const qari = QARIS.find(q => q.id === e.target.value);
                  if (qari) setSelectedQari(qari);
                }}
                className="text-[10px] font-bold bg-white border border-quran-gold/20 rounded-full px-3 py-1 text-quran-gold outline-none focus:ring-2 ring-quran-gold/20 transition-all"
              >
                {QARIS.map(q => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
              <select 
                value={selectedEdition.id}
                onChange={(e) => {
                  const edition = EDITIONS.find(ed => ed.id === e.target.value);
                  if (edition) setSelectedEdition(edition);
                }}
                className="text-[10px] font-bold bg-white border border-quran-gold/20 rounded-full px-3 py-1 text-quran-gold outline-none focus:ring-2 ring-quran-gold/20 transition-all"
              >
                {EDITIONS.map(ed => (
                  <option key={ed.id} value={ed.id}>{ed.name}</option>
                ))}
              </select>
            </div>
          )}
          {(selectedSurah || selectedJuz) && (
            <button 
              onClick={() => {
                setSelectedSurah(null);
                setSelectedJuz(null);
              }}
              className="text-sm font-medium text-quran-gold hover:underline transition-all"
            >
              Back
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 pb-32">
        {!selectedSurah && !selectedJuz ? (
          <div className="space-y-8">
            {/* Browse Mode Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white border border-quran-gold/10 p-1 rounded-2xl flex shadow-sm">
                <button
                  onClick={() => setBrowseMode('surah')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    browseMode === 'surah' ? "bg-quran-gold text-white shadow-md" : "text-quran-gold/40 hover:text-quran-gold"
                  )}
                >
                  সুরা (Surah)
                </button>
                <button
                  onClick={() => setBrowseMode('juz')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    browseMode === 'juz' ? "bg-quran-gold text-white shadow-md" : "text-quran-gold/40 hover:text-quran-gold"
                  )}
                >
                  পারা (Juz)
                </button>
              </div>
            </div>

            {browseMode === 'surah' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {surahs.map((surah) => (
                  <motion.button
                    key={surah.number}
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSurahSelect(surah)}
                    className="p-5 bg-white rounded-2xl border border-quran-gold/5 shadow-sm hover:shadow-md hover:border-quran-gold/20 transition-all text-left flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-quran-gold uppercase tracking-wider mb-1">
                        Surah {surah.number}
                      </div>
                      <div className="text-lg font-bold group-hover:text-quran-gold transition-colors">
                        {surah.englishName}
                      </div>
                      <div className="text-sm text-quran-ink/60 italic">
                        {surah.englishNameTranslation}
                      </div>
                    </div>
                    <div className="text-2xl font-quran text-quran-gold/80">
                      {surah.name}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                  <motion.button
                    key={juz}
                    onClick={() => handleJuzSelect(juz)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-8 bg-white rounded-[32px] border border-quran-gold/10 hover:border-quran-gold/30 hover:shadow-xl hover:shadow-quran-gold/5 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <span className="text-3xl font-bold text-quran-gold group-hover:scale-110 transition-transform">{juz}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">পারা / Juz</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Surah/Juz Title & View Toggle */}
            <div className="text-center space-y-4 mb-12 relative">
              <div className="absolute right-0 top-0 flex items-center bg-white border border-quran-gold/10 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-quran-gold text-white shadow-md" : "text-quran-gold/40 hover:text-quran-gold"
                  )}
                  title="List View"
                >
                  <LayoutList className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('mushaf')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'mushaf' ? "bg-quran-gold text-white shadow-md" : "text-quran-gold/40 hover:text-quran-gold"
                  )}
                  title="Mushaf View"
                >
                  <Book className="w-5 h-5" />
                </button>
              </div>

              {selectedSurah ? (
                <>
                  <h2 className="text-5xl font-quran text-quran-gold">{selectedSurah.name}</h2>
                  <div className="space-y-1">
                    <p className="text-xl font-medium opacity-60">{selectedSurah.englishName}</p>
                    <p className="text-sm italic opacity-40">{selectedSurah.englishNameTranslation}</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-5xl font-quran text-quran-gold">الجزء {selectedJuz}</h2>
                  <div className="space-y-1">
                    <p className="text-xl font-medium opacity-60">Juz {selectedJuz}</p>
                    <p className="text-sm italic opacity-40">পারা {selectedJuz}</p>
                  </div>
                </>
              )}
              
              {(selectedSurah?.number !== 9 && !selectedJuz) && (
                <div className="pt-8">
                  <p className="text-4xl font-quran text-quran-ink opacity-80">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                </div>
              )}
            </div>

            {/* Ayahs List / Mushaf View */}
            {viewMode === 'list' ? (
              <div className="space-y-6 pb-20">
                {ayahs.map((ayah, index) => {
                  const isCurrent = currentAyahIndex === index;
                  const result = isCurrent ? analysisResult : null;

                  return (
                    <motion.div
                      key={ayah.number}
                      onClick={() => {
                        setCurrentAyahIndex(index);
                        setAnalysisResult(null);
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "relative p-8 rounded-[32px] border transition-all cursor-pointer group",
                        isCurrent 
                          ? "bg-white border-quran-gold/30 shadow-xl shadow-quran-gold/10 ring-2 ring-quran-gold/5" 
                          : "bg-white/40 border-transparent hover:border-quran-gold/10 hover:bg-white/60"
                      )}
                    >
                      <div className="text-right">
                        <div className="text-3xl md:text-4xl lg:text-5xl font-quran font-bold leading-[2.2] text-quran-ink inline-block w-full">
                          {result?.wordAnalysis ? (
                            <span className="inline-flex flex-wrap justify-end gap-x-4 gap-y-2">
                              {result.wordAnalysis.map((item: any, idx: number) => (
                                <span 
                                  key={idx} 
                                  className={cn(
                                    "transition-all duration-500",
                                    item.status === 'correct' && "text-emerald-600",
                                    item.status === 'incorrect' && "text-red-500 underline decoration-wavy decoration-red-300 underline-offset-8",
                                    item.status === 'missing' && "text-amber-500 opacity-30"
                                  )}
                                >
                                  {item.word}
                                </span>
                              ))}
                            </span>
                          ) : (
                            ayah.text
                          )}
                          {/* Ayah Marker Symbol */}
                          <span className="inline-flex items-center justify-center w-10 h-10 mx-4 rounded-full border-2 border-quran-gold/20 text-sm font-bold text-quran-gold align-middle">
                            {ayah.numberInSurah}
                          </span>
                        </div>
                      </div>

                      {/* Translation & Qari Audio */}
                      <div className="mt-6 flex items-end justify-between gap-4">
                        <div className="text-left flex-1 space-y-3">
                          {transliterations[index] && (
                            <p className="text-sm font-medium text-quran-gold/80 italic leading-relaxed">
                              <span className="text-[10px] uppercase tracking-wider opacity-50 block mb-1">উচ্চারণ:</span>
                              {transliterations[index].text}
                            </p>
                          )}
                          <p className={cn(
                            "text-lg opacity-60 leading-relaxed border-t border-quran-gold/5 pt-2",
                            selectedEdition.font
                          )}>
                            <span className="text-[10px] uppercase tracking-wider opacity-50 block mb-1">অর্থ:</span>
                            {translations[index]?.text}
                          </p>
                        </div>
                        <button
                          onClick={(e) => toggleQariPlayback(e, ayahAudios[index]?.audio)}
                          className={cn(
                            "shrink-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                            isQariPlaying && qariAudioRef.current?.src === ayahAudios[index]?.audio
                              ? "bg-quran-gold text-white border-quran-gold shadow-lg shadow-quran-gold/20"
                              : "bg-white text-quran-gold border-quran-gold/20 hover:border-quran-gold/40 hover:bg-quran-gold/5"
                          )}
                          title="Listen to Qari"
                        >
                          {isQariPlaying && qariAudioRef.current?.src === ayahAudios[index]?.audio ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      <audio 
                        ref={qariAudioRef} 
                        onEnded={() => setIsQariPlaying(false)}
                        className="hidden"
                      />

                      {/* Analysis Result Inline */}
                      <AnimatePresence>
                        {isCurrent && (analysisResult || isAnalyzing) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-8 pt-6 border-t border-quran-gold/10"
                          >
                            {isAnalyzing && !analysisResult && (
                              <div className="flex items-center gap-3 p-4 bg-quran-gold/5 rounded-2xl mb-4">
                                <Loader2 className="w-5 h-5 animate-spin text-quran-gold" />
                                <span className="text-sm font-medium bengali-text opacity-60">আপনার তিলাওয়াত বিশ্লেষণ করা হচ্ছে...</span>
                              </div>
                            )}

                            {recordedAudioUrl && (
                              <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl mb-4 border border-quran-gold/10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlayback();
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-quran-gold/20 text-xs font-bold text-quran-gold hover:bg-quran-gold/5 transition-all shadow-sm"
                                >
                                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  {isPlaying ? "থামান" : "আপনার তিলাওয়াত শুনুন"}
                                </button>
                                <audio 
                                  ref={audioPlayerRef} 
                                  src={recordedAudioUrl} 
                                  onEnded={() => setIsPlaying(false)}
                                  className="hidden"
                                />
                              </div>
                            )}

                            {analysisResult && (
                              <div className={cn(
                                "p-4 rounded-2xl flex flex-col gap-4",
                                analysisResult.isCorrect ? "bg-emerald-50/50" : "bg-amber-50/50"
                              )}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {analysisResult.isCorrect ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <AlertCircle className="w-5 h-5 text-amber-600" />
                                    )}
                                    <h4 className="font-bold bengali-text">
                                      {analysisResult.isCorrect ? "অসাধারণ!" : "সংশোধন প্রয়োজন"}
                                    </h4>
                                  </div>
                                  <span className="text-xl font-bold text-quran-gold">{analysisResult.score}%</span>
                                </div>
                                <p className="text-sm text-quran-ink/80 bengali-text">
                                  {analysisResult.feedback}
                                </p>

                                {/* Detailed Word-by-Word Guide */}
                                {analysisResult.wordAnalysis?.some((w: any) => w.status === 'incorrect') && (
                                  <div className="space-y-3 mt-4">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-quran-gold/60 bengali-text">উচ্চারণ নির্দেশিকা:</h5>
                                    <div className="grid gap-3">
                                      {analysisResult.wordAnalysis.filter((w: any) => w.status === 'incorrect').map((item: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-white/60 rounded-xl border border-red-100 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-2xl font-quran text-red-600">{item.word}</span>
                                            <button
                                              onClick={(e) => toggleQariPlayback(e, ayahAudios[index]?.audio)}
                                              className="text-[10px] font-bold text-quran-gold hover:underline flex items-center gap-1"
                                            >
                                              <Volume2 className="w-3 h-3" />
                                              ক্বারীর তিলাওয়াতে শুনুন
                                            </button>
                                          </div>
                                          <p className="text-xs bengali-text text-quran-ink/70 leading-relaxed">
                                            {item.pronunciationGuide || item.feedback}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Prominent Qari Playback if incorrect */}
                                {!analysisResult.isCorrect && (
                                  <button
                                    onClick={(e) => toggleQariPlayback(e, ayahAudios[index]?.audio)}
                                    className="flex items-center gap-2 px-4 py-3 bg-quran-gold text-white rounded-xl text-sm font-bold hover:bg-quran-gold/90 transition-all shadow-md w-fit"
                                  >
                                    <Volume2 className="w-5 h-5" />
                                    ক্বারীর সঠিক উচ্চারণ শুনুন
                                  </button>
                                )}
                                
                                {/* Legend */}
                                <div className="flex items-center gap-4 pt-1 text-[9px] uppercase tracking-widest font-bold opacity-40">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>সঠিক</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>ভুল</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>বাদ</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[48px] border border-quran-gold/10 shadow-2xl shadow-quran-gold/5 mb-20">
                <div className="text-right leading-[3] text-4xl md:text-5xl lg:text-6xl font-quran font-bold text-quran-ink">
                  {ayahs.map((ayah, index) => {
                    const isCurrent = currentAyahIndex === index;
                    const result = isCurrent ? analysisResult : null;
                    
                    return (
                      <span 
                        key={ayah.number}
                        onClick={() => {
                          setCurrentAyahIndex(index);
                          setAnalysisResult(null);
                        }}
                        className={cn(
                          "cursor-pointer transition-all duration-300 rounded-lg px-2 py-1",
                          isCurrent ? "bg-quran-gold/10 ring-2 ring-quran-gold/20" : "hover:bg-quran-gold/5"
                        )}
                      >
                        {result?.wordAnalysis ? (
                          <span className="inline-flex flex-wrap gap-x-4">
                            {result.wordAnalysis.map((item: any, idx: number) => (
                              <span 
                                key={idx} 
                                className={cn(
                                  item.status === 'correct' && "text-emerald-600",
                                  item.status === 'incorrect' && "text-red-500 underline decoration-wavy decoration-red-300 underline-offset-8",
                                  item.status === 'missing' && "text-amber-500 opacity-30"
                                )}
                              >
                                {item.word}
                              </span>
                            ))}
                          </span>
                        ) : (
                          ayah.text
                        )}
                        <span className="inline-flex items-center justify-center w-12 h-12 mx-4 rounded-full border-2 border-quran-gold/20 text-base font-bold text-quran-gold align-middle">
                          {ayah.numberInSurah}
                        </span>
                      </span>
                    );
                  })}
                </div>
                
                {/* Inline Analysis for Mushaf View */}
                <AnimatePresence>
                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-12 p-8 bg-quran-paper rounded-3xl border border-quran-gold/10"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          {analysisResult.isCorrect ? <CheckCircle2 className="text-emerald-600" /> : <AlertCircle className="text-amber-600" />}
                          <h4 className="font-bold text-xl bengali-text">আয়াত {ayahs[currentAyahIndex]?.numberInSurah} এর বিশ্লেষণ</h4>
                        </div>
                        <span className="text-3xl font-bold text-quran-gold">{analysisResult.score}%</span>
                      </div>
                      <p className="bengali-text text-quran-ink/80 mb-6">{analysisResult.feedback}</p>
                      
                      {/* Translation & Transliteration in Mushaf View */}
                      <div className="mb-8 p-6 bg-white/40 rounded-2xl border border-quran-gold/5 space-y-4">
                        {transliterations[currentAyahIndex] && (
                          <p className="text-sm font-medium text-quran-gold/80 italic leading-relaxed">
                            <span className="text-[10px] uppercase tracking-wider opacity-50 block mb-1">উচ্চারণ:</span>
                            {transliterations[currentAyahIndex].text}
                          </p>
                        )}
                        <p className={cn(
                          "text-lg opacity-60 leading-relaxed border-t border-quran-gold/5 pt-2",
                          selectedEdition.font
                        )}>
                          <span className="text-[10px] uppercase tracking-wider opacity-50 block mb-1">অর্থ:</span>
                          {translations[currentAyahIndex]?.text}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <button
                          onClick={togglePlayback}
                          className="flex items-center gap-2 px-6 py-3 bg-white border border-quran-gold/20 rounded-full text-sm font-bold text-quran-gold"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          আপনার তিলাওয়াত
                        </button>
                        <button
                          onClick={(e) => toggleQariPlayback(e, ayahAudios[currentAyahIndex]?.audio)}
                          className="flex items-center gap-2 px-6 py-3 bg-quran-gold text-white rounded-full text-sm font-bold"
                        >
                          <Volume2 className="w-4 h-4" />
                          ক্বারীর তিলাওয়াত
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Recording Controls */}
      {(selectedSurah || selectedJuz) && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-quran-paper via-quran-paper to-transparent">
          <div className="max-w-md mx-auto flex items-center justify-center gap-6">
            <div className="relative">
              {isRecording && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-red-500 rounded-full"
                />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAnalyzing}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl",
                  isRecording ? "bg-red-500 text-white" : "bg-quran-gold text-white hover:scale-105 active:scale-95",
                  isAnalyzing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isRecording ? (
                  <Square className="w-8 h-8 fill-current" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>
          </div>
          <p className="text-center mt-4 text-sm font-medium opacity-40 bengali-text">
            {isAnalyzing ? "বিশ্লেষণ করা হচ্ছে..." : isRecording ? "তিলাওয়াত করুন..." : "তিলাওয়াত শুরু করতে বাটনে চাপ দিন"}
          </p>
        </div>
      )}
    </div>
  );
}
