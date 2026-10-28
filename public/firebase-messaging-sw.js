// Service Worker para Firebase Cloud Messaging (FCM) & Web Push
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { notification: { title: 'Kalos Billar Club', body: event.data ? event.data.text() : 'Nueva notificación' } };
  }

  const notificationTitle = data.notification?.title || data.title || 'Kalos Billar Club';
  const notificationOptions = {
    body: data.notification?.body || data.body || 'Alerta de mesa o pedido nuevo',
    icon: '/logo-black.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
