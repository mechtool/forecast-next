'use strict';
var deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
	// Prevent Chrome 67 and earlier from automatically showing the prompt
	e.preventDefault();
	// Stash the event so it can be triggered later.
	deferredPrompt = e;
});
(async function() {
	let appContext = {townForecasts : {}};
	

	if ('serviceWorker' in navigator) {//проверка на сервисного рабочего
		navigator.serviceWorker.register('./service-worker.js').then(function(registraition) {
				console.log('Сервисный рабочий зарегистрирован.');
				//область подключения PushMessages, работа с объектом регистрации
			});
	}
	else{
		console.log('Браузер не поддерживает сервисного рабочего. Работа приложения невозможна.') ;
		return null;
	}
	if ('content' in document.createElement('template')) {//проверка на элемент шаблона
		//получить ссылки на формы
		appContext.appCityForm = document.querySelector('.addCityDialog')
	}
	else{
		alert('Браузер не поддерживает работу с шаблонами. Обновите браузер или приложение не запустится.') ;
		return;
	}
	
	appContext.townForecasts  = new Proxy(appContext.townForecasts, {set : setForecastData});
	appContext.townMetaData = [
		{lat : '55.75360', long : '37.62004', name : 'Moscow', id : 524901 },
		{lat : '43.11826', long : '131.94074' , name : 'Vladivostok', id : 2013348},
		{lat : '56.01949', long : '92.89495' , name : 'Krasnoyarsk', id : 1502026},
		{lat : '55.02133', long : '82.93694', name : 'Novosibirsk', id : 1496747 },
		{lat : '68.95908', long : '33.09265', name : 'Murmansk', id : 524305 }
		];
	appContext.dataCacheNames = [
		'https://api.openweathermap.org/data/2.5/forecast?id=524901',
		'https://api.openweathermap.org/data/2.5/forecast?id=2013348',
		'https://api.openweathermap.org/data/2.5/forecast?id=1502026',
		'https://api.openweathermap.org/data/2.5/forecast?id=1496747',
		'https://api.openweathermap.org/data/2.5/forecast?id=524305',
	];
	appContext.dataCacheNames = [
		'https://api.openweathermap.org/data/2.5/forecast?id=524901',
		'https://api.openweathermap.org/data/2.5/forecast?id=2013348',
		'https://api.openweathermap.org/data/2.5/forecast?id=1502026',
		'https://api.openweathermap.org/data/2.5/forecast?id=1496747',
		'https://api.openweathermap.org/data/2.5/forecast?id=524305',
	];
	//установка обработчиков событий на кнопки
	document.querySelector('.appContainer').addEventListener('click', onClickButtons);
	
	//кэширование данных всех городов из списка при старте приложения
	getForecast(appContext.townMetaData).then(res => { //пишем в кэш
		//обработка только данных
		if(res) setTownForecast(res);
		else console.log('Объекта ответа нет!');
	});
	
	function setTownForecast(res, setForecast = false) {
		res.forEach(res => {
			console.log('[Service Worker] Запрсы данных через fetch', res.url);
			let filtered = appContext.dataCacheNames.filter(el => res.url.indexOf(el) > -1);
			if(res.ok && filtered.length) { //
				caches.open(filtered[0]).then(cache => {
					res.json().then(resJson => { //получаем кэш назад, что бы в него записать
						//отбор данных на 12 часов дня
						let body = {
							city: resJson.city, list: (resJson.list.filter((item, inx) => {
								return (inx === 0 || (new Date().getDate() < new Date(item.dt_txt).getDate() && item.dt_txt.indexOf('12:00:00') >= 0));
							}))
						};
						//заполнение кэша
						cache.put(filtered[0], new Response(new Blob([JSON.stringify(body)], {type: 'application/json'}))).then(result => {
							console.log('Добавлено в кэш '+ filtered[0]);
						});
						setForecast && (appContext.townForecasts[body.city.id] = body);
					})
				});
			}
		})
	}
	
	//диспетчер кнопок
	function onClickButtons(event){
		
		let button = findButton(event.target) ;
		if(button){
			let selector = button.id ? button.id : button.dataset.id;
			switch (selector) {
				case 'btn0' :   deferredPrompt.prompt();
				case 'btn1': //refresh
					break;
				case 'btn2':
				case 'btn4': document.querySelector('.addCityDialog').classList.toggle('active');
					break;
				case 'btn3': getForecast([appContext.townMetaData[document.querySelector('#citySelect').value]]).then(resp => {
						//если нет карточки города, то создаем её, или обновляем данные
							setTownForecast(resp, true);
							document.querySelector('.addCityDialog').classList.toggle('active');
						});
					break;
				case 'btn5' : removeForecastItem(button);
					break;
			}
		}
	}
	
	function removeForecastItem(el) {
	   if(el.classList.contains('mainTemplateBlockClass')) {
	   		el.parentElement.removeChild(el);
	   		return;
	   }
	   return removeForecastItem(el.parentElement);
	}
	
	function findButton(elem){
		if(elem instanceof HTMLButtonElement) return elem;
		else if(elem.classList.contains('appContainer'))  return null;
		return findButton(elem.parentElement);
	}
	
	function getApiKey(){
		return caches.match('apiKey').then(apiKey => {
			return apiKey ? apiKey.json().then(key => key) : {apiKey : '6f0fd351626fa2fd2fb723be500cd35a'} ;
		})
	}
	
 	async function getForecast(townMeta) {
		try {
			let key = await getApiKey().then(key => key);
			return await Promise.all(townMeta.map(town => {
					let url = `https://api.openweathermap.org/data/2.5/forecast?id=${town.id}&units=metric&lang=ru&appid=${key.apiKey}`;
					return window.fetch(url);
				}))
		} catch (e) {
			console.log(e) 
		}
	}
	
	function setForecastData(target, prop, value) {
		//  При установки значения, устанавливаем данные интерфейса
		//либо новую карточку для города, которого еще нет в приложении, либо меняем данные для техаш городов,
		//которые уже есть в приложении.(типа одностороннего связывания свойства)
		let weekDaysParent,
			selectors = [
				'.name',
				'.country',
				'.pressure',
				'.description',
				'.temp',
				'.humidity',
				'.dt_txt',
				'.icon'
			];
		
			value.list && value.list.forEach((elem, inx) => {
				let former = document.getElementById(value.city.id + '-' + inx),
					rightPart = [
						value.city.name,
						value.city.country,
						elem.main.pressure,
						elem.weather[0].description,
						parseInt(elem.main.temp) + ' &#8451;',
						elem.main.humidity,
						new Date(elem.dt_txt).toLocaleString('ru-RU', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour : 'numeric', minute : 'numeric'}),
						`/images/weather/${elem.weather[0].icon}.png`
					],
					template = inx ? (former || document.importNode(document.getElementById('wekDayItem').content , true).firstElementChild) : weekDaysParent = (former || document.importNode(document.getElementById('mainTemplateBlock').content , true).firstElementChild );
				template.id || (template.id = value.city.id + '-' +inx);
				for(let i = 0; i < 8; i++){
					let target = template.querySelector(selectors[i]);
					target && (target[i < 7 ? 'innerHTML':  'src'] = rightPart[i] );
				}
				(inx && !former) && weekDaysParent.querySelector('.weekDays').appendChild(template);
				(inx || !former ) && document.querySelector('.appBase').appendChild(weekDaysParent);
			}) ;
		return true;
	}
})();
