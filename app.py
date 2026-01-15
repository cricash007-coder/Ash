import os
import requests
import io
import base64
import json
import datetime
from flask import Flask, render_template, jsonify, request, send_file
from deep_translator import GoogleTranslator
from gtts import gTTS
from wonderwords import RandomWord

app = Flask(__name__)

# CONFIGURATION
# Replace with your actual Pexels API Key
PEXELS_API_KEY = 'EbEQ12fHcCWaDdVIMIK9dC8r6AiszfSpg6dr8gDs5d69B8lFBnkj0Aam'
# OpenRouter API Key
OPENROUTER_API_KEY = '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'
SAVED_WORDS_FILE = 'saved_words.json'
DAILY_WORD_FILE = 'daily_word.json'

def load_saved_words():
    """Helper to load saved words from a JSON file."""
    if os.path.exists(SAVED_WORDS_FILE):
        try:
            with open(SAVED_WORDS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_word_list(words):
    """Helper to save the word list to a JSON file."""
    with open(SAVED_WORDS_FILE, 'w') as f:
        json.dump(words, f)

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/search/<word>')
def search_word(word):
    """
    Fetches data from Free Dictionary API, Pexels API, and Google Translator.
    Captures Synonyms and Antonyms for the Concept Map.
    """
    target_lang_code = request.args.get('target_lang', 'hi')

    if not word:
        return jsonify({'error': 'No word provided'}), 400

    data = {
        'word': word,
        'definitions': [],
        'phonetics': [],
        'images': [],
        'translation': {}, 
        'concept_map': {'synonyms': [], 'antonyms': []}, # Data for the concept map
        'error': None
    }

    # Sets to collect all unique related words for the graph
    all_english_synonyms = set()
    all_english_antonyms = set()

    # 1. Fetch Word Definitions (Free Dictionary API)
    try:
        dict_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        dict_response = requests.get(dict_url)
        
        if dict_response.status_code == 200:
            dict_data = dict_response.json()
            if isinstance(dict_data, list) and len(dict_data) > 0:
                entry = dict_data[0]
                
                # Extract phonetics
                for p in entry.get('phonetics', []):
                    if p.get('text') and p.get('audio'):
                        data['phonetics'].append({
                            'text': p.get('text'),
                            'audio': p.get('audio')
                        })
                
                # Initialize Translator
                translator = GoogleTranslator(source='auto', target=target_lang_code)

                # Extract meanings/definitions
                count = 0
                for meaning in entry.get('meanings', []):
                    if count >= 3: break
                    
                    part_of_speech = meaning.get('partOfSpeech')
                    
                    # Translate Part of Speech
                    try:
                        translated_pos = translator.translate(part_of_speech)
                    except:
                        translated_pos = part_of_speech

                    # Extract Synonyms/Antonyms at Meaning Level
                    meaning_synonyms = meaning.get('synonyms', [])
                    meaning_antonyms = meaning.get('antonyms', [])

                    for df in meaning.get('definitions', []):
                        if count >= 3: break
                        
                        example = df.get('example', '')
                        translated_example = ''
                        
                        # Translate Example Sentence
                        if example:
                            try:
                                translated_example = translator.translate(example)
                            except:
                                translated_example = ''

                        # Extract Synonyms/Antonyms at Definition Level
                        def_synonyms = df.get('synonyms', [])
                        def_antonyms = df.get('antonyms', [])

                        # MERGE
                        combined_synonyms = list(set(meaning_synonyms + def_synonyms))
                        combined_antonyms = list(set(meaning_antonyms + def_antonyms))

                        # Add to global sets for concept map
                        all_english_synonyms.update(combined_synonyms)
                        all_english_antonyms.update(combined_antonyms)

                        # Translate Synonyms (Top 5 for definition card)
                        translated_synonyms = []
                        if combined_synonyms:
                            top_synonyms = combined_synonyms[:5]
                            try:
                                translated_synonyms = translator.translate_batch(top_synonyms)
                            except Exception as e:
                                print(f"Synonym Translation Error: {e}")
                                translated_synonyms = top_synonyms

                        # Translate Antonyms (Top 5 for definition card)
                        translated_antonyms = []
                        if combined_antonyms:
                            top_antonyms = combined_antonyms[:5]
                            try:
                                translated_antonyms = translator.translate_batch(top_antonyms)
                            except Exception as e:
                                print(f"Antonym Translation Error: {e}")
                                translated_antonyms = top_antonyms

                        data['definitions'].append({
                            'partOfSpeech': part_of_speech,
                            'translatedPartOfSpeech': translated_pos,
                            'definition': df.get('definition'),
                            'example': example,
                            'translatedExample': translated_example,
                            'synonyms': combined_synonyms[:5],
                            'translatedSynonyms': translated_synonyms,
                            'antonyms': combined_antonyms[:5],
                            'translatedAntonyms': translated_antonyms
                        })
                        count += 1
                
                # --- Prepare Concept Map Data ---
                # Take top 6 unique synonyms and antonyms
                top_graph_synonyms = list(all_english_synonyms)[:6]
                top_graph_antonyms = list(all_english_antonyms)[:6]
                
                if top_graph_synonyms:
                    try:
                        data['concept_map']['synonyms'] = translator.translate_batch(top_graph_synonyms)
                    except Exception as e:
                        data['concept_map']['synonyms'] = top_graph_synonyms
                
                if top_graph_antonyms:
                    try:
                        data['concept_map']['antonyms'] = translator.translate_batch(top_graph_antonyms)
                    except Exception as e:
                        data['concept_map']['antonyms'] = top_graph_antonyms

        else:
            data['error'] = "Word not found in dictionary."
            
    except Exception as e:
        data['error'] = f"Dictionary API Error: {str(e)}"

    # 2. Fetch Images (Pexels API)
    if not data['error'] or data['error'] == "Word not found in dictionary.":
        try:
            pexels_url = f"https://api.pexels.com/v1/search?query={word}&per_page=4"
            headers = {'Authorization': PEXELS_API_KEY}
            pexels_response = requests.get(pexels_url, headers=headers)
            
            if pexels_response.status_code == 200:
                pexels_data = pexels_response.json()
                data['images'] = [photo['src']['medium'] for photo in pexels_data.get('photos', [])]
        except Exception as e:
            print(f"Pexels API Error: {str(e)}")

    # 3. Fetch Main Translation & Audio
    try:
        supported_languages = {
            'hi': 'Hindi', 'mr': 'Marathi', 'bn': 'Bengali', 'te': 'Telugu', 
            'ta': 'Tamil', 'gu': 'Gujarati', 'ur': 'Urdu', 'kn': 'Kannada', 
            'ml': 'Malayalam', 'pa': 'Punjabi',
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 
            'ja': 'Japanese', 'zh-CN': 'Chinese (Simplified)', 'ar': 'Arabic',
            'tr': 'Turkish', 'th': 'Thai', 'nl': 'Dutch', 'ko': 'Korean', 
            'id': 'Indonesian'
        }
        
        lang_name = supported_languages.get(target_lang_code, target_lang_code)
        translated_text = GoogleTranslator(source='auto', target=target_lang_code).translate(word)
        
        # Generate Audio for main translation (Pre-loaded)
        audio_b64 = None
        try:
            tts = gTTS(text=translated_text, lang=target_lang_code)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
        except Exception as audio_error:
            print(f"gTTS Error: {audio_error}")

        data['translation'] = {
            'lang': lang_name,
            'code': target_lang_code,
            'text': translated_text,
            'audio': audio_b64
        }

    except Exception as e:
        print(f"Translation Error: {e}")
        data['translation'] = {'lang': 'Error', 'text': 'Could not translate', 'audio': None}

    return jsonify(data)

@app.route('/api/pronounce')
def pronounce():
    text = request.args.get('text')
    lang = request.args.get('lang', 'en')
    if not text: return "No text provided", 400
    try:
        tts = gTTS(text=text, lang=lang)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return send_file(fp, mimetype='audio/mp3')
    except Exception as e:
        return "Error generating audio", 500

# Saved Words Endpoints
@app.route('/api/saved', methods=['GET', 'POST'])
def manage_saved_words():
    words = load_saved_words()
    if request.method == 'POST':
        data = request.json
        new_word = data.get('word')
        if new_word:
            if not any(w.lower() == new_word.lower() for w in words):
                words.insert(0, new_word)
                words = words[:50]
                save_word_list(words)
        return jsonify(words)
    return jsonify(words)

@app.route('/api/saved/<word>', methods=['DELETE'])
def delete_saved_word(word):
    words = load_saved_words()
    words = [w for w in words if w.lower() != word.lower()]
    save_word_list(words)
    return jsonify(words)

# --- DAILY WORD ENDPOINT (Updated to always generate new word) ---
@app.route('/api/daily-word', methods=['GET'])
def get_daily_word():
    # Logic updated to always return a new random word
    word = None
    
    try:
        r = RandomWord()
        # Generate a random English word (nouns or adjectives are usually good)
        word = r.word(include_parts_of_speech=["nouns", "adjectives"], word_min_length=5)
    except Exception as e:
        print(f"Daily Word Error: {e}")
        word = "Serendipity" # Fallback

    return jsonify({'word': word})

# --- Updated Chatbot Endpoint using OpenRouter with Fallback ---
@app.route('/api/chat', methods=['POST'])
def chat_bot():
    data = request.json
    user_msg = data.get('message', '').strip()
    
    if not user_msg:
        return jsonify({'response': "Please say something!"})

    ai_response = None
    
    # 1. Try OpenRouter AI
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "Global Dictionary App"
        }
        
        payload = {
            "model": "google/gemini-2.0-flash-exp:free", 
            "messages": [
                {"role": "system", "content": "You are a helpful dictionary assistant. Answer questions about word definitions, synonyms, translations, and grammar concisely and helpful."},
                {"role": "user", "content": user_msg}
            ]
        }

        response = requests.post(url, headers=headers, json=payload, timeout=5) # 5s timeout
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and result['choices']:
                ai_response = result['choices'][0]['message']['content']
        else:
            print(f"OpenRouter API Error: {response.text}")
            
    except Exception as e:
        print(f"Chatbot AI Exception: {e}")

    # If AI succeeded, return it
    if ai_response:
        return jsonify({'response': ai_response})

    # 2. Fallback Logic: Manual Dictionary Lookups (If AI fails)
    fallback_response = "I'm having trouble connecting to my brain. Please try searching in the main search bar."
    lower_msg = user_msg.lower()
    
    try:
        # Simple extraction of the last word as the target
        words = lower_msg.replace('?', '').replace('.', '').split()
        target_word = words[-1] if words else ""

        if 'define' in lower_msg or 'meaning' in lower_msg or 'what is' in lower_msg:
            r = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{target_word}")
            if r.status_code == 200:
                definition = r.json()[0]['meanings'][0]['definitions'][0]['definition']
                fallback_response = f"Fallback Definition: {definition}"
        
        elif 'synonym' in lower_msg:
            r = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{target_word}")
            if r.status_code == 200:
                syns = []
                data = r.json()[0]
                for m in data.get('meanings', []):
                    for d in m.get('definitions', []):
                        syns.extend(d.get('synonyms', []))
                if syns:
                    fallback_response = f"Fallback Synonyms: {', '.join(list(set(syns))[:5])}"
                else:
                    fallback_response = f"No synonyms found for '{target_word}'."

    except Exception as e:
        print(f"Fallback Logic Error: {e}")

    return jsonify({'response': fallback_response})

if __name__ == '__main__':
    app.run(debug=True)       