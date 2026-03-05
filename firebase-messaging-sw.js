// firebase-messaging-sw.js
// Versión: 1.0.2 - CORREGIDA Y OPTIMIZADA

// Importar Firebase usando importScripts
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB5D45RI21rRAJB9mlt1NeI6N4d3PDyEqg",
  authDomain: "centinela-mx.firebaseapp.com",
  projectId: "centinela-mx",
  storageBucket: "centinela-mx.firebasestorage.app",
  messagingSenderId: "215358382201",
  appId: "1:215358382201:web:cf7e0fffb00ca36b05b4a8",
  measurementId: "G-0S5PVJX04Y"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejador para mensajes en segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'Centinela-MX';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'Nueva notificación',
    icon: '/assets/images/logo.png',
    badge: '/assets/images/logo-badge.png',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// Evento de instalación
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker instalado');
  self.skipWaiting();
});

// Evento de activación
self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker activado');
  return self.clients.claim();
});