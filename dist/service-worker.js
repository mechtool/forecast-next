//Коллекция имен кэшей в которых будут хранится данные о погоде всех пяти городов
var dataCacheNames = [
	'https://api.openweathermap.org/data/2.5/forecast?id=524901',
	'https://api.openweathermap.org/data/2.5/forecast?id=2013348',
	'https://api.openweathermap.org/data/2.5/forecast?id=1502026',
	'https://api.openweathermap.org/data/2.5/forecast?id=1496747',
	'https://api.openweathermap.org/data/2.5/forecast?id=524305',
	];
//Имя кэша, в котором будут сохраняться файлы оболочки приложения
var shellCacheName = 'appShellCache-v1';
//относительные адреса файлов оболочки приложения, которые будут сохранены
//в кэш с вышеуказанным именем.
var filesToCache = [
	'/',
	'/apiKey',
	'/index.html',
	'/index.js',
	'/index.min.css',
	'/lib/material.min.js',
	'/lib/material.min.css',
	'/images/shell/check-24px.svg',
	'/images/shell/clear-24px.svg',
	'/images/shell/delete.svg',
	'/images/shell/ic_add_white_24px.svg',
	'/images/shell/ic_refresh_white_24px.svg',
	'/images/weather/01d.png',
	'/images/weather/02d.png',
	'/images/weather/03d.png',
	'/images/weather/04d.png',
	'/images/weather/09d.png',
	'/images/weather/10d.png',
	'/images/weather/11d.png',
	'/images/weather/13d.png',
	'/images/weather/50d.png',
	'/images/weather/01n.png',
	'/images/weather/02n.png',
	'/images/weather/03n.png',
	'/images/weather/04n.png',
	'/images/weather/09n.png',
	'/images/weather/10n.png',
	'/images/weather/11n.png',
	'/images/weather/13n.png',
	'/images/weather/50n.png',
];
//подписка на событие установки сервисного рабочего в браузер
//Этот отбработчик подходит для заполнения кэшей оболочки приложения
self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Запуск события install');
  e.waitUntil(
  	//заполнение кэшей оболочки и данных приложения
	  caches.open(shellCacheName).then(function(cache) {
	  	console.log('[ServiceWorker] Кэширование оболочки приложения');
	  	return cache.addAll(filesToCache);
	}).catch(()=> console.log('Оболочка приложения не загружена!'))
  )
});
//подписка на событие активации сервисного рабочего
//Подходит для отчистки браузера от старых кэшей, не использующихся
//вновь активирующимся сервисным рабочим.
self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Запуск события активации (activate)');
  e.waitUntil(
  	//удаление всех кэшей не являющихся кэшем оболочки приложения
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== shellCacheName) {
          console.log('[ServiceWorker] Удаление старых кэшей', key);
          return caches.delete(key);
        }
      }));
    })
  );
  /* Регулировка крайних случаев, когда приложение не возвращает
  * свежие данные. Это можо имитировать путем закоментирования строку ниже,
  * а затем выполнить следующие шаги: 1. Загрузить приложение первый раз, так, что бы
  * загрузились первые данные по умолчанию. 2. Нажать кнопку обновления данных приложения
  * 3. Перейти в режим offline 4. Перезагрузить приложение.
  * Ожидается отображение новых данных, но в действительности будут отображаться
  * данные при загрузки (первые). Это происходит потому, что при загрузки, новый сервисный рабочий
  * еще не стал активным, для этого ему нужно, что бы все закладки, которые использует старый сервисный рабочий
  * были закрыты или был запущен закоментированный метод, запускающий принудительную активацию
  * нового сервисного рабочего.
   */
  return self.clients.claim(); //запрос принудительного контроля над клиентами
});
self.addEventListener('fetch', function(e) {
	let dataUrl = dataCacheNames.find(name => e.request.url.indexOf(name) > -1),
		reqCache = dataUrl || e.request;
	e.respondWith(
		caches.match(reqCache).then(req => {
				return dataUrl ? fetch(e.request).catch(() => {
					return req
				} ) : req || fetch(e.request);
			}))
});
