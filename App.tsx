
import React, { useState, useEffect } from 'react';
import { analyzeImage, translateResult } from './geminiService';
import { AnalysisResult, SUPPORTED_LANGUAGES, Language } from './types';
import { AudioControl } from './components/AudioControl';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [englishResult, setEnglishResult] = useState<AnalysisResult | null>(null);
  const [translatedResult, setTranslatedResult] = useState<AnalysisResult | null>(null);
  const [selectedLang, setSelectedLang] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setEnglishResult(null);
        setTranslatedResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const base64Data = image.split(',')[1];
      const data = await analyzeImage(base64Data);
      setEnglishResult(data);
      
      if (selectedLang.code !== 'en') {
        setIsTranslating(true);
        const translated = await translateResult(data, selectedLang.name);
        setTranslatedResult(translated);
      } else {
        setTranslatedResult(data);
      }
    } catch (err: any) {
      console.error("App Analysis Error:", err);
      setError("AI was unable to process this image. Please ensure it is a clear JPG/PNG.");
    } finally {
      setIsAnalyzing(false);
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = async (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) return;
    setSelectedLang(lang);

    if (englishResult) {
      setIsTranslating(true);
      setError(null);
      try {
        const translated = await translateResult(englishResult, lang.name);
        setTranslatedResult(translated);
      } catch (err) {
        console.error("App Translation Error:", err);
        setError("Translation failed. Results will remain in English.");
        setTranslatedResult(englishResult);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const downloadReport = () => {
    const resultToUse = translatedResult || englishResult;
    if (!resultToUse) return;
    
    const detailedStr = resultToUse.detailedAnalysis 
      ? Object.entries(resultToUse.detailedAnalysis).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n')
      : "Data unavailable";

    const content = `VISIONARY IMAGE ANALYSIS REPORT\nLanguage: ${selectedLang.name}\n\n1. PRIMARY: ${resultToUse.primaryCaption}\n\n2. VARIANTS:\n${(resultToUse.variants || []).join('\n')}\n\n3. NARRATIVE: ${resultToUse.comprehensiveParagraph}\n\n4. DETAILS:\n${detailedStr}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VisionaryReport_${selectedLang.code}.txt`;
    link.click();
  };

  const currentResult = translatedResult || englishResult;

  return (
    <div className="min-h-screen pb-20 bg-slate-50 selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Visionary</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedLang.code}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-100 border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer hover:bg-slate-200 transition-colors"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            {image && (
              <button 
                onClick={() => { setImage(null); setEnglishResult(null); setTranslatedResult(null); setError(null); }}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {!image ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-8 w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Vision-to-Language Intelligence</h2>
            <p className="text-slate-500 max-w-lg mb-12 text-lg">Upload any scene to receive deep structural analysis, multi-lingual narratives, and crystal-clear voice insights.</p>
            <label className="cursor-pointer bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 inline-block">
              Upload Image
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6 lg:sticky lg:top-24 h-fit">
              <div className="bg-white p-3 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
                <img src={image} alt="Target" className="w-full h-auto rounded-2xl object-contain max-h-[70vh]" />
              </div>
              
              {!currentResult && !isAnalyzing && (
                <button 
                  onClick={startAnalysis}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Analyze Visuals
                </button>
              )}

              {(isAnalyzing || isTranslating) && (
                <div className="bg-white p-8 rounded-3xl border border-indigo-50 shadow-xl text-center space-y-4">
                  <div className="flex justify-center gap-1.5">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                  </div>
                  <p className="font-black text-slate-800 text-xl">{isAnalyzing ? "Processing Vision..." : "Translating Context..."}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700 font-bold text-center">
                  {error}
                </div>
              )}

              {currentResult && (
                <button 
                  onClick={downloadReport}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export Data (.txt)
                </button>
              )}
            </div>

            <div className="space-y-8">
              {currentResult ? (
                <>
                  <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Caption</h3>
                      <AudioControl text={currentResult.primaryCaption || ""} />
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-tight">
                      {currentResult.primaryCaption || "Analysis pending..."}
                    </p>
                  </section>

                  <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diverse Perspectives</h3>
                    <div className="space-y-4">
                      {(currentResult.variants || []).map((v, i) => (
                        <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl group border border-slate-100 hover:border-indigo-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-black text-slate-300">Persp {i + 2}</span>
                            <AudioControl text={v} className="bg-white/80" />
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed">{v}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Narrative Analysis</h3>
                      <AudioControl text={currentResult.comprehensiveParagraph || ""} />
                    </div>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium italic">
                      {currentResult.comprehensiveParagraph || "N/A"}
                    </p>
                  </section>

                  {currentResult.detailedAnalysis && (
                    <section className="bg-slate-900 p-8 rounded-3xl shadow-2xl space-y-8">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Deep Structural Matrix</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                        {Object.entries(currentResult.detailedAnalysis).map(([key, value]) => (
                          <div key={key} className="space-y-1.5 group">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest group-hover:text-indigo-400 transition-colors">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <p className="text-sm font-bold text-slate-100 border-l-2 border-slate-800 pl-4 group-hover:border-indigo-500 transition-all capitalize">
                              {String(value || "Unknown")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 h-[500px] rounded-3xl flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <h4 className="text-xl font-bold text-slate-500 uppercase tracking-widest">Awaiting Analysis</h4>
                  <p className="mt-2 text-sm text-slate-400">Click the button to process pixels into meaningful descriptors.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
