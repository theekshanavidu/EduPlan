// මෙය සරල Service Worker එකකි
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // මෙහි දැනට කිසිවක් කිරීමට අවශ්‍ය නැත, 
  // නමුත් මෙය තිබීම App එක install කිරීමට අත්‍යවශ්‍ය වේ.
  e.respondWith(fetch(e.request));
});
