import fs from 'fs';
import path from 'path';

const dictEN = {
  "Textprodukte": "Text Products",
  "Eine Rede schreiben": "Write a speech",
  "Fiktive Dialoge mit KI-Persona": "Fictional dialogues with AI persona",
  "Literarische Figuren und fingierte Zeitzeugen mit KI generieren": "Generate literary figures and fictitious contemporary witnesses with AI",
  "KI-unterstützte Stellungnahme zu einem Thema": "AI-supported statement on a topic",
  "DIY-Klassenarbeit": "DIY Exam",
  "Open Media / Book Prüfung": "Open Media / Book Exam",
  "Klassenarbeit à la Carte": "Exam à la Carte",
  "Prozessbegleitender Blog": "Process-accompanying blog",
  "Wiki": "Wiki",
  "Fotoprodukte": "Photo Products",
  "Fotostory": "Photo story",
  "Social Media Post": "Social Media Post",
  "Social Media Profil": "Social Media Profile",
  "Audioprodukte": "Audio Products",
  "Podcast": "Podcast",
  "Hörspiel und Hörbuch": "Radio play and audiobook",
  "Musikalisches Kreativprojekt": "Musical creative project",
  "Videoprodukte": "Video Products",
  "Kurzfilm": "Short film",
  "Vorgangsanalyse mit der Kamera-App": "Process analysis with the camera app",
  "Tutorial / Erklärvideo": "Tutorial / Explainer video",
  "Lernvideo / Explainity-Clip": "Learning video / Explainity clip",
  "Piktogramme und Infografiken": "Pictograms and infographics",
  "Sketchnotes": "Sketchnotes",
  "Interaktive Präsentationen / Multimediales Plakat": "Interactive presentations / Multimedia poster",
  "Lapbook": "Lapbook",
  "Digitales Portfolio (E-Portfolio)": "Digital portfolio (e-portfolio)",
  "Portfolio": "Portfolio"
};

function translateObjectEN(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => translateObjectEN(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (['title', 'label', 'description'].includes(key) && typeof obj[key] === 'string' && obj[key].length > 0) {
        if (dictEN[obj[key]]) {
          newObj[key] = dictEN[obj[key]];
        } else {
          newObj[key] = `[EN] ${obj[key]}`;
        }
      } else {
        newObj[key] = translateObjectEN(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

const srcPath = path.join(process.cwd(), 'content', 'de', 'product-formats.json');
const destPath = path.join(process.cwd(), 'content', 'en', 'product-formats.json');

const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const translated = translateObjectEN(data);

fs.writeFileSync(destPath, JSON.stringify(translated, null, 2), 'utf8');
console.log(`Translated product-formats.json to en`);
