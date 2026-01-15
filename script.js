const { useState } = React;

function App() {
    const [query, setQuery] = useState('');
    const [targetLang, setTargetLang] = useState('hi');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isListening, setIsListening] = useState(false); 

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'mr', name: 'Marathi' },
        { code: 'bn', name: 'Bengali' },
        { code: 'gu', name: 'Gujarati' },
        { code: 'ur', name: 'Urdu' },
        { code: 'te', name: 'Telugu' },
        { code: 'ta', name: 'Tamil' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'pa', name: 'Punjabi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh-CN', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'tr', name: 'Turkish' },
        { code: 'th', name: 'Thai' },
        { code: 'ko', name: 'Korean' },
        { code: 'nl', name: 'Dutch' },
        { code: 'id', name: 'Indonesian' }
    ];

    const handleSearch = async (e) => {
        if (e) e.preventDefault(); 
        if (!query.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`/api/search/${query}?target_lang=${targetLang}`);
            const data = await response.json();

            if (data.error && data.error !== "Word not found in dictionary.") {
                setError(data.error);
            } else if (data.error) {
                setResult(data);
                setError(data.error); 
            } else {
                setResult(data);
            }
        } catch (err) {
            setError('Failed to fetch data from the server.');
        } finally {
            setLoading(false);
        }
    };

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US'; 
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => setIsListening(true);
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setQuery(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);
            recognition.start();
        } else {
            alert("Speech recognition is not supported in this browser.");
        }
    };

    const playAudio = (url) => {
        new Audio(url).play();
    };

    const speakTranslation = (audioBase64) => {
        if (audioBase64) {
            const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
            audio.play().catch(e => console.error("Error playing audio:", e));
        } else {
            alert("Audio pronunciation unavailable for this translation.");
        }
    };

    const playDynamicAudio = (text, lang) => {
        if (!text) return;
        const audio = new Audio(`/api/pronounce?text=${encodeURIComponent(text)}&lang=${lang}`);
        audio.play().catch(e => console.error("Error playing dynamic audio:", e));
    };

    const InlineSpeaker = ({ text, lang }) => (
        <button 
            onClick={(e) => { e.stopPropagation(); playDynamicAudio(text, lang); }}
            className="inline-audio-btn"
            title="Listen"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        </button>
    );

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <header className="text-center mb-10 mt-6">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 filter drop-shadow-lg">
                    Dictionary
                </h1>
                <p className="text-gray-400 text-lg">Explore. Translate. Visualize.</p>
            </header>

            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-10 justify-center items-center">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        className="bg-cardbg border-2 border-purple-900/50 text-white rounded-xl p-4 w-full pr-12 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition shadow-lg placeholder-gray-500"
                        placeholder="Search for a word..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={startListening}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-white transition p-2 rounded-full hover:bg-purple-900/50 ${isListening ? 'mic-active' : ''}`}
                        title="Search by voice"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </button>
                </div>

                <select 
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="bg-cardbg border-2 border-purple-900/50 text-white rounded-xl p-4 focus:outline-none focus:border-accent transition shadow-lg cursor-pointer w-full md:w-auto hover:bg-purple-900/20"
                >
                    {languages.map(lang => (
                        <option key={lang.code} value={lang.code} className="bg-cardbg text-gray-200">
                            {lang.name}
                        </option>
                    ))}
                </select>
                <button 
                    type="submit" 
                    className="bg-accent hover:bg-accent_hover text-white px-8 py-4 rounded-xl transition font-bold shadow-lg shadow-purple-900/50 w-full md:w-auto tracking-wide"
                    disabled={loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && (
                <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 mb-8 rounded-r-lg backdrop-blur-sm" role="alert">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    
                    {/* Main Content Column */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Header Card */}
                        <div className="bg-cardbg p-8 rounded-2xl shadow-xl border border-purple-900/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            
                            <div className="flex items-center justify-between border-b border-purple-800/50 pb-6 mb-6 relative z-10">
                                <div>
                                    <h2 className="text-5xl font-bold text-white capitalize tracking-tight">{result.word}</h2>
                                    {result.phonetics.length > 0 && (
                                        <span className="text-purple-400 text-xl font-mono mt-2 block opacity-80">
                                            {result.phonetics[0].text}
                                        </span>
                                    )}
                                </div>
                                {result.phonetics.find(p => p.audio) && (
                                    <button 
                                        onClick={() => playAudio(result.phonetics.find(p => p.audio).audio)}
                                        className="bg-purple-900/40 text-purple-300 p-4 rounded-full hover:bg-accent hover:text-white transition shadow-lg border border-purple-700/30"
                                        title="Play Pronunciation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6 relative z-10">
                                {result.definitions.length > 0 ? result.definitions.map((def, idx) => (
                                    <div key={idx} className="bg-darkbg/50 p-6 rounded-xl border border-purple-900/20 hover:border-purple-700/40 transition">
                                        <div className="mb-3 flex flex-wrap items-center gap-3">
                                            <span className="italic font-bold text-accent text-lg">
                                                {def.partOfSpeech}
                                            </span>
                                            
                                            {def.translatedPartOfSpeech && def.translatedPartOfSpeech !== def.partOfSpeech && (
                                                <div className="flex items-center bg-purple-900/30 rounded-full px-3 py-1 border border-purple-700/30">
                                                    <span className="text-xs font-semibold text-purple-200">
                                                        {def.translatedPartOfSpeech}
                                                    </span>
                                                    <InlineSpeaker text={def.translatedPartOfSpeech} lang={targetLang} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mb-3 flex items-start gap-2">
                                            <p className="text-gray-200 text-lg leading-relaxed">{def.definition}</p>
                                            <div className="mt-1"><InlineSpeaker text={def.definition} lang="en" /></div>
                                        </div>
                                        
                                        {def.example && (
                                            <div className="mt-3 text-sm border-l-4 border-purple-600 pl-4 py-1 bg-purple-900/10 rounded-r-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-gray-400 italic">"{def.example}"</p>
                                                    <InlineSpeaker text={def.example} lang="en" />
                                                </div>
                                                
                                                {def.translatedExample && (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-purple-300 italic">
                                                            "{def.translatedExample}"
                                                        </p>
                                                        <InlineSpeaker text={def.translatedExample} lang={targetLang} />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Synonyms & Antonyms */}
                                        <div className="mt-5 flex flex-col gap-3">
                                            {def.translatedSynonyms && def.translatedSynonyms.length > 0 && (
                                                <div className="text-sm">
                                                    <span className="font-bold text-green-400 uppercase tracking-wider text-xs block mb-2">Synonyms</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {def.translatedSynonyms.map((syn, i) => (
                                                            <div key={i} className="synonym-tag group" title={def.synonyms[i]}>
                                                                <span className="mr-1">{syn}</span>
                                                                <InlineSpeaker text={syn} lang={targetLang} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {def.translatedAntonyms && def.translatedAntonyms.length > 0 && (
                                                <div className="text-sm">
                                                    <span className="font-bold text-red-400 uppercase tracking-wider text-xs block mb-2">Antonyms</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {def.translatedAntonyms.map((ant, i) => (
                                                            <div key={i} className="antonym-tag group" title={def.antonyms[i]}>
                                                                <span className="mr-1">{ant}</span>
                                                                <InlineSpeaker text={ant} lang={targetLang} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500">No definitions found.</p>}
                            </div>
                        </div>

                        {/* Images Section */}
                        <div className="bg-cardbg p-6 rounded-2xl shadow-xl border border-purple-900/30">
                             <h3 className="text-xl font-bold mb-6 text-gray-200 flex items-center gap-2 border-b border-purple-800/50 pb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Visual Context
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {result.images.length > 0 ? (
                                    result.images.map((imgSrc, idx) => (
                                        <div key={idx} className="overflow-hidden rounded-xl border border-purple-900/30">
                                            <img 
                                                src={imgSrc} 
                                                alt={result.word} 
                                                className="w-full h-40 object-cover hover:scale-110 transition duration-500 cursor-pointer"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 italic col-span-2">No images found.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Main Translation */}
                    <div className="lg:col-span-5">
                        {result.translation && result.translation.text ? (
                            <div className="bg-cardbg p-8 rounded-2xl shadow-2xl border border-purple-500/30 sticky top-6">
                                <h3 className="text-2xl font-bold text-gray-200 mb-8 border-b border-purple-800/50 pb-4 flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                    Translation
                                </h3>
                                
                                <div className="text-center py-10 bg-darkbg/50 rounded-2xl border border-purple-500/20 flex flex-col items-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    
                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 bg-purple-900/20 px-3 py-1 rounded-full border border-purple-800/30">
                                        {result.translation.lang}
                                    </span>
                                    
                                    <p className="text-5xl font-black text-white mb-8 leading-tight drop-shadow-lg px-2">
                                        {result.translation.text}
                                    </p>
                                    
                                    <button 
                                        onClick={() => speakTranslation(result.translation.audio)}
                                        className="pronounce-btn flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-purple-500/20 transform hover:-translate-y-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={`Pronounce in ${result.translation.lang}`}
                                        disabled={!result.translation.audio}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                        Listen Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-cardbg p-6 rounded-2xl shadow-xl border border-purple-900/30">
                                <p className="text-gray-500 italic">Translation unavailable.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);