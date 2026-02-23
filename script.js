// Global Variables




let currentStream = null;
let moodHistory = [];
let isEyeTracking = false;


const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

async function loadModels() {
    console.log("Models loading...");
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    console.log("Models loaded!");
}
// --- 1. Tab Management & Navigation Logic ---
function openFeature(featureId, featureName) {
    // Aadhi sagale sections hide kara
    const sections = ['dashboard-content', 'face-section', 'eye-section', 'voice-section', 'text-section','real time expriments'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Header title update kara
    document.getElementById('active-feature-name').innerText = featureName;

    // Jo section pahije to show kara
    const targetSection = document.getElementById(featureId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// Sidebar/Dashboard links sathi function
function showDashboard() {
    openFeature('dashboard-content', 'Overview Dashboard');
    stopAllMediaStreams();
}

// --- 2. Media Stream Management (Safe Stop) ---
function stopAllMediaStreams() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Reset All Buttons & Displays
    const resets = [
        { btn: 'start-camera', stop: 'stop-camera', vid: 'video', res: 'face-result', txt: "Waiting for camera..." },
        { btn: 'start-eye-camera', stop: 'stop-eye-camera', vid: 'eye-video', res: 'eye-result', txt: "Eye tracking stopped." },
        { btn: 'start-voice', stop: 'stop-voice', res: 'voice-result', txt: "Voice recognition stopped." }
    ];

    resets.forEach(item => {
        if(document.getElementById(item.btn)) document.getElementById(item.btn).disabled = false;
        if(document.getElementById(item.stop)) document.getElementById(item.stop).disabled = true;
        if(item.vid && document.getElementById(item.vid)) document.getElementById(item.vid).srcObject = null;
        if(document.getElementById(item.res)) document.getElementById(item.res).textContent = item.txt;
    });

    if (recognition) recognition.stop();
}

//face detection
// --- १. ग्राफसाठी डेटा सेव्ह करण्याचे फंक्शन ---
function saveMoodForGraph(mood) {
    let history = JSON.parse(localStorage.getItem('moodHistory')) || [];
    let now = new Date();
    
    let timeLabel = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    let lastEntry = history[history.length - 1];
    
    // JAR MOOD BADALLA ASEL TARACH SAVE KARA (Database var load yenar nahi)
    if (!lastEntry || lastEntry.mood !== mood) {
        
        // 1. LocalStorage madhe save karne (Graph sathi)
        history.push({ 
            time: timeLabel, 
            mood: mood,
            timestamp: now.getTime() 
        });
        if (history.length > 20) history.shift();
        localStorage.setItem('moodHistory', JSON.stringify(history));

        // 2. Database madhe save karne (PHP call)
        saveToDatabase(mood); 
    }
}

// Navin function jo PHP la data pathvel
// Switch case madhun alela 'suggestion' variable ithe pass kara
function saveToDatabase(mood, suggestion) {
    let now = new Date();
    let currentTime = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0');

    fetch('save_mood.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mood: mood,
            time: currentTime,
            suggestion: suggestion // He naveen add kara
        })
    })
    .then(response => response.json())
    .then(data => console.log("DB Response:", data))
    .catch(error => console.error("Error:", error));
}

// --- २. फेस डिटेक्शन आणि कॅमेरा लॉजिक ---
document.getElementById('start-camera').addEventListener('click', async () => {
    const video = document.getElementById('video');
    const result = document.getElementById('face-result');
    const stopBtn = document.getElementById('stop-camera');
    const startBtn = document.getElementById('start-camera');

    if (typeof loadModels === 'function') {
        await loadModels();
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        startBtn.disabled = true;
        stopBtn.disabled = false;

        video.onplay = () => {
            const detectionInterval = setInterval(async () => {
                if (video.paused || video.ended) {
                    clearInterval(detectionInterval);
                    return;
                }

                const detections = await faceapi.detectSingleFace(
                    video, 
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceExpressions();

                if (detections) {
                    const expressions = detections.expressions;
                    
                    // सुरुवातीचा मूड निवडा
                    let mood = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

                    // --- TIRED (थकवा) ओळखण्याचे लॉजिक ---
                    // जर न्यूट्रल ८०% पेक्षा जास्त असेल, तर आपण त्याला 'Tired' मानू शकतो
                    if (mood === 'neutral' && expressions.neutral > 0.8) {
                        mood = 'tired';
                    }
                    
                    // saveMoodForGraph(mood); 
                    

                    // Suggestions Logic
                    let suggestion = " ";
                    let icon = " ";

                    switch(mood) {
                        case 'happy': 
                            suggestion = "Your energy is great! Perfect time to start a creative task."; 
                            icon = "😊";
                            break;
                        case 'sad': 
                            suggestion = "It's okay to feel low. How about a quick 5-minute music break?"; 
                            icon = "😟";
                            break;
                        case 'angry': 
                            suggestion = "Calm down, drink some water and take deep breaths."; 
                            icon = "😠";
                            break;
                        case 'neutral': 
                            suggestion = "You are in a focused zone. Keep going!"; 
                            icon = "😐";
                            break;
                        case 'surprised':
                            suggestion = "Something unexpected? Stay curious!";
                            icon = "😲";
                            break;
                        case 'tired': 
                            suggestion = "You look exhausted. Take a 10-minute power nap or a walk!"; 
                            icon = "😴";
                            break;
                        default: 
                            suggestion = "Stay focused on your goals!";
                            icon = "🚀";
                    }
// switch samplyavar...
saveMoodForGraph(mood); 
saveToDatabase(mood, suggestion); // mood ani suggestion doghi pathva

        

                    result.innerHTML = `
                        <div style="font-size: 1.2rem;">
                            ${icon} Mood: <strong style="color: #00bcd4;">${mood.toUpperCase()}</strong>
                        </div>
                        <div class="mt-2 text-muted small">${suggestion}</div>
                    `;
                }
            }, 1000); 
        };

    } catch (err) {
        result.textContent = "Camera access denied or error: " + err;
    }
});

// --- ३. कॅमेरा स्टॉप लॉजिक ---
document.getElementById('stop-camera').addEventListener('click', () => {
    const video = document.getElementById('video');
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    document.getElementById('start-camera').disabled = false;
    document.getElementById('stop-camera').disabled = true;
    document.getElementById('face-result').textContent = "Camera stopped.";
});

    

//Eye Detection

// १. ग्लोबल सेव्हिंग फंक्शन्स (हे एकदाच वरती ठेवा)
function saveToMoodDatabase(source, emotion) {
    let now = new Date();
    let timeLabel = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let today = days[now.getDay()];

    // Daily Graph साठी डेटा
    let dailyHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
    dailyHistory.push({ time: timeLabel, mood: emotion.toLowerCase(), source: source });
    if (dailyHistory.length > 30) dailyHistory.shift();
    localStorage.setItem('moodHistory', JSON.stringify(dailyHistory));

    // Weekly Graph साठी डेटा
    let weeklyHistory = JSON.parse(localStorage.getItem('weeklyMoodHistory')) || {};
    weeklyHistory[today] = emotion.toLowerCase();
    localStorage.setItem('weeklyMoodHistory', JSON.stringify(weeklyHistory));
}

// २. आय ट्रॅकिंग लॉजिक
document.getElementById('start-eye-camera').addEventListener('click', async () => {
    const video = document.getElementById('eye-video');
    const result = document.getElementById('eye-result');
    
    await loadModels(); 

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        currentStream = stream;
        isEyeTracking = true;

        video.onplay = () => {
            const trackEyes = async () => {
                if (!isEyeTracking) return;

                const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                             .withFaceExpressions();

                if (detections) {
                    const expressions = detections.expressions;
                    let mainEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                    
                    // डोळ्यांच्या थकव्यासाठी लॉजिक: जर Neutral जास्त असेल तर 'Tired' म्हणा
                    if(mainEmotion === 'neutral' && expressions.neutral > 0.7) {
                        mainEmotion = 'tired';
                    }
                    
                    // --- ग्राफसाठी डेटा सेव्ह करा ---
                    saveToMoodDatabase('Eye Tracking', mainEmotion);

                    updateUI(mainEmotion, Math.round(expressions[mainEmotion] * 100));
                }

                setTimeout(trackEyes, 2000); // डोळ्यांसाठी २ सेकंदाचा गॅप पुरेसा आहे
            };
            trackEyes();
        };
    } catch (err) {
        result.textContent = `Camera error: ${err.message}`;
    }
});

// ३. अपडेटेड सजेशन्स (Tired सह)
function updateUI(emotion, confidence) {
    const result = document.getElementById('eye-result');
    let suggestion = "";
    let color = "#2196f3";

    switch(emotion) {
    case 'sad': 
        suggestion = "You seem a bit down. Take a deep breath. Try listening to some uplifting music or take a short walk to refresh your mind.";
        color = "#9c27b0";
        break;
    case 'tired': 
        suggestion = "High fatigue detected! Follow the 20-20-20 rule: Look at something 20 feet away for 20 seconds to reduce eye strain.";
        color = "#ff9800";
        break;
    case 'surprised':
        suggestion = "You look startled or highly alert. Take a moment to stabilize your focus and remember to keep breathing deeply.";
        color = "#00bcd4";
        break;
    case 'angry':
        suggestion = "Signs of frustration detected. Close your eyes for 30 seconds, drink some water, and try to relax your jaw and facial muscles.";
        color = "#f44336";
        break;
    case 'happy':
        suggestion = "Positive energy detected! You're in a great mental state. Use this peak mood to complete your most creative or difficult tasks.";
        color = "#4caf50";
        break;
    case 'neutral':
        suggestion = "You are in a calm, balanced state. This is great for steady work, but remember to take a quick stretch break every hour.";
        color = "#607d8b";
        break;
    case 'fearful':
        suggestion = "You seem anxious. Try the 'Box Breathing' technique: Inhale for 4 seconds, hold for 4, exhale for 4, and repeat.";
        color = "#ffeb3b";
        break;
    case 'disgusted':
        suggestion = "Something seems off-putting. Take a small break from your screen and clear your workspace to reset your focus.";
        color = "#8d6e63";
        break;
    default:
        suggestion = "Maintain a healthy posture and ensure your screen brightness matches your room's lighting to protect your vision.";
}
    result.innerHTML = `
        <div style="border-left: 5px solid ${color}; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 0 10px 10px 0;">
            <strong style="font-size: 1.1rem;">Eye Status:</strong> ${emotion.toUpperCase()}<br>
            <div class="progress mt-2" style="height: 10px;">
                <div class="progress-bar" style="width: ${confidence}%; background-color: ${color};"></div>
            </div>
            <small class="mt-2 d-block"><strong>AI Tip:</strong> ${suggestion}</small>
        </div>
    `;
}

// --- 5. Voice Detection Logic (Multilingual) ---
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; 

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        const lowerText = transcript.toLowerCase();
        const resultDisplay = document.getElementById('voice-result');

        let mood = "Neutral";
        let suggest = "I am listening... Tell me more about your day.";
        let color = "#9e9e9e"; 

        if (lowerText.match(/(happy|good|mast|anandi|khush|changla|achha|majjet|great|awesome|smile|positivity)/)) {
            mood = "Happy / आनंदी";
            suggest = "AI Suggestion: Great vibe! Keep this happiness going. / खूप छान! असाच आनंद टिकवून ठेवा.";
            color = "#4caf50";
        } 
        else if (lowerText.match(/(sad|dukh|udash|r रडू|feeling low|not good|radu|dukhi)/)) {
            mood = "Sad / उदास";
            suggest = "AI Suggestion: It's okay to feel sad. Try talking to a friend or listening to music. / काही हरकत नाही, मन शांत करा आणि आवडते गाणे ऐका.";
            color = "#2196f3";
        }
        else if (lowerText.match(/(angry|rag|chid|gussa|irritated|chira|ghussa)/)) {
            mood = "Angry / रागात";
            suggest = "AI Suggestion: Take a deep breath. Don't react immediately. / दीर्घ श्वास घ्या. शांत होण्याचा प्रयत्न करा.";
            color = "#f44336";
        }
        else if (lowerText.match(/(stress|tension|pareshan|load|workload|doke dukh|chinta)/)) {
            mood = "Stressed / तणाव";
            suggest = "AI Suggestion: Drink some water. Break your tasks into small steps. / पाणी प्या आणि कामातून छोटा ब्रेक घ्या.";
            color = "#ff5722";
        }
        else if (lowerText.match(/(tired|sleepy|thaklo|thaklela|exhausted|zop|nind)/)) {
            mood = "Tired / थकलेला";
            suggest = "AI Suggestion: Your body needs rest. A quick nap would be great. / तुमच्या शरीराला आरामाची गरज आहे. थोडी झोप घ्या.";
            color = "#795548";
        }
        else if (lowerText.match(/(excited|utsah|party|wow|m मजा|dhamaal|super)/)) {
            mood = "Excited / उत्साही";
            suggest = "AI Suggestion: Love the energy! Channel this into something creative. / तुमचा उत्साह वाखाणण्याजोगा आहे! काहीतरी नवीन करा.";
            color = "#ffeb3b";
        }
        else if (lowerText.match(/(bored|kantala|bor|nothing to do|kay karu)/)) {
            mood = "Bored / कंटाळलेला";
            suggest = "AI Suggestion: How about a new hobby or watching a short video? / एखादा नवीन छंद जोपासा किंवा छोटा व्हिडिओ पहा.";
            color = "#607d8b";
        }
        else if (lowerText.match(/(confused|gondhal|samajત nahi|samajh|help|nahi kalat)/)) {
            mood = "Confused / गोंधळलेला";
            suggest = "AI Suggestion: Don't worry. Ask for help or write down your thoughts. / काळजी करू नका. कोणाची तरी मदत घ्या किंवा विचार लिहून काढा.";
            color = "#9c27b0";
        }

        resultDisplay.innerHTML = `
            <div style="border-left: 8px solid ${color}; padding: 15px; background: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <p style="color: #555; font-style: italic;">you are speaking:</p>
                <p style="font-size: 1.1em;">"${transcript}"</p>
                <hr>
                <p><strong>Detected Mood:</strong> <span style="color:${color}; font-weight:bold;">${mood}</span></p>
                <div style="background: ${color}22; padding: 10px; border-radius: 5px;">
                    <p style="margin: 0; color: #333;">💡 <strong>AI Salla:</strong> ${suggest}</p>
                </div>
            </div>
        `;

        if (event.results[event.results.length - 1].isFinal) {
            let cleanMood = mood.split(' / ')[0]; // English part extract करणे
            
            // --- १. Daily आणि Weekly डेटा सेव्ह करण्यासाठी खालील ओळ Add केली आहे ---
            if (typeof saveToMoodDatabase === 'function') {
                saveToMoodDatabase('Voice Analysis', cleanMood);
            }
        }
    };
}

// Button Events
document.getElementById('start-voice').addEventListener('click', () => {
    if (recognition) {
        recognition.start();
        document.getElementById('start-voice').disabled = true;
        document.getElementById('stop-voice').disabled = false;
        document.getElementById('voice-result').innerHTML = "<span style='color: green;'>Listening... Please speak into the mic.</span>";
    }
});

document.getElementById('stop-voice').addEventListener('click', () => {
    if (recognition) {
        recognition.stop();
        document.getElementById('start-voice').disabled = false;
        document.getElementById('stop-voice').disabled = true;
    }
});


// --- 6. Text Analysis Logic ---
document.getElementById('analyze-text-btn').addEventListener('click', () => {
    const textInput = document.getElementById('user-text-input').value;
    const resultDisplay = document.getElementById('text-result');
    
    if (!textInput.trim()) {
        resultDisplay.innerHTML = "<p style='color:red;'>कृपया आधी काहीतरी लिहा! (Please write something first!)</p>";
        return;
    }

    const lowerText = textInput.toLowerCase();
    let detectedEmotions = [];
    let suggestions = [];
    let firstDetectedEmotion = ""; // ग्राफसाठी पहिला इमोशन साठवण्यासाठी

    // 2. Updated Emotion Database with English Suggestions
    const emotionRules = [
        { 
            name: 'Happy/आनंदी', 
            keys: /(happy|mast|anandi|khush|good|best|majjet|ek nambar|bhari)/, 
            suggest: "खूप छान! हा आनंद टिकवून ठेवा.", 
            suggestEng: "That's great! Keep this happiness alive.",
            color: 'green' 
        },
        { 
            name: 'Sad/उदास', 
            keys: /(sad|udash|dukhi|radu|bad|low|problem|tras)/, 
            suggest: "काळजी करू नका, मन शांत करा आणि आवडते गाणे ऐका.", 
            suggestEng: "Don't worry, calm your mind and listen to your favorite music.",
            color: 'blue' 
        },
        { 
            name: 'Angry/राग', 
            keys: /(angry|rag|chid|gussa|irritated|santap)/, 
            suggest: "शांत होण्यासाठी दीर्घ श्वास घ्या आणि पाणी प्या.", 
            suggestEng: "Take a deep breath and drink some water to calm down.",
            color: 'red' 
        },
        { 
            name: 'Stressed/ताण', 
            keys: /(stress|tension|load|pareshan|chinta|doke dukh)/, 
            suggest: "थोड्या वेळासाठी कामातून ब्रेक घ्या आणि डोळे मिटून शांत बसा.", 
            suggestEng: "Take a short break from work and sit quietly with your eyes closed.",
            color: 'orange' 
        },
        { 
            name: 'Tired/थकलेला', 
            keys: /(tired|thaklo|sleepy|zop|alas|exhausted)/, 
            suggest: "तुमच्या शरीराला विश्रांतीची गरज आहे. थोडी झोप घ्या.", 
            suggestEng: "Your body needs rest. Try to get some sleep.",
            color: 'brown' 
        }
    ];

    // 3. Keywords Check
    emotionRules.forEach(rule => {
        if (lowerText.match(rule.keys)) {
            detectedEmotions.push(`<b style="color:${rule.color}">${rule.name}</b>`);
            suggestions.push(`<li>${rule.suggest} <br><small style="color: #666;">(${rule.suggestEng})</small></li>`);
            
            // ग्राफसाठी पहिला सापडलेला इमोशन सेट करा
            if (!firstDetectedEmotion) {
                firstDetectedEmotion = rule.name.split('/')[0]; // English नाव (उदा. Happy)
            }
        }
    });

    // 4. Result Display
    if (detectedEmotions.length > 0) {
        resultDisplay.innerHTML = `
            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9; margin-top: 10px;">
                <p><strong>Detected Moods:</strong> ${detectedEmotions.join(' & ')}</p>
                <hr>
                <p><strong>AI Suggestions:</strong></p>
                <ul style="line-height: 1.8;">${suggestions.join('')}</ul>
            </div>
        `;

        // --- ५. ग्राफ डेटा सेव्ह करण्यासाठी खालील ओळ Add केली आहे ---
        if (typeof saveToMoodDatabase === 'function' && firstDetectedEmotion) {
            saveToMoodDatabase('Text Analysis', firstDetectedEmotion);
        }

    } else {
        resultDisplay.innerHTML = `
            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p>मी तुझे बोलणे ऐकले, पण मला नेमके इमोशन्स समजले नाहीत. अजून काही सांगशील का?</p>
                <p style="color: #666; font-size: 0.9em;">(I heard you, but I couldn't detect specific emotions. Could you tell me more?)</p>
            </div>
        `;
    }
});




// --- 2. Navigation & Dashboard Management ---
function openFeature(featureId, featureName) {
    // 1. Sagle sections hide kara
    const sections = ['dashboard-content', 'face-section', 'eye-section', 'voice-section', 'text-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Sidebar Highlight (Emotion Detection tab highlight kara)
    const navItems = document.querySelectorAll('.list-group-item');
    navItems.forEach(item => item.classList.remove('active'));
    const emotionTab = document.getElementById('nav-emotion'); // Tumchya HTML madhe id='nav-emotion' asava
    if (emotionTab) emotionTab.classList.add('active');

    // 3. Header title update
    document.getElementById('active-feature-name').innerText = featureName;

    // 4. Target section show kara
    const targetSection = document.getElementById(featureId);
    if (targetSection) targetSection.style.display = 'block';

   
}

function showDashboard() {
    stopAllMediaStreams();
    
    // Sagle sections hide kara
    const sections = ['face-section', 'eye-section', 'voice-section', 'text-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Dashboard dakhva
    document.getElementById('dashboard-content').style.display = 'flex';
    
    // Sidebar reset (Overview active kara)
    const navItems = document.querySelectorAll('.list-group-item');
    navItems.forEach(item => item.classList.remove('active'));
    if(navItems[0]) navItems[0].classList.add('active');

    document.getElementById('active-feature-name').innerText = 'Overview Dashboard';
}
//




