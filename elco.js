const axios = require('axios');
const tough = require('tough-cookie');
const axiosCookieJarSupport = require('axios-cookiejar-support');
const qs = require('qs');

let count_fails = 0;
axiosCookieJarSupport.wrapper(axios);

const cookieJar = new tough.CookieJar();
axios.defaults.jar = cookieJar;
axios.defaults.withCredentials = true;

// Deine Konfigurationsdaten
const base_url = "https://www.remocon-net.remotethermo.com";
const zone = 1; // Deine Zone
const gateway = ""; // Dein Gateway ID
const username = ""; // Dein Username
const password = ""; // Dein Password
const iobroker_path = '0_userdata.0.Elco';

const login_url = `${base_url}/R2/Account/Login?returnUrl=HTTP/2`;
const data_url = `${base_url}/R2/PlantHomeBsb/GetData/${gateway}`;

const payload = qs.stringify({
  Email: username,
  Password: password,
  RememberMe: false
});

// Zustandsbeschreibungen
const stateDescriptions = {
    'outsideTemp': 'Elco Outside Temperature',
    'dhwStorageTemp': 'Elco Domestic Hot Water Storage Temperature',
    'dhwComfortTemp': 'Elco Domestic Hot Water Storage Temperature',
    'dhwReducedTemp': 'Elco Domestic Hot Water Storage Reduced Temperature',
    'dhwMode': 'Elco Domestic Hot Water Storage Mode',
    'dhwStorageTempError': 'Elco Domestic Hot Water Storage Temperature Error',
    'outsideTempError': 'Elco Outside Temperature Error',
    'hasOutsideTempProbe': 'Elco has Outside Temperature Probe',
    'flameSensor': 'Elco Flame sensor',
    'hasDhwStorageProbe': 'Elco has Domestic Hot Water Storage Probe',
    'heatPumpOn': 'Elco HeatPump On',
    'dhwEnabled': 'Elco Domestic Hot Water Enabled',
    'chComfortTemp': 'Elco Comfort room Temperature setpoint',
    'coolComfortTemp': 'Elco Cool Comfort room Temperature setpoint',
    'coolReducedTemp': 'Elco Cool Reduced room Temperature setpoint',
    'chReducedTemp': 'Elco Reduced room Temperature setpoint',
    'roomTemp': 'Elco Room Temperature',
    'desiredRoomTemp': 'Elco Desired Room Temperature',
    'mode': 'Elco Room Operation mode heating',
    'isHeatingActive': 'Elco Room Heating is Active',
    'isCoolingActive': 'Elco Room Cooling is Active',
    'heatOrCoolRequest': 'Elco Room Heating or Cool is Request',
    'roomTempError': 'Elco Room Temperature Error'
};

async function login() {
  const response = await axios.post(login_url, payload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'browserUtcOffset=-120'
    }
  });

  if (!response.data.ok) {
    throw new Error(`Authentication failed: ${response.data.message}`);
  }
}

async function getData() {
  const payload = {
    useCache: true,
    zone: zone,
    filter: {
      progIds: null,
      plant: true,
      zone: true
    }
  };

  const response = await axios.post(data_url, payload);

  if (response.status !== 200) {
    throw new Error(`Fetching error: ${response.statusText}`);
  }

  return response.data;
}

async function getRemoconData() {
  try {
    await login();
    const data = await getData();
    //console.log(data); // Hier kannst du die Daten verarbeiten und an deine Home Assistant-Instanz senden
    log(`${scriptName} - Remocon Heizungsdaten holen`);
    
    if(data.message){
        log(`${scriptName} => ${data.messageTitle} - ${data.message}`);
    }
    if(data.debugMessage){
        log(`${scriptName} => ${data.debugMessage}`);
    }
    if(data.ok){
        await datenVerarbeiten(data.data.plantData);
        await datenVerarbeiten(data.data.zoneData);
        return true;
    }
    return false
  } catch (error) {
    console.error(`${scriptName} - Unhandled exception: ${error.message}`);
    log(`${scriptName} - Unhandled exception: ${error.message}`)
    return false;
  }
}

async function datenVerarbeiten(data){
    let value = null;
    let dpoint = {};
    let stateDescription;
    for(let key of Object.keys(data)){
        //console.log(key);
        value = data[key];
        stateDescription = stateDescriptions[key] || key;
        switch(key){
            case 'outsideTemp': 
            case 'dhwStorageTemp':
            case 'roomTemp': 
            case 'chProtectionTemp': 
            case 'coolProtectionTemp':
            case 'chHolidayTemp':
            case 'coolHolidayTemp':
            case 'desiredRoomTemp':
                dpoint = {type: 'number', unit: '°C', role: 'value.temperature', read: true, write: false, name:  stateDescription};
            break;
            case 'flameSensor':
            case 'hasOutsideTempProbe':
            case 'heatPumpOn':
            case 'dhwEnabled':
            case 'hasDhwStorageProbe':
            case 'useReducedOperationModeOnHoliday':
            case 'isHeatingActive':
            case 'isCoolingActive':
            case 'hasRoomSensor':
            case 'useReducedOperationModeOnHoliday':
                dpoint = {type: 'boolean', role: 'state', read: true, write: false, name: stateDescription};
                break;
            case 'dhwStorageTempError':
            case 'outsideTempError':
            case 'roomTempError':
            case 'heatOrCoolRequest':
                dpoint = {type: 'boolean', role: 'indicator.error', read: true, write: false, name: stateDescription};
            break;
            case 'todayAsText':
            case 'maxDateAsText':
                dpoint = {type: 'string', read: true, write: false, name:  stateDescription};
                break;
            case 'todayAsMilliseconds':
                dpoint = {type: 'number', role: 'value.time', read: true, write: false, name: stateDescription};
                break;
            case 'dhwMode':
                if(toInt(data[key]) === 1){
                    value = 1;
                }
                else{
                    value = 0;
                }
                dpoint = {type: 'number', role: 'value', read: true, write: false, name: stateDescription};
                break;
            case 'dhwComfortTemp':
            case 'chComfortTemp':
            case 'chReducedTemp':
            case 'coolComfortTemp':
            case 'coolReducedTemp':
                await tempValues(data[key],`${iobroker_path}.${key}`,stateDescription);
                value = null;
                break;
            default:
                value = null; // Wert wird nicht übernommen
        }
        if(value !== null){
            if (!(await existsStateAsync(`${iobroker_path}.${key}`))){
                await createStateAsync(`${iobroker_path}.${key}`, value, dpoint);
            }
            else{
                await setStateAsync(`${iobroker_path}.${key}`, value, true);
            }
        }
    }
    return true;
}

async function tempValues(obj,path,stateDescription){
    let tvalue = null;
    let tstate = {
                    type: 'number', 
                    unit: '°C', 
                    role: 'value.temperature', 
                    read: true, 
                    write: false, 
                    name: stateDescription,
                    min: 0,
                    max: 0,
                    step: 0
            };
    if(typeof obj === 'object'){
        // mehrere werte...standard überschreiben
        for(let obj_key of Object.keys(obj)){
            switch(obj_key){
                case 'min':
                    if(obj[obj_key]){
                        tstate.min = obj[obj_key];
                    }
                    break;
                case 'max':
                    if(obj[obj_key]){
                        tstate.max = obj[obj_key];
                    }
                    break;
                case 'value':
                    tvalue = obj[obj_key];
                    break;
                case 'step':
                    if(obj[obj_key]){
                        tstate.step = obj[obj_key];
                    }
                    break;
            }
        }
        if(tvalue !== null){
                if (!(await existsStateAsync(`${path}`))){
                    await createStateAsync(`${path}`, tvalue, tstate);
                }
                else{
                    await setStateAsync(`${path}`, tvalue, true);
                }
            }
            tvalue = null;
    }   
    return true;
}

await getRemoconData();

schedule('0 * * * *' , () => {
    log(`${scriptName} - Remocon schedule`);
    
    getRemoconData().then(k => {
        if(k === false){
            sendTo('telegram.0', {text: 'Fehler bei Elco Script...mal nach schauen', disable_notification: true});
            count_fails++;
            if(count_fails > 3){
                stopScript("");
            }
        }
    }).catch(error => {
        // Hier können Sie Fehlerbehandlungslogik hinzufügen
        log(`${scriptName} - ${error}`);
    });
});
