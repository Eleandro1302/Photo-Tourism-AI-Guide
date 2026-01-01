
import React, { useState, useEffect, useMemo } from 'react';
import { analyzeImage, fetchLandmarkDetails, generateNarration, fetchNearbyHistoricalPlaces } from './services/geminiService';
import FileUploader from './components/FileUploader';
import Spinner from './components/Spinner';
import AudioPlayer from './components/AudioPlayer';
import CitationCard from './components/CitationCard';
import { GroundingChunk } from './types';
import { translations, languageMap } from './translations';

type OutputFormat = 'textOnly' | 'audioOnly' | 'textAndAudio';

const App: React.FC = () => {
  const [landmarkName, setLandmarkName] = useState<string>('');
  const [history, setHistory] = useState<string>('');
  const [audioData, setAudioData] = useState<string | null>(null);
  const [citations, setCitations] = useState<GroundingChunk[]>([]);
  const [language, setLanguage] = useState<string>(languageMap[navigator.language.split('-')[0]] || 'English');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('textAndAudio');
  const [nearbyPlaces, setNearbyPlaces] = useState<{name: string, type: string, distance: string}[]>([]);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string>('');

  const t = (key: string, vars: { [key: string]: string } = {}): string => {
    let text = translations[language]?.[key] || translations['English'][key];
    if (!text) return key; 
    Object.keys(vars).forEach(varKey => {
        text = text.replace(new RegExp(`{${varKey}}`, 'g'), vars[varKey]);
    });
    return text;
  };

  const resetState = () => {
    setLandmarkName('');
    setHistory('');
    setAudioData(null);
    setCitations([]);
    setNearbyPlaces([]);
    setError('');
  };

  const processOutput = async (name: string, loc?: { latitude: number; longitude: number }) => {
    try {
        setLoadingStep(t('fetchingHistory', { landmarkName: name }));
        const { text, citations } = await fetchLandmarkDetails(name, language, loc);
        setHistory(text);
        setCitations(citations);

        if (outputFormat !== 'textOnly') {
            setLoadingStep(t('creatingAudio'));
            const audio = await generateNarration(text, language);
            setAudioData(audio);
        }
    } catch (err: any) {
        setError(err.message || t('error'));
    } finally {
        setIsLoading(false);
    }
  };

  const handleDiscoverNearby = async () => {
    setIsLoading(true);
    setError('');
    resetState();
    setLoadingStep(t('findingLocation'));

    if (!navigator.geolocation) {
      setError("Seu navegador não suporta geolocalização.");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setLocation(coords);
            
            try {
                setLoadingStep(t('searchingNearby'));
                const places = await fetchNearbyHistoricalPlaces(coords, language);
                if (places.length === 0) {
                  setError("Nenhum local histórico encontrado exatamente nesta área. Tente se mover um pouco.");
                } else {
                  setNearbyPlaces(places);
                }
            } catch (err: any) {
                setError("Erro ao buscar lugares: " + (err.message || t('error')));
            } finally {
                setIsLoading(false);
            }
        },
        (err) => {
            setError(`${t('locationError')} (${err.message})`);
            setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLoadMore = async () => {
    if (!location) return;
    setIsLoadingMore(true);
    setError('');

    try {
        const currentNames = nearbyPlaces.map(p => p.name);
        const newPlaces = await fetchNearbyHistoricalPlaces(location, language, currentNames);
        
        if (newPlaces.length === 0) {
             // Optional: Alert user or just do nothing
        } else {
            setNearbyPlaces(prev => [...prev, ...newPlaces]);
        }
    } catch (err: any) {
        setError("Erro ao carregar mais: " + (err.message || t('error')));
    } finally {
        setIsLoadingMore(false);
    }
  };

  const selectPlace = async (name: string) => {
    setIsLoading(true);
    setNearbyPlaces([]);
    setLandmarkName(name);
    await processOutput(name, location);
  };

  const handleImageUpload = async (base64Image: string) => {
    resetState();
    setIsLoading(true);
    
    // 1. Tentar obter localização primeiro para dar contexto à IA
    setLoadingStep(t('findingLocation'));
    let currentLoc: { latitude: number; longitude: number } | undefined;
    
    if (navigator.geolocation) {
        try {
            currentLoc = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    (err) => {
                        console.warn("Could not retrieve location during image upload", err);
                        resolve(undefined);
                    },
                    { timeout: 4000, enableHighAccuracy: true }
                );
            });
        } catch (e) {
            console.warn(e);
        }
    }

    if (currentLoc) {
        setLocation(currentLoc);
    }

    // 2. Analisar imagem com o contexto de localização
    setLoadingStep(t('identifyingLandmark'));
    
    try {
      // Passamos o 'language' aqui também para o nome do local vir traduzido se possível
      const { landmarkName: name } = await analyzeImage(base64Image, language, currentLoc);
      setLandmarkName(name);
      await processOutput(name, currentLoc || location);
    } catch (err: any) {
      setError(err.message || t('error'));
      setIsLoading(false);
    }
  };

  const realPhotosLink = useMemo(() => {
    const mapsChunk = citations.find(c => c.maps?.uri);
    return mapsChunk?.maps?.uri || null;
  }, [citations]);

  const hasResults = isLoading || !!error || nearbyPlaces.length > 0 || (!!landmarkName && (!!history || !!audioData));

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#050505] text-gray-900 dark:text-gray-100 py-10 px-4 sm:px-8 font-sans transition-colors duration-300 flex flex-col justify-center items-center">
      <div className="max-w-5xl w-full mx-auto space-y-12">
        <header className="text-center space-y-6">
          <div className="inline-flex items-center justify-center space-x-3 px-6 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-900/50">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{t('activeLocation')}</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tightest leading-none text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-2xl mx-auto leading-relaxed">{t('subtitle')}</p>
          </div>
        </header>

        <main className={`grid gap-10 lg:gap-12 items-center transition-all duration-500 ease-in-out ${hasResults ? 'lg:grid-cols-2 w-full' : 'max-w-2xl mx-auto w-full'}`}>
          <div className="space-y-8 w-full">
            <section className="bg-white dark:bg-[#0D0D0D] p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 space-y-8 w-full">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block pl-2">{t('chooseLanguage')}</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold appearance-none cursor-pointer transition-all shadow-sm text-gray-700 dark:text-gray-200"
                  >
                    {Object.keys(translations).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block pl-2">{t('chooseFormat')}</label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {(['textOnly', 'audioOnly', 'textAndAudio'] as OutputFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          outputFormat === fmt 
                          ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {t(fmt)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleDiscoverNearby}
                disabled={isLoading}
                className="w-full py-8 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center space-x-4"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                <span>{t('discoverNearby')}</span>
              </button>
            </section>

            <FileUploader 
              onUpload={handleImageUpload} 
              dragAndDropText={t('dragAndDrop')}
              orText={t('or')}
              useCameraText={t('useCamera')}
              fromGalleryText={t('fromGallery')}
            />
          </div>

          <div className="space-y-8 w-full">
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-[#0D0D0D] rounded-[2.5rem] border-4 border-dashed border-gray-100 dark:border-gray-800 animate-pulse text-center h-full min-h-[400px]">
                <Spinner />
                <p className="mt-8 text-2xl font-black text-blue-600 uppercase tracking-tighter animate-bounce">{loadingStep}</p>
              </div>
            )}

            {error && (
              <div className="p-8 bg-red-50 dark:bg-red-950/20 border-2 border-red-100 dark:border-red-900/30 rounded-[2.5rem] text-red-600 dark:text-red-400 font-black text-center text-sm shadow-xl">
                {error}
              </div>
            )}

            {nearbyPlaces.length > 0 && !isLoading && (
              <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-500">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] text-center">Locais Históricos Detectados</h3>
                <div className="grid gap-4">
                  {nearbyPlaces.map((place, i) => (
                    <button 
                        key={i} 
                        onClick={() => selectPlace(place.name)}
                        className="w-full p-6 bg-white dark:bg-[#0D0D0D] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[2rem] border border-gray-100 dark:border-gray-800 text-left transition-all hover:translate-x-2 shadow-md hover:shadow-lg group flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{place.type}</p>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{place.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700">{place.distance}</span>
                    </button>
                  ))}
                </div>
                
                <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-[1.5rem] font-bold text-sm transition-all flex items-center justify-center space-x-2"
                >
                    {isLoadingMore ? <Spinner /> : <span>+ {t('loadMore')}</span>}
                </button>
              </div>
            )}

            {landmarkName && (history || audioData) && !isLoading && (
              <div className="bg-white dark:bg-[#0D0D0D] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in duration-700">
                <div className="p-8 sm:p-12 space-y-10">
                  <div className="space-y-4 text-center">
                    <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tightest">{landmarkName}</h2>
                    <div className="h-1.5 w-16 bg-blue-600 rounded-full mx-auto"></div>
                  </div>

                  {realPhotosLink && (
                    <a 
                      href={realPhotosLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-3 w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-green-600/20 active:scale-95 hover:-translate-y-1"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>
                      <span>Ver Fotos Reais e Mapa</span>
                    </a>
                  )}

                  {audioData && outputFormat !== 'textOnly' && (
                    <div className="pt-2 flex justify-center">
                      <AudioPlayer 
                        audioData={audioData} 
                        playNarrationText={t('playNarration')} 
                        loadingAudioText={t('loadingAudio')} 
                      />
                    </div>
                  )}

                  {history && outputFormat !== 'audioOnly' && (
                    <div className="prose prose-lg sm:prose-xl dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                      <p className="leading-relaxed font-medium tracking-tight">
                        {history}
                      </p>
                    </div>
                  )}

                  {citations.length > 0 && (
                    <div className="pt-10 border-t border-gray-100 dark:border-gray-800 space-y-8">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] text-center">{t('sources')}</p>
                      <div className="grid gap-4">
                        {citations.map((c, i) => <CitationCard key={i} chunk={c} />)}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={resetState} 
                    className="w-full py-4 text-gray-400 font-bold hover:text-blue-600 transition-colors uppercase tracking-[0.5em] text-[10px] text-center"
                  >
                    {t('analyzeAnother')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        
        <footer className="mt-12 text-center border-t border-gray-100 dark:border-gray-900 pt-10 space-y-5">
            <p className="text-[11px] font-black uppercase tracking-[0.8em] text-gray-300 dark:text-gray-600 pl-[0.8em]">IA Tour Guide &bull; Fotos Reais via Grounding</p>
            <div className="text-gray-400 dark:text-gray-500 text-sm font-medium">
            {t('footerBy')} <a href="https://www.linkedin.com/in/eleandro-mangrich" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 transition-colors font-bold">Eleandro Mangrich</a>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
