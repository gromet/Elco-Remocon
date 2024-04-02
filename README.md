# Elco Heizungsdaten Abholen

Dieses Skript dient dazu, Daten von einer Elco Heizung über die Remocon.net Webseite zu holen. Es verwendet Bibliotheken, wie axios, tough-cookie, axios-cookiejar-support und qs.

## Voraussetzungen

- Ein Konto bei Remocon.net mit einem registrierten Elco Heizungssystem

## Installation
1. Installiere die notwendigen Abhängigkeiten in der Javascript Instanz. 
2. Trage deine Anmeldedaten und Gateway-ID in die Konfigurationsdaten des Skriptes ein.
3. Lege den Datenpunkt unter 'iobroker_path' an z.B. 0_userdata.0.Elco als Verzeichnis. Die restlichen Datnepunkte legt das Script selbständig an

## Konfiguration

Die Konfigurationsdaten befinden sich am Anfang des Skriptes:

```javascript
// Deine Konfigurationsdaten
const base_url = "https://www.remocon-net.remotethermo.com";
const zone = 1; // Deine Zone
const gateway = "<DEIN_GATEWAY>"; // Dein Gateway ID
const username = "<DEIN_USERNAME>"; // Dein Username
const password = "<DEIN_PASSWORT>"; // Dein Password
const iobroker_path = '0_userdata.0.Elco'; // Pfad zu den Datenpunkten
```

## Verwendung

Das Skript kann direkt ausgeführt werden und holt die Daten von der Elco Heizung. Es loggt die Daten und stellt Objekte n Iobroker zur Verfügung.

## Hinweise

- Die Gateway-ID kann man aus der Adresszeile des Browsers auslesen, wenn man sich auf [https://www.remocon-net.remotethermo.com](https://www.remocon-net.remotethermo.com) einloggt. Die URL sieht dann in etwa so aus: `https://www.remocon-net.remotethermo.com/R2/Plant/Index/<Dein Gateway>?navMenuItem=0&breadcrumbPath=0`
- Das Skript ist so konfiguriert, dass es die Daten alle 1 Stunde zwischen 06:00 und 01:30 Uhr abruft.
- Bei mehr als 3 aufeinanderfolgenden Fehlern wird das Skript gestoppt und eine Benachrichtigung über Telegram gesendet.

## Fehlerbehebung

Sollten Probleme auftreten, überprüfen bitte die folgenden Punkte:

1. Sind alle Abhängigkeiten korrekt installiert?
2. Sind die Anmeldedaten und die Gateway-ID korrekt eingegeben?
3. Ist das Elco Heizungssystem online und mit Remocon.net verbunden?

Wenn das Problem weiterhin besteht, hinterlassen bitte ein Issue im GitHub-Repository.
