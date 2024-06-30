const vscode = require('vscode');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// Überprüft, ob heute Dienstag ist
function isTuesday() {
    return moment().tz('Europe/Berlin').day() === 2; // Montag = 1, Dienstag = 2, ...
}

// Feiertage und Schulferien abrufen
async function getHolidaysAndSchoolVacationDays(year) {
    const feiertageUrl = `https://feiertage-api.de/api/?jahr=${year}&nur_land=MV`;

    // Funktion zum Formatieren des Datums in MM-DD
    function formatDateToMMDD(dateString) {
        const date = new Date(dateString);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${month}-${day}`;
    }

    // Feiertage abrufen und formatieren
    const response = await fetch(feiertageUrl);
    const feiertageData = await response.json();
    const feiertage = Object.values(feiertageData).map(holiday => formatDateToMMDD(holiday.datum));

    // Statische Liste der Ferientage für MV 2024 (Beispielhaft)
    const schoolHolidays = [
        { name: 'Winterferien', start: '2024-02-05', end: '2024-02-16' },
        { name: 'Osterferien', start: '2024-03-25', end: '2024-04-03' },
        { name: 'Sommerferien', start: '2024-07-22', end: '2024-08-31' },
        { name: 'Herbstferien', start: '2024-10-07', end: '2024-10-18' },
        { name: 'Weihnachtsferien', start: '2024-12-23', end: '2025-01-03' },
        { name: 'Pfingstferien', start: '2024-05-17', end: '2024-05-21'}
    ];

    // Funktion zum Erstellen eines Arrays mit allen Tagen zwischen Start und Ende der Ferien
    function getDaysBetween(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const days = [];
        for (let currentDate = startDate; currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
            days.push(formatDateToMMDD(currentDate));
        }
        return days;
    }

    // Alle Tage zwischen Start und Ende der Ferien sammeln
    const allSchoolVacationDays = [];
    schoolHolidays.forEach(holiday => {
        const days = getDaysBetween(holiday.start, holiday.end);
        allSchoolVacationDays.push(...days);
    });

    // Alle Feiertage und Tage zwischen Start und Ende der Ferien zurückgeben
    return {
        feiertage,
        ferien: allSchoolVacationDays
    };
}

// Überprüft, ob heute kein Feiertag oder Ferientag ist
async function isNotHoliday() {
    const year = moment().tz('Europe/Berlin').year();
    const holidaysAndVacations = await getHolidaysAndSchoolVacationDays(year);
    
    // Überprüfe, ob heute weder ein Feiertag noch ein Ferientag ist
    const today = moment().tz('Europe/Berlin').format('MM-DD');
    return !holidaysAndVacations.feiertage.includes(today) && !holidaysAndVacations.ferien.includes(today);
}

// Zeigt eine Nachricht an, wenn heute Dienstag und kein Feiertag ist
async function sayYesIfTuesdayNoHoliday() {
    if (isTuesday() && await isNotHoliday()) {
        vscode.window.showInformationMessage('Ja, denn heute ist Dienstag und kein freier Tag in Berliner Zeit.');
    } else {
        vscode.window.showInformationMessage('Nein, denn heute ist kein Dienstag oder es ist ein freier Tag in Berliner Zeit.');
    }
}

// Aktiviert die Erweiterung und registriert die Befehle
function activate(context) {
    console.log('Herzlichen Glückwunsch, deine Erweiterung "infoag-nb" ist jetzt aktiv!');

    // Befehl für die Feiertagsüberprüfung registrieren
    let checkTuesdayCommand = vscode.commands.registerCommand('infoag-nb.is_Tuesday', function () {
        sayYesIfTuesdayNoHoliday();
    });

    // Befehl für das Snake-Spiel registrieren
    let startSnakeGameCommand = vscode.commands.registerCommand('snake-game.start', function () {
        const panel = vscode.window.createWebviewPanel(
            'snakeGame',
            'Snake Game',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        // Lade den Inhalt der snakeGame.html Datei
        const snakeGamePath = path.join(context.extensionPath, 'snakeGame.html');
        const snakeGameHtml = fs.readFileSync(snakeGamePath, 'utf8');
        panel.webview.html = snakeGameHtml;
    });

    context.subscriptions.push(checkTuesdayCommand, startSnakeGameCommand);
}

// Deaktiviert die Erweiterung
function deactivate() {}

module.exports = {
    activate,
    deactivate
};