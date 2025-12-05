require('dotenv').config(); 

// 이제 process.env에서 접근 가능합니다.
const token = process.env.token;
const myId = process.env.myId;
const studyChannelId = process.env.studyChannelId;
const totalChannelId = process.env.totalChannelId;
const reportChannelIdYours = process.env.reportChannelIdYours;
const reportChannelIdMine = process.env.reportChannelIdMine;    

const { Client, Events, GatewayIntentBits, ChannelType } = require('discord.js');

// 💡 1. 인텐트 설정 (GUILD_VOICE_STATES는 필수)
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ] 
});

// 💡 2. 임시 저장소 Map
const joinTimes = new Map(); 

// 🚨🚨🚨 반드시 실제 사용하려는 음성 채널 ID로 변경해야 합니다. 🚨🚨🚨
const STUDY_CHANNEL_ID = studyChannelId; 
const TOTAL_CHANNEL_ID = totalChannelId;
const REPORT_CHANNEL_ID_YOURS = reportChannelIdYours;
const REPORT_CHANNEL_ID_MINE = reportChannelIdMine;


client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const member = newState.member;
    const clie = member.user.username;

    // --- 퇴장 조건 체크 ---
    const isLeavingStudyChannel = 
        oldState.channelId === STUDY_CHANNEL_ID && // 이전 채널이 공부 채널이었고
        newState.channelId !== STUDY_CHANNEL_ID;   // 새 채널은 공부 채널이 아닐 때 (퇴장 또는 이동)

    // 1. 특정 채널에 있는지 확인
    const isInStudyChannel = newState.channelId === STUDY_CHANNEL_ID;
    
    // 2. 비디오 상태가 변했는지 확인
    const oldVideo = oldState.selfVideo; // 이전 비디오 상태
    const newVideo = newState.selfVideo; // 현재 비디오 상태

    if (isInStudyChannel && !oldVideo && newVideo) {
        // 입장 시간을 기록
        joinTimes.set(userId, Date.now()); 
        const reportChannel = client.channels.cache.get(TOTAL_CHANNEL_ID);
            if (reportChannel && reportChannel.type === ChannelType.GuildText) {
                const message = `[공부 시작] ${clie} : ${new Date().toLocaleTimeString()}`;
                reportChannel.send({ content: message })
                    .catch(e => console.error("메시지 전송 실패:", e));
            }
        return; // 다음 로직으로 넘어가지 않음
    }

    const joinTime = joinTimes.get(userId);

    if (joinTimes.has(userId)) {
            // 세션 종료 조건: (채널을 벗어났거나 OR 카메라를 껐거나)
    const shouldEndSession = 
        newState.channelId !== STUDY_CHANNEL_ID || // 공부 채널을 떠났을 때 (다른 채널로 이동 또는 퇴장)
        newState.selfVideo === false;             // 카메라를 껐을 때
        if (shouldEndSession) {
            const leaveTime = Date.now();
            const durationMs = leaveTime - joinTime;
            
            // 밀리초를 시간, 분, 초로 변환
            const seconds = Math.floor((durationMs / 1000) % 60);
            const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));

            // 💡 추가된 부분: 각 숫자를 두 자리 문자열로 변환 (HHmmss 형식)
            const formattedSeconds = String(seconds).padStart(2, '0');
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedHours = String(hours).padStart(2, '0');

            // durationStr도 수정된 변수를 사용합니다.
            const durationStr = `${formattedHours}시간 ${formattedMinutes}분 ${formattedSeconds}초`;
            
            // 💡 3. 결과 출력 및 기록 삭제
            const reportChannel2 = client.channels.cache.get(TOTAL_CHANNEL_ID);
            if (reportChannel2 && reportChannel2.type === ChannelType.GuildText) {
                const message2 = `[공부 종료] ${clie} : ${new Date().toLocaleTimeString()}`;
                reportChannel2.send({ content: message2 })
                    .catch(e => console.error("메시지 전송 실패:", e));
            }

            const targetReportChannelId = (userId === myId) ? REPORT_CHANNEL_ID_MINE : REPORT_CHANNEL_ID_YOURS;
            const reportChannel3 = client.channels.cache.get(targetReportChannelId);
            // limit: 1 옵션을 사용하여 가장 최근 메시지 1개만 가져옵니다.
            const lastMessages = await fetchLatestMessage(client, targetReportChannelId);
            let finalMessage = "";
            if (lastMessages !== null) {
                const result = addTimesFromMessages(durationStr, lastMessages.content);

                finalMessage = `[공부 시간] : ${durationStr} \n[누적 시간] : 총 ${result} 👏`;
            } else {
                finalMessage = `[공부 시간] : ${durationStr} \n[누적 시간] : 총 ${durationStr} 👏`;
            }
        
        // Collection의 첫 번째 요소(가장 최근 메시지)를 반환합니다.
            if (reportChannel3 && reportChannel3.type === ChannelType.GuildText) {
                reportChannel3.send({ content: finalMessage })
                    .catch(e => console.error("메시지 전송 실패:", e));
            }
            
            // 맵에서 기록 삭제
            joinTimes.delete(userId); 
        }
    }
});

async function fetchLatestMessage(client, channelId) {
    const channel = client.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildText) {
        console.error("유효한 텍스트 채널이 아닙니다.");
        return null;
    }

    try {
        // limit: 1 옵션을 사용하여 가장 최근 메시지 1개만 가져옵니다.
        const messages = await channel.messages.fetch({ limit: 1 });

        if(messages.first() === "가져온 메시지가 없습니다.") return null;
        
        // Collection의 첫 번째 요소(가장 최근 메시지)를 반환합니다.
        return messages.first() || null; 

    } catch (error) {
        console.error("최근 메시지 가져오기 중 오류 발생:", error);
        return null;
    }
}

/**
 * "H시간 M분 S초" 형식의 문자열을 밀리초로 변환합니다.
 * @param {string} durationStr - 시간 문자열 (예: "0시간 0분 1초" 또는 "01시간 05분 30초")
 * @returns {number} 총 밀리초
 */
function parseDuration(durationStr) {
    // (\d+)시간 (\d{1,2})분 (\d{1,2})초 패턴을 parseDuration에서도 사용해야 합니다.
    const regex = /(\d+)시간\s*(\d+)분\s*(\d+)초/;
    const match = durationStr.match(regex);

    if (!match) return 0;

    // match[0]은 전체 문자열, match[1]은 시간, match[2]는 분, match[3]은 초
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * 총 밀리초를 "HH시간 mm분 ss초" 형식으로 포맷팅합니다.
 * @param {number} totalMs - 총 밀리초
 * @returns {string} 포맷팅된 시간 문자열
 */
function formatDuration(totalMs) {
    const totalSeconds = Math.floor(totalMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedHours = String(hours).padStart(2, '0');

    return `${formattedHours}시간 ${formattedMinutes}분 ${formattedSeconds}초`;
}

// =================================================================
// ## 🖥️ 메인 메서드: 두 줄 메시지 시간 합치기
// =================================================================
/**
 * 두 줄의 메시지에서 시간을 추출하여 합산하고 포맷팅된 결과를 반환합니다.
 * @param {string} messageContent - "\n"으로 구분된 두 줄의 메시지 내용 전체
 * @returns {string} 합산된 시간을 "HH시간 mm분 ss초" 형식으로 포맷팅한 문자열
 */
function addTimesFromMessages(curTime, messageContent) {
    const lines = messageContent.split('\n');

    if (lines.length < 2) {
        return "오류: 메시지 내용이 두 줄 이상이어야 합니다.";
    }

    // 💡 수정된 부분: 시간(H)은 \d+ (하나 이상의 숫자)를 허용합니다.
    // 분(M)과 초(S)는 \d{1,2} (한 자리 또는 두 자리)를 허용합니다.
    const timePattern = '(\\d+)시간\\s*(\\d+)분\\s*(\\d+)초';
    
    // [누적 시간] : 총 [시간 문자열]
    // 💡 누적 시간은 100시간 이상일 수 있으므로 이 패턴이 필수입니다.
    const totalRegex = new RegExp(`\\[누적 시간\\]\\s*:\\s*총\\s*(${timePattern})`);
    
    const totalMatch = lines[1].match(totalRegex);
    
    if (!totalMatch) {
        console.error("정규식 매칭 실패. 입력된 메시지:", messageContent);
        return "오류: 메시지 패턴을 분석할 수 없습니다. (시간 형식 불일치)";
    }

    const totalDurationStr = totalMatch[1];
    
    // ... (이후 parseDuration 호출 및 합산 로직은 이전과 동일)
    
    const recordMs = parseDuration(curTime);
    const totalMs = parseDuration(totalDurationStr);
    
    const grandTotalMs = recordMs + totalMs;

    return formatDuration(grandTotalMs);
}

client.login(token);