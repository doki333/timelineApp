// ping.js

const http = require('http');
const PORT = process.env.PORT || 3000; 

/**
 * 환경 변수에서 봇의 공개 URL을 가져옵니다.
 * 이 URL은 Koyeb에서 배포 후 부여하는 URL이어야 합니다.
 */
const PING_URL = process.env.PING_URL; 

// Ping을 보낼 주기: 10분 = 10 * 60 * 1000 = 600000ms
const INTERVAL_TIME = 10 * 60 * 1000; 

/**
 * 봇 URL로 주기적으로 HTTP 요청을 보내는 함수
 */
function startPinging() {
    if (!PING_URL) {
        console.warn("⚠️ PING_URL 환경 변수가 설정되지 않았습니다. 핑 기능이 비활성화됩니다.");
        return;
    }

    const pingSelf = () => {
        // http.get()을 사용하여 외부 서비스 호출 (자신에게 호출)
        http.get(PING_URL, (res) => {
            // 응답을 받아야 연결이 완전히 종료되므로 res.resume() 호출
            res.resume();
            if (res.statusCode === 200) {
                console.log(`[Ping] 성공적으로 핑을 보냈습니다. 응답 코드: ${res.statusCode}`);
            } else {
                console.warn(`[Ping] 핑을 보냈지만 응답 코드가 200이 아닙니다: ${res.statusCode}`);
            }
        }).on('error', (err) => {
            // 네트워크 오류 등으로 핑에 실패했을 경우
            console.error(`[Ping] 핑 요청 오류: ${err.message}`);
        });
    };

    console.log(`[Ping] 자가 핑 기능이 활성화되었습니다. 10분마다 실행됩니다.`);
    
    // 봇을 시작하자마자 첫 번째 핑을 보냄
    pingSelf();

    // 설정된 주기마다 핑을 반복하도록 설정
    setInterval(pingSelf, INTERVAL_TIME);
}

/**
 * Koyeb이 웹 서비스로 인식하고 포트를 열어두도록 간단한 웹 서버를 실행합니다.
 */
function startWebServer() {
    const server = http.createServer((req, res) => {
        // 루트 경로('/') 또는 '/ping' 경로로 요청이 오면 응답
        if (req.url === '/ping' || req.url === '/') {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Bot is awake!');
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(PORT, () => {
        console.log(`[Web Server] 핑을 받을 웹 서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}

module.exports = {
    startPinging,
    startWebServer // 웹 서버 시작 함수도 함께 export
};