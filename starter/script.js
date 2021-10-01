'use strict';

let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // CONVERT INTO STRING AND TAKE THE LAST 10 NUMBERS
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coord, distance, duration, cadence) {
    super(coord, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    ////// min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coord, distance, duration, elevationGain) {
    super(coord, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    ////// km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////////
/////////////////////// APPLICATION ARCHITECTURE //////////////////
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map; // SET THEM TO BE EMPTY FIRST THEN REASSIGN THEM LATER
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    /// GET USER'S LOCATION ///
    this._getPosition();

    /// GET DATA FROM LOCAL STORAGE ///
    this._getLocalStorage();

    /// ATTACH EVENT HANDLERS ///
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // RECEIVING LOCATION ////////////////////////////////////////
  //GEOLOCATION API: .getCurrentPosition
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // 1ST FUNCTION = SUCCESSFULLY GET THE POSITION
        this._loadMap.bind(this), //BIND undefined TO NEW OBJECT
        // 2ND FUNCTION = ERROR
        function () {
          alert('Could not get your position.');
        }
      );
  }

  // LOAD MAP ////////////////////////////////////////////////
  _loadMap(position) {
    console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    /// USING THE LEAFLET LIBRARY ///
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    /// HANDLING 'click' ON MAP ///
    this.#map.on('click', this._showForm.bind(this));

    /// RENDER THE MARKERS STORED AFTER THE MAP IS LOADED ///
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // SHOW FORM /////////////////////////////////////////////////
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    // SET THE CURSOR AT THE FIELD WE WANT //
    inputDistance.focus();
  }

  // HIDE FORM /////////////////////////////////////////////////
  _hideForm() {
    // EMPTY THE INOUT FIELDS //
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // CHANGE BETWEEN 2 INPUT FIELDS /////////////////////////////
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  // IF THERE ARE MORE THAN 3 FIELDS, WE CAN.....
  // if (e.target.value === 'running') {}
  // if (e.target.value === 'climbing') {}
  // if (e.target.value === 'skiing') {}

  // SUBMIT THE FORM ///////////////////////////////////////////////
  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    /// GET DATA ///
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    /// IF IS RUNNING, CREATE RUNNING OBJECT ///
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // CHECK IF DATA IS VALID /
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        return alert('Inputs have to be positive numbers.');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    /// IF IS CYCLING, CREATE CYCLING OBJECT ///
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // CHECK IF DATA IS VALID //
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers.');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    /// ADD NEW OBJECT TO WORKOUT ARRAY ///
    this.#workouts.push(workout);

    /// RENDER WORKOUT ON MAP AS MARKER ///
    this._renderWorkoutMarker(workout);

    /// RENDER WORKOUT ON LIST ///
    this._renderWorkout(workout);

    /// HIDE FORM + CLEAR INPUT FIELDS ///
    this._hideForm();

    /// SET ALL WORKOUTS TO LOCAL STORAGE ///
    this._setLocalStorage();
  }

  // RENDER WORKOUT ON MAP AS MARKER /////////////////////////////
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 200,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // RENDER WORKOUT ON LIST //////////////////////////////////////
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}/span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li> `;

    form.insertAdjacentHTML('afterend', html);
  }

  // MOVE TO POP UP WHEN CLICKED //////////////////////////////////////
  _moveToPopup(e) {
    /// GET THE 'workout' ELEMENT IN THE WEBSITE WHEN CLIKCED ///
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    /// MATCH THE ID OF THE 'workout' ELEMENT IN THE ARRAY THAT WE PUSHED BEFORE ///
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    /// USING PUBLIC INTERFACE ///
    // workout.click();
  }

  // SET ALL WORKOUTS TO LOCAL STORAGE ///////////////////////////////////
  _setLocalStorage() {
    /// JSON.stringify() CAN CONVERT ANY OBJECT INTO A STRING ///
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  /// GET DATA FROM LOCAL STORAGE ///////////////////////////////////////
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    /// RESTORAGE THE #workouts WITH THE DATA STORED ///
    this.#workouts = data;

    /// RENDER THE LIST AT THE BEGINING ///
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
