const vscode = require('vscode');
const moment = require('moment-timezone');

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

        panel.webview.html = getWebviewContent();
    });

    context.subscriptions.push(checkTuesdayCommand, startSnakeGameCommand);
}

// HTML-Inhalt für das Snake-Spiel
function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Snake Game</title>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #000;
            }
            canvas {
                border: 1px solid #fff;
            }
            #gameOverScreen {
                display: none;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 20px;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <canvas id="gameCanvas" width="400" height="400"></canvas>
        <div id="gameOverScreen">
            <h2>Game Over</h2>
            <p>Your score: <span id="score">0</span></p>
            <button onclick="restartGame()">Restart</button>
        </div>
        <script>
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            const gameOverScreen = document.getElementById('gameOverScreen');
            const scoreDisplay = document.getElementById('score');

            const box = 20;
            let snake = [];
            snake[0] = { x: 10 * box, y: 10 * box };
            let direction = 'RIGHT';
            let food = {
                x: Math.floor(Math.random() * 19 + 1) * box,
                y: Math.floor(Math.random() * 19 + 1) * box
            };
            let score = 0;
            let game;

            document.addEventListener('keydown', directionChange);

            function directionChange(event) {
                if (event.keyCode == 37 && direction != 'RIGHT') {
                    direction = 'LEFT';
                } else if (event.keyCode == 38 && direction != 'DOWN') {
                    direction = 'UP';
                } else if (event.keyCode == 39 && direction != 'LEFT') {
                    direction = 'RIGHT';
                } else if (event.keyCode == 40 && direction != 'UP') {
                    direction = 'DOWN';
                }else if (event.keyCode == 65 && direction != 'RIGHT') {
                    direction = 'LEFT';
                } else if (event.keyCode == 87 && direction != 'DOWN') {
                    direction = 'UP';
                } else if (event.keyCode == 68 && direction != 'LEFT') {
                    direction = 'RIGHT';
                } else if (event.keyCode == 83 && direction != 'UP') {
                    direction = 'DOWN';
                }
            }

            function draw() {
                ctx.clearRect(0, 0, 400, 400);

                for (let i = 0; i < snake.length; i++) {
                    ctx.fillStyle = (i == 0) ? 'green' : 'white';
                    ctx.fillRect(snake[i].x, snake[i].y, box, box);
                    ctx.strokeStyle = 'red';
                    ctx.strokeRect(snake[i].x, snake[i].y, box, box);
                }

                ctx.fillStyle = 'red';
                ctx.fillRect(food.x, food.y, box, box);

                let snakeX = snake[0].x;
                let snakeY = snake[0].y;

                if (direction == 'LEFT') snakeX -= box;
                if (direction == 'UP') snakeY -= box;
                if (direction == 'RIGHT') snakeX += box;
                if (direction == 'DOWN') snakeY += box;

                if (snakeX == food.x && snakeY == food.y) {
                    food = {
                        x: Math.floor(Math.random() * 19 + 1) * box,
                        y: Math.floor(Math.random() * 19 + 1) * box
                    };
                    score++;
                    scoreDisplay.textContent = score;
                } else {
                    snake.pop();
                }

                let newHead = { x: snakeX, y: snakeY };

                if (snakeX < 0 || snakeY < 0 || snakeX >= 400 || snakeY >= 400 || collision(newHead, snake)) {
                    showGameOverScreen();
                    clearInterval(game);
                }

                snake.unshift(newHead);
            }

            function collision(head, array) {
                for (let i = 0; i < array.length; i++) {
                    if (head.x == array[i].x && head.y == array[i].y) {
                        return true;
                    }
                }
                return false;
            }

            function startGame() {
                snake = [];
                snake[0] = { x: 10 * box, y: 10 * box };
                direction = 'RIGHT';
                food = {
                    x: Math.floor(Math.random() * 19 + 1) * box,
                    y: Math.floor(Math.random() * 19 + 1) * box
                };
                score = 0;
                scoreDisplay.textContent = score;
                gameOverScreen.style.display = 'none';
                game = setInterval(draw, 100);
            }

            function showGameOverScreen() {
                gameOverScreen.style.display = 'block';
            }

            function restartGame() {
                startGame();
            }

            startGame();
        </script>
    </body>
    </html>
    `;
}

// Deaktiviert die Erweiterung
function deactivate() {}

module.exports = {
    activate,
    deactivate
};