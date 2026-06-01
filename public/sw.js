/* SpeakUp service worker — nhận web push & mở app khi bấm thông báo. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text ? event.data.text() : "" };
  }
  const title = data.title || "SpeakUp · Đến giờ học rồi 📚";
  const options = {
    body:
      data.body ||
      "Dành ít phút hôm nay để biến điều bạn hiểu thành điều nói được nhé!",
    icon: data.icon || "/student_character.png",
    badge: "/favicon.ico",
    tag: data.tag || "speakup-daily-reminder",
    data: { url: data.url || "/today" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
