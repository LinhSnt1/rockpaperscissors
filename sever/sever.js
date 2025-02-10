const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

// Lưu trữ thông tin người chơi và trận đấu
const players = new Map(); // Lưu thông tin người chơi
const waitingPlayers = []; // Hàng đợi người chơi đang tìm trận
const matches = new Map(); // Lưu thông tin các trận đấu

// Xử lý kết nối mới
server.on("connection", (ws) => {
  const playerId = generatePlayerId();
  players.set(ws, { id: playerId, name: `Player ${playerId}` });

  console.log(`Player ${playerId} connected`);

  // Xử lý tin nhắn từ client
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    handleMessage(ws, data);
  });

  // Xử lý ngắt kết nối
  ws.on("close", () => {
    handlePlayerDisconnect(ws);
  });
});

// Xử lý tin nhắn
function handleMessage(ws, data) {
  const player = players.get(ws);

  switch (data.type) {
    case "find_match":
      handleFindMatch(ws);
      break;

    case "place_bet":
      handlePlaceBet(ws, data.amount);
      break;

    case "player_choice":
      handlePlayerChoice(ws, data.choice);
      break;
  }
}

// Tìm trận
function handleFindMatch(ws) {
  const layer = players.get(ws);

  // Nếu có người chơi đang đợi
  if (waitingPlayers.length > 0) {
    const opponent = waitingPlayers.shift();
    createMatch(ws, opponent);
  } else {
    // Thêm vào hàng đợi
    waitingPlayers.push(ws);
  }
}

// Tạo trận đấu mới
function createMatch(player1WS, player2WS) {
  const matchId = generateMatchId();
  const match = {
    id: matchId,
    player1: player1WS,
    player2: player2WS,
    bets: new Map(),
    choices: new Map(),
    status: "betting",
  };

  matches.set(matchId, match);

  // Thông báo cho cả hai người chơi
  const player1 = players.get(player1WS);
  const player2 = players.get(player2WS);

  player1WS.send(
    JSON.stringify({
      type: "match_found",
      opponent_name: player2.name,
    })
  );

  player2WS.send(
    JSON.stringify({
      type: "match_found",
      opponent_name: player1.name,
    })
  );
}

// Xử lý đặt cược
function handlePlaceBet(ws, amount) {
  const match = findMatchByPlayer(ws);
  if (!match || match.status !== "betting") return;

  match.bets.set(ws, amount);

  // Kiểm tra nếu cả hai đã đặt cược
  if (match.bets.size === 2) {
    match.status = "playing";
    broadcastToMatch(match, {
      type: "bet_confirmed",
      status: "ready",
      amount: Math.min(...match.bets.values()),
    });
  }
}

// Xử lý lựa chọn của người chơi
function handlePlayerChoice(ws, choice) {
  const match = findMatchByPlayer(ws);
  if (!match || match.status !== "playing") return;

  match.choices.set(ws, choice);

  // Thông báo cho đối thủ
  const opponent = getOpponent(match, ws);
  opponent.send(
    JSON.stringify({
      type: "opponent_choice",
      choice: choice,
    })
  );

  // Kiểm tra kết quả nếu cả hai đã chọn
  if (match.choices.size === 2) {
    determineWinner(match);
  }
}

// Xác định người thắng
function determineWinner(match) {
  const player1Choice = match.choices.get(match.player1);
  const player2Choice = match.choices.get(match.player2);
  const betAmount = Math.min(...match.bets.values());

  let winner = null;

  if (player1Choice === player2Choice) {
    // Hòa
    broadcastToMatch(match, {
      type: "game_result",
      result: "draw",
    });
  } else {
    winner = getWinner(player1Choice, player2Choice);
    const winnerWS = winner === 1 ? match.player1 : match.player2;
    const loserWS = winner === 1 ? match.player2 : match.player1;

    winnerWS.send(
      JSON.stringify({
        type: "game_result",
        result: "win",
        winAmount: betAmount * 2,
      })
    );

    loserWS.send(
      JSON.stringify({
        type: "game_result",
        result: "lose",
        winAmount: 0,
      })
    );
  }

  // Kết thúc trận đấu
  matches.delete(match.id);
}

// Logic xác định người thắng
function getWinner(choice1, choice2) {
  const rules = {
    Kéo: { beats: "Bao" },
    Búa: { beats: "Kéo" },
    Bao: { beats: "Búa" },
  };

  if (rules[choice1].beats === choice2) return 1;
  return 2;
}

// Utility functions
function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateMatchId() {
  return Math.random().toString(36).substr(2, 9);
}

function findMatchByPlayer(ws) {
  for (const [, match] of matches) {
    if (match.player1 === ws || match.player2 === ws) {
      return match;
    }
  }
  return null;
}

function getOpponent(match, ws) {
  return match.player1 === ws ? match.player2 : match.player1;
}

function broadcastToMatch(match, data) {
  match.player1.send(JSON.stringify(data));
  match.player2.send(JSON.stringify(data));
}

function handlePlayerDisconnect(ws) {
  const player = players.get(ws);
  console.log(`Player ${player.id} disconnected`);

  // Xóa khỏi hàng đợi nếu đang tìm trận
  const waitingIndex = waitingPlayers.indexOf(ws);
  if (waitingIndex !== -1) {
    waitingPlayers.splice(waitingIndex, 1);
  }

  // Kết thúc trận đấu nếu đang chơi
  const match = findMatchByPlayer(ws);
  if (match) {
    const opponent = getOpponent(match, ws);
    opponent.send(
      JSON.stringify({
        type: "opponent_disconnected",
      })
    );
    matches.delete(match.id);
  }

  players.delete(ws);
}

console.log("Game server running on port 8080");
