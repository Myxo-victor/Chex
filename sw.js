/*
* Chex v6.0.0 Service Worker
* @author Myxo victor
* IMPORTANT: Place this file in the root directory of your website.
* Service workers cannot be loaded from CDNs due to browser security restrictions.
*/

self.addEventListener('push', function(event) {
    let data = {
        title: 'Chex 6.0 Update',
        content: 'You have a new notification from Chex 6.0.',
        url: '/'
    };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        if (event.data) {
            data.content = event.data.text();
        }
    }

    const options = {
        body: data.content,
        icon: data.icon || '/icon/logo.png',
        badge: data.badge || '/icon/logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(self.registration.showNotification(data.title || 'Chex 6.0', options));
});

self.addEventListener('notificationclick', function(event) {
    const clickedNotification = event.notification;
    clickedNotification.close();

    if (event.action === 'close') return;

    const urlToOpen = new URL(clickedNotification.data.url, self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
            if (windowClients[i].url === urlToOpen) {
                return windowClients[i].focus();
            }
        }
        return clients.openWindow(urlToOpen);
    });

    event.waitUntil(promiseChain);
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});
