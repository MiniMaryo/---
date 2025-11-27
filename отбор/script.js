document.addEventListener("DOMContentLoaded", () => {

    const LAT = 55.7558;
    const LON = 37.6173;
    const CITY = "Москва";

    const OWM_API_KEY = "a47626404e46b8e83e734c2c75f22be2"; // OpenWeatherMap

    const datePicker = document.getElementById("datePicker");
    const okButton = document.getElementById("okButton");
    const weatherDisplay = document.getElementById("weatherDisplay");

    const cityName = document.getElementById("cityName");
    const temperature = document.getElementById("temperature");
    const weatherIcon = document.getElementById("weatherIcon");
    const weatherDescription = document.getElementById("weatherDescription");
    const windSpeed = document.getElementById("windSpeed");
    const humidity = document.getElementById("humidity");
    const feelsLike = document.getElementById("feelsLike");

    const today = new Date().toISOString().split("T")[0];
    datePicker.value = today;

    const weatherCodeToIcon = {
        0: "fas fa-sun",
        1: "fas fa-cloud-sun",
        2: "fas fa-cloud-sun",
        3: "fas fa-cloud",
        45: "fas fa-smog",
        48: "fas fa-smog",
        51: "fas fa-cloud-rain",
        53: "fas fa-cloud-rain",
        55: "fas fa-cloud-rain",
        56: "fas fa-cloud-rain",
        57: "fas fa-cloud-rain",
        61: "fas fa-cloud-showers-heavy",
        63: "fas fa-cloud-showers-heavy",
        65: "fas fa-cloud-showers-heavy",
        66: "fas fa-cloud-showers-heavy",
        67: "fas fa-cloud-showers-heavy",
        71: "fas fa-snowflake",
        73: "fas fa-snowflake",
        75: "fas fa-snowflake",
        77: "fas fa-snowflake",
        80: "fas fa-cloud-showers-heavy",
        81: "fas fa-cloud-showers-heavy",
        82: "fas fa-cloud-showers-heavy",
        85: "fas fa-snowflake",
        86: "fas fa-snowflake",
        95: "fas fa-bolt",
        96: "fas fa-bolt",
        99: "fas fa-bolt"
    };

    async function getCurrentWeather() {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${OWM_API_KEY}&units=metric&lang=ru`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error("Ошибка OpenWeatherMap:", e);
            return null;
        }
    }

    async function getForecast(date) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,apparent_temperature,relativehumidity_2m,windspeed_10m,weathercode&start_date=${date}&end_date=${date}&timezone=Europe/Moscow`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error("Ошибка Open-Meteo:", e);
            return null;
        }
    }

    function getPeriodData(hourly, startHour, endHour) {
        const indices = hourly.time
            .map((t, i) => ({ hour: new Date(t).getHours(), i }))
            .filter(obj => obj.hour >= startHour && obj.hour <= endHour)
            .map(obj => obj.i);

        const avg = arr => Math.round(arr.reduce((a,b) => a+b,0)/arr.length);
        const mostCommon = arr => arr.sort((a,b) =>
            arr.filter(v => v===a).length - arr.filter(v => v===b).length
        ).pop();

        const tempArr = indices.map(i => hourly.temperature_2m[i]);
        const feelsArr = indices.map(i => hourly.apparent_temperature[i]);
        const humArr = indices.map(i => hourly.relativehumidity_2m[i]);
        const windArr = indices.map(i => hourly.windspeed_10m[i]);
        const codeArr = indices.map(i => hourly.weathercode[i]);

        return {
            temp: avg(tempArr),
            feels: avg(feelsArr),
            humidity: avg(humArr),
            wind: avg(windArr),
            code: mostCommon(codeArr)
        };
    }

    async function updateWeather() {
        const selectedDate = datePicker.value;

        const [currentData, forecastData] = await Promise.all([
            getCurrentWeather(),
            getForecast(selectedDate)
        ]);

        if (!forecastData || !forecastData.hourly) {
            weatherDescription.textContent = "Нет данных для выбранной даты.";
            weatherDisplay.classList.remove("active");
            return;
        }

        // Если выбран текущий день — показываем реальные значения
        if (selectedDate === today && currentData) {
            temperature.textContent = Math.round(currentData.main.temp) + "°C";
            feelsLike.textContent = Math.round(currentData.main.feels_like) + "°C";
            humidity.textContent = Math.round(currentData.main.humidity) + "%";
            windSpeed.textContent = Math.round(currentData.wind.speed) + " м/с";
            weatherDescription.textContent = currentData.weather[0].description;
            const main = currentData.weather[0].main;
            const iconMap = {
                Clear: "fas fa-sun",
                Clouds: "fas fa-cloud",
                Rain: "fas fa-cloud-rain",
                Snow: "fas fa-snowflake",
                Thunderstorm: "fas fa-bolt",
                Drizzle: "fas fa-cloud-rain",
                Mist: "fas fa-smog"
            };
            weatherIcon.className = iconMap[main] || "fas fa-cloud";
        } else {
            // Для будущих/прошедших дней показываем Open-Meteo прогноз (берем 12:00)
            const hourly = forecastData.hourly;
            temperature.textContent = Math.round(hourly.temperature_2m[12]) + "°C";
            feelsLike.textContent = Math.round(hourly.apparent_temperature[12]) + "°C";
            humidity.textContent = Math.round(hourly.relativehumidity_2m[12]) + "%";
            windSpeed.textContent = Math.round(hourly.windspeed_10m[12]) + " м/с";
            weatherDescription.textContent = "Общий прогноз";
            weatherIcon.className = weatherCodeToIcon[hourly.weathercode[12]] || "fas fa-cloud";
        }

        cityName.textContent = `${CITY}, Россия`;

        // Утро/День/Вечер
        const hourly = forecastData.hourly;
        const extraBlockId = "extraForecast";
        let extraBlock = document.getElementById(extraBlockId);
        if (!extraBlock) {
            extraBlock = document.createElement("div");
            extraBlock.id = extraBlockId;
            extraBlock.className = "period-blocks";
            weatherDisplay.appendChild(extraBlock);
        }

        const periods = [
            { label: "Утро", start: 6, end: 11 },
            { label: "День", start: 12, end: 17 },
            { label: "Вечер", start: 18, end: 23 }
        ];

        extraBlock.innerHTML = "";
        periods.forEach(p => {
            const dataPeriod = getPeriodData(hourly, p.start, p.end);
            extraBlock.innerHTML += `
                <div class="period">
                    <h4>${p.label}</h4>
                    <i class="${weatherCodeToIcon[dataPeriod.code]} fa-2x"></i>
                    <div><b>${dataPeriod.temp}°C</b></div>
                    <div>Ощущается: ${dataPeriod.feels}°C</div>
                    <div>Влажность: ${dataPeriod.humidity}%</div>
                    <div>Ветер: ${dataPeriod.wind} м/с</div>
                </div>
            `;
        });

        weatherDisplay.classList.add("active");
    }

    okButton.addEventListener("click", updateWeather);
    datePicker.addEventListener("change", updateWeather);

    updateWeather();
});
